/** Filtro de temas da Criação: `?temas=id1,id2`. Passa quem tiver qualquer um. */
export const TEMA_FILTER_PARAM = 'temas';
/** Parâmetros antigos: `?tema=id` (um só) e `?tags=nome,nome` (antes dos temas absorverem as tags). */
export const LEGACY_TEMA_PARAM = 'tema';
export const LEGACY_TAGS_PARAM = 'tags';

function chave(nome: string): string {
  return nome.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

export function parseTemaFilterParam(value: string | null | undefined, legacyTemaId?: string | null): string[] {
  const ids = [...(value ?? '').split(','), legacyTemaId ?? ''].map(id => id.trim()).filter(Boolean);
  return [...new Set(ids)];
}

export function serializeTemaFilterParam(ids: readonly string[]): string {
  return [...new Set(ids.map(id => id.trim()).filter(Boolean))].join(',');
}

export function matchesTemaFilter(temaIds: readonly string[] | null | undefined, selected: readonly string[]): boolean {
  if (selected.length === 0) return true;
  const own = new Set(temaIds ?? []);
  return selected.some(id => own.has(id));
}

/** `?tags=` antigo vira ids de tema pelo nome (sem diferenciar maiúsculas). Nome sem tema some. */
export function temaIdsFromLegacyTags(
  value: string | null | undefined,
  temas: readonly {id: string; nome: string}[],
): string[] {
  const porNome = new Map(temas.map(tema => [chave(tema.nome), tema.id]));
  const ids = (value ?? '').split(',').flatMap(nome => {
    const id = porNome.get(chave(nome));
    return id ? [id] : [];
  });
  return [...new Set(ids)];
}

/**
 * Reescreve a URL antiga: junta `?tema=` e `?tags=` em `?temas=`.
 * Devolve null se não há nada a reescrever.
 */
export function migrateLegacyTemaParams(
  params: URLSearchParams,
  temas: readonly {id: string; nome: string}[],
): URLSearchParams | null {
  if (!params.has(LEGACY_TEMA_PARAM) && !params.has(LEGACY_TAGS_PARAM)) return null;
  const ids = [
    ...parseTemaFilterParam(params.get(TEMA_FILTER_PARAM), params.get(LEGACY_TEMA_PARAM)),
    ...temaIdsFromLegacyTags(params.get(LEGACY_TAGS_PARAM), temas),
  ];
  const next = new URLSearchParams(params);
  next.delete(LEGACY_TEMA_PARAM);
  next.delete(LEGACY_TAGS_PARAM);
  const serialized = serializeTemaFilterParam(ids);
  if (serialized) next.set(TEMA_FILTER_PARAM, serialized);
  else next.delete(TEMA_FILTER_PARAM);
  return next;
}
