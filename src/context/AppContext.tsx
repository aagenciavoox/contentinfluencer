import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import type { AppState } from '../app/providers/appState';
import { initialState } from '../app/providers/appState';
import { supabase } from '../lib/supabase';
import type * as db from '../lib/database';
import { appReducer, AppAction } from './reducer';
import { persistAction, persistContentRecord } from './persistAction';
import { REALTIME_TABLES, shouldSkipRealtimeRefresh } from './realtimeSync';
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
  isPersistedDomainFresh,
  readPersistedDomain,
  writePersistedDomain,
} from '../lib/persistentDataCache';
import { mergeFetchedAppData, patchContentsInDomainCaches, patchPlatformsInDomainCaches } from '../lib/domainCacheSync';
import { BOOTSTRAP_DATA_DOMAINS } from '../lib/database';

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

export const AppContext = React.createContext<{
  state: AppState;
  dispatch: (action: AppAction, options?: PersistOptions) => Promise<void>;
  createContent: (content: db.Content, options?: PersistOptions) => Promise<void>;
  updateContent: (content: db.Content, options?: PersistOptions) => Promise<void>;
  syncFromServer: (options?: RefreshFromServerOptions) => Promise<void>;
  ensureDataDomains: (domains: readonly db.AppDataDomain[], options?: { force?: boolean }) => Promise<void>;
  invalidateListCaches: (namespaces?: string[]) => void;
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
  const loadingDomains = useRef(new Map<string, Promise<void>>());
  const { user, loading: authLoading } = useAuth();
  const realtimeRefreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRealtimeDomains = useRef(new Set<db.AppDataDomain>());
  const pendingRealtimeNamespaces = useRef(new Set<string>());
  const lastServerRefreshAt = useRef(0);
  const lastLocalMutationAt = useRef<number | null>(null);
  const lastUserIdRef = useRef<string | null>(null);
  const pendingPersistCount = useRef(0);

  stateRef.current = state;

  useEffect(() => {
    if (user?.id) lastUserIdRef.current = user.id;
  }, [user?.id]);

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
      const label = ACTION_SAVE_LABELS[actionType] ?? 'Alteracoes salvas';
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

    if (
      user
      && (actionType === 'ADD_PLATFORM' || actionType === 'UPDATE_PLATFORM' || actionType === 'DELETE_PLATFORM')
    ) {
      patchPlatformsInDomainCaches(user.id, stateRef.current.platforms);
    }

    if (
      user
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
      patchContentsInDomainCaches(user.id, stateRef.current.contents);
    }
  }, [invalidateListCaches, user]);

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
    if (!supabase || !user) return;
    const missingDomains = options?.force
      ? [...domains]
      : domains.filter(domain => !loadedDomains.current.has(domain));
    if (missingDomains.length === 0) return;

    const key = [...missingDomains].sort().join('|');
    const existing = loadingDomains.current.get(key);
    if (existing) return existing;

    const cacheKey = buildDomainCacheKey(missingDomains);

    if (!options?.force) {
      const memoryCached = dataCache.getDomain<Partial<db.AppData>>(cacheKey);
      const persisted = readPersistedDomain(user.id, cacheKey);
      const cachedPayload = memoryCached ?? persisted?.payload ?? null;
      const isFresh =
        (memoryCached != null && dataCache.isDomainFresh(cacheKey)) ||
        (persisted != null && isPersistedDomainFresh(persisted));
      const cacheSatisfiesRequest = cachedPayload
        ? canDomainPayloadSatisfyRequest(missingDomains, cachedPayload)
        : false;

      if (cachedPayload && pendingPersistCount.current === 0) {
        dispatch({
          type: 'SET_DATA',
          payload: mergeFetchedAppData(mergeSnapshot(), cachedPayload),
        });
      }

      if (cachedPayload && isFresh && cacheSatisfiesRequest) {
        missingDomains.forEach(domain => loadedDomains.current.add(domain));
        return;
      }
    } else {
      dataCache.invalidateDomain(cacheKey);
    }

    const loadPromise = import('../lib/database')
      .then(module => module.fetchDataDomains(missingDomains, user.id))
      .then(data => {
        const merged = mergeFetchedAppData(mergeSnapshot(), data);
        dataCache.setDomain(cacheKey, merged);
        writePersistedDomain(user.id, cacheKey, merged);
        dispatch({ type: 'SET_DATA', payload: merged });
        if (options?.markLoaded !== false) {
          missingDomains.forEach(domain => loadedDomains.current.add(domain));
        }
      })
      .finally(() => {
        loadingDomains.current.delete(key);
      });

    loadingDomains.current.set(key, loadPromise);
    return loadPromise;
  }, [mergeSnapshot, user]);

  const refreshFromServer = useCallback(async (options?: RefreshFromServerOptions) => {
    if (!supabase || !user) return;
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
          : options.domains.filter(domain => loadedDomains.current.has(domain));
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
  }, [invalidateListCaches, loadDomains, user]);

  useEffect(() => {
    if (!supabase) {
      dispatch({ type: 'SET_LOADED', payload: true });
      loadDone.current = true;
      return;
    }

    // Auth ainda resolvendo — não marcar como carregado com dados vazios.
    if (authLoading) return;

    if (!user) {
      if (lastUserIdRef.current) {
        clearPersistedDomainsForUser(lastUserIdRef.current);
        lastUserIdRef.current = null;
      }
      dispatch({ type: 'SET_DATA', payload: {} });
      loadedDomains.current.clear();
      loadingDomains.current.clear();
      dataCache.invalidateAll();
      dispatch({ type: 'SET_LOADED', payload: true });
      loadDone.current = true;
      return;
    }

    let cancelled = false;

    const cacheKey = buildDomainCacheKey(BOOTSTRAP_DATA_DOMAINS);
    const persisted = readPersistedDomain(user.id, cacheKey);
    if (persisted?.payload) {
      dispatch({
        type: 'SET_DATA',
        payload: mergeFetchedAppData(mergeSnapshot(), persisted.payload),
      });
      dispatch({ type: 'SET_LOADED', payload: true });
      loadDone.current = true;
    } else {
      loadDone.current = false;
      dispatch({ type: 'SET_LOADED', payload: false });
    }

    async function load() {
      try {
        await loadDomains(BOOTSTRAP_DATA_DOMAINS);
      } catch (err) {
        console.error('[DB] initial data fetch failed:', err);
      } finally {
        if (cancelled) return;
        dispatch({ type: 'SET_LOADED', payload: true });
        loadDone.current = true;
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, loadDomains, mergeSnapshot, user]);

  useEffect(() => {
    if (!supabase || !user) return;

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

        const domains = tableDomains.filter(domain => loadedDomains.current.has(domain));
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

    let channel = supabase.channel(`content-os-realtime:${user.id}`);

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
  }, [refreshFromServer, user]);

  useEffect(() => {
    return subscribeDataSync(() => {
      void refreshFromServer({ silent: true });
    });
  }, [refreshFromServer]);

  useEffect(() => {
    if (!user) return;

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
  }, [refreshFromServer, user]);

  const createContent = useCallback(async (content: db.Content, options?: PersistOptions) => {
    const normalizedContent = normalizeContentId(content);

    if (!user || !supabase) {
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
      await runPersist(() => persistContentRecord(normalizedContent, user.id));
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
  }, [finishPersist, refreshFromServer, runPersist, user]);

  const updateContent = useCallback(async (content: db.Content, options?: PersistOptions) => {
    const normalizedContent = normalizeContentId(content);

    if (!user || !supabase) {
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
      await runPersist(() => persistContentRecord(normalizedContent, user.id));
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
  }, [finishPersist, refreshFromServer, runPersist, user]);

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
    const snapshot = shouldPersist && user ? stateRef.current : null;

    dispatch(normalizedAction);

    if (!user || !shouldPersist) return;

    if (!options?.silent) {
      notifySaveFeedback({ status: 'saving', message: LOADING.salvandoAlteracoes });
    }

    try {
      await runPersist(() =>
        persistAction({ action: normalizedAction, userId: user.id, state: stateRef.current })
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
  }, [createContent, finishPersist, refreshFromServer, runPersist, updateContent, user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  const contextValue = React.useMemo(() => ({
    state,
    dispatch: enhancedDispatch,
    createContent,
    updateContent,
    syncFromServer: refreshFromServer,
    ensureDataDomains: loadDomains,
    invalidateListCaches,
  }), [state, enhancedDispatch, createContent, updateContent, refreshFromServer, loadDomains, invalidateListCaches]);

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
