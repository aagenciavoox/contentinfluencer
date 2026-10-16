/** Filtro de temas da Criação: `?temas=id1,id2`. Passa quem tiver qualquer um. */
export const TEMA_FILTER_PARAM = 'temas';
/** Parâmetros antigos: `?tema=id` (um só) e `?tags=nome,nome` (antes dos temas absorverem as tags). */
export const LEGACY_TEMA_PARAM = 'tema';
export const LEGACY_TAGS_PARAM = 'tags';

/** Nome comparavel: sem #, espacos extras, maiusculas nem acentos ("Vampíro " = "vampiro"). */
export function chaveTemaFiltro(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}
const chave = chaveTemaFiltro;

/**
 * Temas repetidos com o mesmo nome (ex.: "Vampiro" e "vampiro" criados em momentos
 * diferentes) contam como um so: escolher um seleciona todos os ids desse nome.
 */
export function expandTemaFilterIds(
  selected: readonly string[],
  temas: readonly {id: string; nome: string}[] | undefined,
): string[] {
  if (!temas?.length || selected.length === 0) return [...selected];
  const chaves = new Set(selected.flatMap(id => {
    const tema = temas.find(item => item.id === id);
    return tema ? [chave(tema.nome)] : [];
  }));
  const extras = temas.filter(tema => chaves.has(chave(tema.nome))).map(tema => tema.id);
  return [...new Set([...selected, ...extras])];
}

/** Um item por nome no seletor; o id escolhido e o do primeiro tema com aquele nome. */
export function dedupeTemasPorNome<T extends {id: string; nome: string}>(temas: readonly T[]): T[] {
  const vistos = new Set<string>();
  return temas.filter(tema => {
    const key = chave(tema.nome);
    if (vistos.has(key)) return false;
    vistos.add(key);
    return true;
  });
}

export function parseTemaFilterParam(value: string | null | undefined, legacyTemaId?: string | null): string[] {
  const ids = [...(value ?? '').split(','), legacyTemaId ?? ''].map(id => id.trim()).filter(Boolean);
  return [...new Set(ids)];
}

export function serializeTemaFilterParam(ids: readonly string[]): string {
  return [...new Set(ids.map(id => id.trim()).filter(Boolean))].join(',');
}

export function matchesTemaFilter(
  temaIds: readonly string[] | null | undefined,
  selected: readonly string[],
  temas?: readonly {id: string; nome: string}[],
): boolean {
  if (selected.length === 0) return true;
  const own = new Set(temaIds ?? []);
  return expandTemaFilterIds(selected, temas).some(id => own.has(id));
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
