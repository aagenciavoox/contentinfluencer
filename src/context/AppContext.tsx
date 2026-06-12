import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import type { AppState } from '../app/providers/appState';
import { initialState } from '../app/providers/appState';
import { supabase } from '../lib/supabase';
import type * as db from '../lib/database';
import { appReducer, AppAction } from './reducer';
import { persistAction, persistContentRecord } from './persistAction';
import { REALTIME_TABLES, shouldSkipRealtimeRefresh } from './realtimeSync';
import { useAuth } from './AuthContext';
import { broadcastDataSync, subscribeDataSync } from '../lib/syncBroadcast';
import { getErrorMessage, notifySaveFeedback } from '../lib/saveFeedback';
import { generateUUID, isUUID } from '../utils/uuid';

const ACTION_SAVE_LABELS: Partial<Record<AppAction['type'], string>> = {
  UPDATE_CONTENT: 'Conteúdo salvo',
  ADD_CONTENT: 'Conteúdo criado',
  UPDATE_IDEA: 'Ideia salva',
  ADD_IDEA: 'Ideia criada',
  UPDATE_AGENDA_ITEM: 'Agenda salva',
  ADD_AGENDA_ITEM: 'Agenda salva',
  UPDATE_RECORDING_BLOCK: 'Bloco salvo',
  ADD_RECORDING_BLOCK: 'Bloco criado',
};

export type PersistOptions = { silent?: boolean; skipBroadcast?: boolean };

export const AppContext = React.createContext<{
  state: AppState;
  dispatch: (action: AppAction, options?: PersistOptions) => Promise<void>;
  createContent: (content: db.Content, options?: PersistOptions) => Promise<void>;
  updateContent: (content: db.Content, options?: PersistOptions) => Promise<void>;
  syncFromServer: (options?: { silent?: boolean }) => Promise<void>;
  ensureDataDomains: (domains: readonly db.AppDataDomain[]) => Promise<void>;
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
  const { user } = useAuth();
  const realtimeRefreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLocalMutationAt = useRef<number | null>(null);
  const pendingPersistCount = useRef(0);

  stateRef.current = state;

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

  const finishPersist = useCallback((actionType: AppAction['type'], options?: PersistOptions) => {
    if (!options?.silent) {
      const label = ACTION_SAVE_LABELS[actionType] ?? 'Alteracoes salvas';
      notifySaveFeedback({ status: 'success', message: label });
    }
    if (!options?.skipBroadcast) {
      broadcastDataSync();
    }
  }, []);

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

    const loadPromise = import('../lib/database')
      .then(module => module.fetchDataDomains(missingDomains))
      .then(data => {
        dispatch({ type: 'SET_DATA', payload: data });
        if (options?.markLoaded !== false) {
          missingDomains.forEach(domain => loadedDomains.current.add(domain));
        }
      })
      .finally(() => {
        loadingDomains.current.delete(key);
      });

    loadingDomains.current.set(key, loadPromise);
    return loadPromise;
  }, [user]);

  const refreshFromServer = useCallback(async (options?: { silent?: boolean }) => {
    if (!supabase || !user) return;
    if (pendingPersistCount.current > 0) return;

    try {
      const domains = loadedDomains.current.size > 0
        ? [...loadedDomains.current]
        : (await import('../lib/database')).BOOTSTRAP_DATA_DOMAINS;
      await loadDomains(domains, { force: true });
      dispatch({ type: 'SET_LOADED' });
      loadDone.current = true;
    } catch (err) {
      console.error('[Sync] Realtime refresh failed:', err);
      if (!options?.silent) {
        notifySaveFeedback({
          status: 'error',
          message: 'Falha ao sincronizar',
          detail: getErrorMessage(err),
        });
      }
    }
  }, [loadDomains, user]);

  useEffect(() => {
    if (!supabase) {
      dispatch({ type: 'SET_LOADED' });
      loadDone.current = true;
      return;
    }

    if (!user) {
      dispatch({ type: 'SET_DATA', payload: {} });
      loadedDomains.current.clear();
      loadingDomains.current.clear();
      dispatch({ type: 'SET_LOADED' });
      loadDone.current = true;
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const { BOOTSTRAP_DATA_DOMAINS } = await import('../lib/database');
        await loadDomains(BOOTSTRAP_DATA_DOMAINS);
      } catch (err) {
        console.error('[DB] initial data fetch failed:', err);
      } finally {
        if (cancelled) return;
        dispatch({ type: 'SET_LOADED' });
        loadDone.current = true;
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadDomains, user]);

  useEffect(() => {
    if (!supabase || !user) return;

    const relevantTables = new Set<string>(REALTIME_TABLES);

    const scheduleRefresh = () => {
      if (realtimeRefreshTimeout.current) {
        clearTimeout(realtimeRefreshTimeout.current);
      }

      realtimeRefreshTimeout.current = setTimeout(() => {
        void refreshFromServer({ silent: true });
      }, 120);
    };

    const channel = supabase
      .channel(`content-os-realtime:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
        if (!payload.table || !relevantTables.has(payload.table)) return;
        if (
          shouldSkipRealtimeRefresh(
            lastLocalMutationAt.current,
            Date.now(),
            pendingPersistCount.current
          )
        ) {
          return;
        }
        scheduleRefresh();
      })
      .subscribe(status => {
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
      notifySaveFeedback({ status: 'saving', message: 'Criando conteudo...' });
    }

    try {
      dispatch({ type: 'ADD_CONTENT', payload: normalizedContent });
      await runPersist(() => persistContentRecord(normalizedContent, user.id));
      finishPersist('ADD_CONTENT', options);
    } catch (err) {
      console.error('[AppContext] createContent failed:', err);
      notifySaveFeedback({
        status: 'error',
        message: 'Falha ao criar conteudo',
        detail: getErrorMessage(err),
      });
      await refreshFromServer({ silent: true });
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
      notifySaveFeedback({ status: 'saving', message: 'Salvando conteudo...' });
    }

    try {
      dispatch({ type: 'UPDATE_CONTENT', payload: normalizedContent });
      await runPersist(() => persistContentRecord(normalizedContent, user.id));
      finishPersist('UPDATE_CONTENT', options);
    } catch (err) {
      console.error('[AppContext] updateContent failed:', err);
      notifySaveFeedback({
        status: 'error',
        message: 'Falha ao salvar conteudo',
        detail: getErrorMessage(err),
      });
      await refreshFromServer({ silent: true });
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

    dispatch(normalizedAction);

    if (!user) return;

    const shouldPersist = !['SET_DATA', 'SET_LOADED', 'SET_THEME', 'LOG_ENERGY', 'DELETE_MULTIPLE_CONTENTS'].includes(
      normalizedAction.type
    );

    if (!shouldPersist) return;

    if (!options?.silent) {
      notifySaveFeedback({ status: 'saving', message: 'Salvando...' });
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
        message: 'Falha ao salvar',
        detail: getErrorMessage(err),
      });
      await refreshFromServer({ silent: true });
      throw err;
    }
  }, [createContent, finishPersist, refreshFromServer, runPersist, updateContent, user]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  const contextValue = React.useMemo(() => ({
    state: {
      ...state,
      books: state.bibliotecaItems,
      partnerships: state.projetos,
      results: state.contentMetrics,
      agenda: state.agendaItems,
    },
    dispatch: enhancedDispatch,
    createContent,
    updateContent,
    syncFromServer: refreshFromServer,
    ensureDataDomains: loadDomains,
  }), [state, enhancedDispatch, createContent, updateContent, refreshFromServer, loadDomains]);

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
