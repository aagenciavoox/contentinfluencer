import assert from 'node:assert/strict';
import type {Content, Idea} from '../../../lib/database.ts';
import {isUUID} from '../../../utils/uuid.ts';
import {
  archiveCreation,
  contentFromLegacyIdea,
  demoteContentToIdea,
  filterCreationContents,
  filterContentsByCreationTab,
  getCreationTabCounts,
  paginateCreationContents,
  promoteContentToScript,
  removeDeletedCreations,
  restoreCreation,
  restoreDeletedCreation,
  sortCreationContents,
} from './creationContent.ts';

function createContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Criação',
    status: 'Ideia',
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
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-07-25T10:00:00.000Z',
    updatedAt: '2026-07-25T10:00:00.000Z',
    deletedAt: null,
    archivedAt: null,
    legacyIdeaId: null,
    plataformas: [],
    ...overrides,
  };
}

function testStablePipelineTransitions() {
  const source = createContent({id: 'stable-id', status: 'Ideia'});
  const promoted = promoteContentToScript(source, '2026-07-25T11:00:00.000Z');
  const demoted = demoteContentToIdea(promoted, '2026-07-25T12:00:00.000Z');

  assert.equal(promoted.id, 'stable-id');
  assert.equal(promoted.status, 'Roteiro');
  assert.equal(demoted.id, 'stable-id');
  assert.equal(demoted.status, 'Ideia');
}

function testArchiveAndRestoreAreReversible() {
  const source = createContent();
  const archived = archiveCreation(source, '2026-07-25T11:00:00.000Z');
  const restored = restoreCreation(archived, '2026-07-25T12:00:00.000Z');

  assert.equal(archived.archivedAt, '2026-07-25T11:00:00.000Z');
  assert.equal(archived.deletedAt, null);
  assert.equal(restored.archivedAt, null);
  assert.equal(restored.deletedAt, null);
}

function testTrashAndRestoreAreReversible() {
  const deletedAt = '2026-07-25T11:00:00.000Z';
  const source = createContent({deletedAt});
  const restored = restoreDeletedCreation(source, '2026-07-25T12:00:00.000Z');

  assert.equal(source.deletedAt, deletedAt);
  assert.equal(restored.deletedAt, null);
  assert.equal(restored.updatedAt, '2026-07-25T12:00:00.000Z');
}

function testClearTrashKeepsOnlyActiveCreations() {
  const contents = [
    createContent({id: 'active'}),
    createContent({id: 'deleted-1', deletedAt: '2026-07-25T12:00:00.000Z'}),
    createContent({id: 'deleted-2', deletedAt: '2026-07-25T13:00:00.000Z'}),
  ];

  assert.deepEqual(
    removeDeletedCreations(contents).map(content => content.id),
    ['active'],
  );
}

function testLegacyIdeaAdapterReusesSourceId() {
  const idea: Idea = {
    id: 'legacy-idea-1',
    userId: 'user-1',
    title: 'Título',
    notes: 'Notas',
    text: 'Título',
    pilarId: 'pilar-1',
    seriesId: null,
    origemId: 'book-1',
    promotedToContentId: null,
    demotedFromContentId: null,
    archived: false,
    createdAt: '2026-07-25T10:00:00.000Z',
  };

  const content = contentFromLegacyIdea(idea);
  assert.equal(isUUID(content.id), true);
  assert.notEqual(content.id, idea.id);
  assert.equal(content.legacyIdeaId, idea.id);
  assert.equal(content.status, 'Ideia');
  assert.equal(content.notes, 'Notas');
  assert.equal(content.bibliotecaItemId, 'book-1');
}

function testCreationTabsExcludeArchivedFromActiveTabs() {
  const contents = [
    createContent({id: 'idea', status: 'Ideia'}),
    createContent({id: 'script', status: 'Roteiro'}),
    createContent({id: 'production', status: 'Pronto para Gravar'}),
    createContent({id: 'posted', status: 'Postado'}),
    createContent({
      id: 'archived',
      status: 'Ideia',
      archivedAt: '2026-07-25T11:00:00.000Z',
    }),
    createContent({
      id: 'deleted',
      status: 'Roteiro',
      deletedAt: '2026-07-25T12:00:00.000Z',
    }),
    createContent({
      id: 'script-already-posted',
      status: 'Roteiro',
      postedAt: '2026-07-20T12:00:00.000Z',
    }),
  ];

  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Produção').map(content => content.id),
    ['production'],
  );
  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Arquivados').map(content => content.id),
    ['archived'],
  );
  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Lixeira').map(content => content.id),
    ['deleted'],
  );
  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Roteiros').map(content => content.id),
    ['script'],
  );
  assert.deepEqual(
    filterContentsByCreationTab(contents, 'Publicados').map(content => content.id),
    ['posted', 'script-already-posted'],
  );
  assert.deepEqual(getCreationTabCounts(contents), {
    Todos: 5,
    Ideias: 1,
    Roteiros: 1,
    Produção: 1,
    Publicados: 2,
    Arquivados: 1,
    Lixeira: 1,
  });
}

function testSharedCreationFiltersIncludeOriginAndSearch() {
  const contents = [
    createContent({
      id: 'matching',
      title: 'Gancho sobre memória',
      pilarId: 'pilar-1',
      seriesId: 'serie-1',
      bibliotecaItemId: 'book-1',
    }),
    createContent({
      id: 'wrong-origin',
      title: 'Gancho sobre memória',
      pilarId: 'pilar-1',
      seriesId: 'serie-1',
      bibliotecaItemId: 'book-2',
    }),
    createContent({
      id: 'wrong-search',
      title: 'Outro assunto',
      pilarId: 'pilar-1',
      seriesId: 'serie-1',
      bibliotecaItemId: 'book-1',
    }),
  ];

  assert.deepEqual(
    filterCreationContents(contents, {
      tab: 'Ideias',
      search: 'MEMÓRIA',
      pilarId: 'pilar-1',
      seriesId: 'serie-1',
      originId: 'book-1',
    }).map(content => content.id),
    ['matching'],
  );
}

function testCreationSortingAndPaginationClampInvalidPages() {
  const contents = Array.from({length: 5}, (_, index) => createContent({
    id: `content-${index + 1}`,
    title: `Título ${index + 1}`,
    updatedAt: `2026-07-2${index + 1}T10:00:00.000Z`,
  }));

  const sorted = sortCreationContents(contents, 'recent');
  assert.equal(sorted[0]?.id, 'content-5');

  const page = paginateCreationContents(sorted, 99, 2);
  assert.equal(page.page, 3);
  assert.equal(page.totalPages, 3);
  assert.equal(page.totalItems, 5);
  assert.deepEqual(page.items.map(content => content.id), ['content-1']);
}

const tests: Array<[string, () => void]> = [
  ['creation pipeline transitions keep the same id', testStablePipelineTransitions],
  ['archive and restore are reversible', testArchiveAndRestoreAreReversible],
  ['trash and restore are reversible', testTrashAndRestoreAreReversible],
  ['clearing trash keeps active creations', testClearTrashKeepsOnlyActiveCreations],
  ['legacy ideas adapt to canonical contents', testLegacyIdeaAdapterReusesSourceId],
  ['creation tabs classify active and archived content', testCreationTabsExcludeArchivedFromActiveTabs],
  ['creation filters combine search, pilar, series and origin', testSharedCreationFiltersIncludeOriginAndSearch],
  ['creation sorting and pagination remain stable', testCreationSortingAndPaginationClampInvalidPages],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
