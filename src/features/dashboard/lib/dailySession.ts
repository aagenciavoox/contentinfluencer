import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Content, RecordingBlock, RecordingBlockContent } from '../../../lib/database';
import { getRecordingQueueContents } from '../../contents/lib/contentWorkflow';
import { normalizeRecordingTags } from '../../recording/lib/recordingWorkflow';
import { generateUUID } from '../../../utils/uuid';

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

export function defaultSelectedSessionIds(candidates: Content[], maxAutoSelect = 5): string[] {
  if (candidates.length === 0) return [];
  if (candidates.length <= maxAutoSelect) {
    return candidates.map(content => content.id);
  }
  return [];
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
