import type { FuncaoEditorial, FuncaoOrigem } from '../../../lib/database.ts';
import { isFuncaoEditorial } from './funcoes.ts';

export type ConteudoAplicavel = {
  seriesId?: string | null;
  funcao?: FuncaoEditorial | null;
  funcaoOrigem?: FuncaoOrigem | null;
  classificacaoCongeladaEm?: string | null;
  deletedAt?: string | null;
};

/** Publicados que ainda carregam a função herdada e podem receber a nova. */
export function conteudosParaAplicarFuncao<T extends ConteudoAplicavel>(
  contents: readonly T[],
  serieId: string,
): T[] {
  return contents.filter(content =>
    content.seriesId === serieId
    && !content.deletedAt
    && content.funcaoOrigem === 'herdada'
    && Boolean(content.classificacaoCongeladaEm),
  );
}

export function devePerguntarAplicarFuncao(
  anterior: FuncaoEditorial | 'varia' | null | undefined,
  proxima: FuncaoEditorial | 'varia' | null | undefined,
  quantidade: number,
): boolean {
  return quantidade > 0 && anterior !== proxima && isFuncaoEditorial(proxima);
}

/** Copia a função da série e marca a origem como aplicada. */
export function aplicarFuncaoPublicada<T extends ConteudoAplicavel>(
  content: T,
  funcao: FuncaoEditorial,
): T {
  return {
    ...content,
    funcao,
    funcaoOrigem: 'aplicada',
  };
}
