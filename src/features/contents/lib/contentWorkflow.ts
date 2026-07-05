import type {Content, RecordingBlock} from '../../../lib/database.ts';
import {CONTENT_STATUS, normalizeContentStatus} from './contentPipeline.ts';

export const EDITORIAL_CONTENT_STATUSES = [
  CONTENT_STATUS.IDEIA,
  CONTENT_STATUS.ROTEIRO,
  CONTENT_STATUS.PRODUCAO,
] as const;
export const PRODUCTION_CONTENT_STATUSES = [
  CONTENT_STATUS.PRODUCAO,
  CONTENT_STATUS.POSTADO,
] as const;
export const RECORDING_READY_STATUS = CONTENT_STATUS.PRODUCAO;
export const POSTED_STATUS = CONTENT_STATUS.POSTADO;

export type EditorialContentStatus = typeof EDITORIAL_CONTENT_STATUSES[number];
export type ProductionContentStatus = typeof PRODUCTION_CONTENT_STATUSES[number];

export function isEditorialContentStatus(status: string): status is EditorialContentStatus {
  return EDITORIAL_CONTENT_STATUSES.includes(normalizeContentStatus(status) as EditorialContentStatus);
}

export function isProductionContentStatus(status: string): status is ProductionContentStatus {
  return PRODUCTION_CONTENT_STATUSES.includes(normalizeContentStatus(status) as ProductionContentStatus);
}

export function getEditorialContents(contents: Content[]) {
  return contents.filter(content => normalizeContentStatus(content.status) !== POSTED_STATUS);
}

export function getProductionContents(contents: Content[]) {
  return contents.filter(content => isProductionContentStatus(content.status));
}

export function getPostingContents(contents: Content[]) {
  return contents.filter(
    content => isProductionContentStatus(content.status) && content.status !== POSTED_STATUS
  );
}

export function getPostedContents(contents: Content[]) {
  return contents.filter(content => normalizeContentStatus(content.status) === POSTED_STATUS);
}

export function getRecordingQueueContents(contents: Content[], blocks: RecordingBlock[] = []) {
  const blockedIds = new Set<string>();
  blocks.forEach(block => {
    block.contents.forEach(item => blockedIds.add(item.contentId));
  });

  return contents.filter(
    content =>
      normalizeContentStatus(content.status) === RECORDING_READY_STATUS &&
      !blockedIds.has(content.id)
  );
}

export function getContentStatusOptions(mode: 'editorial' | 'history') {
  return mode === 'editorial'
    ? ['Todos', ...EDITORIAL_CONTENT_STATUSES]
    : ['Todos', ...PRODUCTION_CONTENT_STATUSES];
}
