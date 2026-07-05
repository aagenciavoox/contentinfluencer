import assert from 'node:assert/strict';
import type { Content, Platform } from './database';
import { mergeContents, mergeFetchedAppData, mergePlatforms } from './domainCacheMerge';

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

testMergeKeepsLocalPlatformsMissingFromIncoming();
testMergeKeepsLocalContentsMissingFromIncoming();
testMergePrefersLocalVersionOnConflict();
testMergePlatformsHelper();
testMergeContentsHelper();
