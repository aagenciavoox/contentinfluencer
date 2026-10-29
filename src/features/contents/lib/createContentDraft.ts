import type { Content, Serie } from '../../../lib/database.ts';
import { aplicarLivros } from '../../../lib/livroIds.ts';
import { generateUUID } from '../../../utils/uuid.ts';
import { aplicarEscolhasDaSerie } from '../../editorial/lib/escolhasSerie.ts';
import { contaNaGradePadrao, funcaoHerdavelDaSerie } from '../../editorial/lib/funcoes.ts';
import { resolverHerancaSerie } from '../../editorial/lib/herancaSerie.ts';
import { CONTENT_STATUS } from './contentPipeline.ts';

type CreateContentDraftOverrides = Partial<Content>;

type SerieDoRascunho = Pick<
  Serie,
  'id' | 'funcaoPadrao' | 'formatoVisualPadrao' | 'energiaPadrao' | 'pilarPrincipalId' | 'pilarIds'
>;

/**
 * Cria rascunho de conteúdo. Com `catalogoSeries`, aplica o resolvedor de herança
 * (pilar, função, modelo, legenda, formato, energia) sem sobrescrever texto próprio.
 */
export function createContentDraft(
  overrides: CreateContentDraftOverrides = {},
  serie?: SerieDoRascunho | null,
  catalogoSeries?: readonly Serie[] | null,
): Content {
  const now = new Date().toISOString();
  const herdada = funcaoHerdavelDaSerie(serie);
  const formato = overrides.formatoVisual ?? serie?.formatoVisualPadrao?.[0] ?? null;

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
    origemConteudoId: null,
    temporadaId: null,
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

  if (catalogoSeries && catalogoSeries.length > 0 && (comSerie.seriesId || serie?.id)) {
    const alvo = { ...comSerie, seriesId: comSerie.seriesId ?? serie?.id ?? null };
    const resolvido = resolverHerancaSerie(alvo, catalogoSeries);
    const scriptVazio = !(alvo.script?.trim());
    const legendaVazia = !(alvo.legendaBase?.trim());
    const comHeranca: Content = {
      ...alvo,
      pilarId: resolvido.pilar.pilarId,
      pilarOrigem: resolvido.pilar.estado === 'herdada' || resolvido.pilar.estado === 'vazia'
        ? (resolvido.pilar.pilarId ? 'herdada' : alvo.pilarOrigem)
        : alvo.pilarOrigem,
      funcao: resolvido.funcao.funcao,
      funcaoOrigem: resolvido.funcao.estado === 'herdada' || resolvido.funcao.estado === 'varia' || resolvido.funcao.estado === 'vazia'
        ? (resolvido.funcao.funcao ? 'herdada' : alvo.funcaoOrigem ?? 'herdada')
        : alvo.funcaoOrigem,
      formatoVisual: alvo.formatoVisual?.trim()
        || resolvido.formato[0]
        || null,
      energiaNecessaria: alvo.energiaNecessaria ?? resolvido.energia,
      script: scriptVazio && resolvido.modelo.template
        ? resolvido.modelo.template
        : alvo.script,
      scriptOrigem: scriptVazio && resolvido.modelo.template ? 'modelo' : alvo.scriptOrigem,
      legendaBase: legendaVazia ? resolvido.legendaBase.legendaBase : alvo.legendaBase,
    };
    comHeranca.contaNaGrade = contaNaGradePadrao(comHeranca.formatoVisual, comHeranca.funcao);
    return { ...comHeranca, ...aplicarLivros(comHeranca) };
  }

  return { ...comSerie, ...aplicarLivros(comSerie) };
}
