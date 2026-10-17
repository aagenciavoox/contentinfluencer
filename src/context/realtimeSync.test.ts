import assert from 'node:assert/strict';
import {
  changedTablesFromPayload,
  createTableAnnouncer,
  LOCAL_REALTIME_SUPPRESSION_MS,
  REALTIME_REFRESH_DEBOUNCE_MS,
  realtimeRefreshDelay,
  shouldSkipRealtimeRefresh,
  syncChannelName,
} from './realtimeSync.ts';

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

function testChannelNameMatchesTheMcp() {
  // O MCP (mcp/src/avisoSync.ts) manda no mesmo canal.
  assert.equal(syncChannelName('abc'), 'content-os-sync:abc');
}

function testReadsOnlyKnownTablesFromPayload() {
  assert.deepEqual(changedTablesFromPayload({ tables: ['contents', 'contents', 'ideas'] }), ['contents', 'ideas']);
  assert.deepEqual(changedTablesFromPayload({ tables: ['tabela_inventada', 42, null, 'series'] }), ['series']);
  assert.deepEqual(changedTablesFromPayload({ tables: 'contents' }), []);
  assert.deepEqual(changedTablesFromPayload(null), []);
  assert.deepEqual(changedTablesFromPayload(undefined), []);
}

async function testAnnouncerBatchesWritesIntoOneMessage() {
  const sent: string[][] = [];
  const announcer = createTableAnnouncer(tables => sent.push(tables), 20);
  announcer.add('contents');
  announcer.add('content_temas');
  announcer.add('contents');
  announcer.add('tabela_inventada');
  assert.deepEqual(sent, []);
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.deepEqual(sent, [['contents', 'content_temas']]);

  announcer.add('ideas');
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.deepEqual(sent, [['contents', 'content_temas'], ['ideas']]);
}

function testAnnouncerFlushSendsPendingNow() {
  const sent: string[][] = [];
  const announcer = createTableAnnouncer(tables => sent.push(tables), 60_000);
  announcer.flush();
  assert.deepEqual(sent, []);
  announcer.add('series');
  announcer.flush();
  announcer.flush();
  assert.deepEqual(sent, [['series']]);
}

function testRefreshWaitsForTheRestOfTheWindow() {
  // Sem recarga anterior: só a folga de 1,5 s.
  assert.equal(realtimeRefreshDelay(0, 10_000, 30_000), REALTIME_REFRESH_DEBOUNCE_MS);
  // Recarga há 22 s: espera os 8 s que faltam, em vez de descartar o pedido.
  assert.equal(realtimeRefreshDelay(100_000, 122_000, 30_000), 8_000);
  // Janela já passou: volta para a folga.
  assert.equal(realtimeRefreshDelay(100_000, 140_000, 30_000), REALTIME_REFRESH_DEBOUNCE_MS);
  // Na hora de rodar (folga 0): só o que falta da janela, ou nada.
  assert.equal(realtimeRefreshDelay(100_000, 129_000, 30_000, 0), 1_000);
  assert.equal(realtimeRefreshDelay(100_000, 131_000, 30_000, 0), 0);
}

const tests: Array<[string, () => void | Promise<void>]> = [
  ['skips realtime refresh while a recent local mutation is still within the suppression window', testSkipsRealtimeRefreshForRecentLocalMutation],
  ['allows realtime refresh after the suppression window expires', testAllowsRealtimeRefreshAfterSuppressionWindow],
  ['allows realtime refresh when there was no local mutation', testAllowsRealtimeRefreshWithoutLocalMutation],
  ['skips realtime refresh while a persist is still in flight', testSkipsRealtimeRefreshWhilePersistInFlight],
  ['uses the same sync channel name as the MCP', testChannelNameMatchesTheMcp],
  ['reads only known tables from a sync message', testReadsOnlyKnownTablesFromPayload],
  ['batches writes made close together into one sync message', testAnnouncerBatchesWritesIntoOneMessage],
  ['flush sends pending tables immediately and only once', testAnnouncerFlushSendsPendingNow],
  ['a refresh asked inside the minimum window waits instead of being dropped', testRefreshWaitsForTheRestOfTheWindow],
];

for (const [name, fn] of tests) {
  await fn();
  console.log(`ok - ${name}`);
}
