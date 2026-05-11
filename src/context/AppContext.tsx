import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import type { AppState } from '../app/providers/appState';
import { initialState } from '../app/providers/appState';
import { supabase } from '../lib/supabase';
import type * as db from '../lib/database';
import { appReducer, AppAction } from './reducer';
import { persistAction, persistContentRecord } from './persistAction';
import { shouldSkipRealtimeRefresh } from './realtimeSync';
import { useAuth } from './AuthContext';
import { generateUUID, isUUID } from '../utils/uuid';

export const AppContext = React.createContext<{
  state: AppState;
  dispatch: (action: AppAction) => Promise<void>;
  createContent: (content: db.Content) => Promise<void>;
  updateContent: (content: db.Content) => Promise<void>;
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
  const loadDone = useRef(false);
  const { user } = useAuth();
  const realtimeRefreshTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLocalMutationAt = useRef<number | null>(null);

  const refreshFromServer = useCallback(async () => {
    if (!supabase || !user) return;

    try {
      const data = await import('../lib/database').then(module => module.fetchAllData());
      dispatch({ type: 'SET_DATA', payload: data });
      dispatch({ type: 'SET_LOADED' });
      loadDone.current = true;
    } catch (err) {
      console.error('[Sync] Realtime refresh failed:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!supabase) {
      dispatch({ type: 'SET_LOADED' });
      loadDone.current = true;
      return;
    }

    let done = false;

    async function load() {
      if (done) return;
      done = true;
      try {
        const data = await import('../lib/database').then(module => module.fetchAllData());
        dispatch({ type: 'SET_DATA', payload: data });
      } catch (err) {
        console.error('[DB] fetchAllData failed:', err);
      } finally {
        dispatch({ type: 'SET_LOADED' });
        loadDone.current = true;
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED'].includes(event)) {
        void load();
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        dispatch({ type: 'SET_DATA', payload: {} });
        dispatch({ type: 'SET_LOADED' });
        loadDone.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;

    const relevantTables = new Set([
      'agenda_items',
      'anotacoes',
      'biblioteca_generos',
      'biblioteca_items',
      'content_metrics',
      'content_plataformas',
      'contents',
      'dna_voz',
      'golden_rules',
      'ideas',
      'item_generos',
      'pilar_plataformas',
      'pilares',
      'platforms',
      'projeto_conteudos',
      'projeto_etapas',
      'projetos',
      'recording_block_contents',
      'recording_blocks',
      'serie_pilares',
      'serie_plataformas',
      'series',
      'templates',
      'user_preferences',
      'cenarios',
      'looks',
    ]);

    const scheduleRefresh = () => {
      if (realtimeRefreshTimeout.current) {
        clearTimeout(realtimeRefreshTimeout.current);
      }

      realtimeRefreshTimeout.current = setTimeout(() => {
        void refreshFromServer();
      }, 120);
    };

    const channel = supabase
      .channel(`content-os-realtime:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
        if (!payload.table || !relevantTables.has(payload.table)) return;
        if (shouldSkipRealtimeRefresh(lastLocalMutationAt.current, Date.now())) return;
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

  const createContent = useCallback(async (content: db.Content) => {
    if (!user) throw new Error('Usuário não autenticado');
    if (!supabase) throw new Error('Supabase não inicializado');

    const normalizedContent = normalizeContentId(content);

    try {
      dispatch({ type: 'ADD_CONTENT', payload: normalizedContent });
      await persistContentRecord(normalizedContent, user.id);
      lastLocalMutationAt.current = Date.now();
    } catch (err) {
      console.error('[AppContext] createContent failed:', err);
      await refreshFromServer();
      throw err;
    }
  }, [refreshFromServer, user]);

  const updateContent = useCallback(async (content: db.Content) => {
    if (!user) throw new Error('Usuário não autenticado');
    if (!supabase) throw new Error('Supabase não inicializado');

    const normalizedContent = normalizeContentId(content);

    try {
      dispatch({ type: 'UPDATE_CONTENT', payload: normalizedContent });
      await persistContentRecord(normalizedContent, user.id);
      lastLocalMutationAt.current = Date.now();
    } catch (err) {
      console.error('[AppContext] updateContent failed:', err);
      await refreshFromServer();
      throw err;
    }
  }, [refreshFromServer, user]);

  const enhancedDispatch = useCallback(async (action: AppAction) => {
    const normalizedAction = normalizeAction(action);
    dispatch(normalizedAction);

    if (!user) return;

    lastLocalMutationAt.current = Date.now();

    try {
      await persistAction({ action: normalizedAction, userId: user.id, state });
      lastLocalMutationAt.current = Date.now();
    } catch (err) {
      console.error('[Sync] Error persisting action:', normalizedAction.type, err);
      await refreshFromServer();
    }
  }, [refreshFromServer, state, user]);

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
  }), [state, enhancedDispatch, createContent, updateContent]);

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
