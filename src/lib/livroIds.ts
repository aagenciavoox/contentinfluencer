/** Livros citados por um roteiro. A lista é a fonte; o id único cobre o banco antigo. */

export function normalizeLivroIds(ids: readonly unknown[] | null | undefined): string[] {
  if (!ids) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function livroIdsEfetivos(content: {
  livroIds?: readonly string[] | null;
  bibliotecaItemId?: string | null;
}): string[] {
  const fromList = normalizeLivroIds(content.livroIds);
  if (fromList.length > 0) return fromList;
  return content.bibliotecaItemId ? [content.bibliotecaItemId] : [];
}

/** Grava a lista e mantém um livro da lista como origem única. */
export function aplicarLivros(content: {
  livroIds?: readonly string[] | null;
  bibliotecaItemId?: string | null;
}): { livroIds: string[]; bibliotecaItemId: string | null } {
  const livroIds = livroIdsEfetivos(content);
  const bibliotecaItemId = content.bibliotecaItemId && livroIds.includes(content.bibliotecaItemId)
    ? content.bibliotecaItemId
    : (livroIds[0] ?? null);
  return { livroIds, bibliotecaItemId };
}

export function removerLivroId<T extends {
  livroIds?: string[] | null;
  bibliotecaItemId: string | null;
}>(content: T, livroId: string): T {
  const atuais = livroIdsEfetivos(content);
  if (!atuais.includes(livroId) && content.bibliotecaItemId !== livroId) return content;
  const livroIds = atuais.filter(id => id !== livroId);
  const bibliotecaItemId = content.bibliotecaItemId && livroIds.includes(content.bibliotecaItemId)
    ? content.bibliotecaItemId
    : (livroIds[0] ?? null);
  return { ...content, livroIds, bibliotecaItemId };
}
