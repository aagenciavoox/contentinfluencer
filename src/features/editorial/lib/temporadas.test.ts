import assert from 'node:assert/strict';
import {
  acharTemporadaPorNome,
  chaveNomeTemporada,
  escopoTemporadas,
  serieIdsNoEscopoTemporadas,
  temporadaNoEscopo,
} from './temporadas.ts';

const series = [
  { id: 'familia', name: 'Descomplicando', parentId: null, usaTemporadas: false },
  { id: 'branbran', name: 'Branbran', parentId: 'familia', usaTemporadas: true },
  { id: 'comece', name: 'Comece', parentId: 'branbran', usaTemporadas: false },
  { id: 'tolkien', name: 'Tolkien', parentId: 'familia', usaTemporadas: true },
];

assert.equal(chaveNomeTemporada('  T1  '), 't1');

assert.equal(escopoTemporadas('comece', series)?.id, 'branbran');
assert.equal(escopoTemporadas('tolkien', series)?.id, 'tolkien');
assert.equal(escopoTemporadas('familia', series), null);

const noBranbran = serieIdsNoEscopoTemporadas('branbran', series);
assert.equal(noBranbran.has('branbran'), true);
assert.equal(noBranbran.has('comece'), true);
assert.equal(noBranbran.has('tolkien'), false);

const temporadas = [
  { id: 't1', userId: 'u', serieId: 'branbran', nome: 'Temporada 1', createdAt: '2026-01-01' },
  { id: 't2', userId: 'u', serieId: 'tolkien', nome: 'Temporada 1', createdAt: '2026-01-02' },
];

assert.equal(acharTemporadaPorNome('branbran', ' temporada 1 ', temporadas)?.id, 't1');
assert.equal(temporadaNoEscopo('t1', 'comece', series, temporadas), true);
assert.equal(temporadaNoEscopo('t2', 'comece', series, temporadas), false);

console.log('ok - temporadas');
