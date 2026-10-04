import type { Content, Serie } from '../../../lib/database.ts';
import { generateUUID } from '../../../utils/uuid.ts';
import { contaNaGradePadrao, funcaoHerdavelDaSerie } from '../../editorial/lib/funcoes.ts';
import { CONTENT_STATUS } from './contentPipeline.ts';

type CreateContentDraftOverrides = Partial<Content>;

export function createContentDraft(
  overrides: CreateContentDraftOverrides = {},
  serie?: Pick<Serie, 'funcaoPadrao'> | null,
): Content {
  const now = new Date().toISOString();
  const herdada = funcaoHerdavelDaSerie(serie);
  const formato = overrides.formatoVisual ?? null;

  return {
    id: generateUUID(),
    userId: '',
    title: '',
    status: CONTENT_STATUS.ROTEIRO,
    slotType: null,
    seriesId: null,
    pilarId: null,
    cenarioId: null,
    lookId: null,
    formatoVisual: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    writingNotes: null,
    energiaNecessaria: null,
    funcao: null,
    funcaoOrigem: herdada ? 'herdada' : null,
    classificacaoCongeladaEm: null,
    contaNaGrade: contaNaGradePadrao(formato, herdada),
    legendaBase: null,
    publishDate: null,
    publishTime: null,
    recordingDate: null,
    recordedAt: null,
    postedAt: null,
    link: null,
    bibliotecaItemId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    archivedAt: null,
    legacyIdeaId: null,
    plataformas: [],
    ...overrides,
  };
}
