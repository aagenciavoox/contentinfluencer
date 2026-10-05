import assert from 'node:assert/strict';
import {
  isSerieColorTaken,
  nextFreeSerieColor,
  seriesNeedingUniqueColors,
  serieColorKey,
} from './serieColors.ts';

const series = [
  {id: 'a', cor: '#6366F1', createdAt: '2026-01-01T00:00:00.000Z'},
  {id: 'b', cor: '#6366f1', createdAt: '2026-01-02T00:00:00.000Z'},
  {id: 'c', cor: null, createdAt: '2026-01-03T00:00:00.000Z'},
];

function testNormalizesSeriesColor() {
  assert.equal(serieColorKey('#6366f1'), '#6366F1');
  assert.equal(serieColorKey('azul'), null);
  assert.equal(serieColorKey(null), null);
}

function testTreatsSameHexAsTaken() {
  assert.equal(isSerieColorTaken(series, '#6366f1', 'b'), true);
  assert.equal(isSerieColorTaken(series, '#6366F1', 'a'), true);
  assert.equal(isSerieColorTaken(series, '#F5C543', 'b'), false);
  assert.equal(isSerieColorTaken(series, null, 'c'), true);
}

function testNextColorSkipsUsedOnes() {
  const next = nextFreeSerieColor(series, 'nova');
  assert.notEqual(next, '#6366F1');
  assert.equal(isSerieColorTaken(series, next, 'nova'), false);
}

function testRecolorsDuplicatesAndBlankColors() {
  const changes = seriesNeedingUniqueColors(series);
  const ids = changes.map(serie => serie.id);
  assert.deepEqual(ids, ['b', 'c']);
  const colors = new Set([
    '#6366F1',
    ...changes.map(serie => serie.cor),
  ]);
  assert.equal(colors.size, 3);
  assert.equal(seriesNeedingUniqueColors([
    series[0],
    {...series[1], cor: changes[0].cor},
    {...series[2], cor: changes[1].cor},
  ]).length, 0);
}

testNormalizesSeriesColor();
testTreatsSameHexAsTaken();
testNextColorSkipsUsedOnes();
testRecolorsDuplicatesAndBlankColors();
