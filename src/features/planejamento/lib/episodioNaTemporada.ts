import {differenceInCalendarDays, parseISO} from 'date-fns';
import {isActiveCreation, isPostedContent} from '../../contents/lib/contentWorkflow.ts';
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

type EpisodioDoProgresso = Pick<Content, 'id' | 'status'> & Partial<Pick<Content, 'temporadaId' | 'archivedAt' | 'deletedAt' | 'postedAt' | 'publishDate'>>;

export type ProgressoDaOnda = {
  publicados: number;
  total: number;
  /** Dias desde a última publicação da wave; null sem publicação. */
  diasDesdeUltima: number | null;
};

/**
 * "Wave 3/12": publicados entre os episódios ativos de cada temporada, e há quantos dias
 * saiu o último. A data da publicação é postedAt, ou a data marcada quando falta.
 */
export function progressoDasOndas(contents: readonly EpisodioDoProgresso[], hoje: string): Map<string, ProgressoDaOnda> {
  const porOnda = new Map<string, {publicados: number; total: number; ultima: string | null}>();
  for (const content of contents) {
    if (!content.temporadaId || !isActiveCreation({archivedAt: content.archivedAt ?? null, deletedAt: content.deletedAt ?? null})) continue;
    const atual = porOnda.get(content.temporadaId) ?? {publicados: 0, total: 0, ultima: null};
    atual.total += 1;
    if (isPostedContent({status: content.status, postedAt: content.postedAt ?? null})) {
      atual.publicados += 1;
      const data = (content.postedAt || content.publishDate || '').slice(0, 10);
      if (data && data <= hoje && (!atual.ultima || data > atual.ultima)) atual.ultima = data;
    }
    porOnda.set(content.temporadaId, atual);
  }
  const resultado = new Map<string, ProgressoDaOnda>();
  for (const [id, onda] of porOnda) {
    resultado.set(id, {
      publicados: onda.publicados,
      total: onda.total,
      diasDesdeUltima: onda.ultima ? differenceInCalendarDays(parseISO(hoje), parseISO(onda.ultima)) : null,
    });
  }
  return resultado;
}

/** Dias sem publicar a partir dos quais a wave aparece como parada (a distância dela, ou 7). */
export const DIAS_PARA_PARADA = 7;

/** "Wave 3/12 · parada há 9 dias". Concluída não fica parada. */
export function textoDoProgresso(progresso: ProgressoDaOnda, limiteDias?: number | null): string {
  const base = `Wave ${progresso.publicados}/${progresso.total}`;
  const limite = limiteDias && limiteDias > 0 ? limiteDias : DIAS_PARA_PARADA;
  const emAndamento = progresso.publicados < progresso.total;
  if (emAndamento && progresso.diasDesdeUltima != null && progresso.diasDesdeUltima >= limite) {
    return `${base} · parada há ${progresso.diasDesdeUltima} ${progresso.diasDesdeUltima === 1 ? 'dia' : 'dias'}`;
  }
  return base;
}
