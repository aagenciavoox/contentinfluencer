/** Conta roteiros por livro a partir do domínio `content` já carregado. */
export function countContentsByBibliotecaItem(
  contents: ReadonlyArray<{ bibliotecaItemId: string | null; deletedAt?: string | null }>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const content of contents) {
    if (content.deletedAt || !content.bibliotecaItemId) continue;
    counts.set(content.bibliotecaItemId, (counts.get(content.bibliotecaItemId) ?? 0) + 1);
  }
  return counts;
}
