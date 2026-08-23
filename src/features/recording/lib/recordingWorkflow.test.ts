import assert from 'node:assert/strict';
import type {Content} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {buildMarkStandaloneContentRecordedTransition} from './recordingWorkflow.ts';

function createContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Roteiro avulso',
    status: CONTENT_STATUS.PRODUCAO,
    slotType: null,
    seriesId: null,
    pilarId: null,
    lookId: null,
    cenarioId: null,
    bibliotecaItemId: null,
    formatoVisual: null,
    energiaNecessaria: null,
    publishDate: null,
    recordingDate: null,
    link: null,
    script: 'Texto para gravar.',
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z',
    deletedAt: null,
    recordedAt: null,
    plataformas: [],
    ...overrides,
  };
}

function testMarksStandaloneContentAsRecorded() {
  const recordedAt = '2026-07-27T12:00:00.000Z';
  const updated = buildMarkStandaloneContentRecordedTransition(createContent(), recordedAt);

  assert.equal(updated.status, CONTENT_STATUS.PRODUCAO);
  assert.equal(updated.recordedAt, recordedAt);
  assert.equal(updated.updatedAt, recordedAt);
}

function testPreservesExistingRecordingMilestone() {
  const originalRecordedAt = '2026-07-27T11:00:00.000Z';
  const updated = buildMarkStandaloneContentRecordedTransition(
    createContent({recordedAt: originalRecordedAt}),
    '2026-07-27T12:00:00.000Z'
  );

  assert.equal(updated.recordedAt, originalRecordedAt);
  assert.equal(updated.updatedAt, '2026-07-27T12:00:00.000Z');
}

const tests: Array<[string, () => void]> = [
  ['standalone recording marks the content milestone', testMarksStandaloneContentAsRecorded],
  ['standalone recording preserves an existing milestone', testPreservesExistingRecordingMilestone],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
