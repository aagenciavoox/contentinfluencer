import {Content, RecordingBlock, RecordingBlockContent} from '../../../lib/database';
import {RECORDED_STATUS} from '../../contents/lib/contentWorkflow';

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

export function buildMarkContentRecordedTransition({
  block,
  contentId,
  contents,
}: MarkContentRecordedParams) {
  const content = contents.find(item => item.id === contentId);
  if (!content) return null;

  return {
    updatedContent: {
      ...content,
      status: RECORDED_STATUS,
      updatedAt: new Date().toISOString(),
    },
    updatedBlockContents: block.contents.map(item =>
      item.contentId === contentId ? {...item, gravado: true} : item
    ),
  };
}

export function buildSaveRecordingSessionTransition(
  block: RecordingBlock,
  contents: Content[],
  completedIds: Set<string>
) {
  const updatedContents = contents
    .filter(content => completedIds.has(content.id))
    .map(content => ({
      ...content,
      status: RECORDED_STATUS,
      updatedAt: new Date().toISOString(),
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

export function getRecordingBlockTags(block?: RecordingBlock | null) {
  const metadata = (block?.metadata || {}) as RecordingTagMetadata;
  if (!Array.isArray(metadata.recordingTags)) return [];
  return normalizeRecordingTags(metadata.recordingTags.filter(tag => typeof tag === 'string') as string[]);
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
