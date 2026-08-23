import assert from 'node:assert/strict';
import type {Content} from '../../../lib/database.ts';
import {
  CONTENT_STATUS,
  DISPLAY_STATUS,
  getDisplayStatus,
  getPrimaryAction,
  normalizeContentStatus,
} from './contentPipeline.ts';

function createContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Roteiro de teste',
    status: CONTENT_STATUS.ROTEIRO,
    slotType: null,
    seriesId: null,
    pilarId: null,
    lookId: null,
    cenarioId: null,
    bibliotecaItemId: null,
    formatoVisual: null,
    energiaNecessaria: null,
    publishDate: null,
    publishTime: null,
    recordingDate: null,
    link: null,
    script: '<p>Texto do roteiro</p>',
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-07-25T12:00:00.000Z',
    updatedAt: '2026-07-25T12:00:00.000Z',
    deletedAt: null,
    plataformas: [],
    ...overrides,
  };
}

function testDisplayStatusFuturePublishDate() {
  const future = new Date();
  future.setDate(future.getDate() + 7);
  const content = {
    status: CONTENT_STATUS.PRODUCAO,
    publishDate: future.toISOString(),
  };
  assert.equal(getDisplayStatus(content), DISPLAY_STATUS.PROGRAMADO);
}

function testDisplayStatusPastPublishDateKeepsCanonical() {
  const content = {
    status: CONTENT_STATUS.PRODUCAO,
    publishDate: '2020-01-01T12:00:00.000Z',
  };
  assert.equal(getDisplayStatus(content), CONTENT_STATUS.PRODUCAO);
}

function testDisplayStatusPostedIgnoresFutureDate() {
  const future = new Date();
  future.setDate(future.getDate() + 7);
  const content = {
    status: CONTENT_STATUS.POSTADO,
    publishDate: future.toISOString(),
  };
  assert.equal(getDisplayStatus(content), CONTENT_STATUS.POSTADO);
}

function testDisplayStatusPostedAtOverridesRoteiro() {
  const content = {
    status: CONTENT_STATUS.ROTEIRO,
    postedAt: '2026-07-20T12:00:00.000Z',
    publishDate: null,
  };
  assert.equal(getDisplayStatus(content), CONTENT_STATUS.POSTADO);
}

function testNormalizeLegacyStatuses() {
  assert.equal(normalizeContentStatus('Gravado'), CONTENT_STATUS.PRODUCAO);
  assert.equal(normalizeContentStatus('Programado'), CONTENT_STATUS.PRODUCAO);
  assert.equal(normalizeContentStatus('Roteiro'), CONTENT_STATUS.ROTEIRO);
}

function testRecordingActionUsesClearPipelineCopy() {
  const action = getPrimaryAction(createContent());

  assert.equal(action.id, 'advance_to_recording');
  assert.equal(action.label, 'Avançar para gravação');
  assert.equal(action.disabled, false);
}

function testRecordingActionExplainsMissingRequirements() {
  const action = getPrimaryAction(createContent({title: '', script: ''}));

  assert.equal(action.disabled, true);
  assert.equal(action.reason, 'Adicione um título e escreva o roteiro para continuar.');
}

const tests: Array<[string, () => void]> = [
  ['future publish date shows Programado', testDisplayStatusFuturePublishDate],
  ['past publish date keeps canonical status', testDisplayStatusPastPublishDateKeepsCanonical],
  ['posted ignores future publish date display', testDisplayStatusPostedIgnoresFutureDate],
  ['postedAt marks a roteiro as Postado in display', testDisplayStatusPostedAtOverridesRoteiro],
  ['normalize legacy statuses to canonical', testNormalizeLegacyStatuses],
  ['recording action uses clear pipeline copy', testRecordingActionUsesClearPipelineCopy],
  ['recording action explains missing requirements', testRecordingActionExplainsMissingRequirements],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
