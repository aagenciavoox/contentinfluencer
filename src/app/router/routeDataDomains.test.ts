import assert from 'node:assert/strict';
import {
  getRouteDataDomains,
  getRouteOutletKey,
  isPathnameTransitionPending,
  NAVIGATION_SEQUENCE_PATHS,
} from './routeDataDomains.ts';

function testNavigationSequenceSharesSectionOutletKey() {
  const keys = NAVIGATION_SEQUENCE_PATHS.map(getRouteOutletKey);
  assert.deepEqual(keys, ['section', 'section', 'section', 'section']);
}

function testNavigationSequencePrefetchDomains() {
  assert.deepEqual(getRouteDataDomains('/criacao'), ['production', 'content']);
  assert.deepEqual(getRouteDataDomains('/criacao/legendas'), ['production', 'content']);
  assert.deepEqual(getRouteDataDomains('/hoje'), [
    'agenda',
    'projects',
    'library',
  ]);
  assert.deepEqual(getRouteDataDomains('/biblioteca'), ['library', 'library-generos', 'content']);
  assert.deepEqual(getRouteDataDomains('/series'), ['production']);
  assert.deepEqual(getRouteDataDomains('/editorial'), [
    'production',
    'content',
    'bootstrap',
    'schedule',
  ]);
}

function testQueryOnlyNavigationKeepsOutletKey() {
  assert.equal(getRouteOutletKey('/calendario'), 'section');
  assert.equal(getRouteOutletKey('/conteudos/abc'), '/conteudos/abc');
  assert.equal(getRouteOutletKey('/biblioteca/analise'), 'section');
  assert.equal(getRouteOutletKey('/biblioteca/livro-1'), '/biblioteca/livro-1');
}

function testContentDetailLoadsLibraryAndScriptTemplates() {
  assert.deepEqual(getRouteDataDomains('/conteudos/abc'), [
    'production',
    'recording',
    'library',
    'templates',
  ]);
}

function testPendingPathnameTransition() {
  assert.equal(isPathnameTransitionPending('/criacao', '/biblioteca'), true);
  assert.equal(isPathnameTransitionPending('/criacao', '/criacao'), false);
  assert.equal(isPathnameTransitionPending('/criacao', undefined), false);
  // Query-only pending location should not blank the screen.
  assert.equal(isPathnameTransitionPending('/calendario', '/calendario'), false);
}

function testNestedSettingsDomains() {
  assert.deepEqual(getRouteDataDomains('/series/abc'), [
    'production',
    'content',
    'bootstrap',
    'templates',
  ]);
  assert.deepEqual(getRouteDataDomains('/configuracoes/plataformas'), ['bootstrap', 'schedule']);
  assert.deepEqual(getRouteDataDomains('/configuracoes/pilares/xyz'), [
    'production',
    'content',
    'bootstrap',
  ]);
  assert.deepEqual(getRouteDataDomains('/editorial/pilares/xyz'), [
    'production',
    'content',
    'bootstrap',
  ]);
  assert.deepEqual(getRouteDataDomains('/editorial/series/xyz'), [
    'production',
    'content',
    'bootstrap',
    'templates',
  ]);
}

testNavigationSequenceSharesSectionOutletKey();
testNavigationSequencePrefetchDomains();
testQueryOnlyNavigationKeepsOutletKey();
testContentDetailLoadsLibraryAndScriptTemplates();
testPendingPathnameTransition();
testNestedSettingsDomains();

console.log('routeDataDomains.test.ts: ok');
