import assert from 'node:assert/strict';
import type { Content } from '../../../lib/database.ts';
import {
  captionClipboardText,
  filterCaptionQueue,
  isCaptionQueueContent,
  paginateCaptionQueue,
} from './captionQueue.ts';

function createContent(overrides: Partial<Content> = {}): Content {
  return {
    id: 'content-1',
    userId: 'user-1',
    title: 'O livro que eu larguei',
    status: 'Roteiro',
    slotType: null,
    seriesId: null,
    pilarId: null,
    lookId: null,
    cenarioId: null,
    bibliotecaItemId: null,
    formatoVisual: 'Reels',
    energiaNecessaria: null,
    funcao: null,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
    publishDate: null,
    recordingDate: null,
    link: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    deletedAt: null,
    archivedAt: null,
    legacyIdeaId: null,
    plataformas: [],
    ...overrides,
  };
}

assert.equal(isCaptionQueueContent(createContent({ status: 'Ideia' })), false);
assert.equal(isCaptionQueueContent(createContent({ status: 'Roteiro' })), true);
assert.equal(isCaptionQueueContent(createContent({ status: 'Produção' })), true);
assert.equal(isCaptionQueueContent(createContent({ status: 'Postado' })), true);
assert.equal(isCaptionQueueContent(createContent({ archivedAt: '2026-10-02T00:00:00.000Z' })), false);
assert.equal(isCaptionQueueContent(createContent({ deletedAt: '2026-10-02T00:00:00.000Z' })), false);

const idea = createContent({ id: 'idea', status: 'Ideia', title: 'Ideia solta', updatedAt: '2026-10-03T00:00:00.000Z' });
const emptyScript = createContent({ id: 'empty', title: 'Sem legenda ainda', updatedAt: '2026-10-02T00:00:00.000Z' });
const ready = createContent({
  id: 'ready',
  title: 'Já tem copy',
  status: 'Produção',
  updatedAt: '2026-10-01T00:00:00.000Z',
  plataformas: [{
    id: 'p1',
    contentId: 'ready',
    platformId: 'Instagram',
    legenda: 'Olha esse trecho.',
    hashtags: '#leitura',
    publishDate: null,
  }],
});

const all = filterCaptionQueue([idea, emptyScript, ready], 'todos', '');
assert.deepEqual(all.map(item => item.id), ['empty', 'ready']);

const missing = filterCaptionQueue([idea, emptyScript, ready], 'sem-legenda', '');
assert.deepEqual(missing.map(item => item.id), ['empty']);

const filled = filterCaptionQueue([emptyScript, ready], 'com-legenda', 'copy');
assert.deepEqual(filled.map(item => item.id), ['ready']);

assert.equal(captionClipboardText([]), '');
assert.equal(
  captionClipboardText([{ platformId: 'Instagram', legenda: 'Oi', hashtags: '#livro' }]),
  'Oi\n\n#livro',
);
assert.equal(
  captionClipboardText([
    { platformId: 'Instagram', legenda: 'Feed', hashtags: '' },
    { platformId: 'TikTok', legenda: 'Curto', hashtags: '#agora' },
  ], 'TikTok'),
  'Curto\n\n#agora',
);
assert.equal(
  captionClipboardText([
    { platformId: 'Instagram', legenda: 'Feed', hashtags: '' },
    { platformId: 'TikTok', legenda: 'Curto', hashtags: '' },
  ]),
  'Instagram\nFeed\n\nTikTok\nCurto',
);

const pages = paginateCaptionQueue(['a', 'b', 'c', 'd', 'e'], 2, 2);
assert.equal(pages.page, 2);
assert.deepEqual(pages.items, ['c', 'd']);
assert.equal(pages.totalPages, 3);
assert.equal(paginateCaptionQueue(['a'], 9, 2).page, 1);

console.log('captionQueue.test.ts passed');
