import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';

/**
 * Etapa de cada item do período, na ordem do processo.
 * Planejamento é o post-it sem conteúdo: a data existe, o conteúdo ainda não.
 * As outras quatro são os status do conteúdo. Nenhuma etapa nova.
 */
export const ETAPAS = ['planejamento', 'ideia', 'roteiro', 'producao', 'postado'] as const;

export type Etapa = typeof ETAPAS[number];

export type ContagemPorEtapa = Record<Etapa, number>;

export const ETAPA_LABEL: Record<Etapa, string> = {
  planejamento: 'Planejamento',
  ideia: 'Ideia',
  roteiro: 'Roteiro',
  producao: 'Produção',
  postado: 'Postado',
};

/** Etapas que são conteúdo. Planejamento fica de fora. */
export const ETAPAS_DE_CONTEUDO: readonly Etapa[] = ['ideia', 'roteiro', 'producao', 'postado'];

/**
 * Status gravado → etapa. Status antigo ("Gravado", "A Editar"…) cai em Produção.
 * Desconhecido cai em Roteiro, como em `getContentStage`.
 */
export function etapaDoStatus(status: string | null | undefined): Etapa {
  const canonical = normalizeContentStatus(status ?? '');
  if (canonical === CONTENT_STATUS.POSTADO) return 'postado';
  if (canonical === CONTENT_STATUS.IDEIA) return 'ideia';
  if (canonical === CONTENT_STATUS.PRODUCAO) return 'producao';
  return 'roteiro';
}

export function contagemPorEtapaVazia(): ContagemPorEtapa {
  return { planejamento: 0, ideia: 0, roteiro: 0, producao: 0, postado: 0 };
}

export function somaDasEtapas(contagem: ContagemPorEtapa): number {
  return ETAPAS.reduce((total, etapa) => total + contagem[etapa], 0);
}
