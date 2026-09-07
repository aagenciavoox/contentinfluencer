import assert from 'node:assert/strict';
import {
  isBottomNavItemActive,
  splitBottomNavItems,
} from './navConfig.ts';

function testSplitsFourItemsEvenly() {
  assert.deepEqual(splitBottomNavItems(['a', 'b', 'c', 'd']), {
    left: ['a', 'b'],
    right: ['c', 'd'],
  });
}

function testSplitsTwoItemsBesideFab() {
  assert.deepEqual(splitBottomNavItems(['criacao', 'gravacao']), {
    left: ['criacao'],
    right: ['gravacao'],
  });
}

function testHomeRouteOnlyMatchesHoje() {
  assert.equal(isBottomNavItemActive('/hoje', '/hoje'), true);
  assert.equal(isBottomNavItemActive('/hoje', '/criacao'), false);
  assert.equal(isBottomNavItemActive('/hoje', '/hoje/extra'), false);
}

function testContentDetailHighlightsCriacao() {
  assert.equal(isBottomNavItemActive('/criacao', '/criacao'), true);
  assert.equal(isBottomNavItemActive('/criacao', '/conteudos/abc'), true);
  assert.equal(isBottomNavItemActive('/criacao', '/calendario'), false);
  assert.equal(isBottomNavItemActive('/criacao', '/gravacao'), false);
}

function testBibliotecaHighlightsDetailRoutes() {
  assert.equal(isBottomNavItemActive('/biblioteca', '/biblioteca'), true);
  assert.equal(isBottomNavItemActive('/biblioteca', '/biblioteca/book-1'), true);
  assert.equal(isBottomNavItemActive('/biblioteca', '/criacao'), false);
}

function testRecordingDetailHighlightsGravacao() {
  assert.equal(isBottomNavItemActive('/gravacao?tab=queue', '/gravacao'), true);
  assert.equal(isBottomNavItemActive('/gravacao?tab=queue', '/gravacao/block-1'), true);
  assert.equal(isBottomNavItemActive('/gravacao?tab=queue', '/criacao'), false);
}

const tests = [
  ['splits four items evenly around the fab', testSplitsFourItemsEvenly],
  ['splits two items beside the fab', testSplitsTwoItemsBesideFab],
  ['highlights home only on /hoje', testHomeRouteOnlyMatchesHoje],
  ['highlights criacao for content detail routes', testContentDetailHighlightsCriacao],
  ['highlights biblioteca for detail routes', testBibliotecaHighlightsDetailRoutes],
  ['highlights gravacao for recording block routes', testRecordingDetailHighlightsGravacao],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
