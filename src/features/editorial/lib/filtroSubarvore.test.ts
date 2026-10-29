import assert from 'node:assert/strict';
import { contentPassaFiltroSerie, filtrarPorSerieSubarvore } from './filtroSubarvore.ts';

const series = [
  { id: 'pai', parentId: null },
  { id: 'filho', parentId: 'pai' },
  { id: 'neto', parentId: 'filho' },
  { id: 'outro', parentId: null },
];

const contents = [
  { id: '1', seriesId: 'neto' },
  { id: '2', seriesId: 'filho' },
  { id: '3', seriesId: 'outro' },
  { id: '4', seriesId: null },
];

assert.equal(contentPassaFiltroSerie('neto', 'pai', series), true);
assert.equal(contentPassaFiltroSerie('outro', 'pai', series), false);
assert.equal(contentPassaFiltroSerie(null, 'pai', series), false);
assert.equal(contentPassaFiltroSerie('neto', null, series), true);

const filtrados = filtrarPorSerieSubarvore(contents, 'pai', series);
assert.deepEqual(filtrados.map(c => c.id).sort(), ['1', '2']);

console.log('ok - filtroSubarvore');
