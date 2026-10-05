import type {Content, Tema} from '../../../lib/database.ts';
import type {PlanejamentoPostIt} from './postIt.ts';

type ConteudoComTemas = Pick<Content, 'id' | 'temaIds'>;
type TemaDoCatalogo = Pick<Tema, 'id' | 'nome'>;

export function nomesDosTemas(
  temaIds: readonly string[] | null | undefined,
  catalogo: readonly TemaDoCatalogo[],
): string[] {
  const porId = new Map(catalogo.map(tema => [tema.id, tema.nome]));
  return (temaIds ?? []).flatMap(id => {
    const nome = porId.get(id)?.trim();
    return nome ? [nome] : [];
  });
}

/** Temas dos conteúdos puxados para algum post-it, em ordem alfabética. */
export function temasEmUso<T extends TemaDoCatalogo>(
  postIts: readonly Pick<PlanejamentoPostIt, 'contentId'>[],
  contents: readonly ConteudoComTemas[],
  catalogo: readonly T[],
): T[] {
  const porId = new Map(contents.map(content => [content.id, content]));
  const usados = new Set<string>();
  for (const postIt of postIts) {
    const content = postIt.contentId ? porId.get(postIt.contentId) : null;
    for (const id of content?.temaIds ?? []) usados.add(id);
  }
  return catalogo
    .filter(tema => usados.has(tema.id))
    .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'));
}

export function conteudoTemTema(
  content: Pick<Content, 'temaIds'> | null,
  temaId: string | null,
): boolean {
  if (!temaId) return true;
  return (content?.temaIds ?? []).includes(temaId);
}
