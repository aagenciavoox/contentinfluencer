import React, { useReducer, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import * as db from '../lib/database';
import { appReducer, AppAction } from './reducer';
import { useAuth } from './AuthContext';
import { generateUUID, isUUID } from '../utils/uuid';

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
  bibliotecaGeneros: [],
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

  theme: 'light',
  isLoaded: false,
};

// ============================================================================
// CONTEXT
// ============================================================================

export const AppContext = React.createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  createContent: (content: db.Content) => Promise<void>;
  updateContent: (content: db.Content) => Promise<void>;
} | null>(null);

function normalizeContentId(content: db.Content): db.Content {
  if (isUUID(content.id)) return content;

  const normalizedContent = { ...content, id: generateUUID() };
  Object.assign(content, normalizedContent);
  return normalizedContent;
}

// ============================================================================
// PROVIDER
// ============================================================================

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const loadDone = useRef(false);
  const { user } = useAuth();

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

  const createContent = useCallback(async (content: db.Content) => {
    if (!user) throw new Error('Usuário não autenticado');
    if (!supabase) throw new Error('Supabase não inicializado');

    try {
      // 1. Persistir no Supabase (Conteúdo + Plataformas)
      const normalizedContent = normalizeContentId(content);
      await db.saveContent({ ...normalizedContent, userId: user.id });
      await db.saveContentPlataformas(normalizedContent.id, normalizedContent.plataformas);
      
      // 2. Atualizar estado local imediatamente
      dispatch({ type: 'ADD_CONTENT', payload: normalizedContent });
    } catch (err) {
      console.error('[AppContext] createContent failed:', err);
      throw err;
    }
  }, [user]);

  const updateContent = useCallback(async (content: db.Content) => {
    if (!user) throw new Error('Usuário não autenticado');
    if (!supabase) throw new Error('Supabase não inicializado');

    try {
      // 1. Persistir no Supabase (Conteúdo + Plataformas)
      const normalizedContent = normalizeContentId(content);
      await db.saveContent({ ...normalizedContent, userId: user.id });
      await db.saveContentPlataformas(normalizedContent.id, normalizedContent.plataformas);
      
      // 2. Atualizar estado local imediatamente
      dispatch({ type: 'UPDATE_CONTENT', payload: normalizedContent });
    } catch (err) {
      console.error('[AppContext] updateContent failed:', err);
      throw err;
    }
  }, [user]);

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
          if (action.payload.generoIds) {
            await db.saveItemGeneros(action.payload.id, action.payload.generoIds);
          }
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
          // Also handle via enhancedDispatch for cases not using createContent/updateContent
          const normalizedContent = normalizeContentId(action.payload);
          await db.saveContent({ ...normalizedContent, userId });
          await db.saveContentPlataformas(normalizedContent.id, normalizedContent.plataformas);
          break;
        case 'DELETE_CONTENT':
          await db.deleteContent(action.payload);
          break;
        case 'ADD_IDEA':
        case 'UPDATE_IDEA':
          await db.saveIdea({ ...action.payload, userId });
          break;
        case 'PROMOTE_IDEA': {
          const normalizedPromotedContent = normalizeContentId(action.payload.content);
          action.payload.contentId = normalizedPromotedContent.id;
          await db.saveContent({ ...normalizedPromotedContent, userId });
          await db.saveContentPlataformas(normalizedPromotedContent.id, normalizedPromotedContent.plataformas);
          const existingIdea = state.ideas.find(idea => idea.id === action.payload.ideaId);
          if (existingIdea) {
            await db.saveIdea({
              ...existingIdea,
              userId,
              promotedToContentId: normalizedPromotedContent.id,
              archived: true,
            });
          }
          break;
        }
        case 'DELETE_IDEA':
          await db.deleteIdea(action.payload);
          break;

        // --- Projetos ---
        case 'ADD_PARTNERSHIP':
        case 'UPDATE_PARTNERSHIP':
        case 'ADD_PROJETO':
        case 'UPDATE_PROJETO':
          await db.saveProjeto({ ...action.payload, userId });
          for (const etapa of action.payload.etapas || []) {
            await db.saveProjetoEtapa(etapa);
          }
          await db.saveProjetoConteudos(action.payload.id, action.payload.contentIds || []);
          break;
        case 'ADD_PROJETO_ETAPA':
        case 'UPDATE_PROJETO_ETAPA':
          await db.saveProjetoEtapa(action.payload.etapa);
          break;
        case 'DELETE_PROJETO_ETAPA':
          await db.deleteProjetoEtapa(action.payload.etapaId);
          break;
        case 'DELETE_PARTNERSHIP':
        case 'DELETE_PROJETO':
          await db.deleteProjeto(action.payload);
          break;

        // --- Pillars & Series ---
        case 'ADD_PILAR':
        case 'UPDATE_PILAR':
          await db.savePilar({ ...action.payload, userId });
          if (action.payload.plataformas) {
            await db.savePilarPlataformas(action.payload.id, action.payload.plataformas);
          }
          break;
        case 'DELETE_PILAR':
          await db.deletePilar(action.payload);
          break;
        case 'ADD_SERIE':
        case 'UPDATE_SERIE':
        case 'ADD_SERIES':
          await db.saveSerie({ ...action.payload, userId });
          if (action.payload.pilarIds) {
            await db.saveSeriePilares(action.payload.id, action.payload.pilarIds);
          }
          if (action.payload.plataformas) {
            await db.saveSeriePlataformas(action.payload.id, action.payload.plataformas);
          }
          break;
        case 'DELETE_SERIE':
          await db.deleteSerie(action.payload);
          break;

        // --- Metrics ---
        case 'ADD_RESULT':
        case 'UPDATE_RESULT':
        case 'ADD_CONTENT_METRIC':
        case 'UPDATE_CONTENT_METRIC':
          await db.saveContentMetric({ ...action.payload, userId });
          break;
        case 'DELETE_RESULT':
        case 'DELETE_CONTENT_METRIC':
          await db.deleteContentMetric(action.payload);
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
        case 'UPDATE_BLOCK_CONTENTS':
          await db.saveRecordingBlockContents(action.payload.blockId, action.payload.contents);
          break;
        case 'DELETE_RECORDING_BLOCK':
          await db.deleteRecordingBlock(action.payload);
          break;

        // --- Templates ---
        case 'ADD_TEMPLATE':
        case 'UPDATE_TEMPLATE':
          await db.saveTemplate({ ...action.payload, userId });
          break;
        case 'DELETE_TEMPLATE':
          await db.deleteTemplate(action.payload);
          break;

        // --- Preferences & DNA ---
        case 'SET_PREFERENCE':
        case 'UPDATE_PREFERENCE':
          await db.savePreference(action.payload.key, action.payload.value);
          break;
        case 'UPDATE_DNA_VOZ':
          await db.saveDnaVoz({
            promessaCentral: action.payload.promessaCentral ?? state.dnaVoz?.promessaCentral ?? '',
            publico: action.payload.publico ?? state.dnaVoz?.publico ?? '',
            tom: action.payload.tom ?? state.dnaVoz?.tom ?? '',
            naoFaco: action.payload.naoFaco ?? state.dnaVoz?.naoFaco ?? [],
            alertas: action.payload.alertas ?? state.dnaVoz?.alertas ?? [],
          });
          break;
        case 'SET_DNA_VOZ':
          await db.saveDnaVoz(action.payload);
          break;

        // --- Rules ---
        case 'ADD_GOLDEN_RULE':
        case 'UPDATE_GOLDEN_RULE':
          await db.saveGoldenRule({ ...action.payload, userId });
          break;
        case 'DELETE_GOLDEN_RULE':
          await db.deleteGoldenRule(action.payload);
          break;

        // --- Platforms ---
        case 'ADD_PLATFORM':
        case 'UPDATE_PLATFORM':
          await db.savePlatform({ ...action.payload, userId });
          break;
        case 'DELETE_PLATFORM':
          await db.deletePlatform(action.payload);
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
  }, [user, state.bibliotecaItems, state.dnaVoz]);

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

// ============================================================================
// HOOK
// ============================================================================

export function useAppContext() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
