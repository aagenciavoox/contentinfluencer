import assert from 'node:assert/strict';
import {
  clearUnsavedChanges,
  flushUnsavedChanges,
  hasUnsavedChanges,
  resetUnsavedChangesForTests,
  setUnsavedChanges,
  subscribeUnsavedChanges,
  unsavedChangesCount,
} from './unsavedChanges.ts';
import { decideOnNewVersion, shouldAutoApplyPendingUpdate } from './appUpdateDecision.ts';

function testRegisterAndClear() {
  resetUnsavedChangesForTests();
  assert.equal(hasUnsavedChanges(), false);
  setUnsavedChanges('a', true);
  setUnsavedChanges('b', true);
  setUnsavedChanges('a', true);
  assert.equal(unsavedChangesCount(), 2);
  clearUnsavedChanges('a');
  assert.equal(hasUnsavedChanges(), true);
  setUnsavedChanges('b', false);
  assert.equal(hasUnsavedChanges(), false);
}

function testNotifiesOnlyOnTransitions() {
  resetUnsavedChangesForTests();
  let calls = 0;
  subscribeUnsavedChanges(() => { calls += 1; });
  setUnsavedChanges('a', true);
  setUnsavedChanges('a', true);
  setUnsavedChanges('a', false);
  setUnsavedChanges('a', false);
  assert.equal(calls, 2);
}

async function testFlushAwaitsAllEvenIfOneFails() {
  resetUnsavedChangesForTests();
  const done: string[] = [];
  setUnsavedChanges('ok', true, async () => {
    await new Promise(resolve => setTimeout(resolve, 5));
    done.push('ok');
  });
  setUnsavedChanges('fail', true, () => { throw new Error('boom'); });
  setUnsavedChanges('noFlush', true);
  await flushUnsavedChanges();
  assert.deepEqual(done, ['ok']);
}

function testDecision() {
  assert.equal(decideOnNewVersion({ hasUnsavedChanges: false }), 'reload');
  assert.equal(decideOnNewVersion({ hasUnsavedChanges: true }), 'prompt');
  const base = { updatePending: true, hasUnsavedChanges: false, documentHidden: true, applying: false };
  assert.equal(shouldAutoApplyPendingUpdate(base), true);
  assert.equal(shouldAutoApplyPendingUpdate({ ...base, hasUnsavedChanges: true }), false);
  assert.equal(shouldAutoApplyPendingUpdate({ ...base, documentHidden: false }), false);
  assert.equal(shouldAutoApplyPendingUpdate({ ...base, applying: true }), false);
  assert.equal(shouldAutoApplyPendingUpdate({ ...base, updatePending: false }), false);
}

testRegisterAndClear();
testNotifiesOnlyOnTransitions();
await testFlushAwaitsAllEvenIfOneFails();
testDecision();
resetUnsavedChangesForTests();
console.log('unsavedChanges tests passed');