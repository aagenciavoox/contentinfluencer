import {canPullContent, type PlanejamentoPostIt} from './postIt.ts';
import type {Content} from '../../../lib/database.ts';
import type {GradeSerie} from '../../editorial/lib/gradeEntries.ts';
import {
  buildPublishCalendarItems,
  isScheduledItem,
} from '../../editorial-calendar/lib/publishCalendarItems.ts';

export type PublicacaoNoDia = {
  id: string;
  contentId: string;
  titulo: string;
  time: string | null;
  platformNames: string[];
  estado: 'postado' | 'programado' | 'previsto';
};

/**
 * Publicações e previsões datadas. Uma data prevista mantém a etapa real.
 * Só leitura: os post-its continuam sendo o plano.
 */
export function publicacoesPorDia(input: {
  contents: readonly Content[];
  platforms: readonly {id: string; nome: string}[];
  series: readonly GradeSerie[];
  redeReferenciaId: string | null;
  hoje?: string;
  postIts?: readonly PlanejamentoPostIt[];
}): Map<string, PublicacaoNoDia[]> {
  const titulos = new Map(input.contents.map(content => [content.id, content.title?.trim() || 'Sem título']));
  const porId = new Map(input.contents.map(content => [content.id, content]));
  const map = new Map<string, PublicacaoNoDia[]>();

  for (const item of buildPublishCalendarItems({...input, platformFilter: 'todas'})) {
    if (!item.date) continue;
    const content = porId.get(item.contentId);
    const estado = item.posted ? 'postado' : isScheduledItem(item, content) ? 'programado' : content && canPullContent(content) ? 'previsto' : null;
    if (!estado) continue;
    const dia = item.date.slice(0, 10);
    // O vínculo é o cartão do original. Ciclos de repost permanecem independentes.
    if (item.id.endsWith(':original') && input.postIts?.some(postIt => postIt.contentId === item.contentId && postIt.date === dia)) continue;
    const lista = map.get(dia) ?? [];
    lista.push({
      id: item.id,
      contentId: item.contentId,
      titulo: titulos.get(item.contentId) ?? 'Sem título',
      time: item.time,
      platformNames: item.platformNames,
      estado,
    });
    map.set(dia, lista);
  }

  map.forEach(lista => lista.sort((left, right) => (left.time ?? '').localeCompare(right.time ?? '')));
  return map;
}
