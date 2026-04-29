import React, { useReducer, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as db from '../lib/database';
import { appReducer, AppAction } from './reducer';
import { useAuth } from './AuthContext';

// ============================================================================
// STATE
// ============================================================================

export interface AppState extends db.AppData {
  theme: 'light' | 'dark';
  isLoaded: boolean;
}

export const initialState: AppState = {
  platforms: [],
  preferences: {},
  dnaVoz: null,
  pilares: [],
  series: [],
  cenarios: [],
  looks: [],
  bibliotecaItems: [],
  contents: [],
  ideas: [],
  projetos: [],
  recordingBlocks: [],
  templates: [],
  agendaItems: [],
  goldenRules: [],
  contentMetrics: [],
  
  // Legacy aliases
  books: [],
  partnerships: [],
  results: [],
  agenda: [],

  theme: 'dark',
  isLoaded: false,
};

// ============================================================================
// CONTEXT
// ============================================================================

export const AppContext = React.createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const loadDone = useRef(false);

  useEffect(() => {
    if (!supabase) {
      dispatch({ type: 'SET_LOADED' });
      return;
    }

    let done = false;

    async function load() {
      if (done) return;
      done = true;
      try {
        const data = await db.fetchAllData();
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
        load();
      } else if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        dispatch({ type: 'SET_DATA', payload: {} });
        dispatch({ type: 'SET_LOADED' });
        loadDone.current = true;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const { user } = useAuth();

  const enhancedDispatch = useCallback(async (action: AppAction) => {
    // 1. Update local state immediately (Optimistic UI)
    dispatch(action);

    // 2. Persist to Supabase
    if (!user) return;
    const userId = user.id;

    try {
      switch (action.type) {
        // --- Biblioteca & Books ---
        case 'ADD_BOOK':
        case 'UPDATE_BOOK':
        case 'ADD_BIBLIOTECA_ITEM':
        case 'UPDATE_BIBLIOTECA_ITEM':
          await db.saveBibliotecaItem({ ...action.payload, userId });
          break;
        case 'DELETE_BOOK':
        case 'DELETE_BIBLIOTECA_ITEM':
          await db.deleteBibliotecaItem(action.payload);
          break;

        // --- Annotations ---
        case 'ADD_ANNOTATION':
        case 'UPDATE_ANNOTATION':
        case 'ADD_ANOTACAO':
        case 'UPDATE_ANOTACAO':
          // Support both payload formats
          const ann = (action.payload as any).anotacao || action.payload;
          const lid = (action.payload as any).livroId || (action.payload as any).itemId;
          await db.saveAnotacao({ ...ann, itemId: lid, userId });
          break;
        case 'DELETE_ANNOTATION':
        case 'DELETE_ANOTACAO':
          const aid = (action.payload as any).annotationId || (action.payload as any).anotacaoId || action.payload;
          await db.deleteAnotacao(aid as string);
          break;
        case 'DISTILL_ANNOTATION':
          const book = state.bibliotecaItems.find(b => b.id === action.payload.livroId);
          const note = book?.anotacoes.find(a => a.id === action.payload.annotationId);
          if (note) {
            await db.saveAnotacao({ ...note, destilada: true, itemId: action.payload.livroId, userId });
          }
          break;

        // --- Contents & Ideas ---
        case 'ADD_CONTENT':
        case 'UPDATE_CONTENT':
          await db.saveContent({ ...action.payload, userId });
          break;
        case 'DELETE_CONTENT':
          await db.deleteContent(action.payload);
          break;
        case 'ADD_IDEA':
        case 'UPDATE_IDEA':
          await db.saveIdea({ ...action.payload, userId });
          break;
        case 'DELETE_IDEA':
          await db.deleteIdea(action.payload);
          break;

        // --- Projetos ---
        case 'ADD_PARTNERSHIP':
        case 'UPDATE_PARTNERSHIP':
        case 'ADD_PROJETO':
        case 'UPDATE_PROJETO':
          await db.saveProjeto({ ...action.payload, userId });
          break;
        case 'DELETE_PARTNERSHIP':
        case 'DELETE_PROJETO':
          await db.deleteProjeto(action.payload);
          break;

        // --- Pillars & Series ---
        case 'ADD_PILAR':
        case 'UPDATE_PILAR':
          await db.savePilar({ ...action.payload, userId });
          break;
        case 'DELETE_PILAR':
          await db.deletePilar(action.payload);
          break;
        case 'ADD_SERIE':
        case 'UPDATE_SERIE':
        case 'ADD_SERIES':
          await db.saveSerie({ ...action.payload, userId });
          break;
        case 'DELETE_SERIE':
          await db.deleteSerie(action.payload);
          break;

        // --- Metrics ---
        case 'ADD_RESULT':
        case 'UPDATE_RESULT':
          await db.saveContentMetric({ ...action.payload, userId });
          break;

        // --- Agenda ---
        case 'ADD_AGENDA':
        case 'UPDATE_AGENDA':
        case 'ADD_AGENDA_ITEM':
        case 'UPDATE_AGENDA_ITEM':
          await db.saveAgendaItem({ ...action.payload, userId });
          break;
        case 'DELETE_AGENDA':
        case 'DELETE_AGENDA_ITEM':
          await db.deleteAgendaItem(action.payload);
          break;

        // --- Recording & Blocks ---
        case 'ADD_RECORDING_BLOCK':
        case 'UPDATE_RECORDING_BLOCK':
          await db.saveRecordingBlock({ ...action.payload, userId });
          break;
        case 'DELETE_RECORDING_BLOCK':
          await db.deleteRecordingBlock(action.payload);
          break;

        // --- Preferences & DNA ---
        case 'UPDATE_PREFERENCE':
          await db.savePreference(action.payload.key, action.payload.value);
          break;
        case 'SET_DNA_VOZ':
          await db.saveDnaVoz(action.payload);
          break;

        // --- Energy ---
        case 'LOG_ENERGY':
          // Table removed in new schema, but we keep the action for local state if needed
          break;

        default:
          break;
      }
    } catch (err) {
      console.error('[Sync] Error persisting action:', action.type, err);
    }
  }, [user, state.bibliotecaItems]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  // Provide aliases for state properties to match what the UI expects
  const contextValue = React.useMemo(() => ({
    state: {
      ...state,
      books: state.bibliotecaItems,
      partnerships: state.projetos,
      results: state.contentMetrics,
      agenda: state.agendaItems,
    },
    dispatch: enhancedDispatch
  }), [state, enhancedDispatch]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useAppContext() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
