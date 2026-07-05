import type { Content, Pilar, Serie } from '../../../lib/database';
import { getDisplayStatus } from './contentPipeline';
import { htmlToReadableText } from '../../../lib/utils';

export function resolveContentEntities(
  content: Pick<Content, 'pilarId' | 'seriesId'>,
  pilares: Pilar[],
  series: Serie[]
) {
  const pillar = content.pilarId ? pilares.find(item => item.id === content.pilarId) ?? null : null;
  const seriesEntity = content.seriesId ? series.find(item => item.id === content.seriesId) ?? null : null;

  return {
    pillar,
    series: seriesEntity,
    hasRefs: Boolean(content.pilarId || content.seriesId),
    isResolved: Boolean(pillar || seriesEntity),
  };
}


const DRAFT_TITLES = new Set(['novo conteudo', 'novo conteúdo', '(sem titulo)', '(sem título)']);
const MIN_EXCERPT_LENGTH = 40;

export function formatLastEdit(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEdit = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfEdit.getTime()) / 86_400_000);

  if (dayDiff === 0) return 'hoje';
  if (dayDiff === 1) return 'ontem';
  if (dayDiff < 7) return `${dayDiff}d atrás`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function getScriptWordCount(content: Content) {
  const text = htmlToReadableText(content.script || content.notes || '');
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export function getUsefulExcerpt(content: Content) {
  const excerpt = htmlToReadableText(content.notes || content.script || '').trim();
  if (excerpt.length < MIN_EXCERPT_LENGTH) return null;
  return excerpt;
}

export function isDraftTitle(title: string | null | undefined) {
  const normalized = (title || '').trim().toLowerCase();
  return !normalized || DRAFT_TITLES.has(normalized);
}

export function isRecentlyCreated(content: Content) {
  const created = new Date(content.createdAt);
  if (Number.isNaN(created.getTime())) return false;
  return Date.now() - created.getTime() < 86_400_000;
}

export function buildContentMetaLine(
  content: Content,
  options?: { pillarName?: string | null; seriesName?: string | null }
) {
  const parts = [getDisplayStatus(content), formatLastEdit(content.updatedAt)];

  if (options?.pillarName) parts.push(options.pillarName);
  if (options?.seriesName) parts.push(options.seriesName);

  const wordCount = getScriptWordCount(content);
  if (wordCount > 0) parts.push(`${wordCount} palavras`);

  return parts.join(' · ');
}

export function getDisplayTitle(title: string | null | undefined) {
  if (isDraftTitle(title)) return '(sem título)';
  return title || '(sem título)';
}

export { getStatusChipClass } from '../../../lib/statusClasses';
