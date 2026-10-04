/** Pilar que a série ocupa. O principal vale; sem ele, o primeiro vínculo antigo. */
export function pilarPrincipalDaSerie(
  serie: { pilarPrincipalId?: string | null; pilarIds?: readonly string[] | null } | null | undefined,
): string | null {
  if (!serie) return null;
  const principal = serie.pilarPrincipalId?.trim();
  if (principal) return principal;
  return serie.pilarIds?.find(id => id.trim()) ?? null;
}

/** No detalhe, escolher a série preenche o pilar só quando ele ainda está vazio. */
export function patchAoEscolherSerie(
  content: { pilarId?: string | null },
  serie: { id: string; pilarPrincipalId?: string | null; pilarIds?: readonly string[] | null } | null,
): { seriesId: string | null; pilarId?: string } {
  if (!serie) return { seriesId: null };
  const patch: { seriesId: string | null; pilarId?: string } = { seriesId: serie.id };
  if (!content.pilarId) {
    const pilar = pilarPrincipalDaSerie(serie);
    if (pilar) patch.pilarId = pilar;
  }
  return patch;
}
