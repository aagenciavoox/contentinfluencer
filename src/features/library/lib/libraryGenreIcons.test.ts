import assert from 'node:assert/strict';
import { genreIconKey } from './libraryGenreIcons.ts';

assert.equal(genreIconKey('Fantasia'), 'fantasia');
assert.equal(genreIconKey('Ficção científica'), 'ficcao');
assert.equal(genreIconKey('Ciência'), 'ciencia');
assert.equal(genreIconKey('Romance'), 'romance');
assert.equal(genreIconKey('Terror'), 'terror');
assert.equal(genreIconKey('Suspense'), 'suspense');
assert.equal(genreIconKey('Mistério'), 'misterio');
assert.equal(genreIconKey('Histórico'), 'historico');
assert.equal(genreIconKey('Ação'), 'acao');
assert.equal(genreIconKey('Algo novo'), 'tag');

console.log('libraryGenreIcons tests passed');
