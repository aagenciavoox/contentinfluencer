import type { FuncaoEditorial, FuncaoOrigem, FuncaoPadraoSerie } from '../../../lib/database.ts';

export const FUNCOES: FuncaoEditorial[] = [
  'atrair',
  'converter',
  'aprofundar',
  'comunidade',
  'acao',
  'reter',
];

export const FUNCAO_LABELS: Record<FuncaoEditorial, string> = {
  atrair: 'Atrair alcance',
  converter: 'Converter em seguidor',
  aprofundar: 'Aprofundar',
  comunidade: 'Comunidade',
  acao: 'Levar à ação',
  reter: 'Reter',
};

/** Rótulo curto para a faixa de ritmo e os chips do celular. */
export const FUNCAO_CURTA: Record<FuncaoEditorial, string> = {
  atrair: 'Atrair',
  converter: 'Converter',
  aprofundar: 'Aprofundar',
  comunidade: 'Comunidade',
  acao: 'Ação',
  reter: 'Reter',
};

export const FUNCAO_DESCRICOES: Record<FuncaoEditorial, string> = {
  atrair: 'Traz gente nova pelo humor ou pela curiosidade.',
  converter: 'Convida quem chegou a seguir.',
  aprofundar: 'Dá contexto e desenvolve a análise.',
  comunidade: 'Cria conversa e identificação.',
  acao: 'Leva a uma ação concreta.',
  reter: 'Mantém o vínculo com quem já acompanha.',
};

/** Agrupamento calculado. `null` fica fora desse agrupamento. */
export const FUNIL_DA_FUNCAO: Record<FuncaoEditorial, 'topo' | 'meio' | 'fundo' | null> = {
  atrair: 'topo',
  converter: 'topo',
  aprofundar: 'meio',
  comunidade: 'meio',
  acao: 'fundo',
  reter: null,
};

export const ROTULO_ETAPA: Record<'topo' | 'meio' | 'fundo', string> = {
  topo: 'Topo',
  meio: 'Meio',
  fundo: 'Fundo',
};

export function rotuloFuncaoPadrao(value: FuncaoPadraoSerie | null | undefined): string | null {
  if (!value) return null;
  if (value === 'varia') return 'Varia por conteúdo';
  return FUNCAO_LABELS[value];
}

export function rotuloEtapaDaFuncao(funcao: FuncaoEditorial): string {
  const etapa = FUNIL_DA_FUNCAO[funcao];
  return etapa ? ROTULO_ETAPA[etapa] : 'Fora';
}

export function isFuncaoEditorial(value: unknown): value is FuncaoEditorial {
  return typeof value === 'string' && (FUNCOES as readonly string[]).includes(value);
}

/** Função da série que um roteiro pode herdar. `varia` e vazio não herdam valor. */
export function funcaoHerdavelDaSerie(
  serie: { funcaoPadrao?: FuncaoPadraoSerie | null } | null | undefined,
): FuncaoEditorial | null {
  const value = serie?.funcaoPadrao;
  return isFuncaoEditorial(value) ? value : null;
}

export type FuncaoEstado =
  | 'herdada'
  | 'escolhida'
  | 'nenhuma'
  | 'indefinida'
  | 'aplicada'
  | 'migrada';

export type FuncaoResolvida = {
  funcao: FuncaoEditorial | null;
  estado: FuncaoEstado;
  congelada: boolean;
};

type ConteudoFuncao = {
  funcao?: FuncaoEditorial | null;
  funcaoOrigem?: FuncaoOrigem | null;
  classificacaoCongeladaEm?: string | null;
};

const ESTADOS_GRAVADOS = new Set<FuncaoEstado>([
  'herdada',
  'escolhida',
  'nenhuma',
  'aplicada',
  'migrada',
]);

function estadoGravado(origem: FuncaoOrigem | null | undefined): FuncaoEstado | null {
  if (origem && ESTADOS_GRAVADOS.has(origem)) return origem;
  return null;
}

/**
 * Resolve a função efetiva.
 * Enquanto não congela, origem `herdada` lê a série.
 * Congelada, usa o valor copiado no conteúdo e ignora mudança da série.
 */
export function resolveFuncao(
  content: ConteudoFuncao,
  serie?: { funcaoPadrao?: FuncaoPadraoSerie | null } | null,
): FuncaoResolvida {
  const congelada = Boolean(content.classificacaoCongeladaEm);
  const origem = content.funcaoOrigem ?? null;
  const stored = isFuncaoEditorial(content.funcao) ? content.funcao : null;
  const estado = estadoGravado(origem) ?? (stored ? 'escolhida' : 'indefinida');

  if (congelada) {
    return {
      funcao: estado === 'nenhuma' ? null : stored,
      estado,
      congelada: true,
    };
  }

  if (estado === 'herdada') {
    return {
      funcao: funcaoHerdavelDaSerie(serie),
      estado: 'herdada',
      congelada: false,
    };
  }

  if (estado === 'nenhuma' || estado === 'indefinida') {
    return { funcao: null, estado, congelada: false };
  }

  return { funcao: stored, estado, congelada: false };
}

/** Stories, Live e a função reter ficam fora da grade por padrão. */
export function contaNaGradePadrao(
  formato: string | null | undefined,
  funcao: FuncaoEditorial | null | undefined,
): boolean {
  if (funcao === 'reter') return false;
  const normalized = (formato ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  if (normalized === 'stories' || normalized === 'story' || normalized === 'live') return false;
  return true;
}

export function rotuloDaSerie(funcao: FuncaoEditorial | null | undefined): string {
  return funcao ? `Da série (${FUNCAO_LABELS[funcao]})` : 'Da série';
}
