import { isWithinInterval, parseISO, startOfDay } from 'date-fns';
import type { Content } from '../../lib/database.ts';
import {
  canAdvanceToRecording,
  CONTENT_STATUS,
  normalizeContentStatus,
  PRODUCTION_TAGS,
} from '../contents/lib/contentPipeline.ts';
import type { CycleWindow } from './types.ts';

type ContentLike = Pick<
  Content,
  'id' | 'status' | 'script' | 'title' | 'recordedAt' | 'postedAt' | 'publishDate' | 'tags' | 'deletedAt' | 'pilarId' | 'seriesId'
>;

export function isActiveContent(content: ContentLike): boolean {
  return !content.deletedAt;
}

export function isScriptWritten(content: ContentLike): boolean {
  if (!isActiveContent(content)) return false;
  if (normalizeContentStatus(content.status) === CONTENT_STATUS.IDEIA) return false;
  return canAdvanceToRecording(content);
}

export function isPostableStock(content: ContentLike): boolean {
  if (!isActiveContent(content)) return false;
  if (normalizeContentStatus(content.status) !== CONTENT_STATUS.PRODUCAO) return false;
  if (!content.recordedAt) return false;
  const hasEditTag = content.tags.some(
    tag => tag.trim().toLowerCase() === PRODUCTION_TAGS.EDITAR,
  );
  return !hasEditTag;
}

export function isPublishedContent(content: ContentLike): boolean {
  if (!isActiveContent(content)) return false;
  return normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO;
}

export function getPublicationTimestamp(content: ContentLike): string | null {
  return content.postedAt ?? content.publishDate ?? null;
}

export function isPublishedInCycle(content: ContentLike, cycle: CycleWindow): boolean {
  if (!isPublishedContent(content)) return false;
  const timestamp = getPublicationTimestamp(content);
  if (!timestamp) return false;

  try {
    const date = startOfDay(parseISO(timestamp));
    return isWithinInterval(date, { start: cycle.start, end: cycle.end });
  } catch {
    return false;
  }
}

export function comparePublicationTimestamps(left: string | null, right: string | null): number {
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  return new Date(left).getTime() - new Date(right).getTime();
}
