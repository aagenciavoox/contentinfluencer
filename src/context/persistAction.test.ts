import assert from 'node:assert/strict';
import type { AppState } from '../app/providers/appState.ts';
import type { Content } from '../lib/database.ts';
import { persistAction, persistContentRecord, type PersistenceApi } from './persistAction.ts';

function createMockApi() {
  const calls: Array<{ name: keyof PersistenceApi; args: unknown[] }> = [];
  const record = <K extends keyof PersistenceApi>(name: K) =>
    (...args: unknown[]) => {
      calls.push({ name, args });
      return Promise.resolve();
    };

  const api: PersistenceApi = {
    saveContent: record('saveContent'),
    saveContentPlataformas: record('saveContentPlataformas'),
    saveBibliotecaItem: record('saveBibliotecaItem'),
    saveItemGeneros: record('saveItemGeneros'),
    deleteBibliotecaItem: record('deleteBibliotecaItem'),
    saveAnotacao: record('saveAnotacao'),
    deleteAnotacao: record('deleteAnotacao'),
    deleteContent: record('deleteContent'),
    saveIdea: record('saveIdea'),
    deleteIdea: record('deleteIdea'),
    saveProjeto: record('saveProjeto'),
    saveProjetoEtapa: record('saveProjetoEtapa'),
    saveProjetoConteudos: record('saveProjetoConteudos'),
    deleteProjetoEtapa: record('deleteProjetoEtapa'),
    deleteProjeto: record('deleteProjeto'),
    savePilar: record('savePilar'),
    savePilarPlataformas: record('savePilarPlataformas'),
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
    saveDnaVoz: record('saveDnaVoz'),
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
    books: [],
    partnerships: [],
    results: [],
    agenda: [],
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

async function testPersistActionPromoteIdeaArchivesIdeaAndPersistsContent() {
  const { api, calls } = createMockApi();
  const content = createContent({ id: 'content-promoted' });
  const state = createState({
    ideas: [{
      id: 'idea-1',
      userId: 'user-1',
      text: 'Ideia',
      pilarId: null,
      seriesId: null,
      origemId: null,
      promotedToContentId: null,
      archived: false,
      createdAt: '2026-05-01T00:00:00.000Z',
    }],
  });

  await persistAction({
    action: {
      type: 'PROMOTE_IDEA',
      payload: {
        ideaId: 'idea-1',
        contentId: 'content-promoted',
        content,
      },
    },
    userId: 'user-1',
    state,
    api,
  });

  assert.deepEqual(calls.map(call => call.name), ['saveContent', 'saveContentPlataformas', 'saveIdea']);
  const savedIdea = calls[2]?.args[0] as { archived: boolean; promotedToContentId: string };
  assert.equal(savedIdea.archived, true);
  assert.equal(savedIdea.promotedToContentId, 'content-promoted');
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
  ['persistAction persists promoted ideas with archived source idea', testPersistActionPromoteIdeaArchivesIdeaAndPersistsContent],
  ['persistAction persists looks and cenarios through the unified adapter', testPersistActionWritesLooksAndCenarios],
];

for (const [name, fn] of tests) {
  await fn();
  console.log(`ok - ${name}`);
}
