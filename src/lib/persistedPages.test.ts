import assert from 'node:assert/strict';
import {
  PERSISTED_PAGE_LIMIT,
  readPersistedPage,
  selectPersistedPagesToPrune,
} from './persistentDataCache.ts';

function testKeepsEverythingUnderTheLimit() {
  const entries = [
    { key: 'a', fetchedAt: 1 },
    { key: 'b', fetchedAt: 2 },
  ];
  assert.deepEqual(selectPersistedPagesToPrune(entries, PERSISTED_PAGE_LIMIT), []);
}

function testPrunesOldestBeyondTheLimit() {
  const entries = [
    { key: 'busca-a', fetchedAt: 10 },
    { key: 'padrao', fetchedAt: 50 },
    { key: 'busca-ab', fetchedAt: 20 },
    { key: 'lendo', fetchedAt: 40 },
    { key: 'busca-abc', fetchedAt: 30 },
    { key: 'sem-data', fetchedAt: 0 },
  ];
  assert.deepEqual(selectPersistedPagesToPrune(entries, 4), ['busca-a', 'sem-data']);
}

function testReadsNothingOutsideTheBrowser() {
  assert.equal(readPersistedPage('user-1:library', '{"page":1}'), null);
}

const tests: Array<[string, () => void]> = [
  ['keeps every persisted page under the limit', testKeepsEverythingUnderTheLimit],
  ['prunes the oldest persisted pages beyond the limit', testPrunesOldestBeyondTheLimit],
  ['reads no persisted page outside the browser', testReadsNothingOutsideTheBrowser],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
