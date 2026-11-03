/**
 * Variedade e concentração (Ritmo & Regras Gerais). Os limites são regras de planejamento,
 * não de desempenho: só avisam, não bloqueiam. Sem limite gravado valem os de antes.
 * Exceção intencional cala o aviso daquela obra ou assunto só no período dela; não desliga os outros.
 */

export type LimitesConcentracao = {
  /** Pautas da mesma obra dentro da janela que disparam o aviso. */
  obraRepeticoes: number;
  /** Tamanho da janela da obra, em dias corridos. */
  obraJanelaDias: number;
  /** Fração das pautas do intervalo acima da qual um assunto está concentrado. */
  assuntoFracaoMax: number;
  /** Com menos pautas que isto no intervalo, não há aviso de assunto. */
  assuntoMinPautas: number;
};

export const LIMITES_CONCENTRACAO_PADRAO: LimitesConcentracao = {
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
