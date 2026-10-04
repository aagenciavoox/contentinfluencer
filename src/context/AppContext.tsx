import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { AppState } from '../app/providers/appState';
import { initialState } from '../app/providers/appState';
import { supabase } from '../lib/supabase';
import type * as db from '../lib/database';
import { appReducer, AppAction } from './reducer';
import { persistAction, persistContentRecord } from './persistAction';
import { REALTIME_TABLES, shouldSkipRealtimeRefresh } from './realtimeSync';
import {
  applyDomainStatus,
  clearDomainStatus,
  isDomainAlreadyLoaded,
  markDomainsLoaded,
  resolveDomainStatus,
  subtractInFlightDomains,
  type DomainLoadStatus,
  type DomainStatusMap,
} from './domainLoading';
import {
  getDomainsForRealtimeTable,
  getListNamespacesForRealtimeTable,
} from './realtimeDomainMap';
import { useAuth } from './AuthContext';
import { broadcastDataSync, subscribeDataSync } from '../lib/syncBroadcast';
import { getErrorMessage, notifySaveFeedback } from '../lib/saveFeedback';
import { ERRORS, LOADING } from '../lib/uiCopy';
import { generateUUID, isUUID } from '../utils/uuid';
import { buildDomainCacheKey, dataCache } from '../lib/dataCache';
import {
  canDomainPayloadSatisfyRequest,
  clearPersistedDomainsForUser,
  clearPersistedPagesForUser,
  discardObsoleteDomainCache,
  isPersistedDomainFresh,
  readPersistedDomain,
  writePersistedDomain,
} from '../lib/persistentDataCache';
import { mergeFetchedAppData, patchContentsInDomainCaches, patchPlatformsInDomainCaches, patchSeriesInDomainCaches, patchTemasInDomainCaches } from '../lib/domainCacheSync';
import {
  BOOTSTRAP_DATA_DOMAINS,
  CRITICAL_BOOTSTRAP_DOMAINS,
  DEFERRED_BOOTSTRAP_DOMAINS,
  fetchDataDomains,
} from '../lib/database';

const ACTION_SAVE_LABELS: Partial<Record<AppAction['type'], string>> = {
  UPDATE_CONTENT: 'Roteiro salvo',
  ADD_CONTENT: 'Roteiro criado',
  UPDATE_IDEA: 'Ideia salva',
  ADD_IDEA: 'Ideia criada',
  DEMOTE_CONTENTS_TO_IDEAS: 'Roteiros movidos para Ideias',
  SET_CONTENT_STATUS: 'Etapa atualizada',
  ARCHIVE_CONTENTS: 'Criação arquivada',
  RESTORE_CONTENTS: 'Criação restaurada',
  DELETE_CONTENT: 'Roteiro movido para a lixeira',
  DELETE_MULTIPLE_CONTENTS: 'Roteiros movidos para a lixeira',
  UPDATE_AGENDA_ITEM: 'Agenda salva',
  ADD_AGENDA_ITEM: 'Agenda salva',
  ADD_POST_IT: 'Post-it criado',
  UPDATE_POST_IT: 'Post-it salvo',
  DELETE_POST_IT: 'Post-it apagado',
  UPDATE_RECORDING_BLOCK: 'Bloco salvo',
  UPDATE_BLOCK_CONTENTS: 'Roteiro adicionado ao bloco',
  ADD_RECORDING_BLOCK: 'Bloco criado',
  ADD_PLATFORM: 'Plataforma salva',
  UPDATE_PLATFORM: 'Plataforma salva',
  DELETE_PLATFORM: 'Plataforma removida',
};

export type PersistOptions = { silent?: boolean; skipBroadcast?: boolean };

export type RefreshFromServerOptions = {
  silent?: boolean;
  force?: boolean;
  domains?: db.AppDataDomain[];
  namespaces?: string[];
};

const MIN_SERVER_REFRESH_INTERVAL_MS = 30_000;

/** Domínios cujos dados são esvaziados quando o cache local de uma versão antiga é descartado. */
const DISCARDED_CACHE_DOMAINS: readonly db.AppDataDomain[] = [
  'content',
  'content-schedule',
  'content-summary',
  'ideas',
  'production',
];

export const AppContext = React.createContext<{
  state: AppState;
  dispatch: (action: AppAction, options?: PersistOptions) => Promise<void>;
  createContent: (content: db.Content, options?: PersistOptions) => Promise<void>;
  updateContent: (content: db.Content, options?: PersistOptions) => Promise<void>;
  syncFromServer: (options?: RefreshFromServerOptions) => Promise<void>;
  ensureDataDomains: (domains: readonly db.AppDataDomain[], options?: { force?: boolean }) => Promise<void>;
  invalidateListCaches: (namespaces?: string[]) => void;
  /** Espelho do carregamento por domínio, para as telas não lerem lista vazia como dado real. */
  domainStatus: DomainStatusMap;
  /** Verdadeiro quando o domínio (ou um apelido que o cobre) já tem dados na tela. */
  isDomainReady: (domain: db.AppDataDomain) => boolean;
} | null>(null);

function normalizeContentId(content: db.Content): db.Content {
  if (isUUID(content.id)) return content;
  return { ...content, id: generateUUID() };
}

function normalizeAction(action: AppAction): AppAction {
  switch (action.type) {
    case 'ADD_CONTENT':
    case 'UPDATE_CONTENT':
      return {
        ...action,
        payload: normalizeContentId(action.payload),
      };
    case 'ADD_IDEA':
    case 'UPDATE_IDEA':
      return {
        ...action,
        payload: {
          ...action.payload,
          canonicalContentId:
            action.payload.canonicalContentId
            ?? (isUUID(action.payload.id) ? action.payload.id : generateUUID()),
        },
      };
    case 'PROMOTE_IDEA': {
      const normalizedContent = normalizeContentId(action.payload.content);
      return {
        ...action,
        payload: {
          ...action.payload,
          contentId: normalizedContent.id,
          content: normalizedContent,
        },
      };
    }
    default:
      return action;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const stateRef = useRef(state);
  const loadDone = useRef(false);
  const loadedDomains = useRef(new Set<db.AppDataDomain>());
  /** Uma promise por domínio em voo: pedidos que se sobrepõem aguardam a mesma busca. */
  const inFlightDomains = useRef(new Map<db.AppDataDomain, Promise<void>>());
  const [domainStatus, setDomainStatus] = useState<DomainStatusMap>({});
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const realtimeRefreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRealtimeDomains = useRef(new Set<db.AppDataDomain>());
  const pendingRealtimeNamespaces = useRef(new Set<string>());
  const lastServerRefreshAt = useRef(0);
  const lastLocalMutationAt = useRef<number | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const pendingPersistCount = useRef(0);

  stateRef.current = state;

  useEffect(() => {
    if (userId) lastUserIdRef.current = userId;
  }, [userId]);

  const updateDomainStatus = useCallback((
    domains: readonly db.AppDataDomain[],
    status: DomainLoadStatus,
  ) => {
    if (domains.length === 0) return;
    setDomainStatus(previous => applyDomainStatus(previous, domains, status));
  }, []);

  const resetDomainStatus = useCallback(() => {
    setDomainStatus(previous => (Object.keys(previous).length === 0 ? previous : {}));
  }, []);

  const touchLocalMutation = useCallback(() => {
    lastLocalMutationAt.current = Date.now();
  }, []);

  const runPersist = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    pendingPersistCount.current += 1;
    touchLocalMutation();
    try {
      return await fn();
    } finally {
      pendingPersistCount.current = Math.max(0, pendingPersistCount.current - 1);
      touchLocalMutation();
    }
  }, [touchLocalMutation]);

  const invalidateListCaches = useCallback((namespaces?: string[]) => {
    if (!namespaces) {
      dataCache.invalidatePages();
    } else {
      namespaces.forEach(namespace => dataCache.invalidatePages(namespace));
    }
    dataCache.invalidateValue('stats:');
  }, []);

  const finishPersist = useCallback((actionType: AppAction['type'], options?: PersistOptions) => {
    if (!options?.silent) {
      const label = ACTION_SAVE_LABELS[actionType] ?? 'Alterações salvas';
      notifySaveFeedback({ status: 'success', message: label });
    }
    if (!options?.skipBroadcast) {
      broadcastDataSync();
    }

    if (
      actionType.includes('CONTENT')
      || actionType.includes('BOOK')
      || actionType.includes('BIBLIOTECA')
      || actionType.includes('ANOTACAO')
      || actionType.includes('ANNOTATION')
      || actionType.includes('IDEA')
    ) {
      invalidateListCaches(['contents', 'library']);
    }

    // A primeira página guardada da Biblioteca ficou velha: a próxima abertura busca de novo.
    if (userId && (actionType.includes('BOOK') || actionType.includes('BIBLIOTECA'))) {
      clearPersistedPagesForUser(userId);
    }

    if (
      userId
      && (actionType === 'ADD_PLATFORM' || actionType === 'UPDATE_PLATFORM' || actionType === 'DELETE_PLATFORM')
    ) {
      patchPlatformsInDomainCaches(userId, stateRef.current.platforms);
    }

    if (
      userId
      && (
        actionType === 'ADD_CONTENT'
        || actionType === 'UPDATE_CONTENT'
        || actionType === 'DELETE_CONTENT'
        || actionType === 'DELETE_MULTIPLE_CONTENTS'
        || actionType === 'ADD_IDEA'
        || actionType === 'UPDATE_IDEA'
        || actionType === 'DELETE_IDEA'
        || actionType === 'PROMOTE_IDEA'
        || actionType === 'DEMOTE_CONTENTS_TO_IDEAS'
        || actionType === 'SET_CONTENT_STATUS'
        || actionType === 'ARCHIVE_CONTENTS'
        || actionType === 'RESTORE_CONTENTS'
      )
    ) {
      patchContentsInDomainCaches(userId, stateRef.current.contents);
    }

    if (
      userId
      && (actionType === 'ADD_SERIE' || actionType === 'UPDATE_SERIE' || actionType === 'DELETE_SERIE')
    ) {
      patchSeriesInDomainCaches(userId, stateRef.current.series);
    }

    if (userId && actionType === 'ADD_TEMA') {
      patchTemasInDomainCaches(userId, stateRef.current.temas);
    }
  }, [invalidateListCaches, userId]);

  const mergeSnapshot = useCallback(
    () => ({
      platforms: stateRef.current.platforms,
      contents: stateRef.current.contents,
    }),
    [],
  );

  const loadDomains = useCallback(async (
    domains: readonly db.AppDataDomain[],
    options?: { force?: boolean; markLoaded?: boolean }
  ) => {
    if (!supabase || !userId) return;
    const missingDomains = options?.force
      ? [...domains]
      : domains.filter(domain => !isDomainAlreadyLoaded(loadedDomains.current, domain));
    if (missingDomains.length === 0) return;

    // Domínios já em voo em outro pedido não vão ao servidor de novo: aguardamos a busca existente.
    const { toFetch, pending } = subtractInFlightDomains(missingDomains, inFlightDomains.current);
    if (toFetch.length === 0) {
      await Promise.all(pending);
      return;
    }

    const cacheKey = buildDomainCacheKey(toFetch);

    if (!options?.force) {
      const memoryCached = dataCache.getDomain<Partial<db.AppData>>(cacheKey);
      const persisted = readPersistedDomain(userId, cacheKey);
      const cachedPayload = memoryCached ?? persisted?.payload ?? null;
      const isFresh =
        (memoryCached != null && dataCache.isDomainFresh(cacheKey)) ||
        (persisted != null && isPersistedDomainFresh(persisted));
      const cacheSatisfiesRequest = cachedPayload
        ? canDomainPayloadSatisfyRequest(toFetch, cachedPayload)
        : false;

      if (cachedPayload && pendingPersistCount.current === 0) {
        dispatch({
          type: 'SET_DATA',
          payload: mergeFetchedAppData(mergeSnapshot(), cachedPayload),
        });
        // Cache na tela conta como pronto, mesmo vencido: a revalidação segue por trás.
        if (cacheSatisfiesRequest) updateDomainStatus(toFetch, 'ready');
      }

      if (cachedPayload && isFresh && cacheSatisfiesRequest) {
        markDomainsLoaded(loadedDomains.current, toFetch);
        updateDomainStatus(toFetch, 'ready');
        await Promise.all(pending);
        return;
      }
    } else {
      dataCache.invalidateDomain(cacheKey);
    }

    updateDomainStatus(toFetch, 'loading');

    const loadPromise: Promise<void> = fetchDataDomains(toFetch, userId)
      .then(data => {
        const merged = mergeFetchedAppData(mergeSnapshot(), data);
        if (
          pendingPersistCount.current === 0
          && Array.isArray(data.contents)
          && data.contents.length === 0
        ) {
          merged.contents = [];
        }
        dataCache.setDomain(cacheKey, merged);
        writePersistedDomain(userId, cacheKey, merged);
        dispatch({ type: 'SET_DATA', payload: merged });
        updateDomainStatus(toFetch, 'ready');
        if (options?.markLoaded !== false) {
          markDomainsLoaded(loadedDomains.current, toFetch);
        }
      })
      .catch(err => {
        updateDomainStatus(toFetch, 'error');
        throw err;
      })
      .finally(() => {
        toFetch.forEach(domain => {
          if (inFlightDomains.current.get(domain) === loadPromise) {
            inFlightDomains.current.delete(domain);
          }
        });
      });

    toFetch.forEach(domain => inFlightDomains.current.set(domain, loadPromise));
    await Promise.all([loadPromise, ...pending]);
  }, [mergeSnapshot, updateDomainStatus, userId]);

  const refreshFromServer = useCallback(async (options?: RefreshFromServerOptions) => {
    if (!supabase || !userId) return;
    if (pendingPersistCount.current > 0) return;

    if (
      !options?.force
      && lastServerRefreshAt.current > 0
      && Date.now() - lastServerRefreshAt.current < MIN_SERVER_REFRESH_INTERVAL_MS
    ) {
      return;
    }

    try {
      let domains: db.AppDataDomain[];
      if (options?.domains?.length) {
        domains = options.force
          ? options.domains
          : options.domains.filter(domain => isDomainAlreadyLoaded(loadedDomains.current, domain));
        if (domains.length === 0) return;
      } else {
        domains = loadedDomains.current.size > 0
          ? [...loadedDomains.current]
          : BOOTSTRAP_DATA_DOMAINS;
      }

      if (options?.namespaces !== undefined) {
        invalidateListCaches(options.namespaces);
      } else {
        invalidateListCaches();
      }

      await loadDomains(domains, { force: true });
      dispatch({ type: 'SET_LOADED', payload: true });
      loadDone.current = true;
      lastServerRefreshAt.current = Date.now();
    } catch (err) {
      console.error('[Sync] Realtime refresh failed:', err);
      if (!options?.silent) {
        notifySaveFeedback({
          status: 'error',
          message: ERRORS.sincronizar,
          detail: getErrorMessage(err),
        });
      }
    }
  }, [invalidateListCaches, loadDomains, userId]);

  useEffect(() => {
    if (!supabase) {
      dispatch({ type: 'SET_LOADED', payload: true });
      loadDone.current = true;
      return;
    }

    // Auth ainda resolvendo — não marcar como carregado com dados vazios.
    if (authLoading) return;

    if (!userId) {
      if (lastUserIdRef.current) {
        clearPersistedDomainsForUser(lastUserIdRef.current);
        lastUserIdRef.current = null;
      }
      dispatch({ type: 'SET_DATA', payload: {} });
      loadedDomains.current.clear();
      inFlightDomains.current.clear();
      resetDomainStatus();
      dataCache.invalidateAll();
      dispatch({ type: 'SET_LOADED', payload: true });
      loadDone.current = true;
      return;
    }

    let cancelled = false;

    if (discardObsoleteDomainCache()) {
      dataCache.invalidateAll();
      loadedDomains.current.clear();
      dispatch({
        type: 'SET_DATA',
        payload: { contents: [], ideas: [], series: [], pilares: [] },
      });
      // Só os domínios esvaziados acima voltam a carregar; o bootstrap logo abaixo busca todos eles.
      setDomainStatus(previous => clearDomainStatus(previous, DISCARDED_CACHE_DOMAINS));
    }

    const criticalCacheKey = buildDomainCacheKey(CRITICAL_BOOTSTRAP_DOMAINS);
    const legacyBootstrapKey = buildDomainCacheKey(BOOTSTRAP_DATA_DOMAINS);
    const persisted =
      readPersistedDomain(userId, criticalCacheKey)
      ?? readPersistedDomain(userId, legacyBootstrapKey);

    if (persisted?.payload) {
      dispatch({
        type: 'SET_DATA',
        payload: mergeFetchedAppData(mergeSnapshot(), persisted.payload),
      });
      dispatch({ type: 'SET_LOADED', payload: true });
      loadDone.current = true;
      // Cache fresco já tem o essencial. Cache vencido pinta na hora, mas não marca
      // o domínio como carregado — senão a revalidação nunca busca a capa e o resto.
      // Nos dois casos a tela já mostra os dados, então o status fica pronto.
      if (canDomainPayloadSatisfyRequest(CRITICAL_BOOTSTRAP_DOMAINS, persisted.payload)) {
        updateDomainStatus(CRITICAL_BOOTSTRAP_DOMAINS, 'ready');
      }
      if (persisted.payload.contents && isPersistedDomainFresh(persisted)) {
        markDomainsLoaded(loadedDomains.current, CRITICAL_BOOTSTRAP_DOMAINS);
      }
    } else {
      loadDone.current = false;
      dispatch({ type: 'SET_LOADED', payload: false });
    }

    async function load() {
      try {
        // Primeira pintura: plataformas + pilares/séries + lista leve de conteúdos.
        await loadDomains(CRITICAL_BOOTSTRAP_DOMAINS);
        if (cancelled) return;
        dispatch({ type: 'SET_LOADED', payload: true });
        loadDone.current = true;

        // Resto do bootstrap não bloqueia o shell.
        void loadDomains(DEFERRED_BOOTSTRAP_DOMAINS).catch(err => {
          console.error('[DB] deferred bootstrap failed:', err);
        });
      } catch (err) {
        console.error('[DB] initial data fetch failed:', err);
        if (!cancelled) {
          dispatch({ type: 'SET_LOADED', payload: true });
          loadDone.current = true;
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, loadDomains, mergeSnapshot, resetDomainStatus, updateDomainStatus, userId]);

  useEffect(() => {
    if (!supabase || !userId) return;

    const scheduleRefresh = (table: string) => {
      getDomainsForRealtimeTable(table).forEach(domain => {
        pendingRealtimeDomains.current.add(domain);
      });
      getListNamespacesForRealtimeTable(table).forEach(namespace => {
        pendingRealtimeNamespaces.current.add(namespace);
      });

      if (realtimeRefreshTimeout.current) {
        clearTimeout(realtimeRefreshTimeout.current);
      }

      realtimeRefreshTimeout.current = setTimeout(() => {
        const tableDomains = [...pendingRealtimeDomains.current];
        pendingRealtimeDomains.current.clear();
        const tableNamespaces = [...pendingRealtimeNamespaces.current];
        pendingRealtimeNamespaces.current.clear();

        const domains = tableDomains.filter(domain =>
          isDomainAlreadyLoaded(loadedDomains.current, domain)
        );
        if (domains.length === 0) return;

        void refreshFromServer({
          silent: true,
          domains,
          namespaces: tableNamespaces,
        });
      }, 120);
    };

    const handleTableChange = (table: string) => {
      if (
        shouldSkipRealtimeRefresh(
          lastLocalMutationAt.current,
          Date.now(),
          pendingPersistCount.current
        )
      ) {
        return;
      }
      scheduleRefresh(table);
    };

    let channel = supabase.channel(`content-os-realtime:${userId}`);

    for (const table of REALTIME_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => handleTableChange(table)
      );
    }

    channel.subscribe(status => {
      if (import.meta.env.DEV) {
        console.log('[Realtime] Channel status:', status);
      }
    });

    return () => {
      if (realtimeRefreshTimeout.current) {
        clearTimeout(realtimeRefreshTimeout.current);
        realtimeRefreshTimeout.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [refreshFromServer, userId]);

  useEffect(() => {
    return subscribeDataSync(() => {
      void refreshFromServer({ silent: true });
    });
  }, [refreshFromServer]);

  useEffect(() => {
    if (!userId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (pendingPersistCount.current > 0) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void refreshFromServer({ silent: true });
      }, 400);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [refreshFromServer, userId]);

  const createContent = useCallback(async (content: db.Content, options?: PersistOptions) => {
    const normalizedContent = normalizeContentId(content);

    if (!userId || !supabase) {
      // Modo local: mantém o estado em memória mesmo sem backend disponível.
      dispatch({ type: 'ADD_CONTENT', payload: normalizedContent });
      finishPersist('ADD_CONTENT', options);
      return;
    }

    if (!options?.silent) {
      notifySaveFeedback({ status: 'saving', message: LOADING.criandoRoteiro });
    }

    try {
      dispatch({ type: 'ADD_CONTENT', payload: normalizedContent });
      await runPersist(() => persistContentRecord(normalizedContent, userId));
      finishPersist('ADD_CONTENT', options);
    } catch (err) {
      console.error('[AppContext] createContent failed:', err);
      notifySaveFeedback({
        status: 'error',
        message: ERRORS.criarRoteiro,
        detail: getErrorMessage(err),
      });
      await refreshFromServer({ silent: true, force: true });
      throw err;
    }
  }, [finishPersist, refreshFromServer, runPersist, userId]);

  const updateContent = useCallback(async (content: db.Content, options?: PersistOptions) => {
    const normalizedContent = normalizeContentId(content);

    if (!userId || !supabase) {
      // Modo local: mantém o estado em memória mesmo sem backend disponível.
      dispatch({ type: 'UPDATE_CONTENT', payload: normalizedContent });
      finishPersist('UPDATE_CONTENT', options);
      return;
    }

    if (!options?.silent) {
      notifySaveFeedback({ status: 'saving', message: LOADING.salvandoRoteiro });
    }

    try {
      dispatch({ type: 'UPDATE_CONTENT', payload: normalizedContent });
      await runPersist(() => persistContentRecord(normalizedContent, userId));
      finishPersist('UPDATE_CONTENT', options);
    } catch (err) {
      console.error('[AppContext] updateContent failed:', err);
      notifySaveFeedback({
        status: 'error',
        message: ERRORS.salvarRoteiro,
        detail: getErrorMessage(err),
      });
      await refreshFromServer({ silent: true, force: true });
      throw err;
    }
  }, [finishPersist, refreshFromServer, runPersist, userId]);

  const enhancedDispatch = useCallback(async (action: AppAction, options?: PersistOptions) => {
    const normalizedAction = normalizeAction(action);

    if (normalizedAction.type === 'ADD_CONTENT') {
      await createContent(normalizedAction.payload, options);
      return;
    }

    if (normalizedAction.type === 'UPDATE_CONTENT') {
      await updateContent(normalizedAction.payload, options);
      return;
    }

    const shouldPersist = !['SET_DATA', 'SET_LOADED', 'SET_THEME', 'LOG_ENERGY'].includes(
      normalizedAction.type
    );

    // Snapshot before optimistic dispatch so we can restore on double-failure.
    const snapshot = shouldPersist && userId ? stateRef.current : null;

    dispatch(normalizedAction);

    if (!userId || !shouldPersist) return;

    if (!options?.silent) {
      notifySaveFeedback({ status: 'saving', message: LOADING.salvandoAlteracoes });
    }

    try {
      await runPersist(() =>
        persistAction({ action: normalizedAction, userId, state: stateRef.current })
      );
      finishPersist(normalizedAction.type, options);
    } catch (err) {
      console.error('[Sync] Error persisting action:', normalizedAction.type, err);
      notifySaveFeedback({
        status: 'error',
        message: ERRORS.salvarGenerico,
        detail: getErrorMessage(err),
      });
      try {
        await refreshFromServer({ silent: true, force: true });
      } catch (refreshErr) {
        // Server refresh also failed: restore from pre-dispatch snapshot.
        console.error('[Sync] Server refresh also failed, restoring from snapshot:', refreshErr);
        if (snapshot) {
          dispatch({ type: 'SET_DATA', payload: snapshot });
        }
      }
      throw err;
    }
  }, [createContent, finishPersist, refreshFromServer, runPersist, updateContent, userId]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Sem backend ou sem sessão não há nada para buscar: as telas não devem esperar.
  const hasRemoteData = Boolean(supabase) && (authLoading || Boolean(userId));
  const isDomainReady = useCallback(
    (domain: db.AppDataDomain) => !hasRemoteData || resolveDomainStatus(domainStatus, domain) === 'ready',
    [domainStatus, hasRemoteData],
  );

  const contextValue = React.useMemo(() => ({
    state,
    dispatch: enhancedDispatch,
    createContent,
    updateContent,
    syncFromServer: refreshFromServer,
    ensureDataDomains: loadDomains,
    invalidateListCaches,
    domainStatus,
    isDomainReady,
  }), [state, enhancedDispatch, createContent, updateContent, refreshFromServer, loadDomains, invalidateListCaches, domainStatus, isDomainReady]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
