import assert from 'node:assert/strict';
import type { Content } from '../../../lib/database.ts';
import {
  stableCaptionOrder,
  captionClipboardText,
  filtrarFilaLegendas,
  isCaptionQueueContent,
  paginateCaptionQueue,
  publicacaoNaFila,
} from './captionQueue.ts';
import type { ContentPlataforma } from '../../../lib/database.ts';

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

function pub(partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'platformId' | 'contentId'>): ContentPlataforma {
  return {
    legenda: '',
    hashtags: '',
    publishDate: null,
    publicationKind: 'post',
    status: 'agendada',
    legendaPropria: false,
    ...partial,
  };
}

assert.equal(isCaptionQueueContent(createContent({ status: 'Ideia' })), false);
assert.equal(isCaptionQueueContent(createContent({ status: 'Roteiro' })), true);
assert.equal(isCaptionQueueContent(createContent({ status: 'Produção' })), true);
assert.equal(isCaptionQueueContent(createContent({ status: 'Postado' })), true);
assert.equal(isCaptionQueueContent(createContent({ archivedAt: '2026-10-02T00:00:00.000Z' })), false);
assert.equal(isCaptionQueueContent(createContent({ deletedAt: '2026-10-02T00:00:00.000Z' })), false);

const contas = [
  { id: 'ig-diza', nome: 'Instagram', rede: 'instagram' as const, handle: 'dizaianne' },
  { id: 'ig-leituras', nome: 'Leituras', rede: 'instagram' as const, handle: 'leituras' },
  { id: 'tt', nome: 'TikTok', rede: 'tiktok' as const, handle: 'dizaianne' },
];

const idea = createContent({ id: 'idea', status: 'Ideia', title: 'Ideia solta', updatedAt: '2026-10-03T00:00:00.000Z' });
const emptyScript = createContent({
  id: 'empty',
  title: 'Sem legenda ainda',
  updatedAt: '2026-10-02T00:00:00.000Z',
  plataformas: [pub({ id: 'empty-ig', contentId: 'empty', platformId: 'ig-diza' })],
});
const ready = createContent({
  id: 'ready',
  title: 'Já tem copy',
  status: 'Produção',
  updatedAt: '2026-10-01T00:00:00.000Z',
  legendaBase: 'Olha esse trecho.',
  plataformas: [pub({
    id: 'p1',
    contentId: 'ready',
    platformId: 'ig-diza',
    hashtags: '#leitura',
  })],
});
const duasContas = createContent({
  id: 'duas',
  title: 'Duas contas',
  status: 'Postado',
  updatedAt: '2026-10-04T00:00:00.000Z',
  legendaBase: 'Base preenchida',
  plataformas: [
    pub({ id: 'duas-ig', contentId: 'duas', platformId: 'ig-diza', status: 'publicada', legenda: 'já foi' }),
    pub({ id: 'duas-tt', contentId: 'duas', platformId: 'tt' }),
    pub({ id: 'duas-ig2', contentId: 'duas', platformId: 'ig-leituras', legendaPropria: true, legenda: '' }),
  ],
});

assert.equal(publicacaoNaFila(duasContas, duasContas.plataformas[0]), false);
assert.equal(publicacaoNaFila(duasContas, duasContas.plataformas[1]), true);

const all = filtrarFilaLegendas([idea, emptyScript, ready, duasContas], 'todos', '', contas);
assert.deepEqual(all.map(item => item.id), ['duas-ig2', 'duas-tt', 'empty-ig', 'p1']);

const missing = filtrarFilaLegendas([idea, emptyScript, ready, duasContas], 'sem-legenda', '', contas);
assert.deepEqual(missing.map(item => item.id), ['duas-ig2', 'empty-ig']);

const filled = filtrarFilaLegendas([emptyScript, ready, duasContas], 'com-legenda', 'copy', contas);
assert.deepEqual(filled.map(item => item.id), ['p1']);

const pelaConta = filtrarFilaLegendas([duasContas], 'sem-legenda', '@leituras', contas);
assert.deepEqual(pelaConta.map(item => item.id), ['duas-ig2']);

const comBase = filtrarFilaLegendas([duasContas], 'com-legenda', 'tiktok', contas);
assert.deepEqual(comBase.map(item => item.id), ['duas-tt']);

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

{
  const a = { id: 'a' };
  const b = { id: 'b' };
  const c = { id: 'c' };
  // 'a' ganhou legenda (saiu de matched) mas segue na fila; 'c' é novo e entra no fim.
  assert.deepEqual(
    stableCaptionOrder(['a', 'b'], [b, c], [c, a, b]).map(item => item.id),
    ['a', 'b', 'c'],
  );
  // Item apagado some mesmo estando na ordem anterior.
  assert.deepEqual(stableCaptionOrder(['a', 'b'], [b], [b]).map(item => item.id), ['b']);
}

console.log('captionQueue.test.ts passed');
