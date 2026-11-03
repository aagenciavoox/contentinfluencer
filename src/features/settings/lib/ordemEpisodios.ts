import type { Content } from '../../../lib/database.ts';

type ComOrdem = Partial<Pick<Content, 'ordemEpisodio'>>;

/** Com número vem antes, em ordem crescente; sem número empata (quem chama desempata). */
export function compararOrdemEpisodio(a: ComOrdem, b: ComOrdem): number {
  const oa = typeof a.ordemEpisodio === 'number' ? a.ordemEpisodio : null;
  const ob = typeof b.ordemEpisodio === 'number' ? b.ordemEpisodio : null;
  if (oa === null && ob === null) return 0;
  if (oa === null) return 1;
  if (ob === null) return -1;
  return oa - ob;
}

export type DirecaoEpisodio = 'subir' | 'descer';

/**
 * Troca o episódio com o vizinho na lista já ordenada e renumera a lista toda (1, 2, 3...).
 * Devolve só quem muda de número. Nas pontas não muda nada.
 */
export function moverEpisodio<T extends { id: string } & ComOrdem>(
  lista: readonly T[],
  id: string,
  direcao: DirecaoEpisodio,
): Array<{ item: T; ordemEpisodio: number }> {
  const indice = lista.findIndex(item => item.id === id);
  const alvo = direcao === 'subir' ? indice - 1 : indice + 1;
  if (indice < 0 || alvo < 0 || alvo >= lista.length) return [];
  const nova = [...lista];
  [nova[indice], nova[alvo]] = [nova[alvo], nova[indice]];
  return nova
    .map((item, posicao) => ({ item, ordemEpisodio: posicao + 1 }))
    .filter(({ item, ordemEpisodio }) => item.ordemEpisodio !== ordemEpisodio);
}
