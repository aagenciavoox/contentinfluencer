import assert from 'node:assert/strict';
import {
  buildMobileMenuSections,
  buildSidebarSections,
  isBottomNavItemActive,
  isNavItemActive,
  isNavItemHidden,
  isSettingsNavActive,
  MOBILE_BOTTOM_NAV_LEFT,
  MOBILE_BOTTOM_NAV_RIGHT,
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
  assert.equal(isBottomNavItemActive('/criacao', '/criacao/transcricao'), true);
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

function testSidebarTranscricaoIsNotCriacao() {
  assert.equal(isNavItemActive('/criacao', '/criacao/transcricao'), false);
  assert.equal(isNavItemActive('/criacao/transcricao', '/criacao/transcricao'), true);
  assert.equal(isNavItemActive('/criacao/transcricao', '/criacao/legendas'), false);
  const creation = buildSidebarSections(DEFAULT_MODULE_FLAGS)
    .find(section => section.label === 'Produção')
    ?.items.find(item => item.to === '/criacao');
  assert.deepEqual(
    creation?.nested?.map(item => [item.label, item.to]),
    [
      ['Legendas', '/criacao/legendas'],
      ['Transcrição', '/criacao/transcricao'],
    ],
  );
}

function testSidebarDetailRoutesHighlightParents() {
  assert.equal(isNavItemActive('/biblioteca', '/biblioteca/book-1'), true);
  assert.equal(isNavItemActive('/projetos', '/projetos/camp-1'), true);
  assert.equal(isNavItemActive('/gravacao?tab=queue', '/gravacao/block-1'), true);
  assert.equal(isNavItemActive('/editorial', '/editorial'), true);
  assert.equal(isNavItemActive('/editorial', '/editorial/pilares'), true);
  assert.equal(isNavItemActive('/series', '/series'), true);
  assert.equal(isNavItemActive('/series', '/series/abc'), true);
  assert.equal(isNavItemActive('/series', '/clubes/abc'), true);
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

// Blocos por tipo de trabalho; Contas e horários não é mais item: vive no Editorial.
function testSidebarBlocks() {
  assert.deepEqual(
    buildSidebarSections(DEFAULT_MODULE_FLAGS).map(section => [section.label, section.items.map(item => item.label)]),
    [
      [null, ['Hoje', 'Biblioteca']],
      ['Produção', ['Criação', 'Séries e quadros', 'Gravação']],
      ['Agenda', ['Calendário', 'Projetos']],
      ['Estratégia', ['Editorial', 'Planejamento', 'Análises']],
    ],
  );
}

// Análises é uma área desligada por padrão: só entra no menu quando a chave está ligada.
function testAnalisesIsAModuleOffByDefault() {
  const analises = buildSidebarSections(DEFAULT_MODULE_FLAGS)
    .flatMap(section => section.items)
    .find(item => item.to === '/analises');
  assert.ok(analises);
  assert.equal(isNavItemHidden(analises, DEFAULT_MODULE_FLAGS), true);
  assert.equal(isNavItemHidden(analises, { ...DEFAULT_MODULE_FLAGS, analyses: true }), false);
  const mobileWithAnalytics = buildMobileMenuSections({ ...DEFAULT_MODULE_FLAGS, analyses: true })
    .find(section => section.label === 'Estratégia');
  assert.ok(mobileWithAnalytics?.items.some(item => item.label === 'Análises'));
}

function testExactlyOneDesktopItemIsActiveOnRepresentativeRoutes() {
  const menuTargets = [
    '/hoje',
    '/criacao',
    '/criacao/legendas',
    '/criacao/transcricao',
    '/series',
    '/editorial',
    '/analises',
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
    '/criacao/transcricao',
    '/conteudos/content-1',
    '/series/serie-1/roteiros',
    '/editorial/pilares/pilar-1',
    '/analises',
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

function testBottomNavOrder() {
  assert.deepEqual(
    [...MOBILE_BOTTOM_NAV_LEFT, ...MOBILE_BOTTOM_NAV_RIGHT].map(item => item.label),
    ['Criação', 'Biblioteca', 'Gravação', 'Menu'],
  );
}

function testExactlyOneBottomTabIsActive() {
  const tabs = [...MOBILE_BOTTOM_NAV_LEFT, ...MOBILE_BOTTOM_NAV_RIGHT];
  const expected: Array<[string, string]> = [
    ['/criacao', 'Criação'],
    ['/criacao/legendas', 'Criação'],
    ['/conteudos/content-1', 'Criação'],
    ['/biblioteca/analise', 'Biblioteca'],
    ['/gravacao/block-1', 'Gravação'],
    ['/menu', 'Menu'],
    ['/hoje', 'Menu'],
    ['/calendario', 'Menu'],
    ['/planejamento', 'Menu'],
    ['/editorial/pilares/pilar-1', 'Menu'],
    ['/series/serie-1', 'Menu'],
    ['/configuracoes/perfil', 'Menu'],
  ];
  for (const [pathname, label] of expected) {
    const active = tabs.filter(tab => isBottomNavItemActive(tab.to, pathname)).map(tab => tab.label);
    assert.deepEqual(active, [label], `${pathname} should mark only ${label}, got ${active.join(', ') || 'none'}`);
  }
}

function testMobileMenuListsWhatIsNotInTheBar() {
  const sections = buildMobileMenuSections(DEFAULT_MODULE_FLAGS);
  assert.deepEqual(
    sections.map(section => [section.label, section.items.map(item => item.label)]),
    [
      [null, ['Hoje']],
      ['Produção', ['Legendas', 'Transcrição', 'Séries e quadros']],
      ['Agenda', ['Calendário', 'Projetos']],
      ['Estratégia', ['Editorial', 'Planejamento']],
    ],
  );
}

function testMobileMenuHidesDisabledModules() {
  const sections = buildMobileMenuSections({ ...DEFAULT_MODULE_FLAGS, calendar: false, projects: false });
  assert.equal(sections.some(section => section.label === 'Agenda'), false);
  assert.deepEqual(sections.find(section => section.label === 'Estratégia')?.items.map(item => item.label), ['Editorial']);
}

const tests = [
  ['bottom nav is criacao, biblioteca, gravacao and menu', testBottomNavOrder],
  ['exactly one bottom tab is active, menu for everything else', testExactlyOneBottomTabIsActive],
  ['mobile menu lists what is not in the bottom bar', testMobileMenuListsWhatIsNotInTheBar],
  ['mobile menu hides disabled modules', testMobileMenuHidesDisabledModules],
  ['splits four items evenly around the fab', testSplitsFourItemsEvenly],
  ['splits two items beside the fab', testSplitsTwoItemsBesideFab],
  ['highlights home only on /hoje', testHomeRouteOnlyMatchesHoje],
  ['highlights criacao for content detail routes', testContentDetailHighlightsCriacao],
  ['highlights biblioteca for detail routes', testBibliotecaHighlightsDetailRoutes],
  ['highlights gravacao for recording block routes', testRecordingDetailHighlightsGravacao],
  ['sidebar marks legendas instead of criacao', testSidebarLegendasIsNotCriacao],
  ['sidebar marks transcricao instead of criacao', testSidebarTranscricaoIsNotCriacao],
  ['sidebar marks detail routes on the parent item', testSidebarDetailRoutesHighlightParents],
  ['settings excludes editorial and series routes', testSettingsExcludesEditorialAndSeries],
  ['sidebar blocks follow the kind of work', testSidebarBlocks],
  ['analises is a module off by default', testAnalisesIsAModuleOffByDefault],
  ['marks exactly one desktop item on representative routes', testExactlyOneDesktopItemIsActiveOnRepresentativeRoutes],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
