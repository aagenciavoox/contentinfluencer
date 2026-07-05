import assert from 'node:assert/strict';
import type {Content} from '../../../lib/database.ts';
import {CONTENT_STATUS} from './contentPipeline.ts';
import {getEditorialContents, getRecordingQueueContents} from './contentWorkflow.ts';

function createContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Conteudo teste',
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
    publishDateEnabled: false,
    recordingDate: null,
    recordingDateEnabled: false,
    link: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    deletedAt: null,
    recordedAt: null,
    postedAt: null,
    plataformas: [],
    ...overrides,
  };
}

function testEditorialContentsShowAllExceptPosted() {
  const roteiro = createContent({id: 'roteiro', status: CONTENT_STATUS.ROTEIRO});
  const ideia = createContent({id: 'ideia', status: CONTENT_STATUS.IDEIA});
  const linkedProduction = createContent({
    id: 'linked-production',
    status: CONTENT_STATUS.PRODUCAO,
    bibliotecaItemId: 'book-1',
  });
  const linkedPosted = createContent({
    id: 'linked-posted',
    status: CONTENT_STATUS.POSTADO,
    bibliotecaItemId: 'book-1',
  });
  const unlinkedProduction = createContent({
    id: 'unlinked-production',
    status: CONTENT_STATUS.PRODUCAO,
  });

  const visibleIds = getEditorialContents([
    roteiro,
    ideia,
    linkedProduction,
    linkedPosted,
    unlinkedProduction,
  ]).map(content => content.id);

  assert.deepEqual(visibleIds, ['roteiro', 'ideia', 'linked-production', 'unlinked-production']);
}

function testRecordingQueueExcludesBlockedContents() {
  const ready = createContent({id: 'ready-1', status: CONTENT_STATUS.PRODUCAO});
  const blocked = createContent({id: 'ready-2', status: CONTENT_STATUS.PRODUCAO});
  const blocks = [
    {
      id: 'block-1',
      userId: 'user-1',
      name: 'Bloco',
      createdAt: '2026-05-01T00:00:00.000Z',
      contents: [{blockId: 'block-1', contentId: 'ready-2', ordem: 0, gravado: false}],
    },
  ];

  const visibleIds = getRecordingQueueContents([ready, blocked], blocks).map(content => content.id);
  assert.deepEqual(visibleIds, ['ready-1']);
}

const tests: Array<[string, () => void]> = [
  ['editorial contents show all except posted', testEditorialContentsShowAllExceptPosted],
  ['recording queue excludes blocked contents', testRecordingQueueExcludesBlockedContents],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
