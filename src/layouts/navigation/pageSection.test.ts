import assert from 'node:assert/strict';
import { buildSidebarSections, PAGE_SECTION } from './navConfig.ts';
import { DEFAULT_MODULE_FLAGS } from '../../features/settings/lib/moduleFlags.ts';

function testPageSectionMatchesSidebarGroupLabels() {
  const labels = buildSidebarSections(DEFAULT_MODULE_FLAGS)
    .map(section => section.label)
    .filter(label => label !== null);

  assert.deepEqual(labels, [
    PAGE_SECTION.producao,
    PAGE_SECTION.agenda,
    PAGE_SECTION.estrategia,
  ]);
}

const tests = [
  ['page section matches the sidebar group labels', testPageSectionMatchesSidebarGroupLabels],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
