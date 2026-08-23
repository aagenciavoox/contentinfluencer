import assert from 'node:assert/strict';
import {getPostingWindowFromTime, POSTING_WINDOWS} from './postingWindow.ts';

assert.equal(getPostingWindowFromTime('09:00')?.id, 'manha');
assert.equal(getPostingWindowFromTime('14:30')?.id, 'tarde');
assert.equal(getPostingWindowFromTime('20:00')?.id, 'noite');
assert.equal(getPostingWindowFromTime(null), null);
assert.deepEqual(
  POSTING_WINDOWS.map(window => window.defaultTime),
  ['09:00', '14:00', '20:00'],
);

console.log('postingWindow.test.ts passed');
