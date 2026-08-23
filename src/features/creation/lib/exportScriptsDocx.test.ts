import assert from 'node:assert/strict';
import type {Content, Platform} from '../../../lib/database.ts';
import {
  buildCreationExportSections,
  canExportCreation,
  createCreationsDocxBlob,
  getCreationExportCopy,
} from './exportScriptsDocx.ts';

function content(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'Roteiro principal',
    status: 'Roteiro',
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
    script: '<p>Primeiro bloco.</p><p>Segundo bloco.</p>',
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-07-30T10:00:00.000Z',
    updatedAt: '2026-07-30T10:00:00.000Z',
    deletedAt: null,
    archivedAt: null,
    plataformas: [],
    ...overrides,
  };
}

const platforms: Platform[] = [
  {
    id: 'instagram',
    userId: 'user-1',
    nome: 'Instagram',
    ativo: true,
    createdAt: '2026-07-30T10:00:00.000Z',
  },
];

const source = content({
  plataformas: [
    {
      id: 'caption-1',
      contentId: 'content-1',
      platformId: 'instagram',
      legenda: '<p>Legenda publicada.</p>',
      hashtags: '#conteudo #criacao',
      publishDate: null,
    },
    {
      id: 'caption-2',
      contentId: 'content-1',
      platformId: 'tiktok',
      legenda: '   ',
      hashtags: '#nao-exportar',
      publishDate: null,
    },
  ],
});

const sections = buildCreationExportSections([source], platforms);
assert.equal(sections.length, 1);
assert.equal(sections[0]?.title, 'Roteiro principal');
assert.equal(sections[0]?.kind, 'script');
assert.equal(sections[0]?.body, 'Primeiro bloco.\n\nSegundo bloco.');
assert.deepEqual(sections[0]?.captions, [
  {
    platform: 'Instagram',
    text: 'Legenda publicada.',
    hashtags: '#conteudo #criacao',
  },
]);
console.log('ok - creation export includes title, readable script and non-empty captions');

const idea = content({
  id: 'idea-1',
  title: 'Ideia principal',
  status: 'Ideia',
  notes: '<p>Descrição da ideia.</p>',
  script: null,
});
const ideaSections = buildCreationExportSections([idea], platforms);
assert.equal(ideaSections[0]?.kind, 'idea');
assert.equal(ideaSections[0]?.body, 'Descrição da ideia.');
assert.equal(getCreationExportCopy([idea]).title, 'Ideias');
assert.equal(getCreationExportCopy([source]).title, 'Roteiros');
assert.equal(getCreationExportCopy([idea, source]).title, 'Ideias e roteiros');
console.log('ok - creation export includes ideas and chooses the matching document title');

assert.equal(canExportCreation(content({status: 'Ideia'})), true);
assert.equal(canExportCreation(content({status: 'Pronto para Gravar'})), true);
assert.equal(
  canExportCreation(content({deletedAt: '2026-07-30T11:00:00.000Z'})),
  false,
);
console.log('ok - creation export includes ideas and excludes deleted content');

const blob = await createCreationsDocxBlob([idea, source], platforms);
assert.ok(blob.size > 1_000);
assert.equal(
  blob.type,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
);
console.log('ok - creation export creates a valid DOCX blob');
