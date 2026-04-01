import React, { useReducer, useEffect, useRef, useCallback } from 'react';
import {
  Content,
  Idea,
  Series,
  Result,
  AgendaItem,
  EnergyLog,
  Partnership,
  Book,
  Pilar,
  Look,
  Cenario,
  RecordingBlock,
  GoldenRule,
} from '../types';
import { INITIAL_SERIES, INITIAL_PILARES, GOLDEN_RULES, mapLegacyFormatToPlataforma } from '../constants';
import { appReducer, AppAction } from './reducer';
import { fetchAllData, saveToSupabase, softDeleteFromSupabase, PendingDelete } from '../lib/database';

export interface AppState {
  contents: Content[];
  ideas: Idea[];
  series: Series[];
  results: Result[];
  agenda: AgendaItem[];
  energyLogs: EnergyLog[];
  partnerships: Partnership[];
  books: Book[];
  pilares: Pilar[];
  looks: Look[];
  cenarios: Cenario[];
  recordingBlocks: RecordingBlock[];
  goldenRules: GoldenRule[];
  onboardingCompleto: boolean;
  viewedGuides: string[];
  theme: 'light' | 'dark';
  dnaVoz: {
    promessaCentral: string;
    publico: string;
    pilares: string[];
    tom: string;
    naoFaco: string[];
    alertas: string[];
  };
}

const STORAGE_KEY = 'content_os_data';

const initialState: AppState = {
  contents: [
    {
      id: 'mock-1',
      title: 'Calma eu te explico: Por que lemos ficção?',
      seriesId: 'calma-explico',
      pillar: 'Análise',
      format: 'Reels',
      status: 'Postado',
      slotType: 'Série',
      publishDate: '2026-03-25',
      plataformas: ['Instagram'],
      formatoVisual: 'Talking Head',
      createdAt: '2026-03-15T10:00:00Z',
    },
    {
      id: 'mock-2',
      title: 'POV: Leitor de suspense tentando dormir',
      seriesId: 'tipos-leitores',
      pillar: 'Humor',
      format: 'Reels',
      status: 'A Editar',
      slotType: 'Curto',
      publishDate: '2026-03-27',
      plataformas: ['Instagram', 'TikTok'],
      formatoVisual: 'POV Texto',
      createdAt: '2026-03-18T14:30:00Z',
    },
    {
      id: 'mock-3',
      title: 'Minha leitura atual',
      seriesId: '',
      pillar: 'Indicação',
      format: 'Stories',
      status: 'Pronto para Gravar',
      slotType: 'Janela',
      publishDate: '2026-03-29',
      plataformas: ['Instagram'],
      formatoVisual: 'Talking Head',
      createdAt: '2026-03-22T09:15:00Z',
    },
  ],
  ideas: [
    {
      id: 'idea-1',
      text: 'Por que todo mundo ama livros com vilões carismáticos?',
      createdAt: '2026-03-25T18:00:00Z',
      pillar: 'Análise',
      archived: false,
    },
    {
      id: 'idea-2',
      text: 'Como lidar com o bloqueio de leitura em dias difíceis',
      createdAt: '2026-03-26T08:00:00Z',
      pillar: 'Identificação',
      archived: false,
    },
    {
      id: 'idea-3',
      text: 'Top 5 livros que parecem Dark Romance mas não são',
      createdAt: '2026-03-26T15:00:00Z',
      pillar: 'Indicação',
      archived: false,
    },
  ],
  series: INITIAL_SERIES,
  results: [],
  agenda: [
    {
      id: 'agenda-1',
      title: 'Reunião de Planejamento Mensal',
      date: '2026-03-27',
      type: 'Reunião',
      external: true,
    },
    {
      id: 'agenda-2',
      title: 'Sessão de Gravação — Série GSA',
      date: '2026-03-30',
      type: 'Entrega',
      external: false,
    },
  ],
  energyLogs: [
    { date: '2026-03-25', level: 4 },
    { date: '2026-03-26', level: 3 },
  ],
  partnerships: [
    {
      id: 'p-1',
      brand: 'Kobo',
      brandColor: '#1D4ED8',
      title: 'Campanha Kobo Libra Colour 2026',
      status: 'Roteiro',
      deadline: '2026-04-15',
      createdAt: new Date().toISOString(),
    },
  ],
  books: [],
  pilares: INITIAL_PILARES,
  looks: [],
  cenarios: [],
  recordingBlocks: [],
  goldenRules: GOLDEN_RULES,
  onboardingCompleto: false,
  viewedGuides: [],
  theme: 'light',
  dnaVoz: {
    promessaCentral: '',
    publico: '',
    pilares: ['Autenticidade', 'Clareza', 'Humor'],
    tom: 'Direta, engraçada e inteligente. Fala como a melhor amiga leitora.',
    naoFaco: ['Clickbait sem entrega', 'Fingir que leu', 'Conteúdo sem ponto de vista'],
    alertas: ['Cuidado com o excesso de análise sem humor', 'Mantenha o ponto de vista forte'],
  },
};

// Migração de dados legados para o novo formato
function migrarDados(parsed: any): AppState {
  return {
    ...initialState,
    ...parsed,
    theme: parsed.theme || initialState.theme,
    contents: (parsed.contents || initialState.contents).map((c: any) => ({
      ...c,
      legendas: c.legendas || (c.caption ? { Instagram: c.caption } : undefined),
      plataformas: c.plataformas || (c.format ? mapLegacyFormatToPlataforma(c.format) : ['Instagram']),
    })),
    ideas: parsed.ideas || initialState.ideas,
    series: parsed.series || initialState.series,
    results: parsed.results || initialState.results,
    agenda: parsed.agenda || initialState.agenda,
    energyLogs: parsed.energyLogs || initialState.energyLogs,
    partnerships: parsed.partnerships || initialState.partnerships,
    books: parsed.books || [],
    pilares: parsed.pilares || INITIAL_PILARES,
    looks: parsed.looks || [],
    cenarios: parsed.cenarios || [],
    recordingBlocks: parsed.recordingBlocks || [],
    goldenRules: parsed.goldenRules || GOLDEN_RULES,
    onboardingCompleto: parsed.onboardingCompleto ?? false,
    dnaVoz: {
      ...initialState.dnaVoz,
      ...(parsed.dnaVoz || {}),
      promessaCentral: parsed.dnaVoz?.promessaCentral || '',
      publico: parsed.dnaVoz?.publico || '',
    },
  } as AppState;
}

// ─── Mapeamento: action type → tabela no Supabase ──────────────────────────

const DELETE_ACTION_TABLE_MAP: Record<string, string> = {
  DELETE_CONTENT: 'contents',
  DELETE_IDEA: 'ideas',
  DELETE_SERIES: 'series',
  DELETE_RESULT: 'results',
  DELETE_AGENDA: 'agenda_items',
  DELETE_PARTNERSHIP: 'partnerships',
  DELETE_BOOK: 'books',
  DELETE_ANNOTATION: 'book_annotations',
  DELETE_PILAR: 'pilares',
  DELETE_LOOK: 'looks',
  DELETE_CENARIO: 'cenarios',
  DELETE_RECORDING_BLOCK: 'recording_blocks',
  DELETE_GOLDEN_RULE: 'golden_rules',
};

export const AppContext = React.createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialState;
    try {
      return migrarDados(JSON.parse(saved));
    } catch {
      return initialState;
    }
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);
  const pendingDeletes = useRef<PendingDelete[]>([]);

  // Wrapped dispatch que intercepta DELETE actions para rastrear soft deletes
  const wrappedDispatch = useCallback((action: AppAction) => {
    const table = DELETE_ACTION_TABLE_MAP[action.type];

    if (table) {
      // DELETE_ANNOTATION tem payload especial: { livroId, annotationId }
      if (action.type === 'DELETE_ANNOTATION') {
        const payload = action.payload as { livroId: string; annotationId: string };
        pendingDeletes.current.push({ table, id: payload.annotationId });
      } else {
        // Todos os outros DELETEs usam payload: string (o ID)
        pendingDeletes.current.push({ table, id: action.payload as string });
      }
    }

    dispatch(action);
  }, []);

  // 1. Fetch data from Supabase on mount — BEFORE enabling saves
  useEffect(() => {
    async function loadData() {
      try {
        const dbData = await fetchAllData();
        if (Object.keys(dbData).length > 0) {
          dispatch({ type: 'SET_STATE', payload: dbData });
        }
      } catch (err) {
        console.error('[Supabase] Failed to fetch initial data:', err);
      } finally {
        initialLoadDone.current = true;
      }
    }
    loadData();
  }, []);

  // 2. Persist state changes — only runs AFTER initial Supabase load
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    // Don't save to Supabase until we've loaded from it first
    if (!initialLoadDone.current) return;

    // Debounce Supabase sync — wait 2s after last change before sending
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        // 1. Processar soft deletes pendentes
        if (pendingDeletes.current.length > 0) {
          const deletesToProcess = [...pendingDeletes.current];
          pendingDeletes.current = [];
          await softDeleteFromSupabase(deletesToProcess);
        }

        // 2. Upsert state ativo
        await saveToSupabase(state);
      } catch (err) {
        console.error('[Supabase] Failed to sync:', err);
      }
    }, 2000);
  }, [state]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch: wrappedDispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = React.useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
