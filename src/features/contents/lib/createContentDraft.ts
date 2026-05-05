import type {Content} from '../../../lib/database';
import {generateUUID} from '../../../utils/uuid';
import {CONTENT_STATUS} from './contentPipeline';

type CreateContentDraftOverrides = Partial<Content>;

export function createContentDraft(overrides: CreateContentDraftOverrides = {}): Content {
  const now = new Date().toISOString();

  return {
    id: generateUUID(),
    userId: '',
    title: '',
    status: CONTENT_STATUS.ROTEIRO,
    slotType: null,
    seriesId: null,
    pilarId: null,
    cenarioId: null,
    lookId: null,
    formatoVisual: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    energiaNecessaria: null,
    publishDate: null,
    recordingDate: null,
    link: null,
    bibliotecaItemId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    plataformas: [],
    ...overrides,
  };
}
