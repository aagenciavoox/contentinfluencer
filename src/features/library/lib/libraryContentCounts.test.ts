import assert from 'node:assert/strict';
import { countContentsByBibliotecaItem } from './libraryContentCounts.ts';

assert.deepEqual(
  [...countContentsByBibliotecaItem([
    { bibliotecaItemId: 'livro-1' },
    { bibliotecaItemId: 'livro-1' },
    { bibliotecaItemId: 'livro-2' },
    { bibliotecaItemId: null },
    { bibliotecaItemId: 'livro-3', deletedAt: '2026-10-01T00:00:00.000Z' },
  ])],
  [['livro-1', 2], ['livro-2', 1]],
);

assert.equal(countContentsByBibliotecaItem([]).size, 0);

console.log('libraryContentCounts.test.ts passed');
