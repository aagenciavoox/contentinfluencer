/** Ocorrências (início, sem sobreposição) de `query` em `text`. Busca vazia: nenhuma. */
export function findAllInText(text: string, query: string, caseSensitive = false): number[] {
  if (!query) return [];
  const haystack = caseSensitive ? text : text.toLocaleLowerCase('pt-BR');
  const needle = caseSensitive ? query : query.toLocaleLowerCase('pt-BR');
  // toLocaleLowerCase pode mudar o tamanho em casos raros; se mudar, cai para a comparação exata.
  if (haystack.length !== text.length || needle.length !== query.length) {
    return findAllInText(text, query, true);
  }
  const result: number[] = [];
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    result.push(index);
    index = haystack.indexOf(needle, index + needle.length);
  }
  return result;
}

export type TextBlock = { pos: number; text: string };
export type FindMatch = { from: number; to: number };

/** Ocorrências em vários blocos (cada um com sua posição inicial no documento). Não atravessa blocos. */
export function findMatchesInBlocks(blocks: TextBlock[], query: string, caseSensitive = false): FindMatch[] {
  const matches: FindMatch[] = [];
  for (const block of blocks) {
    for (const start of findAllInText(block.text, query, caseSensitive)) {
      matches.push({ from: block.pos + start, to: block.pos + start + query.length });
    }
  }
  return matches;
}

/** Índice da próxima/anterior ocorrência, com volta ao início/fim. */
export function stepMatch(current: number, total: number, direction: 1 | -1): number {
  if (total === 0) return -1;
  if (current < 0) return direction === 1 ? 0 : total - 1;
  return (current + direction + total) % total;
}
