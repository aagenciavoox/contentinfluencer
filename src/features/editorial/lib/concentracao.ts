/**
 * Variedade e concentração (Ritmo & Regras Gerais). Os limites são regras de planejamento,
 * não de desempenho: só avisam, não bloqueiam. Sem limite gravado valem os de antes.
 * Exceção intencional cala o aviso daquela obra ou assunto só no período dela; não desliga os outros.
 */

export type LimitesConcentracao = {
  /** Pautas da mesma obra dentro da janela que disparam o aviso. */
  contarSequencia: boolean;
  assuntoRepeticoes: number;
  assuntoJanelaDias: number;
  obraRepeticoes: number;
  /** Tamanho da janela da obra, em dias corridos. */
  obraJanelaDias: number;
  /** Fração das pautas do intervalo acima da qual um assunto está concentrado. */
  assuntoFracaoMax: number;
  /** Mínimo de pautas para a regra de fração do assunto. */
  assuntoMinPautas: number;
};

export const LIMITES_CONCENTRACAO_PADRAO: LimitesConcentracao = {
  contarSequencia: true,
  assuntoRepeticoes: 2,
  assuntoJanelaDias: 7,
  obraRepeticoes: 2,
  obraJanelaDias: 7,
  assuntoFracaoMax: 1 / 3,
  assuntoMinPautas: 3,
};

function inteiroEntre(valor: unknown, minimo: number, maximo: number): number | null {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= minimo && valor <= maximo ? valor : null;
}

/** Lê `editorial_conta.concentracao`. Campo ausente ou fora da faixa usa o padrão. */
export function lerLimitesConcentracao(valor: unknown): LimitesConcentracao {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return LIMITES_CONCENTRACAO_PADRAO;
  const raw = valor as Record<string, unknown>;
  const fracao = typeof raw.assuntoFracaoMax === 'number' && raw.assuntoFracaoMax > 0 && raw.assuntoFracaoMax < 1
    ? raw.assuntoFracaoMax
    : null;
  return {
    contarSequencia: typeof raw.contarSequencia === 'boolean' ? raw.contarSequencia : true,
    assuntoRepeticoes: inteiroEntre(raw.assuntoRepeticoes, 2, 30) ?? LIMITES_CONCENTRACAO_PADRAO.assuntoRepeticoes,
    assuntoJanelaDias: inteiroEntre(raw.assuntoJanelaDias, 1, 90) ?? LIMITES_CONCENTRACAO_PADRAO.assuntoJanelaDias,
    obraRepeticoes: inteiroEntre(raw.obraRepeticoes, 2, 30) ?? LIMITES_CONCENTRACAO_PADRAO.obraRepeticoes,
    obraJanelaDias: inteiroEntre(raw.obraJanelaDias, 1, 90) ?? LIMITES_CONCENTRACAO_PADRAO.obraJanelaDias,
    assuntoFracaoMax: fracao ?? LIMITES_CONCENTRACAO_PADRAO.assuntoFracaoMax,
    assuntoMinPautas: inteiroEntre(raw.assuntoMinPautas, 1, 100) ?? LIMITES_CONCENTRACAO_PADRAO.assuntoMinPautas,
  };
}

/** "acima de 33%", com o denominador visível na frase do aviso. */
export function rotuloFracao(fracao: number): string {
  return `${Math.round(fracao * 100)}%`;
}

/** Uma linha de concentracao_excecao. */
export type ExcecaoConcentracao = {
  id: string;
  tipo: 'obra' | 'assunto';
  alvoId: string;
  /** Null = vale em todas as contas. */
  platformId: string | null;
  inicio: string;
  fim: string;
  nota: string;
};

/**
 * Há exceção intencional para este alvo cobrindo o intervalo inteiro do aviso?
 * Exceção de uma conta só vale quando a análise é daquela conta.
 */
export function excecaoCobre(
  excecoes: readonly ExcecaoConcentracao[],
  alvo: { tipo: ExcecaoConcentracao['tipo']; alvoId: string },
  intervalo: { inicio: string; fim: string },
  platformId: string | null = null,
): ExcecaoConcentracao | null {
  return excecoes.find(excecao => (
    excecao.tipo === alvo.tipo
    && excecao.alvoId === alvo.alvoId
    && (excecao.platformId == null || excecao.platformId === platformId)
    && excecao.inicio <= intervalo.inicio
    && excecao.fim >= intervalo.fim
  )) ?? null;
}

/** Faixas aceitas na tela, as mesmas da leitura (fora delas vale o padrão). */
export const FAIXAS_CONCENTRACAO = {
  assuntoRepeticoes: { min: 2, max: 30 },
  assuntoJanelaDias: { min: 1, max: 90 },
  obraRepeticoes: { min: 2, max: 30 },
  obraJanelaDias: { min: 1, max: 90 },
  /** Em %, só inteiros: 1/3 aparece como 33%. */
  assuntoPercentual: { min: 5, max: 95 },
  assuntoMinPautas: { min: 1, max: 100 },
} as const;

/** Os limites são os padrão? (então nada precisa ser gravado). */
export function limitesPadrao(limites: LimitesConcentracao): boolean {
  const padrao = LIMITES_CONCENTRACAO_PADRAO;
  return limites.contarSequencia === padrao.contarSequencia
    && limites.assuntoRepeticoes === padrao.assuntoRepeticoes
    && limites.assuntoJanelaDias === padrao.assuntoJanelaDias
    && limites.obraRepeticoes === padrao.obraRepeticoes
    && limites.obraJanelaDias === padrao.obraJanelaDias
    && limites.assuntoFracaoMax === padrao.assuntoFracaoMax
    && limites.assuntoMinPautas === padrao.assuntoMinPautas;
}

/** Exceções que ainda valem ou vão valer, pela data de início; as vencidas ficam de fora. */
export function excecoesEmVigor(excecoes: readonly ExcecaoConcentracao[], hoje: string): ExcecaoConcentracao[] {
  return excecoes
    .filter(excecao => excecao.fim >= hoje)
    .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.fim.localeCompare(b.fim));
}

/** O que falta para gravar a exceção; null quando está pronta. */
export function problemaDaExcecao(excecao: Omit<ExcecaoConcentracao, 'id'>): string | null {
  if (!excecao.alvoId) return excecao.tipo === 'obra' ? 'Escolha a obra.' : 'Escolha o assunto.';
  const data = /^\d{4}-\d{2}-\d{2}$/;
  if (!data.test(excecao.inicio) || !data.test(excecao.fim)) return 'Escolha o início e o fim.';
  if (excecao.inicio > excecao.fim) return 'O fim vem depois do início.';
  return null;
}
