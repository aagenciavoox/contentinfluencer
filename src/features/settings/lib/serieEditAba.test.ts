import assert from 'node:assert/strict';
import { abaDoItemAberto, lerAbaEdicaoSerie } from './serieEditAba.ts';

assert.equal(lerAbaEdicaoSerie(null), 'sobre');
assert.equal(lerAbaEdicaoSerie(undefined), 'sobre');
assert.equal(lerAbaEdicaoSerie(''), 'sobre');
assert.equal(lerAbaEdicaoSerie('configuracoes'), 'sobre');
assert.equal(lerAbaEdicaoSerie('sobre'), 'sobre');
assert.equal(lerAbaEdicaoSerie('roteiros'), 'roteiros');
assert.equal(lerAbaEdicaoSerie('publicacao'), 'publicacao');

assert.equal(abaDoItemAberto('pilar'), 'sobre');
assert.equal(abaDoItemAberto('funcao'), 'sobre');
assert.equal(abaDoItemAberto('frequencia'), 'sobre');
assert.equal(abaDoItemAberto('formato'), 'sobre');
assert.equal(abaDoItemAberto('energia'), 'sobre');

console.log('serieEditAba.test.ts passed');
