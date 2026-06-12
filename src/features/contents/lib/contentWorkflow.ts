import type {Content, RecordingBlock} from '../../../lib/database.ts';
import {CONTENT_STATUS} from './contentPipeline.ts';

export const EDITORIAL_CONTENT_STATUSES = [
  CONTENT_STATUS.IDEIA,
  CONTENT_STATUS.ROTEIRO,
  CONTENT_STATUS.PRONTO_PARA_GRAVAR,
  CONTENT_STATUS.GRAVADO,
  CONTENT_STATUS.A_EDITAR,
  CONTENT_STATUS.EDITADO,
  CONTENT_STATUS.PROGRAMADO,
] as const;
export const PRODUCTION_CONTENT_STATUSES = [
  CONTENT_STATUS.GRAVADO,
  CONTENT_STATUS.A_EDITAR,
  CONTENT_STATUS.EDITADO,
  CONTENT_STATUS.PROGRAMADO,
  CONTENT_STATUS.POSTADO,
] as const;
export const RECORDING_READY_STATUS = CONTENT_STATUS.PRONTO_PARA_GRAVAR;
export const RECORDED_STATUS = CONTENT_STATUS.GRAVADO;
export const POSTED_STATUS = CONTENT_STATUS.POSTADO;

export type EditorialContentStatus = typeof EDITORIAL_CONTENT_STATUSES[number];
export type ProductionContentStatus = typeof PRODUCTION_CONTENT_STATUSES[number];

export function isEditorialContentStatus(status: string): status is EditorialContentStatus {
  return EDITORIAL_CONTENT_STATUSES.includes(status as EditorialContentStatus);
}

export function isProductionContentStatus(status: string): status is ProductionContentStatus {
  return PRODUCTION_CONTENT_STATUSES.includes(status as ProductionContentStatus);
}

export function getEditorialContents(contents: Content[]) {
  return contents.filter(content => content.status !== POSTED_STATUS);
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
  return contents.filter(content => content.status === POSTED_STATUS);
}

export function getRecordingQueueContents(contents: Content[], blocks: RecordingBlock[] = []) {
  const blockedIds = new Set<string>();
  blocks.forEach(block => {
    block.contents.forEach(item => blockedIds.add(item.contentId));
  });

  return contents.filter(
    content => content.status === RECORDING_READY_STATUS && !blockedIds.has(content.id)
  );
}

export function getContentStatusOptions(mode: 'editorial' | 'history') {
  return mode === 'editorial'
    ? ['Todos', ...EDITORIAL_CONTENT_STATUSES]
    : ['Todos', ...PRODUCTION_CONTENT_STATUSES];
}
