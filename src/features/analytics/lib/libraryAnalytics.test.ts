import assert from 'node:assert/strict';
import type { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';
import { buildLibraryAnalytics, formatWatchTime } from './libraryAnalytics.ts';

function item(overrides: Partial<BibliotecaItem> & Pick<BibliotecaItem, 'id' | 'tipo' | 'status'>): BibliotecaItem {
  return {
    id: overrides.id,
    userId: 'user-1',
    tipo: overrides.tipo,
    titulo: overrides.id,
    autorDiretor: '',
    capaUrl: null,
    status: overrides.status,
    dataInicio: null,
    dataFim: null,
    avaliacao: null,
    notasGerais: null,
    potencialConteudo: null,
    totalPaginas: null,
    paginasLidas: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    generoIds: [],
    anotacoes: [],
    ...overrides,
  };
}

const items = [
  item({
    id: 'reading-book',
    tipo: 'livro',
    status: 'Lendo',
    totalPaginas: 300,
    paginasLidas: 120,
    avaliacao: 4,
    generoIds: ['Fantasia'],
    anotacoes: [
      { id: 'n1', userId: 'u', itemId: 'reading-book', texto: 'A', tipo: 'Anotação', capituloRef: null, contentPotential: true, createdAt: '2026-01-01', deletedAt: null },
      { id: 'n2', userId: 'u', itemId: 'reading-book', texto: 'B', tipo: 'Trecho', capituloRef: null, contentPotential: false, createdAt: '2026-01-02', deletedAt: null },
    ],
  }),
  item({
    id: 'finished-book',
    tipo: 'livro',
    status: 'Lido',
    totalPaginas: 200,
    paginasLidas: 180,
    avaliacao: 5,
    dataInicio: '2026-07-01',
    dataFim: '2026-07-11',
    generoIds: ['Fantasia'],
  }),
  item({ id: 'film', tipo: 'filme', status: 'Assistido', totalPaginas: 130 }),
  item({ id: 'series', tipo: 'série', status: 'Assistindo', totalPaginas: 10, paginasLidas: 3 }),
];

const metadata = new Map<string, BibliotecaItemMeta>([
  ['series', { episodios: '10', duracaoPorEpisodio: '45 min' }],
]);

const snapshot = buildLibraryAnalytics(
  items,
  itemId => metadata.get(itemId) || {},
  new Date('2026-08-02T12:00:00.000Z'),
);

assert.equal(snapshot.totals.pagesRead, 320);
assert.equal(snapshot.totals.pagesCatalogued, 500);
assert.equal(snapshot.totals.minutesWatched, 265);
assert.equal(snapshot.totals.episodesWatched, 3);
assert.equal(snapshot.totals.averageRating, 4.5);
assert.equal(snapshot.totals.completed, 2);
assert.equal(snapshot.totals.active, 2);
assert.equal(snapshot.totals.averageProgress, 68);
assert.equal(snapshot.totals.averageCompletionDays, 10);
assert.equal(snapshot.annotations.total, 2);
assert.equal(snapshot.annotations.highlights, 1);
assert.equal(snapshot.genreData[0]?.label, 'Fantasia');
assert.equal(formatWatchTime(265), '4h 25min');

console.log('libraryAnalytics.test.ts passed');
