import assert from 'node:assert/strict';
import { LOCAL_REALTIME_SUPPRESSION_MS, shouldSkipRealtimeRefresh } from './realtimeSync.ts';

function testSkipsRealtimeRefreshForRecentLocalMutation() {
  assert.equal(shouldSkipRealtimeRefresh(1_000, 1_000 + LOCAL_REALTIME_SUPPRESSION_MS - 1), true);
}

function testAllowsRealtimeRefreshAfterSuppressionWindow() {
  assert.equal(shouldSkipRealtimeRefresh(1_000, 1_000 + LOCAL_REALTIME_SUPPRESSION_MS + 1), false);
}

function testAllowsRealtimeRefreshWithoutLocalMutation() {
  assert.equal(shouldSkipRealtimeRefresh(null, 5_000), false);
}

function testSkipsRealtimeRefreshWhilePersistInFlight() {
  assert.equal(shouldSkipRealtimeRefresh(null, 5_000, 1), true);
  assert.equal(shouldSkipRealtimeRefresh(1_000, 1_000 + LOCAL_REALTIME_SUPPRESSION_MS + 10_000, 2), true);
}

const tests: Array<[string, () => void]> = [
  ['skips realtime refresh while a recent local mutation is still within the suppression window', testSkipsRealtimeRefreshForRecentLocalMutation],
  ['allows realtime refresh after the suppression window expires', testAllowsRealtimeRefreshAfterSuppressionWindow],
  ['allows realtime refresh when there was no local mutation', testAllowsRealtimeRefreshWithoutLocalMutation],
  ['skips realtime refresh while a persist is still in flight', testSkipsRealtimeRefreshWhilePersistInFlight],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
