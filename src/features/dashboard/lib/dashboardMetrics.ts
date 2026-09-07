import type {AgendaItem, Content} from '../../../lib/database';
import {CONTENT_STATUS, PRODUCTION_TAGS} from '../../contents/lib/contentPipeline';

export function getReadyToRecord(contents: Content[]): Content[] {
  return contents.filter(
    c =>
      c.status === CONTENT_STATUS.PRODUCAO &&
      !c.recordedAt &&
      (c.tags.includes(PRODUCTION_TAGS.GRAVAR) || c.tags.length === 0),
  );
}

export function getInProduction(contents: Content[]): Content[] {
  return contents.filter(c => c.status === CONTENT_STATUS.PRODUCAO);
}

export function getUpcomingAgenda(agendaItems: AgendaItem[], limit = 5): AgendaItem[] {
  return [...agendaItems]
    .filter(item => item.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
    .slice(0, limit);
}

export type SpotlightData =
  | {type: 'record'; count: number; firstId: string; firstTitle: string}
  | {type: 'edit'; count: number; firstId: string; firstTitle: string}
  | {type: 'agenda'; title: string; date: string; time?: string}
  | {type: 'empty'};

export function resolveSpotlight({
  readyToRecord,
  inProduction,
  upcomingAgenda,
}: {
  readyToRecord: {id: string; title?: string | null}[];
  inProduction: {id: string; title?: string | null; status: string; recordedAt?: string | null}[];
  upcomingAgenda: {title: string; date: string; time?: string}[];
}): SpotlightData {
  if (readyToRecord.length > 0) {
    return {
      type: 'record',
      count: readyToRecord.length,
      firstId: readyToRecord[0].id,
      firstTitle: readyToRecord[0].title || '(sem titulo)',
    };
  }
  const editing = inProduction.filter(c => Boolean(c.recordedAt));
  if (editing.length > 0) {
    return {
      type: 'edit',
      count: editing.length,
      firstId: editing[0].id,
      firstTitle: editing[0].title || '(sem titulo)',
    };
  }
  if (upcomingAgenda.length > 0) {
    return {
      type: 'agenda',
      title: upcomingAgenda[0].title,
      date: upcomingAgenda[0].date,
      time: upcomingAgenda[0].time,
    };
  }
  return {type: 'empty'};
}
