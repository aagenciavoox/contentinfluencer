import type { FuncaoEditorial } from '../../../lib/database.ts';
import { FUNCOES } from './funcoes.ts';

/** Abaixo deste total semanal, a prévia e a contagem olham 4 semanas. */
export const LIMITE_GRADE_PEQUENA = 8;
export const SEMANAS_GRADE_PEQUENA = 4;

export function rotuloEspacos(valor: number): string {
  const quantidade = Number.isFinite(valor) ? Math.max(0, Math.floor(valor)) : 0;
  return `${quantidade} ${quantidade === 1 ? 'espaço' : 'espaços'}`;
}

/** Soma os espaços por semana dos pilares ativos. Pilar inativo fica de fora. */
export function somaEspacosSemana(
  pilares: ReadonlyArray<{ ativo?: boolean; frequenciaSemanal?: number | null }>,
): number {
  return pilares.reduce((soma, pilar) => {
    if (pilar.ativo === false) return soma;
    const valor = pilar.frequenciaSemanal;
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return soma;
    return soma + Math.floor(valor);
  }, 0);
}

export function gradePequena(espacosPorSemana: number): boolean {
  return Number.isFinite(espacosPorSemana) && espacosPorSemana > 0 && espacosPorSemana < LIMITE_GRADE_PEQUENA;
}

/** 1 semana, ou 4 quando a grade tem menos de 8 espaços por semana. */
export function semanasDaContagem(espacosPorSemana: number): number {
  if (!Number.isFinite(espacosPorSemana) || espacosPorSemana <= 0) return 1;
  return gradePequena(espacosPorSemana) ? SEMANAS_GRADE_PEQUENA : 1;
}

/** Total da prévia e da contagem. Grade pequena multiplica por 4 semanas. */
export function totalDaContagem(espacosPorSemana: number): number {
  if (!Number.isFinite(espacosPorSemana) || espacosPorSemana <= 0) return 0;
  return Math.floor(espacosPorSemana) * semanasDaContagem(espacosPorSemana);
}

export function percentuaisFechamEm100(percentuais: readonly number[]): boolean {
  if (percentuais.length === 0) return false;
  let soma = 0;
  for (const valor of percentuais) {
    if (!Number.isInteger(valor) || valor < 0) return false;
    soma += valor;
  }
  return soma === 100;
}

/**
 * Reparte `total` inteiros pelos percentuais pelo método do maior resto.
 * A soma do resultado é o total (negativo vira 0). Lista vazia devolve [].
 */
export function distribuirEspacos(total: number, percentuais: readonly number[]): number[] {
  const quantidade = percentuais.length;
  if (quantidade === 0) return [];
  const seguro = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  if (seguro === 0) return Array.from({ length: quantidade }, () => 0);

  const pesos = percentuais.map(valor =>
    typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? Math.round(valor * 1000) : 0,
  );
  const somaPesos = pesos.reduce((soma, peso) => soma + peso, 0);
  if (somaPesos <= 0) {
    const resultado = Array.from({ length: quantidade }, () => 0);
    resultado[0] = seguro;
    return resultado;
  }

  const bases = pesos.map(peso => Math.floor((seguro * peso) / somaPesos));
  const restos = pesos.map(peso => (seguro * peso) % somaPesos);
  let faltam = seguro - bases.reduce((soma, valor) => soma + valor, 0);
  const ordem = restos
    .map((resto, index) => ({ index, resto }))
    .sort((a, b) => b.resto - a.resto || a.index - b.index);

  const resultado = [...bases];
  let cursor = 0;
  while (faltam > 0) {
    resultado[ordem[cursor % ordem.length].index] += 1;
    faltam -= 1;
    cursor += 1;
  }
  return resultado;
}

export function percentuaisNaOrdem(
  distribuicao: Partial<Record<FuncaoEditorial, number>> | null | undefined,
): number[] {
  return FUNCOES.map(funcao => {
    const valor = distribuicao?.[funcao];
    return typeof valor === 'number' && Number.isFinite(valor) ? valor : 0;
  });
}
