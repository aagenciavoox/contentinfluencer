import type { FuncaoEditorial } from '../../../lib/database.ts';
import { distribuirEspacos } from './distribuirEspacos.ts';
import { FUNCAO_CURTA, FUNCOES } from './funcoes.ts';

/**
 * Proporção fixa de cada objetivo, em %. Vale para todos os períodos.
 * Chave ausente é "sem proporção", não zero.
 */
export type ProporcaoFuncoes = Partial<Record<FuncaoEditorial, number>>;

/** Metas digitadas para um período. Valem só ali e passam na frente da proporção. */
export type AjustesDoPeriodo = Partial<Record<FuncaoEditorial, number>>;

function percentualValido(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 100) return null;
  return value;
}

/** Lê a proporção salva. Valor fora de 0–100 sai; sem nenhuma chave válida, null. */
export function readProporcao(value: unknown): ProporcaoFuncoes | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const proporcao: ProporcaoFuncoes = {};
  let algum = false;
  for (const funcao of FUNCOES) {
    const percentual = percentualValido(raw[funcao]);
    if (percentual == null) continue;
    proporcao[funcao] = percentual;
    algum = true;
  }
  return algum ? proporcao : null;
}

export function somaDaProporcao(proporcao: ProporcaoFuncoes | null | undefined): number {
  if (!proporcao) return 0;
  return FUNCOES.reduce((soma, funcao) => soma + (proporcao[funcao] ?? 0), 0);
}

export function proporcaoFechaEm100(proporcao: ProporcaoFuncoes | null | undefined): boolean {
  return somaDaProporcao(proporcao) === 100;
}

/** 100% repartido entre os objetivos pelo maior resto: 17, 17, 17, 17, 16, 16. */
export function proporcaoIgual(funcoes: readonly FuncaoEditorial[] = FUNCOES): ProporcaoFuncoes {
  const partes = distribuirEspacos(100, funcoes.map(() => 1));
  const proporcao: ProporcaoFuncoes = {};
  funcoes.forEach((funcao, index) => { proporcao[funcao] = partes[index]; });
  return proporcao;
}

/**
 * Meta de cada objetivo = proporção × limite, pelo maior resto: a soma bate com o limite.
 * Sem limite ou sem proporção, não há número a calcular.
 */
export function metasDaProporcao(
  limite: number | null | undefined,
  proporcao: ProporcaoFuncoes | null | undefined,
): Partial<Record<FuncaoEditorial, number>> {
  if (limite == null || !Number.isFinite(limite) || limite < 0) return {};
  if (!proporcao || somaDaProporcao(proporcao) <= 0) return {};
  const partes = distribuirEspacos(limite, FUNCOES.map(funcao => proporcao[funcao] ?? 0));
  const metas: Partial<Record<FuncaoEditorial, number>> = {};
  FUNCOES.forEach((funcao, index) => {
    if (proporcao[funcao] != null) metas[funcao] = partes[index];
  });
  return metas;
}

export type OrigemDaMeta = 'ajustada' | 'proporcao' | null;

export type MetaDoObjetivo = {
  funcao: FuncaoEditorial;
  /** Número que vale no período. Null quando não há ajuste nem conta possível. */
  meta: number | null;
  /** Quanto a proporção daria, mesmo quando há ajuste. */
  calculada: number | null;
  percentual: number | null;
  origem: OrigemDaMeta;
};

/** O ajuste do período passa na frente; sem ajuste, vale a proporção × limite. */
export function metasDoPeriodo({
  limite,
  proporcao,
  ajustes,
}: {
  limite: number | null | undefined;
  proporcao: ProporcaoFuncoes | null | undefined;
  ajustes: AjustesDoPeriodo | null | undefined;
}): Record<FuncaoEditorial, MetaDoObjetivo> {
  const calculadas = metasDaProporcao(limite, proporcao);
  const resultado = {} as Record<FuncaoEditorial, MetaDoObjetivo>;
  for (const funcao of FUNCOES) {
    const ajuste = ajustes?.[funcao];
    const calculada = calculadas[funcao] ?? null;
    const temAjuste = typeof ajuste === 'number' && Number.isInteger(ajuste) && ajuste >= 0;
    resultado[funcao] = {
      funcao,
      meta: temAjuste ? ajuste : calculada,
      calculada,
      percentual: proporcao?.[funcao] ?? null,
      origem: temAjuste ? 'ajustada' : calculada != null ? 'proporcao' : null,
    };
  }
  return resultado;
}

export type DiferencaDaMeta = { funcao: FuncaoEditorial; quantidade: number };

export type ResumoDasMetas = {
  faltam: DiferencaDaMeta[];
  passaram: DiferencaDaMeta[];
};

/** Compara previstos com a meta. Objetivo sem meta não entra: não há com o que comparar. */
export function resumoDasMetas(
  linhas: ReadonlyArray<{ funcao: FuncaoEditorial; meta: number | null; previsto: number }>,
): ResumoDasMetas {
  const faltam: DiferencaDaMeta[] = [];
  const passaram: DiferencaDaMeta[] = [];
  for (const linha of linhas) {
    if (linha.meta == null) continue;
    const diferenca = linha.meta - linha.previsto;
    if (diferenca > 0) faltam.push({ funcao: linha.funcao, quantidade: diferenca });
    else if (diferenca < 0) passaram.push({ funcao: linha.funcao, quantidade: -diferenca });
  }
  return { faltam, passaram };
}

/** "Falta 1 de Converter", "Faltam 2 de Atrair", "Atrair passou 1". */
export function frasesDoResumo(
  resumo: ResumoDasMetas,
  nomes: Record<FuncaoEditorial, string> = FUNCAO_CURTA,
): string[] {
  return [
    ...resumo.faltam.map(({ funcao, quantidade }) => (
      quantidade === 1 ? `Falta 1 de ${nomes[funcao]}` : `Faltam ${quantidade} de ${nomes[funcao]}`
    )),
    ...resumo.passaram.map(({ funcao, quantidade }) => `${nomes[funcao]} passou ${quantidade}`),
  ];
}
