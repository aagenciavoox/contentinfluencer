import type { Content, Serie } from '../../../lib/database.ts';
import { aplicarLivros } from '../../../lib/livroIds.ts';
import { generateUUID } from '../../../utils/uuid.ts';
import { aplicarEscolhasDaSerie } from '../../editorial/lib/escolhasSerie.ts';
import { contaNaGradePadrao, funcaoHerdavelDaSerie } from '../../editorial/lib/funcoes.ts';
import { CONTENT_STATUS } from './contentPipeline.ts';

type CreateContentDraftOverrides = Partial<Content>;

type SerieDoRascunho = Pick<
  Serie,
  'id' | 'funcaoPadrao' | 'formatoVisualPadrao' | 'energiaPadrao' | 'pilarPrincipalId' | 'pilarIds'
>;

export function createContentDraft(
  overrides: CreateContentDraftOverrides = {},
  serie?: SerieDoRascunho | null,
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
    pilarId: null,
    pilarOrigem: null,
    cenarioId: null,
    lookId: null,
    formatoVisual: formato,
    script: null,
    scriptOrigem: null,
    scriptNotes: [],
    tags: [],
    temaIds: [],
    notes: null,
    referencias: null,
    writingNotes: null,
    energiaNecessaria: serie?.energiaPadrao ?? null,
    funcao: null,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
    contaNaGrade: contaNaGradePadrao(formato, herdada),
    contaNaGradeOrigem: 'regra',
    redeReferenciaCongeladaId: null,
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
  const comSerie = serie?.id ? aplicarEscolhasDaSerie(draft, serie) : draft;
  return { ...comSerie, ...aplicarLivros(comSerie) };
}
