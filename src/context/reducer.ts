import type { AppState } from '../app/providers/appState';
import {
  archiveCreation,
  contentFromLegacyIdea,
  demoteContentToIdea,
  findContentForLegacyIdea,
  promoteContentToScript,
  restoreCreation,
  transitionCreationStatus,
  updateContentFromLegacyIdea,
} from '../features/contents/lib/creationContent';
import {
  AppData,
  Content, Idea, Pilar, Serie, Cenario, Look,
  BibliotecaItem, Anotacao, Projeto, ProjetoEtapa,
  RecordingBlock, RecordingBlockContent, Template,
  AgendaItem, GoldenRule, ContentMetric, Platform, DnaVoz,
} from '../lib/database';

// ============================================================================
// ACTION TYPES
// ============================================================================

export type AppAction =
  // ─── Sincronização ──────────────────────────────────────────────────────────
  | { type: 'SET_DATA';    payload: Partial<AppData> }
  | { type: 'SET_LOADED';  payload?: boolean }
  | { type: 'SET_THEME';   payload: 'light' | 'dark' }
  | { type: 'SET_PREFERENCE'; payload: { key: string; value: any } }
  | { type: 'UPDATE_PREFERENCE'; payload: { key: string; value: any } }

  // ─── DNA de Voz ─────────────────────────────────────────────────────────────
  | { type: 'UPDATE_DNA_VOZ'; payload: Pick<DnaVoz, 'promessaCentral' | 'publico' | 'tom' | 'naoFaco' | 'alertas'> }

  // ─── Conteúdos ──────────────────────────────────────────────────────────────
  | { type: 'ADD_CONTENT';              payload: Content }
  | { type: 'UPDATE_CONTENT';           payload: Content }
  | { type: 'DELETE_CONTENT';           payload: string }
  | { type: 'DELETE_MULTIPLE_CONTENTS'; payload: string[] }
  | { type: 'SET_CONTENT_STATUS'; payload: { contentIds: string[]; status: string } }
  | { type: 'ARCHIVE_CONTENTS'; payload: string[] }
  | { type: 'RESTORE_CONTENTS'; payload: string[] }

  // ─── Ideias ─────────────────────────────────────────────────────────────────
  | { type: 'ADD_IDEA';    payload: Idea & { canonicalContentId?: string } }
  | { type: 'UPDATE_IDEA'; payload: Idea & { canonicalContentId?: string } }
  | { type: 'DELETE_IDEA'; payload: string }
  | { type: 'PROMOTE_IDEA'; payload: { ideaId: string; contentId: string; content: Content } }
  | { type: 'DEMOTE_CONTENTS_TO_IDEAS'; payload: { contentIds: string[]; contents?: Content[] } }

  // ─── Pilares ────────────────────────────────────────────────────────────────
  | { type: 'ADD_PILAR';    payload: Pilar }
  | { type: 'UPDATE_PILAR'; payload: Pilar }
  | { type: 'DELETE_PILAR'; payload: string }

  // ─── Séries ─────────────────────────────────────────────────────────────────
  | { type: 'ADD_SERIE';    payload: Serie }
  | { type: 'UPDATE_SERIE'; payload: Serie }
  | { type: 'DELETE_SERIE'; payload: string }

  // ─── Cenários ───────────────────────────────────────────────────────────────
  | { type: 'ADD_CENARIO';    payload: Cenario }
  | { type: 'UPDATE_CENARIO'; payload: Cenario }
  | { type: 'DELETE_CENARIO'; payload: string }

  // ─── Looks ──────────────────────────────────────────────────────────────────
  | { type: 'ADD_LOOK';    payload: Look }
  | { type: 'UPDATE_LOOK'; payload: Look }
  | { type: 'DELETE_LOOK'; payload: string }

  // ─── Biblioteca ─────────────────────────────────────────────────────────────
  | { type: 'ADD_BIBLIOTECA_ITEM';    payload: BibliotecaItem }
  | { type: 'UPDATE_BIBLIOTECA_ITEM'; payload: BibliotecaItem }
  | { type: 'DELETE_BIBLIOTECA_ITEM'; payload: string }
  | { type: 'ADD_ANOTACAO';    payload: { itemId: string; anotacao: Anotacao } }
  | { type: 'UPDATE_ANOTACAO'; payload: { itemId: string; anotacao: Anotacao } }
  | { type: 'DELETE_ANOTACAO'; payload: { itemId: string; anotacaoId: string } }
  // Aliases for Biblioteca
  | { type: 'ADD_BOOK';    payload: any }
  | { type: 'UPDATE_BOOK'; payload: any }
  | { type: 'DELETE_BOOK'; payload: string }
  | { type: 'ADD_ANNOTATION';    payload: any }
  | { type: 'UPDATE_ANNOTATION'; payload: any }
  | { type: 'DELETE_ANNOTATION'; payload: { livroId: string; annotationId: string } }
  | { type: 'DISTILL_ANNOTATION'; payload: { livroId: string; annotationId: string } }

  // ─── Projetos ───────────────────────────────────────────────────────────────
  | { type: 'ADD_PROJETO';    payload: Projeto }
  | { type: 'UPDATE_PROJETO'; payload: Projeto }
  | { type: 'DELETE_PROJETO'; payload: string }
  | { type: 'ADD_PROJETO_ETAPA';    payload: { projetoId: string; etapa: ProjetoEtapa } }
  | { type: 'UPDATE_PROJETO_ETAPA'; payload: { projetoId: string; etapa: ProjetoEtapa } }
  | { type: 'DELETE_PROJETO_ETAPA'; payload: { projetoId: string; etapaId: string } }
  // Aliases and additional for Projects
  | { type: 'ADD_CAMPAIGN'; payload: any }
  | { type: 'ADD_PARTNERSHIP'; payload: any }
  | { type: 'UPDATE_PARTNERSHIP'; payload: any }
  | { type: 'DELETE_PARTNERSHIP'; payload: string }

  // ─── Resultados ─────────────────────────────────────────────────────────────
  | { type: 'ADD_RESULT';    payload: any }
  | { type: 'UPDATE_RESULT'; payload: any }
  | { type: 'DELETE_RESULT'; payload: string }

  // ─── Gravação ───────────────────────────────────────────────────────────────
  | { type: 'ADD_RECORDING_BLOCK';    payload: RecordingBlock }
  | { type: 'UPDATE_RECORDING_BLOCK'; payload: RecordingBlock }
  | { type: 'DELETE_RECORDING_BLOCK'; payload: string }
  | { type: 'UPDATE_BLOCK_CONTENTS';  payload: { blockId: string; contents: RecordingBlockContent[] } }

  // ─── Templates ──────────────────────────────────────────────────────────────
  | { type: 'ADD_TEMPLATE';    payload: Template }
  | { type: 'UPDATE_TEMPLATE'; payload: Template }
  | { type: 'DELETE_TEMPLATE'; payload: string }

  // ─── Agenda ─────────────────────────────────────────────────────────────────
  | { type: 'ADD_AGENDA_ITEM';    payload: AgendaItem }
  | { type: 'UPDATE_AGENDA_ITEM'; payload: AgendaItem }
  | { type: 'DELETE_AGENDA_ITEM'; payload: string }
  | { type: 'ADD_AGENDA';    payload: any }
  | { type: 'UPDATE_AGENDA'; payload: any }
  | { type: 'DELETE_AGENDA'; payload: string }

  // ─── Regras de Ouro ─────────────────────────────────────────────────────────
  | { type: 'ADD_GOLDEN_RULE';    payload: GoldenRule }
  | { type: 'UPDATE_GOLDEN_RULE'; payload: GoldenRule }
  | { type: 'DELETE_GOLDEN_RULE'; payload: string }

  // ─── Métricas ───────────────────────────────────────────────────────────────
  | { type: 'ADD_CONTENT_METRIC';    payload: ContentMetric }
  | { type: 'UPDATE_CONTENT_METRIC'; payload: ContentMetric }
  | { type: 'DELETE_CONTENT_METRIC'; payload: string }

  // ─── Plataformas ────────────────────────────────────────────────────────────
  | { type: 'ADD_PLATFORM';    payload: Platform }
  | { type: 'UPDATE_PLATFORM'; payload: Platform }
  | { type: 'DELETE_PLATFORM'; payload: string }

  // ─── Energia ────────────────────────────────────────────────────────────────
  | { type: 'LOG_ENERGY'; payload: unknown };

// ============================================================================
// HELPERS
// ============================================================================

function deriveTheme(prefs: Record<string, string>): 'light' | 'dark' {
  const saved = prefs?.['theme'];
  if (saved === 'dark' || saved === 'light') return saved;
  return 'light';
}

// ============================================================================
// REDUCER
// ============================================================================

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    // ─── Sincronização ──────────────────────────────────────────────────────
    case 'SET_DATA': {
      const prefs = action.payload.preferences ?? state.preferences;
      return { ...state, ...action.payload, theme: deriveTheme(prefs) };
    }
    case 'SET_LOADED':
      return { ...state, isLoaded: action.payload !== false };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_PREFERENCE':
    case 'UPDATE_PREFERENCE':
      return { ...state, preferences: { ...state.preferences, [action.payload.key]: action.payload.value } };

    // ─── DNA de Voz ─────────────────────────────────────────────────────────
    case 'UPDATE_DNA_VOZ':
      return {
        ...state,
        dnaVoz: state.dnaVoz
          ? { ...state.dnaVoz, ...action.payload }
          : { id: '', userId: '', updatedAt: new Date().toISOString(), ...action.payload },
      };

    // ─── Conteúdos ──────────────────────────────────────────────────────────
    case 'ADD_CONTENT':
      return { ...state, contents: [action.payload, ...state.contents] };
    case 'UPDATE_CONTENT': {
      const exists = state.contents.some(content => content.id === action.payload.id);
      return {
        ...state,
        contents: exists
          ? state.contents.map(content =>
              content.id === action.payload.id ? action.payload : content
            )
          : [action.payload, ...state.contents],
      };
    }
    case 'DELETE_CONTENT':
      return { ...state, contents: state.contents.filter(c => c.id !== action.payload) };
    case 'DELETE_MULTIPLE_CONTENTS':
      return { ...state, contents: state.contents.filter(c => !action.payload.includes(c.id)) };
    case 'SET_CONTENT_STATUS': {
      const contentIds = new Set(action.payload.contentIds);
      return {
        ...state,
        contents: state.contents.map(content =>
          contentIds.has(content.id)
            ? transitionCreationStatus(content, action.payload.status)
            : content
        ),
      };
    }
    case 'ARCHIVE_CONTENTS': {
      const contentIds = new Set(action.payload);
      return {
        ...state,
        contents: state.contents.map(content =>
          contentIds.has(content.id) ? archiveCreation(content) : content
        ),
      };
    }
    case 'RESTORE_CONTENTS': {
      const contentIds = new Set(action.payload);
      return {
        ...state,
        contents: state.contents.map(content =>
          contentIds.has(content.id) ? restoreCreation(content) : content
        ),
      };
    }

    // ─── Ideias ─────────────────────────────────────────────────────────────
    case 'ADD_IDEA': {
      const existing = findContentForLegacyIdea(state.contents, action.payload.id);
      const content = existing
        ? updateContentFromLegacyIdea(existing, action.payload)
        : contentFromLegacyIdea(action.payload, {
            id: action.payload.canonicalContentId,
          });
      return {
        ...state,
        contents: existing
          ? state.contents.map(item => item.id === existing.id ? content : item)
          : [content, ...state.contents],
      };
    }
    case 'UPDATE_IDEA': {
      const existing = findContentForLegacyIdea(state.contents, action.payload.id);
      const content = existing
        ? updateContentFromLegacyIdea(existing, action.payload)
        : contentFromLegacyIdea(action.payload, {
            id: action.payload.canonicalContentId,
          });
      return {
        ...state,
        contents: existing
          ? state.contents.map(item => item.id === existing.id ? content : item)
          : [content, ...state.contents],
        ideas: state.ideas.map(idea =>
          idea.id === action.payload.id ? {...idea, ...action.payload} : idea
        ),
      };
    }
    case 'DELETE_IDEA': {
      const existing = findContentForLegacyIdea(state.contents, action.payload);
      return {
        ...state,
        contents: existing
          ? state.contents.map(content =>
              content.id === existing.id ? archiveCreation(content) : content
            )
          : state.contents,
        ideas: state.ideas.map(idea =>
          idea.id === action.payload ? {...idea, archived: true} : idea
        ),
      };
    }
    case 'PROMOTE_IDEA': {
      const existing = findContentForLegacyIdea(state.contents, action.payload.ideaId);
      const sourceIdea = state.ideas.find(idea => idea.id === action.payload.ideaId);
      const canonicalContent = existing
        ? promoteContentToScript(existing)
        : promoteContentToScript(
            sourceIdea
              ? contentFromLegacyIdea(sourceIdea, {
                  ...action.payload.content,
                  legacyIdeaId: sourceIdea.id,
                  createdAt: sourceIdea.createdAt,
                })
              : {
                  ...action.payload.content,
                  legacyIdeaId: action.payload.ideaId,
                }
          );
      return {
        ...state,
        ideas: state.ideas.map(i =>
          i.id === action.payload.ideaId
            ? { ...i, promotedToContentId: canonicalContent.id, archived: true }
            : i
        ),
        contents: existing
          ? state.contents.map(content =>
              content.id === existing.id ? canonicalContent : content
            )
          : [canonicalContent, ...state.contents],
      };
    }
    case 'DEMOTE_CONTENTS_TO_IDEAS': {
      const contentIdSet = new Set(action.payload.contentIds);

      return {
        ...state,
        contents: state.contents.map(content =>
          contentIdSet.has(content.id) ? demoteContentToIdea(content) : content
        ),
        recordingBlocks: state.recordingBlocks.map(block => ({
          ...block,
          contents: block.contents.filter(item => !contentIdSet.has(item.contentId)),
        })),
      };
    }

    // ─── Pilares ────────────────────────────────────────────────────────────
    case 'ADD_PILAR':
      return { ...state, pilares: [...state.pilares, action.payload] };
    case 'UPDATE_PILAR':
      return { ...state, pilares: state.pilares.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PILAR':
      return {
        ...state,
        pilares: state.pilares.filter(p => p.id !== action.payload),
        contents: state.contents.map(c =>
          c.pilarId === action.payload ? { ...c, pilarId: null } : c
        ),
        ideas: state.ideas.map(i =>
          i.pilarId === action.payload ? { ...i, pilarId: null } : i
        ),
        series: state.series.map(s =>
          s.pilarIds.includes(action.payload)
            ? { ...s, pilarIds: s.pilarIds.filter(id => id !== action.payload) }
            : s
        ),
      };

    // ─── Séries ─────────────────────────────────────────────────────────────
    case 'ADD_SERIE':
      return { ...state, series: [...state.series, action.payload] };
    case 'UPDATE_SERIE':
      return { ...state, series: state.series.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SERIE':
      return {
        ...state,
        series: state.series.filter(s => s.id !== action.payload),
        contents: state.contents.map(c =>
          c.seriesId === action.payload ? { ...c, seriesId: null } : c
        ),
      };

    // ─── Cenários ───────────────────────────────────────────────────────────
    case 'ADD_CENARIO':
      return { ...state, cenarios: [...state.cenarios, action.payload] };
    case 'UPDATE_CENARIO':
      return { ...state, cenarios: state.cenarios.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CENARIO':
      return { ...state, cenarios: state.cenarios.filter(c => c.id !== action.payload) };

    // ─── Looks ──────────────────────────────────────────────────────────────
    case 'ADD_LOOK':
      return { ...state, looks: [...state.looks, action.payload] };
    case 'UPDATE_LOOK':
      return { ...state, looks: state.looks.map(l => l.id === action.payload.id ? action.payload : l) };
    case 'DELETE_LOOK':
      return { ...state, looks: state.looks.filter(l => l.id !== action.payload) };

    // ─── Biblioteca ─────────────────────────────────────────────────────────
    case 'ADD_BIBLIOTECA_ITEM':
    case 'ADD_BOOK':
      return { ...state, bibliotecaItems: [action.payload, ...state.bibliotecaItems] };
    case 'UPDATE_BIBLIOTECA_ITEM':
    case 'UPDATE_BOOK':
      return { ...state, bibliotecaItems: state.bibliotecaItems.map(b => b.id === action.payload.id ? action.payload : b) };
    case 'DELETE_BIBLIOTECA_ITEM':
    case 'DELETE_BOOK':
      return { ...state, bibliotecaItems: state.bibliotecaItems.filter(b => b.id !== action.payload) };
    case 'ADD_ANOTACAO':
      return {
        ...state,
        bibliotecaItems: state.bibliotecaItems.map(b =>
          b.id === action.payload.itemId
            ? { ...b, anotacoes: [...b.anotacoes, action.payload.anotacao] }
            : b
        ),
      };
    case 'ADD_ANNOTATION':
      const addedAnnotation = (action.payload as any).anotacao || action.payload;
      const addLivroId = (action.payload as any).livroId || (action.payload as any).itemId;
      return {
        ...state,
        bibliotecaItems: state.bibliotecaItems.map(b =>
          b.id === addLivroId
            ? { ...b, anotacoes: [...b.anotacoes, addedAnnotation] }
            : b
        ),
      };
    case 'UPDATE_ANOTACAO':
      return {
        ...state,
        bibliotecaItems: state.bibliotecaItems.map(b =>
          b.id === action.payload.itemId
            ? { ...b, anotacoes: b.anotacoes.map(a => a.id === action.payload.anotacao.id ? action.payload.anotacao : a) }
            : b
        ),
      };
    case 'UPDATE_ANNOTATION':
      const updatedAnnotation = (action.payload as any).anotacao || action.payload;
      const updateLivroId = (action.payload as any).livroId || (action.payload as any).itemId;
      return {
        ...state,
        bibliotecaItems: state.bibliotecaItems.map(b =>
          b.id === updateLivroId
            ? { ...b, anotacoes: b.anotacoes.map(a => a.id === updatedAnnotation.id ? updatedAnnotation : a) }
            : b
        ),
      };
    case 'DELETE_ANOTACAO':
      return {
        ...state,
        bibliotecaItems: state.bibliotecaItems.map(b =>
          b.id === action.payload.itemId
            ? { ...b, anotacoes: b.anotacoes.filter(a => a.id !== action.payload.anotacaoId) }
            : b
        ),
      };
    case 'DELETE_ANNOTATION':
      return {
        ...state,
        bibliotecaItems: state.bibliotecaItems.map(b =>
          b.id === action.payload.livroId
            ? { ...b, anotacoes: b.anotacoes.filter(a => a.id !== action.payload.annotationId) }
            : b
        ),
      };
    case 'DISTILL_ANNOTATION':
      return {
        ...state,
        bibliotecaItems: state.bibliotecaItems.map(b =>
          b.id === action.payload.livroId
            ? { ...b, anotacoes: b.anotacoes.map(a => a.id === action.payload.annotationId ? { ...a, destilada: true } : a) }
            : b
        ),
      };

    // ─── Projetos ───────────────────────────────────────────────────────────
    case 'ADD_PROJETO':
    case 'ADD_CAMPAIGN':
    case 'ADD_PARTNERSHIP':
      return { ...state, projetos: [action.payload, ...state.projetos] };
    case 'UPDATE_PROJETO':
    case 'UPDATE_PARTNERSHIP':
      return { ...state, projetos: state.projetos.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PROJETO':
    case 'DELETE_PARTNERSHIP':
      return { ...state, projetos: state.projetos.filter(p => p.id !== action.payload) };
    case 'ADD_PROJETO_ETAPA':
      return {
        ...state,
        projetos: state.projetos.map(p =>
          p.id === action.payload.projetoId
            ? { ...p, etapas: [...p.etapas, action.payload.etapa] }
            : p
        ),
      };
    case 'UPDATE_PROJETO_ETAPA':
      return {
        ...state,
        projetos: state.projetos.map(p =>
          p.id === action.payload.projetoId
            ? { ...p, etapas: p.etapas.map(e => e.id === action.payload.etapa.id ? action.payload.etapa : e) }
            : p
        ),
      };
    case 'DELETE_PROJETO_ETAPA':
      return {
        ...state,
        projetos: state.projetos.map(p =>
          p.id === action.payload.projetoId
            ? { ...p, etapas: p.etapas.filter(e => e.id !== action.payload.etapaId) }
            : p
        ),
      };

    // ─── Resultados ──────────────────────────────────────────────────────────

    // ─── Gravação ───────────────────────────────────────────────────────────
    case 'ADD_RECORDING_BLOCK':
      return { ...state, recordingBlocks: [action.payload, ...state.recordingBlocks] };
    case 'UPDATE_RECORDING_BLOCK':
      return { ...state, recordingBlocks: state.recordingBlocks.map(b => b.id === action.payload.id ? action.payload : b) };
    case 'DELETE_RECORDING_BLOCK':
      return { ...state, recordingBlocks: state.recordingBlocks.filter(b => b.id !== action.payload) };
    case 'UPDATE_BLOCK_CONTENTS':
      return {
        ...state,
        recordingBlocks: state.recordingBlocks.map(b =>
          b.id === action.payload.blockId ? { ...b, contents: action.payload.contents } : b
        ),
      };

    // ─── Templates ──────────────────────────────────────────────────────────
    case 'ADD_TEMPLATE':
      return { ...state, templates: [action.payload, ...state.templates] };
    case 'UPDATE_TEMPLATE':
      return { ...state, templates: state.templates.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TEMPLATE':
      return { ...state, templates: state.templates.filter(t => t.id !== action.payload) };

    // ─── Agenda ─────────────────────────────────────────────────────────────
    case 'ADD_AGENDA_ITEM':
      return { ...state, agendaItems: [...state.agendaItems, action.payload] };
    case 'UPDATE_AGENDA_ITEM':
      return { ...state, agendaItems: state.agendaItems.map(a => a.id === action.payload.id ? action.payload : a) };
    case 'DELETE_AGENDA_ITEM':
      return { ...state, agendaItems: state.agendaItems.filter(a => a.id !== action.payload) };

    // ─── Regras de Ouro ─────────────────────────────────────────────────────
    case 'ADD_GOLDEN_RULE':
      return { ...state, goldenRules: [...state.goldenRules, action.payload] };
    case 'UPDATE_GOLDEN_RULE':
      return { ...state, goldenRules: state.goldenRules.map(r => r.id === action.payload.id ? action.payload : r) };
    case 'DELETE_GOLDEN_RULE':
      return { ...state, goldenRules: state.goldenRules.filter(r => r.id !== action.payload) };


    // ─── Plataformas ────────────────────────────────────────────────────────
    case 'ADD_PLATFORM':
      return { ...state, platforms: [...state.platforms, action.payload] };
    case 'UPDATE_PLATFORM':
      return { ...state, platforms: state.platforms.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PLATFORM':
      return { ...state, platforms: state.platforms.filter(p => p.id !== action.payload) };

    // ─── DNA da Voz ─────────────────────────────────────────────────────────
    // ─── Resultados / Métricas ──────────────────────────────────────────────────
    case 'ADD_RESULT':
    case 'ADD_CONTENT_METRIC':
      return { ...state, contentMetrics: [action.payload, ...state.contentMetrics] };
    case 'UPDATE_RESULT':
    case 'UPDATE_CONTENT_METRIC':
      return { ...state, contentMetrics: state.contentMetrics.map(m => m.id === action.payload.id ? action.payload : m) };
    case 'DELETE_RESULT':
    case 'DELETE_CONTENT_METRIC':
      return { ...state, contentMetrics: state.contentMetrics.filter(m => m.id !== action.payload) };

    // ─── Energia ──────────────────────────────────────────────────────────────
    case 'LOG_ENERGY':
      return state;

    default:
      return state;
  }
}
