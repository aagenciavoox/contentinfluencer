import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Content, RecordingBlock, RecordingBlockContent } from '../../../lib/database';
import { getRecordingQueueContents } from '../../contents/lib/contentWorkflow.ts';
import { normalizeRecordingTags } from '../../recording/lib/recordingWorkflow.ts';
import { generateUUID } from '../../../utils/uuid.ts';

/** Roteiros disponíveis para montar a sessão do dia (fila, ainda não gravados). */
export function getSessionCandidates(
  contents: Content[],
  blocks: RecordingBlock[] = [],
): Content[] {
  return getRecordingQueueContents(contents, blocks)
    .filter(content => !content.recordedAt)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function buildDailySessionName(now = new Date()): string {
  return `Sessão · ${format(now, 'd MMM', { locale: ptBR })}`;
}

/** Bloco curto sugerido ao abrir o dia. A fila maior continua disponível para marcar. */
export const SUGGESTED_SESSION_LIMIT = 4;

const DRAFT_STORAGE_KEY = 'criaki.daily-session-draft';
const LOOSE_GROUP_ID = 'loose';

export type SessionSeriesRef = { id: string; name: string };

export type SessionGroup = {
  id: string;
  label: string;
  items: Content[];
};

export type DailySessionDraft = {
  day: string;
  ids: string[];
  touched: boolean;
};

/**
 * Pré-seleciona um bloco curto. A lista precisa chegar do mais recente para o mais antigo.
 * Se alguma série tiver 2 ou mais roteiros, a sugestão sai dela (a maior; empate fica com a mais recente).
 */
export function suggestSessionIds(candidates: Content[], limit = SUGGESTED_SESSION_LIMIT): string[] {
  if (candidates.length === 0) return [];
  if (candidates.length <= limit) return candidates.map(content => content.id);

  const groups = new Map<string, Content[]>();
  for (const content of candidates) {
    if (!content.seriesId) continue;
    const group = groups.get(content.seriesId) ?? [];
    group.push(content);
    groups.set(content.seriesId, group);
  }

  let best: Content[] | null = null;
  let bestUpdated = Number.NEGATIVE_INFINITY;
  for (const items of groups.values()) {
    if (items.length < 2) continue;
    const updated = items.reduce(
      (max, item) => Math.max(max, Date.parse(item.updatedAt) || 0),
      0,
    );
    if (!best || items.length > best.length || (items.length === best.length && updated > bestUpdated)) {
      best = items;
      bestUpdated = updated;
    }
  }

  return (best ?? candidates).slice(0, limit).map(content => content.id);
}

export function suggestionSummary(
  candidates: Content[],
  series: SessionSeriesRef[],
  limit = SUGGESTED_SESSION_LIMIT,
): string {
  if (candidates.length === 0) return '';
  if (candidates.length <= limit) return 'Todos os roteiros prontos.';

  const chosenIds = new Set(suggestSessionIds(candidates, limit));
  const chosen = candidates.filter(content => chosenIds.has(content.id));
  const seriesIds = new Set(chosen.map(content => content.seriesId).filter(Boolean));
  if (seriesIds.size === 1) {
    const seriesId = [...seriesIds][0];
    const name = series.find(item => item.id === seriesId)?.name;
    if (name) return `Sugestão da série ${name}.`;
  }
  return 'Sugestão com os roteiros mais recentes.';
}

export function groupCandidatesBySeries(
  candidates: Content[],
  series: SessionSeriesRef[],
): SessionGroup[] {
  const nameById = new Map(series.map(item => [item.id, item.name]));
  const order: string[] = [];
  const buckets = new Map<string, Content[]>();

  for (const content of candidates) {
    const key = content.seriesId && nameById.has(content.seriesId) ? content.seriesId : LOOSE_GROUP_ID;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)?.push(content);
  }

  const groups = order.map(key => ({
    id: key,
    label: key === LOOSE_GROUP_ID ? 'Avulsos' : nameById.get(key) || 'Série',
    items: buckets.get(key) ?? [],
  }));

  const named = groups.filter(group => group.id !== LOOSE_GROUP_ID);
  const loose = groups.filter(group => group.id === LOOSE_GROUP_ID);
  named.sort((left, right) => right.items.length - left.items.length);
  return [...named, ...loose];
}

export function toggleSessionId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id];
}

export function moveSessionId(ids: string[], id: string, direction: -1 | 1): string[] {
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function readDailySessionDraft(
  storage: Pick<Storage, 'getItem'> | null,
  day: string,
): DailySessionDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DailySessionDraft>;
    if (parsed.day !== day || !Array.isArray(parsed.ids) || typeof parsed.touched !== 'boolean') {
      return null;
    }
    return {
      day,
      ids: parsed.ids.filter((id): id is string => typeof id === 'string'),
      touched: parsed.touched,
    };
  } catch {
    return null;
  }
}

export function writeDailySessionDraft(
  storage: Pick<Storage, 'setItem'> | null,
  draft: DailySessionDraft,
) {
  storage?.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function resolveSessionSelection(candidates: Content[], draft: DailySessionDraft | null): string[] {
  const valid = new Set(candidates.map(content => content.id));
  if (draft) {
    const kept = draft.ids.filter(id => valid.has(id));
    if (draft.touched || kept.length > 0) return kept;
  }
  return suggestSessionIds(candidates);
}

export function buildDailySessionBlock({
  contents,
  contentIds,
  userId,
  now = new Date(),
}: {
  contents: Content[];
  contentIds: string[];
  userId: string;
  now?: Date;
}): { block: RecordingBlock; blockContents: RecordingBlockContent[] } | null {
  const ordered = contentIds
    .map(id => contents.find(content => content.id === id) ?? null)
    .filter((content): content is Content => content !== null);

  if (ordered.length === 0) return null;

  const blockId = generateUUID();
  const recordingTags = normalizeRecordingTags(ordered.flatMap(content => content.tags || []));

  const block: RecordingBlock = {
    id: blockId,
    userId,
    name: buildDailySessionName(now),
    lookLabel: null,
    cenarioLabel: null,
    metadata: {
      recordingTags,
      sourceContentIds: ordered.map(content => content.id),
      dailySession: true,
    },
    createdAt: now.toISOString(),
    contents: [],
  };

  const blockContents: RecordingBlockContent[] = ordered.map((content, index) => ({
    blockId,
    contentId: content.id,
    ordem: index,
    gravado: false,
  }));

  return { block, blockContents };
}
