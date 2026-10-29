import type { Content } from '../../../lib/database.ts';
import { createContentDraft } from './createContentDraft.ts';
import { CONTENT_STATUS } from './contentPipeline.ts';

export type OpcoesDerivacao = {
  /** Campos a copiar. Título fica em branco. */
  copiar?: {
    script?: boolean;
    formato?: boolean;
    pilar?: boolean;
    funcao?: boolean;
    referencias?: boolean;
    temas?: boolean;
    notes?: boolean;
    legendaBase?: boolean;
    seriesId?: boolean;
  };
};

/**
 * Novo conteúdo a partir de outro. Grava origem_conteudo_id.
 * Sem publicações, métricas nem marcos. República não usa este caminho.
 */
export function derivarConteudo(origem: Content, opcoes: OpcoesDerivacao = {}): Content {
  const copiar = opcoes.copiar ?? {};
  const comRoteiro = Boolean(copiar.script && origem.script?.trim());

  return createContentDraft({
    title: '',
    status: comRoteiro ? CONTENT_STATUS.ROTEIRO : CONTENT_STATUS.IDEIA,
    origemConteudoId: origem.id,
    seriesId: copiar.seriesId === false ? null : origem.seriesId,
    temporadaId: null,
    script: copiar.script ? origem.script : null,
    scriptOrigem: copiar.script && origem.script?.trim() ? 'autor' : null,
    formatoVisual: copiar.formato ? origem.formatoVisual : null,
    pilarId: copiar.pilar ? origem.pilarId : null,
    pilarOrigem: copiar.pilar && origem.pilarId ? 'escolhida' : null,
    funcao: copiar.funcao ? origem.funcao : null,
    funcaoOrigem: copiar.funcao && origem.funcao ? 'escolhida' : null,
    referencias: copiar.referencias ? origem.referencias : null,
    temaIds: copiar.temas ? [...(origem.temaIds ?? [])] : [],
    notes: copiar.notes ? origem.notes : null,
    legendaBase: copiar.legendaBase ? origem.legendaBase : null,
    plataformas: [],
    postedAt: null,
    recordedAt: null,
    edicaoConcluidaEm: null,
    classificacaoCongeladaEm: null,
    publishDate: null,
    recordingDate: null,
  });
}
