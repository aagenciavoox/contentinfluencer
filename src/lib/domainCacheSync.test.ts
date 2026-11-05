import assert from 'node:assert/strict';
import type { Content, PlanejamentoPostIt, Platform } from './database';
import { limparConteudosApagados, marcarConteudoApagado } from './conteudosApagados.ts';
import { aplicarListaCompletaDeConteudos, mergeContents, mergeFetchedAppData, mergePlatforms, patchChangedSlices } from './domainCacheMerge.ts';

function platform(id: string, nome: string): Platform {
  return {
    id,
    userId: 'user-1',
    nome,
    ativo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function content(id: string, title: string, createdAt: string): Content {
  return {
    id,
    userId: 'user-1',
    title,
    status: 'Postado',
    slotType: null,
    seriesId: null,
    pilarId: null,
    cenarioId: null,
    lookId: null,
    formatoVisual: 'Video',
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    energiaNecessaria: null,
    funcao: null,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
    publishDate: '2026-07-01',
    publishTime: null,
    recordingDate: null,
    recordedAt: null,
    postedAt: null,
    link: null,
    bibliotecaItemId: null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
    plataformas: [],
  };
}

function testMergeKeepsLocalPlatformsMissingFromIncoming() {
  const current = { platforms: [platform('p1', 'Instagram')], contents: [] };
  const incoming = { platforms: [] as Platform[] };
  const merged = mergeFetchedAppData(current, incoming);
  assert.equal(merged.platforms?.length, 1);
}

function testMergeKeepsLocalContentsMissingFromIncoming() {
  const current = {
    platforms: [],
    contents: [content('c1', 'Video postado', '2026-07-05T12:00:00.000Z')],
  };
  const incoming = { contents: [] as Content[] };
  const merged = mergeFetchedAppData(current, incoming);
  assert.equal(merged.contents?.length, 1);
  assert.equal(merged.contents?.[0]?.title, 'Video postado');
}

function testMergePrefersLocalVersionOnConflict() {
  const current = {
    platforms: [platform('p1', 'Instagram Atualizado')],
    contents: [content('c1', 'Titulo local', '2026-07-05T13:00:00.000Z')],
  };
  const incoming = {
    platforms: [platform('p1', 'Instagram Antigo')],
    contents: [content('c1', 'Titulo remoto', '2026-07-05T12:00:00.000Z')],
  };
  const merged = mergeFetchedAppData(current, incoming);
  assert.equal(merged.platforms?.[0]?.nome, 'Instagram Atualizado');
  assert.equal(merged.contents?.[0]?.title, 'Titulo local');
}

function testMergePrefersNewerServerVersionOverStaleCache() {
  const cached = {
    ...content('c1', 'Roteiro', '2026-07-05T12:00:00.000Z'),
    status: 'Roteiro',
    script: '<p>corpo local</p>',
  };
  const server = {
    ...content('c1', 'Roteiro', '2026-07-05T12:00:00.000Z'),
    status: 'Produção',
    script: undefined as unknown as string | null,
    updatedAt: '2026-07-05T14:00:00.000Z',
  };
  const merged = mergeFetchedAppData({ platforms: [], contents: [cached] }, { contents: [server] });
  assert.equal(merged.contents?.[0]?.status, 'Produção');
  assert.equal(merged.contents?.[0]?.script, '<p>corpo local</p>');
}

function testMergePlatformsHelper() {
  const merged = mergePlatforms([platform('p1', 'Local')], []);
  assert.equal(merged.length, 1);
}

function testMergeContentsHelper() {
  const merged = mergeContents(
    [content('c1', 'Local', '2026-07-05T13:00:00.000Z')],
    [],
  );
  assert.equal(merged.length, 1);
}

function testMergeDropsDeletedContentEvenWhenServerStillReturnsIt() {
  limparConteudosApagados();
  marcarConteudoApagado('c1');
  try {
    const local = content('c1', 'Apagado', '2026-07-05T13:00:00.000Z');
    const remote = content('c1', 'Ainda no retorno antigo', '2026-07-05T12:00:00.000Z');
    const merged = mergeFetchedAppData(
      { platforms: [], contents: [local, content('c2', 'Fica', '2026-07-05T11:00:00.000Z')] },
      { contents: [remote, content('c2', 'Fica', '2026-07-05T11:00:00.000Z')] },
    );
    assert.deepEqual(merged.contents?.map(item => item.id), ['c2']);
  } finally {
    limparConteudosApagados();
  }
}

function testFullListDropsGhostAndKeepsFreshLocal() {
  const ghost = content('apagado', 'Sumiu no servidor', '2026-07-01T12:00:00.000Z');
  const fresco = {
    ...content('novo', 'Criado durante a busca', '2026-07-05T12:00:00.000Z'),
    updatedAt: '2026-07-05T12:00:05.000Z',
  };
  const vivo = content('vivo', 'Continua', '2026-07-04T12:00:00.000Z');
  const arquivado = {
    ...content('arquivo', 'Fora da lista ativa', '2026-07-02T12:00:00.000Z'),
    archivedAt: '2026-07-02T12:00:00.000Z',
  };
  const comErro = content('falha', 'Gravação com erro', '2026-07-03T12:00:00.000Z');
  const lista = aplicarListaCompletaDeConteudos(
    [ghost, fresco, vivo, arquivado, comErro],
    [vivo],
    {
      manterIds: new Set(['falha']),
      alteradoDesdeMs: Date.parse('2026-07-05T12:00:02.000Z'),
    },
  );
  assert.deepEqual(lista.map(item => item.id).sort(), ['arquivo', 'falha', 'novo', 'vivo']);
}

function postIt(id: string, date: string | null): PlanejamentoPostIt {
  return {
    id,
    userId: 'user-1',
    texto: '',
    date,
    contentId: null,
    createdAt: '2026-10-17T15:00:00.000Z',
    updatedAt: '2026-10-17T15:00:00.000Z',
  };
}

function testPatchPutsSavedPostItsIntoCachedPhoto() {
  const before = { postIts: [postIt('n1', null)], platforms: [] as Platform[] };
  const after = { ...before, postIts: [postIt('n1', '2026-10-26')] };
  const cached = { postIts: before.postIts, goldenRules: [] };
  const next = patchChangedSlices(cached, before, after);
  assert.equal(next?.postIts?.[0]?.date, '2026-10-26');
  assert.equal(next?.goldenRules, cached.goldenRules);
}

function testPatchSkipsPhotoWithoutChangedSlice() {
  const before = { postIts: [postIt('n1', null)], agendaItems: [] };
  const after = { ...before, postIts: [postIt('n1', '2026-10-26')] };
  assert.equal(patchChangedSlices({ agendaItems: [] }, before, after), null);
}

function testPatchLeavesContentsToTheirOwnSync() {
  const before = { contents: [] as Content[] };
  const after = { contents: [content('c1', 'Novo', '2026-10-17T15:00:00.000Z')] };
  assert.equal(patchChangedSlices({ contents: [] }, before, after), null);
}

testMergeKeepsLocalPlatformsMissingFromIncoming();
testMergeKeepsLocalContentsMissingFromIncoming();
testMergePrefersLocalVersionOnConflict();
testMergePrefersNewerServerVersionOverStaleCache();
testMergePlatformsHelper();
testMergeContentsHelper();
testMergeDropsDeletedContentEvenWhenServerStillReturnsIt();
testFullListDropsGhostAndKeepsFreshLocal();
testPatchPutsSavedPostItsIntoCachedPhoto();
testPatchSkipsPhotoWithoutChangedSlice();
testPatchLeavesContentsToTheirOwnSync();
