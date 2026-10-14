import type {Content} from '../../../lib/database.ts';
import type {GradeSerie} from '../../editorial/lib/gradeEntries.ts';
import {
  buildPublishCalendarItems,
  isScheduledItem,
  todayKey,
} from '../../editorial-calendar/lib/publishCalendarItems.ts';

export type PublicacaoNoDia = {
  id: string;
  contentId: string;
  titulo: string;
  time: string | null;
  platformNames: string[];
  estado: 'postado' | 'programado';
};

/**
 * O que já foi ao ar e o que está programado, por dia, como no calendário.
 * Só leitura: os post-its continuam sendo o plano.
 */
export function publicacoesPorDia(input: {
  contents: readonly Content[];
  platforms: readonly {id: string; nome: string}[];
  series: readonly GradeSerie[];
  redeReferenciaId: string | null;
  hoje?: string;
}): Map<string, PublicacaoNoDia[]> {
  const hoje = input.hoje ?? todayKey();
  const titulos = new Map(input.contents.map(content => [content.id, content.title?.trim() || 'Sem título']));
  const map = new Map<string, PublicacaoNoDia[]>();

  for (const item of buildPublishCalendarItems({...input, platformFilter: 'todas'})) {
    if (!item.date) continue;
    const estado = item.posted ? 'postado' : isScheduledItem(item, hoje) ? 'programado' : null;
    if (!estado) continue;
    const dia = item.date.slice(0, 10);
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
