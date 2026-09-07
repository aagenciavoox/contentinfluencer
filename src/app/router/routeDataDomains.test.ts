import assert from 'node:assert/strict';
import {
  getRouteDataDomains,
  getRouteOutletKey,
  isPathnameTransitionPending,
  NAVIGATION_SEQUENCE_PATHS,
} from './routeDataDomains.ts';

function testNavigationSequenceHasDistinctOutletKeys() {
  const keys = NAVIGATION_SEQUENCE_PATHS.map(getRouteOutletKey);
  assert.deepEqual(keys, [
    '/criacao',
    '/biblioteca',
    '/configuracoes/series',
    '/configuracoes/pilares',
  ]);
  assert.equal(new Set(keys).size, keys.length, 'each route remount key must be unique');
}

function testNavigationSequencePrefetchDomains() {
  assert.deepEqual(getRouteDataDomains('/criacao'), ['production', 'content']);
  assert.deepEqual(getRouteDataDomains('/hoje'), [
    'agenda',
    'projects',
  ]);
  assert.deepEqual(getRouteDataDomains('/biblioteca'), ['library', 'library-generos']);
  assert.deepEqual(getRouteDataDomains('/configuracoes/series'), ['production']);
  assert.deepEqual(getRouteDataDomains('/configuracoes/pilares'), ['production']);
}

function testQueryOnlyNavigationKeepsOutletKey() {
  const pathname = '/calendario';
  assert.equal(getRouteOutletKey(pathname), '/calendario');
  // Same pathname with different query must not force remount via key.
  assert.equal(getRouteOutletKey(pathname), getRouteOutletKey('/calendario'));
}

function testPendingPathnameTransition() {
  assert.equal(isPathnameTransitionPending('/criacao', '/biblioteca'), true);
  assert.equal(isPathnameTransitionPending('/criacao', '/criacao'), false);
  assert.equal(isPathnameTransitionPending('/criacao', undefined), false);
  // Query-only pending location should not blank the screen.
  assert.equal(isPathnameTransitionPending('/calendario', '/calendario'), false);
}

function testNestedSettingsDomains() {
  assert.deepEqual(getRouteDataDomains('/configuracoes/series/abc'), [
    'production',
    'content',
    'bootstrap',
  ]);
  assert.deepEqual(getRouteDataDomains('/configuracoes/pilares/xyz'), [
    'production',
    'content',
    'bootstrap',
  ]);
}

testNavigationSequenceHasDistinctOutletKeys();
testNavigationSequencePrefetchDomains();
testQueryOnlyNavigationKeepsOutletKey();
testPendingPathnameTransition();
testNestedSettingsDomains();

console.log('routeDataDomains.test.ts: ok');
