import type {Content, RecordingBlock, RecordingBlockContent} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';

type MarkContentRecordedParams = {
  block: RecordingBlock;
  contentId: string;
  contents: Content[];
};

type RecordingBlockLabelsParams = {
  block?: RecordingBlock | null;
  content?: Content | null;
};

type RecordingTagMetadata = {
  recordingTags?: unknown;
};

export type RecordingBlockProgress = {
  totalCount: number;
  completedCount: number;
  readyCount: number;
  progressPercentage: number;
  isCompleted: boolean;
};

export function getContentIdsInBlocks(blocks: RecordingBlock[]) {
  const ids = new Set<string>();

  blocks.forEach(block => {
    block.contents.forEach(item => ids.add(item.contentId));
  });

  return ids;
}

export function isBlockContentComplete(
  blockContent: RecordingBlockContent,
  content: Content | null | undefined
) {
  if (blockContent.gravado) return true;
  return Boolean(content?.recordedAt);
}

export function getRecordingBlockProgress(
  block: RecordingBlock,
  contents: Content[]
): RecordingBlockProgress {
  const orderedContents = [...block.contents].sort((left, right) => left.ordem - right.ordem);
  const totalCount = orderedContents.length;
  const completedCount = orderedContents.filter(item => {
    const content = contents.find(candidate => candidate.id === item.contentId) ?? null;
    return isBlockContentComplete(item, content);
  }).length;
  const readyCount = totalCount - completedCount;
  const progressPercentage =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return {
    totalCount,
    completedCount,
    readyCount,
    progressPercentage,
    isCompleted: totalCount > 0 && readyCount === 0,
  };
}

export function getOrderedBlockContents(block: RecordingBlock) {
  return [...block.contents].sort((left, right) => left.ordem - right.ordem);
}

export function normalizeBlockContentsOrder(contents: RecordingBlockContent[]) {
  return contents.map((item, index) => ({...item, ordem: index}));
}

export function reorderBlockContents(
  contents: RecordingBlockContent[],
  fromIndex: number,
  toIndex: number
) {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= contents.length ||
    toIndex >= contents.length ||
    fromIndex === toIndex
  ) {
    return contents;
  }

  const next = [...contents];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return normalizeBlockContentsOrder(next);
}

export function removeBlockContent(contents: RecordingBlockContent[], contentId: string) {
  return normalizeBlockContentsOrder(contents.filter(item => item.contentId !== contentId));
}

export function addBlockContent(
  contents: RecordingBlockContent[],
  blockId: string,
  content: Content
) {
  if (contents.some(item => item.contentId === content.id)) return contents;

  return normalizeBlockContentsOrder([
    ...contents,
    {
      blockId,
      contentId: content.id,
      ordem: contents.length,
      gravado: Boolean(content.recordedAt),
    },
  ]);
}

export function getRecordingBlockTags(block?: RecordingBlock | null) {
  const metadata = (block?.metadata || {}) as RecordingTagMetadata;
  if (!Array.isArray(metadata.recordingTags)) return [];
  return normalizeRecordingTags(metadata.recordingTags.filter(tag => typeof tag === 'string') as string[]);
}

export function withRecordingBlockTags(block: RecordingBlock, tags: string[]) {
  return {
    ...block,
    metadata: {
      ...(block.metadata || {}),
      recordingTags: normalizeRecordingTags(tags),
    },
  };
}

export function buildMarkContentRecordedTransition({
  block,
  contentId,
  contents,
}: MarkContentRecordedParams) {
  const content = contents.find(item => item.id === contentId);
  if (!content) return null;

  const now = new Date().toISOString();

  return {
    updatedContent: {
      ...content,
      status: CONTENT_STATUS.PRODUCAO,
      recordedAt: content.recordedAt ?? now,
      updatedAt: now,
    },
    updatedBlockContents: block.contents.map(item =>
      item.contentId === contentId ? {...item, gravado: true} : item
    ),
  };
}

export function buildMarkStandaloneContentRecordedTransition(
  content: Content,
  recordedAt = new Date().toISOString()
) {
  return {
    ...content,
    status: CONTENT_STATUS.PRODUCAO,
    recordedAt: content.recordedAt ?? recordedAt,
    updatedAt: recordedAt,
  };
}

export function buildSaveRecordingSessionTransition(
  block: RecordingBlock,
  contents: Content[],
  completedIds: Set<string>
) {
  const now = new Date().toISOString();
  const updatedContents = contents
    .filter(content => completedIds.has(content.id))
    .map(content => ({
      ...content,
      status: CONTENT_STATUS.PRODUCAO,
      recordedAt: content.recordedAt ?? now,
      updatedAt: now,
    }));

  const updatedBlockContents: RecordingBlockContent[] = block.contents.map(item => ({
    ...item,
    gravado: completedIds.has(item.contentId) || item.gravado,
  }));

  return {updatedContents, updatedBlockContents};
}

export function normalizeRecordingTags(tags: Array<string | null | undefined> = []) {
  const seen = new Set<string>();

  return tags
    .map(tag => tag?.trim() || '')
    .filter(Boolean)
    .filter(tag => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function resolveRecordingContextTags({block, content}: RecordingBlockLabelsParams) {
  const blockTags = getRecordingBlockTags(block);
  if (blockTags.length > 0) return blockTags;

  const contentTags = normalizeRecordingTags(content?.tags || []);
  if (contentTags.length > 0) return contentTags;

  return [];
}

export function resolveRecordingContextSummary(params: RecordingBlockLabelsParams) {
  const tags = resolveRecordingContextTags(params);
  return tags.length > 0 ? tags.join(' · ') : 'Sem marcadores';
}

export function isRecordingBlockTeleprompterEnabled(block?: RecordingBlock | null) {
  const metadata = block?.metadata;
  if (!metadata || typeof metadata !== 'object') return true;

  const value = metadata.teleprompterEnabled;
  return typeof value === 'boolean' ? value : true;
}
