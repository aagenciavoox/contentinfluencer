import { AppState } from './AppContext';
import { Book, BookAnnotation, Pilar, Look, Cenario, RecordingBlock, GoldenRule } from '../types';

export type AppAction =
  // Conteúdo
  | { type: 'ADD_CONTENT'; payload: any }
  | { type: 'UPDATE_CONTENT'; payload: any }
  | { type: 'DELETE_CONTENT'; payload: string }
  | { type: 'DELETE_MULTIPLE_CONTENTS'; payload: string[] }
  // Ideia
  | { type: 'ADD_IDEA'; payload: any }
  | { type: 'UPDATE_IDEA'; payload: any }
  | { type: 'DELETE_IDEA'; payload: string }
  | { type: 'PROMOTE_IDEA'; payload: any }
  // Resultado
  | { type: 'ADD_RESULT'; payload: any }
  | { type: 'UPDATE_RESULT'; payload: any }
  | { type: 'DELETE_RESULT'; payload: string }
  // Energia
  | { type: 'LOG_ENERGY'; payload: any }
  // Agenda
  | { type: 'ADD_AGENDA'; payload: any }
  | { type: 'DELETE_AGENDA'; payload: string }
  // DNA da Voz
  | { type: 'UPDATE_DNA_VOZ'; payload: any }
  // Série
  | { type: 'UPDATE_SERIES'; payload: any }
  | { type: 'ADD_SERIES'; payload: any }
  | { type: 'DELETE_SERIES'; payload: string }
  // Parceria
  | { type: 'ADD_PARTNERSHIP'; payload: any }
  | { type: 'UPDATE_PARTNERSHIP'; payload: any }
  | { type: 'DELETE_PARTNERSHIP'; payload: string }
  // Tema
  | { type: 'SET_THEME'; payload: 'light' | 'dark' }
  // Livros
  | { type: 'ADD_BOOK'; payload: Book }
  | { type: 'UPDATE_BOOK'; payload: Book }
  | { type: 'DELETE_BOOK'; payload: string }
  // Anotações do Livro
  | { type: 'ADD_ANNOTATION'; payload: BookAnnotation }
  | { type: 'UPDATE_ANNOTATION'; payload: BookAnnotation }
  | { type: 'DELETE_ANNOTATION'; payload: { livroId: string; annotationId: string } }
  | { type: 'DISTILL_ANNOTATION'; payload: { livroId: string; annotationId: string } }
  // Pilares
  | { type: 'ADD_PILAR'; payload: Pilar }
  | { type: 'UPDATE_PILAR'; payload: Pilar }
  | { type: 'DELETE_PILAR'; payload: string }
  // Looks
  | { type: 'ADD_LOOK'; payload: Look }
  | { type: 'UPDATE_LOOK'; payload: Look }
  | { type: 'DELETE_LOOK'; payload: string }
  // Cenários
  | { type: 'ADD_CENARIO'; payload: Cenario }
  | { type: 'UPDATE_CENARIO'; payload: Cenario }
  | { type: 'DELETE_CENARIO'; payload: string }
  // Onboarding
  | { type: 'SET_ONBOARDING_COMPLETO'; payload: boolean }
  | { type: 'MARK_GUIDE_VIEWED'; payload: string }
  // Blocos de Gravação
  | { type: 'ADD_RECORDING_BLOCK'; payload: RecordingBlock }
  | { type: 'DELETE_RECORDING_BLOCK'; payload: string }
  // Regras de Ouro
  | { type: 'UPDATE_GOLDEN_RULES'; payload: GoldenRule[] }
  // Sincronização Supabase
  | { type: 'SET_STATE'; payload: Partial<AppState> };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, ...action.payload };
    // ─── Conteúdo ────────────────────────────────────────────────────────────
    case 'ADD_CONTENT':
      return { ...state, contents: [action.payload, ...state.contents] };
    case 'UPDATE_CONTENT':
      return {
        ...state,
        contents: state.contents.map(c => c.id === action.payload.id ? action.payload : c),
      };
    case 'DELETE_CONTENT':
      return { ...state, contents: state.contents.filter(c => c.id !== action.payload) };
    case 'DELETE_MULTIPLE_CONTENTS':
      return { ...state, contents: state.contents.filter(c => !action.payload.includes(c.id)) };

    // ─── Ideia ───────────────────────────────────────────────────────────────
    case 'ADD_IDEA':
      return { ...state, ideas: [action.payload, ...state.ideas] };
    case 'UPDATE_IDEA':
      return {
        ...state,
        ideas: state.ideas.map(i => i.id === action.payload.id ? action.payload : i),
      };
    case 'DELETE_IDEA':
      return { ...state, ideas: state.ideas.filter(i => i.id !== action.payload) };
    case 'PROMOTE_IDEA':
      return {
        ...state,
        ideas: state.ideas.map(i =>
          i.id === action.payload.ideaId
            ? { ...i, promotedToContentId: action.payload.contentId, archived: true }
            : i
        ),
        contents: [action.payload.content, ...state.contents],
      };

    // ─── Resultado ───────────────────────────────────────────────────────────
    case 'ADD_RESULT':
      return { ...state, results: [action.payload, ...state.results] };
    case 'UPDATE_RESULT':
      return {
        ...state,
        results: state.results.map(r => r.id === action.payload.id ? action.payload : r),
      };
    case 'DELETE_RESULT':
      return { ...state, results: state.results.filter(r => r.id !== action.payload) };

    // ─── Energia ─────────────────────────────────────────────────────────────
    case 'LOG_ENERGY': {
      const filtered = state.energyLogs.filter(l => l.date !== action.payload.date);
      return { ...state, energyLogs: [...filtered, action.payload] };
    }

    // ─── Agenda ──────────────────────────────────────────────────────────────
    case 'ADD_AGENDA':
      return { ...state, agenda: [...state.agenda, action.payload] };
    case 'DELETE_AGENDA':
      return { ...state, agenda: state.agenda.filter(a => a.id !== action.payload) };

    // ─── DNA da Voz ──────────────────────────────────────────────────────────
    case 'UPDATE_DNA_VOZ':
      return { ...state, dnaVoz: { ...state.dnaVoz, ...action.payload } };

    // ─── Série ───────────────────────────────────────────────────────────────
    case 'UPDATE_SERIES':
      return {
        ...state,
        series: state.series.map(ser => ser.id === action.payload.id ? action.payload : ser),
      };
    case 'ADD_SERIES':
      return { ...state, series: [...state.series, action.payload] };
    case 'DELETE_SERIES':
      return {
        ...state,
        series: state.series.filter(ser => ser.id !== action.payload),
        contents: state.contents.map(c =>
          c.seriesId === action.payload ? { ...c, seriesId: '' } : c
        ),
      };

    // ─── Parceria ────────────────────────────────────────────────────────────
    case 'ADD_PARTNERSHIP':
      return { ...state, partnerships: [action.payload, ...state.partnerships] };
    case 'UPDATE_PARTNERSHIP':
      return {
        ...state,
        partnerships: state.partnerships.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'DELETE_PARTNERSHIP':
      return { ...state, partnerships: state.partnerships.filter(p => p.id !== action.payload) };

    // ─── Tema ────────────────────────────────────────────────────────────────
    case 'SET_THEME':
      return { ...state, theme: action.payload };

    // ─── Livros ──────────────────────────────────────────────────────────────
    case 'ADD_BOOK':
      return { ...state, books: [action.payload, ...state.books] };
    case 'UPDATE_BOOK':
      return {
        ...state,
        books: state.books.map(b => b.id === action.payload.id ? action.payload : b),
      };
    case 'DELETE_BOOK':
      return { ...state, books: state.books.filter(b => b.id !== action.payload) };

    // ─── Anotações ───────────────────────────────────────────────────────────
    case 'ADD_ANNOTATION':
      return {
        ...state,
        books: state.books.map(b =>
          b.id === action.payload.livroId
            ? { ...b, anotacoes: [...b.anotacoes, action.payload] }
            : b
        ),
      };
    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        books: state.books.map(b =>
          b.id === action.payload.livroId
            ? {
                ...b,
                anotacoes: b.anotacoes.map(a =>
                  a.id === action.payload.id ? action.payload : a
                ),
              }
            : b
        ),
      };
    case 'DELETE_ANNOTATION':
      return {
        ...state,
        books: state.books.map(b =>
          b.id === action.payload.livroId
            ? { ...b, anotacoes: b.anotacoes.filter(a => a.id !== action.payload.annotationId) }
            : b
        ),
      };
    case 'DISTILL_ANNOTATION':
      return {
        ...state,
        books: state.books.map(b =>
          b.id === action.payload.livroId
            ? {
                ...b,
                anotacoes: b.anotacoes.map(a =>
                  a.id === action.payload.annotationId ? { ...a, destilada: true } : a
                ),
              }
            : b
        ),
      };

    // ─── Pilares ─────────────────────────────────────────────────────────────
    case 'ADD_PILAR':
      return { ...state, pilares: [...state.pilares, action.payload] };
    case 'UPDATE_PILAR':
      return {
        ...state,
        pilares: state.pilares.map(p => p.id === action.payload.id ? action.payload : p),
      };
    case 'DELETE_PILAR':
      return { ...state, pilares: state.pilares.filter(p => p.id !== action.payload) };

    // ─── Looks ───────────────────────────────────────────────────────────────
    case 'ADD_LOOK':
      return { ...state, looks: [...state.looks, action.payload] };
    case 'UPDATE_LOOK':
      return {
        ...state,
        looks: state.looks.map(l => l.id === action.payload.id ? action.payload : l),
      };
    case 'DELETE_LOOK':
      return { ...state, looks: state.looks.filter(l => l.id !== action.payload) };

    // ─── Cenários ────────────────────────────────────────────────────────────
    case 'ADD_CENARIO':
      return { ...state, cenarios: [...state.cenarios, action.payload] };
    case 'UPDATE_CENARIO':
      return {
        ...state,
        cenarios: state.cenarios.map(c => c.id === action.payload.id ? action.payload : c),
      };
    case 'DELETE_CENARIO':
      return { ...state, cenarios: state.cenarios.filter(c => c.id !== action.payload) };

    // ─── Onboarding ──────────────────────────────────────────────────────────
    case 'SET_ONBOARDING_COMPLETO':
      return { ...state, onboardingCompleto: action.payload };
    case 'MARK_GUIDE_VIEWED':
      return { 
        ...state, 
        viewedGuides: [...state.viewedGuides, action.payload] 
      };

    // ─── Blocos de Gravação ──────────────────────────────────────────────────
    case 'ADD_RECORDING_BLOCK':
      return { ...state, recordingBlocks: [action.payload, ...state.recordingBlocks] };
    case 'DELETE_RECORDING_BLOCK':
      return { ...state, recordingBlocks: state.recordingBlocks.filter(b => b.id !== action.payload) };

    // ─── Regras de Ouro ──────────────────────────────────────────────────────
    case 'UPDATE_GOLDEN_RULES':
      return { ...state, goldenRules: action.payload };

    default:
      return state;
  }
}
