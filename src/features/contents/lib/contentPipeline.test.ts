import assert from 'node:assert/strict';
import {
  CONTENT_STATUS,
  DISPLAY_STATUS,
  getDisplayStatus,
  normalizeContentStatus,
} from './contentPipeline.ts';

function testDisplayStatusFuturePublishDate() {
  const future = new Date();
  future.setDate(future.getDate() + 7);
  const content = {
    status: CONTENT_STATUS.PRODUCAO,
    publishDate: future.toISOString(),
  };
  assert.equal(getDisplayStatus(content), DISPLAY_STATUS.PROGRAMADO);
}

function testDisplayStatusPastPublishDateKeepsCanonical() {
  const content = {
    status: CONTENT_STATUS.PRODUCAO,
    publishDate: '2020-01-01T12:00:00.000Z',
  };
  assert.equal(getDisplayStatus(content), CONTENT_STATUS.PRODUCAO);
}

function testDisplayStatusPostedIgnoresFutureDate() {
  const future = new Date();
  future.setDate(future.getDate() + 7);
  const content = {
    status: CONTENT_STATUS.POSTADO,
    publishDate: future.toISOString(),
  };
  assert.equal(getDisplayStatus(content), CONTENT_STATUS.POSTADO);
}

function testNormalizeLegacyStatuses() {
  assert.equal(normalizeContentStatus('Gravado'), CONTENT_STATUS.PRODUCAO);
  assert.equal(normalizeContentStatus('Programado'), CONTENT_STATUS.PRODUCAO);
  assert.equal(normalizeContentStatus('Roteiro'), CONTENT_STATUS.ROTEIRO);
}

const tests: Array<[string, () => void]> = [
  ['future publish date shows Programado', testDisplayStatusFuturePublishDate],
  ['past publish date keeps canonical status', testDisplayStatusPastPublishDateKeepsCanonical],
  ['posted ignores future publish date display', testDisplayStatusPostedIgnoresFutureDate],
  ['normalize legacy statuses to canonical', testNormalizeLegacyStatuses],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
