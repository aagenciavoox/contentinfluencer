import {isActiveCreation} from '../../contents/lib/contentWorkflow.ts';
import {compararOrdemEpisodio} from '../../settings/lib/ordemEpisodios.ts';
import type {Content} from '../../../lib/database.ts';

type Episodio = Pick<Content, 'id' | 'createdAt'> & Partial<Pick<Content, 'temporadaId' | 'ordemEpisodio' | 'archivedAt' | 'deletedAt'>>;

/**
 * "3 de 12": a posição do episódio entre os ativos da mesma temporada.
 * Sem temporada, o conteúdo não entra.
 */
export function rotulosDeEpisodio(contents: readonly Episodio[]): Map<string, string> {
  const porTemporada = new Map<string, Episodio[]>();
  for (const content of contents) {
    if (!content.temporadaId || !isActiveCreation({archivedAt: content.archivedAt ?? null, deletedAt: content.deletedAt ?? null})) continue;
    const lista = porTemporada.get(content.temporadaId);
    if (lista) lista.push(content);
    else porTemporada.set(content.temporadaId, [content]);
  }

  const rotulos = new Map<string, string>();
  for (const lista of porTemporada.values()) {
    const ordenados = [...lista].sort((a, b) =>
      compararOrdemEpisodio(a, b)
      || (a.createdAt || '').localeCompare(b.createdAt || '')
      || a.id.localeCompare(b.id),
    );
    const total = ordenados.length;
    ordenados.forEach((content, indice) => {
      rotulos.set(content.id, `${indice + 1} de ${total}`);
    });
  }
  return rotulos;
}
