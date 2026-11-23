import assert from 'node:assert/strict';
import { getRouteDataDomains } from './routeDataDomains.ts';

function testQueryAndHashDoNotChangeDomains() {
  assert.deepEqual(getRouteDataDomains('/gravacao?tab=queue'), getRouteDataDomains('/gravacao'));
  assert.deepEqual(getRouteDataDomains('/analises#topo'), getRouteDataDomains('/analises'));
  assert.deepEqual(getRouteDataDomains('/criacao?compose=script'), getRouteDataDomains('/criacao'));
}

function testNavigationSequencePrefetchDomains() {
  assert.deepEqual(getRouteDataDomains('/criacao'), ['production', 'content']);
  assert.deepEqual(getRouteDataDomains('/criacao/legendas'), ['production', 'content']);
  assert.deepEqual(getRouteDataDomains('/hoje'), [
    'agenda',
    'projects',
    'library',
    'recording',
  ]);
  assert.deepEqual(getRouteDataDomains('/biblioteca'), ['library', 'library-generos', 'content']);
  assert.deepEqual(getRouteDataDomains('/series'), ['production', 'content']);
  assert.deepEqual(getRouteDataDomains('/editorial'), [
    'production',
    'content',
    'bootstrap',
    'schedule',
  ]);
}

function testContentDetailLoadsLibraryAndScriptTemplates() {
  assert.deepEqual(getRouteDataDomains('/conteudos/abc'), [
    'production',
    'recording',
    'library',
    'templates',
  ]);
}

function testNestedSettingsDomains() {
  assert.deepEqual(getRouteDataDomains('/series/abc'), [
    'production',
    'content',
    'bootstrap',
    'templates',
  ]);
  // Legacy alias for the same SeriesRoteiros page as /series/:id/roteiros.
  assert.deepEqual(getRouteDataDomains('/configuracoes/series/abc/roteiros'), [
    'production',
    'content',
    'bootstrap',
    'templates',
  ]);
  assert.deepEqual(getRouteDataDomains('/configuracoes/plataformas'), ['bootstrap', 'schedule']);
  assert.deepEqual(getRouteDataDomains('/contas'), ['bootstrap', 'schedule', 'content', 'production', 'analytics']);
  assert.deepEqual(getRouteDataDomains('/analises'), ['bootstrap', 'content', 'production', 'analytics']);
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

testQueryAndHashDoNotChangeDomains();
testNavigationSequencePrefetchDomains();
testContentDetailLoadsLibraryAndScriptTemplates();
testNestedSettingsDomains();

console.log('routeDataDomains.test.ts: ok');
