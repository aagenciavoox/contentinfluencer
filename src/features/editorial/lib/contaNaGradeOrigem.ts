import type { FuncaoEditorial } from '../../../lib/database.ts';
import { contaNaGradePadrao, normalizarFormato } from './funcoes.ts';

export type ContaNaGradeOrigem = 'manual' | 'regra';

/**
 * O padrão antigo tirava Stories, Live e Reter.
 * Serve só para ler uma linha que ainda não tem origem gravada.
 */
function excecaoLegada(
  formato: string | null | undefined,
  funcao: FuncaoEditorial | null | undefined,
): boolean {
  if (funcao === 'reter') return true;
  const normalized = normalizarFormato(formato);
  return normalized === 'stories' || normalized === 'story' || normalized === 'live';
}

/**
 * Classifica o booleano já salvo, antes da regra nova.
 * false + Stories/Live/Reter veio da regra antiga.
 * false no resto foi desligado à mão.
 * true + Stories/Live/Reter foi ligado à mão.
 * true no resto segue a regra.
 */
export function classificarOrigemContaNaGrade(
  contaNaGrade: boolean,
  formato: string | null | undefined,
  funcao: FuncaoEditorial | null | undefined,
): ContaNaGradeOrigem {
  const excecao = excecaoLegada(formato, funcao);
  if (!contaNaGrade) return excecao ? 'regra' : 'manual';
  return excecao ? 'manual' : 'regra';
}

/**
 * Origem manual obedece ao booleano salvo.
 * Sem origem, classifica o legado e só então aplica o padrão novo.
 * Não regrava a linha.
 */
export function contaNaGradeEfetiva(input: {
  contaNaGrade: boolean;
  contaNaGradeOrigem?: ContaNaGradeOrigem | null;
  formato?: string | null;
  funcao?: FuncaoEditorial | null;
}): boolean {
  const origem = input.contaNaGradeOrigem === 'manual' || input.contaNaGradeOrigem === 'regra'
    ? input.contaNaGradeOrigem
    : classificarOrigemContaNaGrade(input.contaNaGrade, input.formato, input.funcao);
  if (origem === 'manual') return input.contaNaGrade;
  return contaNaGradePadrao(input.formato, input.funcao);
}
