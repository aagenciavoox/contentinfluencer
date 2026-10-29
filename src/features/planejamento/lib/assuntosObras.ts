import type {BibliotecaItem, Content, Tema} from '../../../lib/database.ts';
import type {PlanejamentoPostIt} from './postIt.ts';

/** Livros ligados ao conteúdo: lista, senão o livro único. */
export function idsDeObras(
  content: Pick<Content, 'bibliotecaItemId' | 'livroIds'> | null | undefined,
): string[] {
  if (!content) return [];
  const listed = [...new Set(
    (content.livroIds ?? []).filter(id => typeof id === 'string' && id.trim()).map(id => id.trim()),
  )];
  if (listed.length > 0) return listed;
  const single = content.bibliotecaItemId?.trim();
  return single ? [single] : [];
}

/** Só temas do catálogo (`temaIds`). Tags livres não entram. */
export function nomesDosAssuntos(
  content: Pick<Content, 'temaIds'> | null | undefined,
  catalogo: readonly Pick<Tema, 'id' | 'nome'>[],
): string[] {
  if (!content) return [];
  const porId = new Map(catalogo.map(tema => [tema.id, tema.nome.trim()]));
  return (content.temaIds ?? []).flatMap(id => {
    const nome = porId.get(id)?.trim();
    return nome ? [nome] : [];
  });
}

export function nomesDasObras(
  content: Pick<Content, 'bibliotecaItemId' | 'livroIds'> | null | undefined,
  biblioteca: readonly Pick<BibliotecaItem, 'id' | 'titulo'>[],
): string[] {
  const porId = new Map(biblioteca.map(item => [item.id, item.titulo?.trim() || 'Obra']));
  return idsDeObras(content).flatMap(id => {
    const nome = porId.get(id);
    return nome ? [nome] : [];
  });
}

export function assuntosEmUso<T extends Pick<Tema, 'id' | 'nome'>>(
  postIts: readonly Pick<PlanejamentoPostIt, 'contentId'>[],
  contents: readonly Pick<Content, 'id' | 'temaIds'>[],
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

export function conteudoTemAssunto(
  content: Pick<Content, 'temaIds'> | null,
  temaId: string | null,
): boolean {
  if (!temaId) return true;
  return (content?.temaIds ?? []).includes(temaId);
}
