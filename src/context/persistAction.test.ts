import assert from 'node:assert/strict';
import type { AppState } from '../app/providers/appState.ts';
import type { Content } from '../lib/database.ts';
import { persistAction, persistContentRecord, type PersistenceApi } from './persistAction.ts';

function createMockApi(contentsById: Content[] = []) {
  const calls: Array<{ name: keyof PersistenceApi; args: unknown[] }> = [];
  const record = <K extends keyof PersistenceApi>(name: K) =>
    (...args: unknown[]) => {
      calls.push({ name, args });
      return Promise.resolve();
    };

  const api: PersistenceApi = {
    saveDnaVoz: record('saveDnaVoz'),
    saveContent: record('saveContent'),
    saveContentPlataformas: record('saveContentPlataformas'),
    saveBibliotecaItem: record('saveBibliotecaItem'),
    saveItemGeneros: record('saveItemGeneros'),
    deleteBibliotecaItem: record('deleteBibliotecaItem'),
    saveAnotacao: record('saveAnotacao'),
    deleteAnotacao: record('deleteAnotacao'),
    deleteContent: record('deleteContent'),
    fetchContentsByIds: async (_userId: string, ids: readonly string[]) => {
      calls.push({ name: 'fetchContentsByIds', args: [ids] });
      return contentsById.filter(content => ids.includes(content.id));
    },
    saveIdea: record('saveIdea'),
    deleteIdea: record('deleteIdea'),
    saveProjeto: record('saveProjeto'),
    saveProjetoEtapa: record('saveProjetoEtapa'),
    saveProjetoEtapas: record('saveProjetoEtapas'),
    saveProjetoConteudos: record('saveProjetoConteudos'),
    deleteProjetoEtapa: record('deleteProjetoEtapa'),
    deleteProjeto: record('deleteProjeto'),
    savePilar: record('savePilar'),
    savePilarPlataformas: record('savePilarPlataformas'),
    clearPilarReferences: record('clearPilarReferences'),
    deletePilar: record('deletePilar'),
    saveSerie: record('saveSerie'),
    saveSeriePilares: record('saveSeriePilares'),
    saveSeriePlataformas: record('saveSeriePlataformas'),
    deleteSerie: record('deleteSerie'),
    saveCenario: record('saveCenario'),
    deleteCenario: record('deleteCenario'),
    saveLook: record('saveLook'),
    deleteLook: record('deleteLook'),
    saveContentMetric: record('saveContentMetric'),
    deleteContentMetric: record('deleteContentMetric'),
    saveAgendaItem: record('saveAgendaItem'),
    deleteAgendaItem: record('deleteAgendaItem'),
    saveRecordingBlock: record('saveRecordingBlock'),
    saveRecordingBlockContents: record('saveRecordingBlockContents'),
    deleteRecordingBlock: record('deleteRecordingBlock'),
    saveTemplate: record('saveTemplate'),
    deleteTemplate: record('deleteTemplate'),
    savePreference: record('savePreference'),
    saveGoldenRule: record('saveGoldenRule'),
    deleteGoldenRule: record('deleteGoldenRule'),
    savePlatform: record('savePlatform'),
    deletePlatform: record('deletePlatform'),
  };

  return { api, calls };
}

function createState(overrides: Partial<AppState> = {}): AppState {
  return {
    platforms: [],
    preferences: {},
    dnaVoz: null,
    pilares: [],
    series: [],
    cenarios: [],
    looks: [],
    bibliotecaGeneros: [],
    bibliotecaItems: [],
    contents: [],
    ideas: [],
    projetos: [],
    recordingBlocks: [],
    templates: [],
    agendaItems: [],
    goldenRules: [],
    contentMetrics: [],
    postingTimeEntries: [],
    theme: 'light',
    isLoaded: true,
    ...overrides,
  };
}

function createContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Conteúdo teste',
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

async function testPersistContentRecordUsesContentAndPlatforms() {
  const { api, calls } = createMockApi();
  const content = createContent({
    plataformas: [{
      id: 'platform-row',
      contentId: 'content-1',
      platformId: 'Instagram',
      legenda: 'Legenda',
      hashtags: '#a',
      publishDate: null,
      publishDateEnabled: false,
    }],
  });

  await persistContentRecord(content, 'user-99', api);

  assert.deepEqual(calls.map(call => call.name), ['saveContent', 'saveContentPlataformas']);
  assert.equal((calls[0]?.args[0] as Content & { userId: string }).userId, 'user-99');
  assert.equal(calls[1]?.args[0], 'content-1');
}

async function testPersistActionPromoteIdeaUsesStableCanonicalContentId() {
  const { api, calls } = createMockApi();
  const canonicalId = '11111111-1111-4111-8111-111111111111';
  const content = createContent({ id: canonicalId });
  const state = createState({
    ideas: [{
      id: 'idea-1',
      userId: 'user-1',
      title: 'Ideia',
      notes: null,
      text: 'Ideia',
      pilarId: null,
      seriesId: null,
      origemId: null,
      promotedToContentId: null,
      demotedFromContentId: null,
      archived: false,
      createdAt: '2026-05-01T00:00:00.000Z',
    }],
  });

  await persistAction({
    action: {
      type: 'PROMOTE_IDEA',
      payload: {
        ideaId: 'idea-1',
        contentId: canonicalId,
        content,
      },
    },
    userId: 'user-1',
    state,
    api,
  });

  assert.deepEqual(calls.map(call => call.name), ['saveContent', 'saveContentPlataformas']);
  const savedContent = calls[0]?.args[0] as Content;
  assert.equal(savedContent.id, canonicalId);
  assert.equal(savedContent.legacyIdeaId, 'idea-1');
  assert.equal(savedContent.status, 'Roteiro');
}

async function testPersistActionDemoteContentKeepsStableId() {
  const content = createContent({ id: 'content-linked', title: 'Roteiro editado', notes: 'corpo das observações' });
  const { api, calls } = createMockApi([content]);
  const state = createState({
    contents: [content],
    ideas: [{
      id: 'idea-1',
      userId: 'user-1',
      title: 'Ideia original',
      notes: null,
      text: 'Ideia original',
      pilarId: null,
      seriesId: null,
      origemId: null,
      promotedToContentId: 'content-linked',
      demotedFromContentId: null,
      archived: true,
      createdAt: '2026-05-01T00:00:00.000Z',
    }],
  });

  await persistAction({
    action: {
      type: 'DEMOTE_CONTENTS_TO_IDEAS',
      payload: { contentIds: ['content-linked'] },
    },
    userId: 'user-1',
    state,
    api,
  });

  assert.deepEqual(calls.map(call => call.name), [
    'fetchContentsByIds',
    'saveContent',
    'saveContentPlataformas',
  ]);
  const savedContent = calls.find(call => call.name === 'saveContent')?.args[0] as Content;
  assert.equal(savedContent.id, 'content-linked');
  assert.equal(savedContent.status, 'Ideia');
  assert.equal(savedContent.title, 'Roteiro editado');
  assert.equal(calls.some(call => call.name === 'deleteContent'), false);
  assert.equal(calls.some(call => call.name === 'saveIdea'), false);
}

async function testPersistActionDemoteUnlinkedContentRemainsContent() {
  const content = createContent({ id: 'content-new', title: 'Só roteiro', notes: 'Sem ideia anterior' });
  const { api, calls } = createMockApi([content]);
  const state = createState({ contents: [content], ideas: [] });

  await persistAction({
    action: {
      type: 'DEMOTE_CONTENTS_TO_IDEAS',
      payload: { contentIds: ['content-new'] },
    },
    userId: 'user-1',
    state,
    api,
  });

  assert.deepEqual(calls.map(call => call.name), [
    'fetchContentsByIds',
    'saveContent',
    'saveContentPlataformas',
  ]);
  const savedContent = calls.find(call => call.name === 'saveContent')?.args[0] as Content;
  assert.equal(savedContent.id, 'content-new');
  assert.equal(savedContent.status, 'Ideia');
  assert.equal(calls.some(call => call.name === 'saveIdea'), false);
}

async function testPersistActionAdaptsLegacyAddIdeaToContent() {
  const {api, calls} = createMockApi();
  const state = createState();

  await persistAction({
    action: {
      type: 'ADD_IDEA',
      payload: {
        id: 'idea-new',
        canonicalContentId: '22222222-2222-4222-8222-222222222222',
        userId: '',
        title: 'Gancho novo',
        notes: 'Desenvolver depois',
        text: 'Gancho novo',
        pilarId: null,
        seriesId: null,
        origemId: null,
        promotedToContentId: null,
        demotedFromContentId: null,
        archived: false,
        createdAt: '2026-05-01T00:00:00.000Z',
      },
    },
    userId: 'user-1',
    state,
    api,
  });

  assert.deepEqual(calls.map(call => call.name), ['saveContent', 'saveContentPlataformas']);
  const savedContent = calls[0]?.args[0] as Content;
  assert.equal(savedContent.id, '22222222-2222-4222-8222-222222222222');
  assert.equal(savedContent.legacyIdeaId, 'idea-new');
  assert.equal(savedContent.status, 'Ideia');
  assert.equal(calls.some(call => call.name === 'saveIdea'), false);
}

async function testPersistActionWritesLooksAndCenarios() {
  const { api, calls } = createMockApi();
  const state = createState();

  await persistAction({
    action: {
      type: 'ADD_LOOK',
      payload: {
        id: 'look-1',
        userId: 'user-1',
        numero: 1,
        descricao: 'Look principal',
        cenarioId: null,
        ativo: true,
        createdAt: '2026-05-01T00:00:00.000Z',
      },
    },
    userId: 'user-1',
    state,
    api,
  });

  await persistAction({
    action: {
      type: 'ADD_CENARIO',
      payload: {
        id: 'cenario-1',
        userId: 'user-1',
        nome: 'Estúdio',
        descricao: 'Fundo claro',
        tempoSetupMinutos: 5,
        ativo: true,
        createdAt: '2026-05-01T00:00:00.000Z',
      },
    },
    userId: 'user-1',
    state,
    api,
  });

  assert.deepEqual(calls.map(call => call.name), ['saveLook', 'saveCenario']);
}

const tests: Array<[string, () => Promise<void>]> = [
  ['persistContentRecord saves content and platforms together', testPersistContentRecordUsesContentAndPlatforms],
  ['persistAction promotes an idea with a stable canonical content id', testPersistActionPromoteIdeaUsesStableCanonicalContentId],
  ['persistAction demotes content by updating its canonical status', testPersistActionDemoteContentKeepsStableId],
  ['persistAction keeps unlinked demoted content in contents', testPersistActionDemoteUnlinkedContentRemainsContent],
  ['persistAction adapts ADD_IDEA to a canonical content write', testPersistActionAdaptsLegacyAddIdeaToContent],
  ['persistAction persists looks and cenarios through the unified adapter', testPersistActionWritesLooksAndCenarios],
];

for (const [name, fn] of tests) {
  await fn();
  console.log(`ok - ${name}`);
}
