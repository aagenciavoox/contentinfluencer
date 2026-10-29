import assert from 'node:assert/strict';
import {
  caminhoDaSerie,
  conteudoNaSubarvore,
  filhosDaSerie,
  formariaCicloOrigem,
  formariaCicloParent,
  idsDaSubarvore,
  idsParaTravarOrigem,
  idsParaTravarParent,
} from './serieArvore.ts';

const series = [
  { id: 'descomplicando', name: 'Descomplicando', parentId: null },
  { id: 'branbran', name: 'Descomplicando Branbran', parentId: 'descomplicando' },
  { id: 'tolkien', name: 'Descomplicando Tolkien', parentId: 'descomplicando' },
  { id: 'comece', name: 'Por onde começo?', parentId: 'branbran' },
  { id: 'cosmere', name: 'Cosmere sem TCC', parentId: 'branbran' },
];

assert.deepEqual(
  filhosDaSerie('descomplicando', series).map(s => s.id),
  ['branbran', 'tolkien'],
);

assert.deepEqual(
  [...idsDaSubarvore('branbran', series)].sort(),
  ['branbran', 'comece', 'cosmere'],
);

assert.equal(conteudoNaSubarvore('comece', 'descomplicando', series), true);
assert.equal(conteudoNaSubarvore('tolkien', 'branbran', series), false);
assert.equal(conteudoNaSubarvore(null, 'descomplicando', series), false);

assert.deepEqual(
  caminhoDaSerie('comece', series).map(s => s.id),
  ['descomplicando', 'branbran', 'comece'],
);

assert.equal(formariaCicloParent('descomplicando', 'comece', series), true);
assert.equal(formariaCicloParent('comece', 'descomplicando', series), false);
assert.equal(formariaCicloParent('branbran', 'branbran', series), true);
assert.equal(formariaCicloParent('branbran', null, series), false);

const links = new Map<string, string | null>([
  ['a', null],
  ['b', 'a'],
  ['c', 'b'],
]);
assert.equal(formariaCicloOrigem('a', 'c', links), true);
assert.equal(formariaCicloOrigem('d', 'a', links), false);
assert.equal(formariaCicloOrigem('a', 'a', links), true);

// Travas concorrentes: A→B e B→A travam o mesmo conjunto ordenado.
assert.deepEqual(
  idsParaTravarParent('a', 'b', [
    { id: 'a', parentId: null },
    { id: 'b', parentId: null },
  ]),
  ['a', 'b'],
);
assert.deepEqual(
  idsParaTravarParent('b', 'a', [
    { id: 'a', parentId: null },
    { id: 'b', parentId: null },
  ]),
  ['a', 'b'],
);

assert.deepEqual(
  idsParaTravarOrigem('x', 'y', new Map([['y', null]])),
  ['x', 'y'],
);
assert.deepEqual(
  idsParaTravarOrigem('y', 'x', new Map([['x', null]])),
  ['x', 'y'],
);

console.log('ok - serieArvore');
