import type { Content, Serie } from '../../../lib/database.ts';
import { aplicarLivros } from '../../../lib/livroIds.ts';
import { generateUUID } from '../../../utils/uuid.ts';
import { contaNaGradePadrao, funcaoHerdavelDaSerie } from '../../editorial/lib/funcoes.ts';
import { pilarPrincipalDaSerie } from '../../editorial/lib/pilarDaSerie.ts';
import { CONTENT_STATUS } from './contentPipeline.ts';

type CreateContentDraftOverrides = Partial<Content>;

export function createContentDraft(
  overrides: CreateContentDraftOverrides = {},
  serie?: Pick<Serie, 'funcaoPadrao' | 'formatoVisualPadrao' | 'energiaPadrao'> & Parameters<typeof pilarPrincipalDaSerie>[0] | null,
): Content {
  const now = new Date().toISOString();
  const herdada = funcaoHerdavelDaSerie(serie);
  const formato = overrides.formatoVisual ?? serie?.formatoVisualPadrao ?? null;

  const draft: Content = {
    id: generateUUID(),
    userId: '',
    title: '',
    status: CONTENT_STATUS.ROTEIRO,
    slotType: null,
    seriesId: null,
    pilarId: pilarPrincipalDaSerie(serie),
    cenarioId: null,
    lookId: null,
    formatoVisual: formato,
    script: null,
    scriptNotes: [],
    tags: [],
    temaIds: [],
    notes: null,
    referencias: null,
    writingNotes: null,
    energiaNecessaria: serie?.energiaPadrao ?? null,
    funcao: null,
    funcaoOrigem: herdada ? 'herdada' : null,
    classificacaoCongeladaEm: null,
    contaNaGrade: contaNaGradePadrao(formato, herdada),
    legendaBase: null,
    publishDate: null,
    publishTime: null,
    recordingDate: null,
    recordingTime: null,
    recordedAt: null,
    postedAt: null,
    link: null,
    bibliotecaItemId: null,
    livroIds: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    archivedAt: null,
    legacyIdeaId: null,
    plataformas: [],
    ...overrides,
  };
  return { ...draft, ...aplicarLivros(draft) };
}
