import assert from 'node:assert/strict';
import { contarEpisodios } from './contarEpisodios.ts';

const series = [
  { id: 'serie', name: 'Série' },
  { id: 'quadro', parentId: 'serie', name: 'Quadro' },
  { id: 'outra', name: 'Outra' },
];

const contents = [
  { id: 'ideia', seriesId: 'serie', status: 'ideia', deletedAt: null },
  { id: 'roteiro', seriesId: 'serie', status: 'roteiro', deletedAt: null },
  { id: 'no-quadro', seriesId: 'quadro', status: 'publicado', deletedAt: null },
  { id: 'no-quadro', seriesId: 'quadro', status: 'publicado', deletedAt: null },
  { id: 'apagado', seriesId: 'serie', status: 'roteiro', deletedAt: '2026-01-01' },
  { id: 'fora', seriesId: 'outra', status: 'roteiro', deletedAt: null },
];

assert.equal(contarEpisodios('serie', series, contents), 3);
assert.equal(contarEpisodios('quadro', series, contents), 1);
assert.equal(contarEpisodios('outra', series, contents), 1);

console.log('contarEpisodios.test.ts passed');
