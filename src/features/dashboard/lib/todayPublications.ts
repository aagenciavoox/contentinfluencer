import type { Content } from '../../../lib/database.ts';
import { buildPublishCalendarItems, type PublishCalendarItem } from '../../editorial-calendar/lib/publishCalendarItems.ts';

type CalendarInput = Parameters<typeof buildPublishCalendarItems>[0];
export type TodayPublication = PublishCalendarItem & { content: Content };

/** Cada conta segue sua própria data, inclusive em reposts e publicações já realizadas. */
export function getTodayPublications(input: CalendarInput, day: string): TodayPublication[] {
  const result = new Map<string, TodayPublication>();
  for (const content of input.contents) {
    const refs = [...new Set(content.plataformas.map(item => item.platformId))];
    for (const platformFilter of refs.length ? refs : ['todas']) {
      const items = buildPublishCalendarItems({ ...input, contents: [content], platformFilter });
      for (const item of items) {
        if (item.date === day && !item.cancelled) result.set(item.id, { ...item, content });
      }
    }
  }
  return [...result.values()].sort((a, b) => Number(a.posted) - Number(b.posted)
    || (a.time || '99:99').localeCompare(b.time || '99:99')
    || a.content.title.localeCompare(b.content.title) || a.id.localeCompare(b.id));
}
