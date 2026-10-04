import assert from 'node:assert/strict';
import { countContentsByBibliotecaItem } from './libraryContentCounts.ts';

assert.deepEqual(
  [...countContentsByBibliotecaItem([
    { bibliotecaItemId: 'livro-1' },
    { bibliotecaItemId: 'livro-1' },
    { bibliotecaItemId: 'livro-2' },
    { bibliotecaItemId: null },
    { bibliotecaItemId: 'livro-3', deletedAt: '2026-10-01T00:00:00.000Z' },
    { bibliotecaItemId: 'livro-1', livroIds: ['livro-1', 'livro-2', 'livro-2'] },
    { bibliotecaItemId: 'livro-9', livroIds: ['livro-4'], deletedAt: '2026-10-02T00:00:00.000Z' },
  ])],
  [['livro-1', 3], ['livro-2', 2]],
);

assert.equal(countContentsByBibliotecaItem([]).size, 0);

console.log('libraryContentCounts.test.ts passed');
