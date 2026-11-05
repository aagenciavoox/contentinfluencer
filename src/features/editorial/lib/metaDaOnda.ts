/** Quantidade, período e início que a Saúde usa na série, no quadro ou na temporada. */

export type UnidadeDaMeta = 'semana' | 'quinzena' | 'mes';

export type FrequenciaGravada = {
  vezes: number | null;
  unidade: string | null;
  aPartirDe: string | null;
  /** Frase antiga da série. Temporada não grava isto. */
  recomendada: string | null;
};

const UNIDADES = new Set<UnidadeDaMeta>(['semana', 'quinzena', 'mes']);

export function unidadeDaMeta(valor: string | null | undefined): UnidadeDaMeta {
  return valor === 'quinzena' || valor === 'mes' ? valor : 'semana';
}

function frase(vezes: number, unidade: UnidadeDaMeta): string {
  if (unidade === 'semana') return vezes === 1 ? 'Semanal' : `${vezes} por semana`;
  if (unidade === 'quinzena') return vezes === 1 ? 'Quinzenal' : `${vezes} por quinzena`;
  return vezes === 1 ? 'Mensal' : `${vezes} por mês`;
}

/**
 * Meta vazia sai. Com quantidade, a quinzena exige a data de início dos ciclos.
 * Quadro sem meta fica "Sob demanda", para não herdar uma frase antiga.
 */
export function frequenciaParaGravar(input: {
  vezes: number | null;
  unidade: string | null | undefined;
  aPartirDe: string | null | undefined;
  tipo: 'serie' | 'quadro' | 'temporada';
}): { erro: string } | FrequenciaGravada {
  const vezes = input.vezes != null && Number.isFinite(input.vezes) && input.vezes > 0
    ? Math.min(60, Math.trunc(input.vezes))
    : null;
  if (vezes == null) {
    return {
      vezes: null,
      unidade: null,
      aPartirDe: null,
      recomendada: input.tipo === 'quadro' ? 'Sob demanda' : null,
    };
  }
  const unidade = UNIDADES.has(input.unidade as UnidadeDaMeta) ? input.unidade as UnidadeDaMeta : null;
  if (!unidade) return { erro: 'Escolha o período da meta.' };
  const aPartirDe = input.aPartirDe && /^\d{4}-\d{2}-\d{2}$/.test(input.aPartirDe) ? input.aPartirDe : null;
  if (unidade === 'quinzena' && !aPartirDe) return { erro: 'Meta a cada 14 dias precisa da data de início dos ciclos.' };
  return {
    vezes,
    unidade,
    aPartirDe,
    recomendada: frase(vezes, unidade),
  };
}

type Linha = Record<string, unknown>;

/** Meta e acompanhamento da wave, lidos de serie_acompanhamento (escopo 'temporada') e serie_meta. */
export type OndaGravada = {
  acompanhar: boolean;
  ritmoProprio: boolean;
  frequenciaVezes: number | null;
  frequenciaUnidade: UnidadeDaMeta | null;
  frequenciaAPartirDe: string | null;
  /** Janela e regras do acompanhamento da wave, como no acompanhamento geral da série. */
  inicio: string | null;
  termino: string | null;
  distanciaMaxDias: number | null;
  evitarDiasSeguidos: boolean;
};

function dia(valor: unknown): string | null {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor) ? valor.slice(0, 10) : null;
}

/**
 * Ritmo próprio: a wave anda sozinha e os episódios dela saem da conta da série de cima.
 * Só vale com meta própria; com meta, fica ligado a não ser que tenha sido desligado.
 */
export function ritmoProprioDaOnda(onda: { ritmoProprio?: boolean | null; frequenciaVezes?: number | null }): boolean {
  if (!(typeof onda.frequenciaVezes === 'number' && onda.frequenciaVezes > 0)) return false;
  return onda.ritmoProprio !== false;
}

/** A wave da temporada a partir das linhas de acompanhamento e meta da série. */
export function ondaDasLinhas(temporadaId: string, acompanhamentos: readonly Linha[], metas: readonly Linha[]): OndaGravada {
  const acompanhamento = acompanhamentos.find(row => row.escopo === 'temporada' && String(row.temporada_id ?? '') === temporadaId);
  const meta = metas.find(row => row.temporada_id != null && String(row.temporada_id) === temporadaId);
  const vezes = typeof meta?.vezes === 'number' && meta.vezes > 0 ? meta.vezes : null;
  const unidade = vezes != null && UNIDADES.has(meta?.unidade as UnidadeDaMeta) ? meta!.unidade as UnidadeDaMeta : null;
  const aPartirDe = vezes != null && typeof meta?.a_partir_de === 'string' && meta.a_partir_de ? meta.a_partir_de.slice(0, 10) : null;
  return {
    acompanhar: acompanhamento != null && acompanhamento.ativo !== false,
    ritmoProprio: ritmoProprioDaOnda({ ritmoProprio: acompanhamento ? acompanhamento.ritmo_proprio !== false : null, frequenciaVezes: vezes }),
    frequenciaVezes: unidade ? vezes : null,
    frequenciaUnidade: unidade,
    frequenciaAPartirDe: unidade ? aPartirDe : null,
    inicio: dia(acompanhamento?.inicio),
    termino: dia(acompanhamento?.termino),
    distanciaMaxDias: typeof acompanhamento?.distancia_max_dias === 'number' && acompanhamento.distancia_max_dias > 0
      ? acompanhamento.distancia_max_dias
      : null,
    evitarDiasSeguidos: acompanhamento?.evitar_dias_seguidos === true,
  };
}

/**
 * Linhas para gravar a wave: acompanhamento (quando ligado ou com meta) e meta (quando há quantidade e período).
 * Sem nenhuma das duas, a wave volta a ser só um agrupamento de episódios.
 */
export function linhasDaOnda(temporada: {
  id: string;
  userId: string;
  serieId: string;
  acompanhar?: boolean;
  ritmoProprio?: boolean | null;
  frequenciaVezes?: number | null;
  frequenciaUnidade?: string | null;
  frequenciaAPartirDe?: string | null;
  acompanhamentoInicio?: string | null;
  acompanhamentoTermino?: string | null;
  distanciaMaxDias?: number | null;
  evitarDiasSeguidos?: boolean;
}): { acompanhamento: Linha | null; meta: Linha | null } {
  const vezes = typeof temporada.frequenciaVezes === 'number' && temporada.frequenciaVezes > 0 ? Math.trunc(temporada.frequenciaVezes) : null;
  const unidade = UNIDADES.has(temporada.frequenciaUnidade as UnidadeDaMeta) ? temporada.frequenciaUnidade as UnidadeDaMeta : null;
  const meta = vezes != null && unidade && (unidade !== 'quinzena' || temporada.frequenciaAPartirDe)
    ? {
      user_id: temporada.userId,
      serie_id: temporada.serieId,
      temporada_id: temporada.id,
      platform_id: null,
      formato: null,
      vezes,
      unidade,
      a_partir_de: temporada.frequenciaAPartirDe || null,
    }
    : null;
  const acompanhamento = temporada.acompanhar === true || meta
    ? {
      user_id: temporada.userId,
      serie_id: temporada.serieId,
      escopo: 'temporada',
      temporada_id: temporada.id,
      platform_id: null,
      formato: null,
      ativo: temporada.acompanhar === true,
      ritmo_proprio: temporada.ritmoProprio !== false,
      inicio: temporada.acompanhamentoInicio || null,
      termino: temporada.acompanhamentoTermino || null,
      distancia_max_dias: typeof temporada.distanciaMaxDias === 'number' && temporada.distanciaMaxDias > 0
        ? Math.trunc(temporada.distanciaMaxDias)
        : null,
      evitar_dias_seguidos: temporada.evitarDiasSeguidos === true,
    }
    : null;
  return { acompanhamento, meta };
}
