/**
 * `tags` virou só compatibilidade. Tema é o agrupamento do roteiro.
 * Ficam em contents.tags apenas as marcas internas de produção (gravar, editar).
 * O resto vira tema.
 */
export const TAGS_DE_PRODUCAO: ReadonlySet<string> = new Set(['gravar', 'editar']);

function limpar(tag: string): string {
  return tag.trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim();
}

export function separarTags(tags: readonly string[] | null | undefined): {producao: string[]; temas: string[]} {
  const producao: string[] = [];
  const temas: string[] = [];
  const vistos = new Set<string>();
  for (const bruta of tags ?? []) {
    const tag = limpar(String(bruta ?? ''));
    const chave = tag.toLocaleLowerCase('pt-BR');
    if (!tag || vistos.has(chave)) continue;
    vistos.add(chave);
    if (TAGS_DE_PRODUCAO.has(chave)) producao.push(chave);
    else temas.push(tag);
  }
  return {producao, temas};
}

/** Junta temas pedidos com os que vieram em `tags`, sem repetir (ignora maiúsculas). */
export function juntarTemas(...listas: ReadonlyArray<readonly string[] | undefined>): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const item of listas.flatMap(lista => lista ?? [])) {
    const nome = limpar(item);
    const chave = nome.toLocaleLowerCase('pt-BR');
    if (!nome || vistos.has(chave)) continue;
    vistos.add(chave);
    out.push(nome);
  }
  return out;
}
