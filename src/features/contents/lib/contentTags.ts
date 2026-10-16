/**
 * Tags de usuário de um conteúdo (coluna `contents.tags`, text[]).
 * As tags técnicas de produção ("gravar", "editar", ver PRODUCTION_TAGS) moram
 * na mesma coluna, mas não aparecem nem são editadas como tag.
 */
export const TECHNICAL_CONTENT_TAGS: ReadonlySet<string> = new Set(['gravar', 'editar']);

/** Parâmetro de URL do filtro de tags na Criação. */
export const TAG_FILTER_PARAM = 'tags';

export function tagKey(tag: string): string {
  return normalizeTag(tag).toLocaleLowerCase('pt-BR');
}

/** Tira espaços extras e "#" do começo. */
export function normalizeTag(raw: string | null | undefined): string {
  return (raw ?? '').trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim();
}

export function isTechnicalTag(tag: string): boolean {
  return TECHNICAL_CONTENT_TAGS.has(tagKey(tag));
}

/** Lista normalizada, sem vazias e sem repetir (ignora maiúsculas). */
export function normalizeTags(tags: readonly (string | null | undefined)[] | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags ?? []) {
    const tag = normalizeTag(raw);
    const key = tag.toLocaleLowerCase('pt-BR');
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

/** Tags que a pessoa vê e edita. */
export function userTags(tags: readonly string[] | null | undefined): string[] {
  return normalizeTags(tags).filter(tag => !isTechnicalTag(tag));
}

/**
 * Aplica a edição das tags de usuário mantendo as técnicas que já estavam salvas.
 */
export function applyUserTags(current: readonly string[] | null | undefined, edited: readonly string[]): string[] {
  const technical = (current ?? []).filter(tag => isTechnicalTag(tag));
  return normalizeTags([...technical, ...edited.filter(tag => !isTechnicalTag(tag))]);
}

/** Todas as tags de usuário já usadas, para sugerir e filtrar. Ordem alfabética. */
export function collectTagOptions(contents: readonly {tags?: readonly string[] | null}[]): string[] {
  return normalizeTags(contents.flatMap(content => userTags(content.tags)))
    .sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

/** Passa no filtro se tiver qualquer uma das tags escolhidas. Sem escolha, tudo passa. */
export function matchesTagFilter(tags: readonly string[] | null | undefined, selected: readonly string[]): boolean {
  if (selected.length === 0) return true;
  const own = new Set(userTags(tags).map(tagKey));
  return selected.some(tag => own.has(tagKey(tag)));
}

export function parseTagFilterParam(value: string | null | undefined): string[] {
  return normalizeTags((value ?? '').split(','));
}

export function serializeTagFilterParam(tags: readonly string[]): string {
  return normalizeTags(tags).map(tag => tag.replace(/,/g, ' ')).join(',');
}
