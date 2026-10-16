import assert from 'node:assert/strict';
import type { BibliotecaItem } from '../../../lib/database';
import { groupLibraryByPeriod, periodKeyForDate } from './libraryPeriods.ts';

function item(id: string, tipo: BibliotecaItem['tipo'], status: BibliotecaItem['status'], dataFim: string | null, extra: Partial<BibliotecaItem> = {}): BibliotecaItem {
  return {
    id, userId: 'u', tipo, titulo: id, autorDiretor: '', capaUrl: null, status,
    dataInicio: null, dataFim, avaliacao: null, notasGerais: null, potencialConteudo: null,
    totalPaginas: null, paginasLidas: null, generoIds: [], anotacoes: [],
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null,
    ...extra,
  } as BibliotecaItem;
}

assert.equal(periodKeyForDate(new Date(2026, 0, 15), 'trimestre').label, 'T1 2026');
assert.equal(periodKeyForDate(new Date(2026, 11, 1), 'trimestre').label, 'T4 2026');
assert.equal(periodKeyForDate(new Date(2026, 5, 30), 'semestre').label, '1º semestre 2026');
assert.equal(periodKeyForDate(new Date(2026, 6, 1), 'semestre').label, '2º semestre 2026');
assert.equal(periodKeyForDate(new Date(2025, 6, 1), 'ano').label, '2025');

const items = [
  item('a', 'livro', 'Lido', new Date(2026, 1, 10).toISOString(), { totalPaginas: 300, avaliacao: 4 }),
  item('b', 'quadrinho', 'Lido', new Date(2026, 4, 10).toISOString(), { totalPaginas: 100, avaliacao: 2 }),
  item('c', 'filme', 'Assistido', new Date(2026, 8, 10).toISOString()),
  item('d', 'livro', 'Lido', new Date(2025, 10, 10).toISOString(), { totalPaginas: 200 }),
  item('e', 'livro', 'Lendo', new Date(2026, 1, 10).toISOString()),
  item('f', 'livro', 'Lido', null),
];

const quarters = groupLibraryByPeriod(items, 'trimestre');
assert.deepEqual(quarters.map(b => b.label), ['T4 2025', 'T1 2026', 'T2 2026', 'T3 2026']);
assert.equal(quarters[1].pagesRead, 300);

const halves = groupLibraryByPeriod(items, 'semestre');
assert.deepEqual(halves.map(b => [b.label, b.completed]), [['2º semestre 2025', 1], ['1º semestre 2026', 2], ['2º semestre 2026', 1]]);
assert.equal(halves[1].books, 2);
assert.equal(halves[1].averageRating, 3);

const years = groupLibraryByPeriod(items, 'ano');
assert.deepEqual(years.map(b => [b.label, b.completed, b.pagesRead]), [['2025', 1, 200], ['2026', 3, 400]]);
assert.deepEqual(groupLibraryByPeriod([], 'ano'), []);

console.log('libraryPeriods.test.ts passed');
