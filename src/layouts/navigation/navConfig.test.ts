import assert from 'node:assert/strict';
import {
  isBottomNavItemActive,
  splitBottomNavItems,
} from './navConfig.ts';

function testSplitsThreeItemsWithEqualTabColumns() {
  assert.deepEqual(splitBottomNavItems(['calendario', 'criacao', 'gravacao']), {
    left: ['calendario', 'criacao'],
    right: ['gravacao'],
  });
}

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

function testContentDetailHighlightsCriacao() {
  assert.equal(isBottomNavItemActive('/criacao', '/criacao'), true);
  assert.equal(isBottomNavItemActive('/criacao', '/conteudos/abc'), true);
  assert.equal(isBottomNavItemActive('/criacao', '/calendario'), false);
  assert.equal(isBottomNavItemActive('/criacao', '/gravacao'), false);
}

function testRecordingDetailHighlightsGravacao() {
  assert.equal(isBottomNavItemActive('/gravacao?tab=queue', '/gravacao'), true);
  assert.equal(isBottomNavItemActive('/gravacao?tab=queue', '/gravacao/block-1'), true);
  assert.equal(isBottomNavItemActive('/gravacao?tab=queue', '/criacao'), false);
}

function testCalendarDoesNotStealOtherRoutes() {
  assert.equal(isBottomNavItemActive('/calendario', '/calendario'), true);
  assert.equal(isBottomNavItemActive('/calendario', '/calendario/extra'), true);
  assert.equal(isBottomNavItemActive('/calendario', '/criacao'), false);
  assert.equal(isBottomNavItemActive('/calendario', '/conteudos/abc'), false);
}

const tests = [
  ['splits three items so every tab column can stay 1fr', testSplitsThreeItemsWithEqualTabColumns],
  ['splits four items evenly around the fab', testSplitsFourItemsEvenly],
  ['splits two items beside the fab', testSplitsTwoItemsBesideFab],
  ['highlights criacao for content detail routes', testContentDetailHighlightsCriacao],
  ['highlights gravacao for recording block routes', testRecordingDetailHighlightsGravacao],
  ['does not let calendario match criacao or conteudos', testCalendarDoesNotStealOtherRoutes],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
