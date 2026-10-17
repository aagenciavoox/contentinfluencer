import assert from 'node:assert/strict';
import { notifyTableWrite, onTableWrite, writtenTable } from './tableWrites.ts';

const base = 'https://projeto.supabase.co/rest/v1/';

function testFindsTableOfEachWriteMethod() {
  assert.equal(writtenTable(`${base}contents?id=eq.1`, 'PATCH'), 'contents');
  assert.equal(writtenTable(`${base}content_temas`, 'post'), 'content_temas');
  assert.equal(writtenTable(`${base}ideas?id=eq.2`, 'DELETE'), 'ideas');
  assert.equal(writtenTable(`${base}user_preferences?on_conflict=user_id,key`, 'POST'), 'user_preferences');
}

function testIgnoresReadsRpcAndOtherServices() {
  assert.equal(writtenTable(`${base}contents?select=*`, 'GET'), null);
  assert.equal(writtenTable(`${base}contents?select=id`, 'HEAD'), null);
  assert.equal(writtenTable(`${base}rpc/get_content_status_counts`, 'POST'), null);
  assert.equal(writtenTable('https://projeto.supabase.co/auth/v1/token?grant_type=refresh_token', 'POST'), null);
  assert.equal(writtenTable('https://projeto.supabase.co/storage/v1/object/library-covers/a.png', 'POST'), null);
}

function testListenersReceiveWritesUntilRemoved() {
  const seen: string[] = [];
  const stop = onTableWrite(table => seen.push(table));
  notifyTableWrite('contents');
  stop();
  notifyTableWrite('ideas');
  assert.deepEqual(seen, ['contents']);
}

function testFailingListenerDoesNotStopTheOthers() {
  const seen: string[] = [];
  const originalError = console.error;
  console.error = () => undefined;
  const stopBroken = onTableWrite(() => {
    throw new Error('quebrou');
  });
  const stop = onTableWrite(table => seen.push(table));
  try {
    notifyTableWrite('series');
  } finally {
    stopBroken();
    stop();
    console.error = originalError;
  }
  assert.deepEqual(seen, ['series']);
}

const tests: Array<[string, () => void]> = [
  ['finds the table of insert, upsert, update and delete requests', testFindsTableOfEachWriteMethod],
  ['ignores reads, rpc calls and non-REST services', testIgnoresReadsRpcAndOtherServices],
  ['delivers table writes to listeners until they unsubscribe', testListenersReceiveWritesUntilRemoved],
  ['keeps notifying other listeners when one throws', testFailingListenerDoesNotStopTheOthers],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
