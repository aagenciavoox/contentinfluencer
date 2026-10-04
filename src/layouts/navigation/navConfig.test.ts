import assert from 'node:assert/strict';
import {
  buildSidebarSections,
  isBottomNavItemActive,
  isNavItemActive,
  isSettingsNavActive,
  splitBottomNavItems,
} from './navConfig.ts';
import { DEFAULT_MODULE_FLAGS } from '../../features/settings/lib/moduleFlags.ts';

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
  assert.equal(isBottomNavItemActive('/criacao', '/criacao/legendas'), true);
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

function testSidebarLegendasIsNotCriacao() {
  assert.equal(isNavItemActive('/criacao', '/criacao'), true);
  assert.equal(isNavItemActive('/criacao', '/conteudos/abc'), true);
  assert.equal(isNavItemActive('/criacao', '/criacao/legendas'), false);
  assert.equal(isNavItemActive('/criacao/legendas', '/criacao/legendas'), true);
  assert.equal(isNavItemActive('/criacao/legendas', '/criacao'), false);
}

function testSidebarDetailRoutesHighlightParents() {
  assert.equal(isNavItemActive('/biblioteca', '/biblioteca/book-1'), true);
  assert.equal(isNavItemActive('/projetos', '/projetos/camp-1'), true);
  assert.equal(isNavItemActive('/gravacao?tab=queue', '/gravacao/block-1'), true);
  assert.equal(isNavItemActive('/editorial', '/editorial'), true);
  assert.equal(isNavItemActive('/editorial', '/editorial/pilares'), true);
  assert.equal(isNavItemActive('/series', '/series'), true);
  assert.equal(isNavItemActive('/series', '/series/abc'), true);
}

function testSettingsExcludesEditorialAndSeries() {
  assert.equal(isNavItemActive('/configuracoes', '/configuracoes'), true);
  assert.equal(isNavItemActive('/configuracoes', '/configuracoes/perfil'), true);
  assert.equal(isNavItemActive('/configuracoes', '/editorial'), false);
  assert.equal(isNavItemActive('/configuracoes', '/editorial/funil'), false);
  assert.equal(isNavItemActive('/configuracoes', '/series'), false);
  assert.equal(isNavItemActive('/configuracoes', '/series/abc'), false);
  assert.equal(isSettingsNavActive('/configuracoes/plataformas', false), true);
  assert.equal(isSettingsNavActive('/series', true), false);
}

function testCreationMenuIncludesEditorial() {
  const creation = buildSidebarSections(DEFAULT_MODULE_FLAGS)
    .find(section => section.label === 'Criação');
  assert.deepEqual(
    creation?.items.map(item => [item.label, item.to]),
    [
      ['Criação', '/criacao'],
      ['Séries', '/series'],
      ['Editorial', '/editorial'],
      ['Biblioteca', '/biblioteca'],
    ],
  );
}

function testExactlyOneDesktopItemIsActiveOnRepresentativeRoutes() {
  const menuTargets = [
    '/hoje',
    '/criacao',
    '/criacao/legendas',
    '/series',
    '/editorial',
    '/biblioteca',
    '/gravacao?tab=queue',
    '/calendario',
    '/planejamento',
    '/projetos',
    '/configuracoes',
  ];
  const routes = [
    '/hoje',
    '/criacao',
    '/criacao/legendas',
    '/conteudos/content-1',
    '/series/serie-1/roteiros',
    '/editorial/pilares/pilar-1',
    '/biblioteca/analise',
    '/biblioteca/book-1',
    '/gravacao/block-1',
    '/calendario',
    '/planejamento',
    '/projetos/project-1',
    '/configuracoes/perfil',
  ];

  for (const pathname of routes) {
    const activeTargets = menuTargets.filter(target => isNavItemActive(target, pathname));
    assert.equal(
      activeTargets.length,
      1,
      `${pathname} should activate exactly one item, got ${activeTargets.join(', ') || 'none'}`,
    );
  }
}

const tests = [
  ['splits four items evenly around the fab', testSplitsFourItemsEvenly],
  ['splits two items beside the fab', testSplitsTwoItemsBesideFab],
  ['highlights home only on /hoje', testHomeRouteOnlyMatchesHoje],
  ['highlights criacao for content detail routes', testContentDetailHighlightsCriacao],
  ['highlights biblioteca for detail routes', testBibliotecaHighlightsDetailRoutes],
  ['highlights gravacao for recording block routes', testRecordingDetailHighlightsGravacao],
  ['sidebar marks legendas instead of criacao', testSidebarLegendasIsNotCriacao],
  ['sidebar marks detail routes on the parent item', testSidebarDetailRoutesHighlightParents],
  ['settings excludes editorial and series routes', testSettingsExcludesEditorialAndSeries],
  ['shows the editorial creation menu', testCreationMenuIncludesEditorial],
  ['marks exactly one desktop item on representative routes', testExactlyOneDesktopItemIsActiveOnRepresentativeRoutes],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
