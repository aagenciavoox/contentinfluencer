/** Quantidade, período e início que a Saúde usa na série, no quadro ou na temporada. */

/** Períodos gravados. Bimestre, trimestre e semestre são blocos fechados a partir de janeiro. */
export const VALORES_UNIDADE = ['semana', 'quinzena', 'mes', 'bimestre', 'trimestre', 'semestre'] as const;

export type UnidadeDaMeta = (typeof VALORES_UNIDADE)[number];

export const OPCOES_UNIDADE: readonly { value: UnidadeDaMeta; label: string }[] = [
  { value: 'semana', label: 'Semanal' },
  { value: 'quinzena', label: 'Quinzenal' },
  { value: 'mes', label: 'Mensal' },
  { value: 'bimestre', label: 'Bimestral' },
  { value: 'trimestre', label: 'Trimestral' },
  { value: 'semestre', label: 'Semestral' },
];

export type FrequenciaGravada = {
  vezes: number | null;
  unidade: string | null;
  aPartirDe: string | null;
  /** Frase antiga da série. Temporada não grava isto. */
  recomendada: string | null;
};

const UNIDADES = new Set<string>(VALORES_UNIDADE);

/** Teto da quantidade. Acima disso a gravação recusa, em vez de trocar o número. */
export const MAX_VEZES_DA_META = 60;

export type ErroDeFrequencia = {
  erro: string;
  campo: 'quantidade' | 'periodo' | 'inicio';
};

export function ehUnidadeDaMeta(valor: unknown): valor is UnidadeDaMeta {
  return typeof valor === 'string' && UNIDADES.has(valor);
}

export function unidadeDaMeta(valor: string | null | undefined): UnidadeDaMeta {
  return ehUnidadeDaMeta(valor) ? valor : 'semana';
}

const FRASE_UM: Record<UnidadeDaMeta, string> = {
  semana: 'Semanal',
  quinzena: 'Quinzenal',
  mes: 'Mensal',
  bimestre: 'Bimestral',
  trimestre: 'Trimestral',
  semestre: 'Semestral',
};

const FRASE_VARIOS: Record<UnidadeDaMeta, string> = {
  semana: 'por semana',
  quinzena: 'por quinzena',
  mes: 'por mês',
  bimestre: 'por bimestre',
  trimestre: 'por trimestre',
  semestre: 'por semestre',
};

/** "por semana", "a cada 14 dias", "por trimestre". O chip e o resumo da meta usam isto. */
export function complementoDoPeriodo(unidade: string): string {
  if (unidade === 'quinzena') return 'a cada 14 dias';
  return ehUnidadeDaMeta(unidade) ? FRASE_VARIOS[unidade] : 'por semana';
}

function frase(vezes: number, unidade: UnidadeDaMeta): string {
  return vezes === 1 ? FRASE_UM[unidade] : `${vezes} ${FRASE_VARIOS[unidade]}`;
}

/** Frase antiga da série (Semanal, 2 por mês, Trimestral). Unidade desconhecida não vira frase. */
export function fraseDaFrequencia(vezes: number | null, unidade: string): string | null {
  const chave = unidade.trim().toLowerCase();
  if (!ehUnidadeDaMeta(chave)) return null;
  const qtd = vezes && vezes > 0 ? vezes : 1;
  return frase(qtd, chave);
}

/**
 * Meta vazia sai. Zero e acima do teto são erro: não apagam nem trocam o número.
 * Com quantidade, a quinzena exige a data de início dos ciclos.
 * Quadro sem meta fica "Sob demanda", para não herdar uma frase antiga.
 */
export function frequenciaParaGravar(input: {
  vezes: number | null;
  unidade: string | null | undefined;
  aPartirDe: string | null | undefined;
  tipo: 'serie' | 'quadro' | 'temporada';
}): ErroDeFrequencia | FrequenciaGravada {
  if (input.vezes != null && Number.isFinite(input.vezes)) {
    const bruto = Math.trunc(input.vezes);
    if (bruto === 0) {
      return { erro: 'Quantidade zero não apaga a meta. Deixe o campo vazio para tirá-la.', campo: 'quantidade' };
    }
    if (bruto < 0) {
      return { erro: 'A quantidade precisa ser pelo menos 1.', campo: 'quantidade' };
    }
    if (bruto > MAX_VEZES_DA_META) {
      return { erro: `A quantidade máxima da meta é ${MAX_VEZES_DA_META}.`, campo: 'quantidade' };
    }
  }
  const vezes = input.vezes != null && Number.isFinite(input.vezes) && input.vezes > 0
    ? Math.trunc(input.vezes)
    : null;
  if (vezes == null) {
    return {
      vezes: null,
      unidade: null,
      aPartirDe: null,
      recomendada: input.tipo === 'quadro' ? 'Sob demanda' : null,
    };
  }
  const unidade = ehUnidadeDaMeta(input.unidade) ? input.unidade : null;
  if (!unidade) return { erro: 'Escolha o período da meta.', campo: 'periodo' };
  const aPartirDe = input.aPartirDe && /^\d{4}-\d{2}-\d{2}$/.test(input.aPartirDe) ? input.aPartirDe : null;
  if (unidade === 'quinzena' && !aPartirDe) {
    return { erro: 'Meta a cada 14 dias precisa da data de início dos ciclos.', campo: 'inicio' };
  }
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
  const unidade = vezes != null && ehUnidadeDaMeta(meta?.unidade) ? meta.unidade : null;
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
  const unidade = ehUnidadeDaMeta(temporada.frequenciaUnidade) ? temporada.frequenciaUnidade : null;
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
