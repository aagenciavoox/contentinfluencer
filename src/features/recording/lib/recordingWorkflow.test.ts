import assert from 'node:assert/strict';
import type {Content, RecordingBlock} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {
  addBlockContent,
  blocosAoVoltarDaGravacao,
  buildMarkStandaloneContentRecordedTransition,
  isBlockContentComplete,
} from './recordingWorkflow.ts';

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
    funcao: null,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
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

  // Gravado leva o vídeo para Edição, ainda sem "pronto para publicar".
  assert.equal(updated.status, CONTENT_STATUS.EDICAO);
  assert.equal(updated.edicaoConcluidaEm, null);
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

function testAddsScriptToExistingBlock() {
  const existing = {
    blockId: 'block-1',
    contentId: 'content-1',
    ordem: 0,
    gravado: false,
  };
  const next = addBlockContent([existing], 'block-1', createContent({id: 'content-2'}));

  assert.equal(next.length, 2);
  assert.equal(next[1]?.contentId, 'content-2');
  assert.equal(next[1]?.blockId, 'block-1');
  assert.equal(next[1]?.ordem, 1);
}

function testBackToProductionClearsBlockMark() {
  const block: RecordingBlock = {
    id: 'block-1',
    userId: 'user-1',
    name: 'Terça',
    createdAt: '2026-07-27T10:00:00.000Z',
    contents: [
      {blockId: 'block-1', contentId: 'content-1', ordem: 0, gravado: true},
      {blockId: 'block-1', contentId: 'content-2', ordem: 1, gravado: true},
    ],
  };
  const back = createContent({id: 'content-1', status: CONTENT_STATUS.PRODUCAO, recordedAt: null});
  const staying = createContent({id: 'content-2', status: CONTENT_STATUS.EDICAO, recordedAt: '2026-07-27T12:00:00.000Z'});

  const {alterados} = blocosAoVoltarDaGravacao([block], [back, staying]);
  assert.equal(alterados.length, 1);
  assert.equal(alterados[0]?.contents[0]?.gravado, false);
  assert.equal(alterados[0]?.contents[1]?.gravado, true);
  assert.equal(isBlockContentComplete(alterados[0].contents[0], back), false);
  assert.equal(isBlockContentComplete(alterados[0].contents[1], staying), true);
}

function testDoesNotDuplicateScriptInBlock() {
  const contents = [
    {
      blockId: 'block-1',
      contentId: 'content-1',
      ordem: 0,
      gravado: false,
    },
  ];
  const next = addBlockContent(contents, 'block-1', createContent({id: 'content-1'}));

  assert.equal(next, contents);
  assert.equal(next.length, 1);
}

const tests: Array<[string, () => void]> = [
  ['standalone recording marks the content milestone', testMarksStandaloneContentAsRecorded],
  ['standalone recording preserves an existing milestone', testPreservesExistingRecordingMilestone],
  ['adds a script to an existing recording block', testAddsScriptToExistingBlock],
  ['does not duplicate a script already in the block', testDoesNotDuplicateScriptInBlock],
  ['going back to Produção clears the block recording mark', testBackToProductionClearsBlockMark],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
