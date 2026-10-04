import { livroIdsEfetivos } from '../../../lib/livroIds.ts';

/** Conta roteiros por livro a partir da lista `livroIds` já carregada. */
export function countContentsByBibliotecaItem(
  contents: ReadonlyArray<{
    bibliotecaItemId?: string | null;
    livroIds?: readonly string[] | null;
    deletedAt?: string | null;
  }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const content of contents) {
    if (content.deletedAt) continue;
    for (const id of livroIdsEfetivos(content)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}
