import assert from 'node:assert/strict';
import type {Content} from '../../../lib/database.ts';
import {CONTENT_STATUS} from './contentPipeline.ts';
import {getEditorialContents} from './contentWorkflow.ts';

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
    plataformas: [],
    ...overrides,
  };
}

function testEditorialContentsShowAllExceptPosted() {
  const roteiro = createContent({id: 'roteiro', status: CONTENT_STATUS.ROTEIRO});
  const ideia = createContent({id: 'ideia', status: CONTENT_STATUS.IDEIA});
  const linkedReady = createContent({
    id: 'linked-ready',
    status: CONTENT_STATUS.PRONTO_PARA_GRAVAR,
    bibliotecaItemId: 'book-1',
  });
  const linkedRecorded = createContent({
    id: 'linked-recorded',
    status: CONTENT_STATUS.GRAVADO,
    bibliotecaItemId: 'book-1',
  });
  const linkedPosted = createContent({
    id: 'linked-posted',
    status: CONTENT_STATUS.POSTADO,
    bibliotecaItemId: 'book-1',
  });
  const unlinkedReady = createContent({
    id: 'unlinked-ready',
    status: CONTENT_STATUS.PRONTO_PARA_GRAVAR,
  });

  const visibleIds = getEditorialContents([
    roteiro,
    ideia,
    linkedReady,
    linkedRecorded,
    linkedPosted,
    unlinkedReady,
  ]).map(content => content.id);

  assert.deepEqual(visibleIds, ['roteiro', 'ideia', 'linked-ready', 'linked-recorded', 'unlinked-ready']);
}

const tests: Array<[string, () => void]> = [
  ['editorial contents show all except posted', testEditorialContentsShowAllExceptPosted],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
