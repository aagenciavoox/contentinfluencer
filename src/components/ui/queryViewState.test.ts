import assert from 'node:assert/strict';
import { resolveQueryViewStatus } from './queryViewStatus.ts';

function testLoadingWhileAuthOrDisabled() {
  assert.equal(
    resolveQueryViewStatus({ authLoading: true, loading: false, itemCount: 0, enabled: true }),
    'loading',
  );
  assert.equal(
    resolveQueryViewStatus({ loading: false, itemCount: 0, enabled: false }),
    'loading',
  );
}

function testLoadingWhileFetchInFlight() {
  assert.equal(
    resolveQueryViewStatus({ loading: true, itemCount: 0, enabled: true, fetchAttempted: false }),
    'loading',
  );
}

function testEmptyOnlyAfterSettled() {
  assert.equal(
    resolveQueryViewStatus({
      loading: false,
      itemCount: 0,
      enabled: true,
      fetchAttempted: true,
      error: null,
    }),
    'empty',
  );
}

function testErrorOnlyAfterSettled() {
  assert.equal(
    resolveQueryViewStatus({
      loading: false,
      itemCount: 0,
      enabled: true,
      fetchAttempted: true,
      error: 'falhou',
    }),
    'error',
  );
  assert.equal(
    resolveQueryViewStatus({
      loading: true,
      itemCount: 0,
      enabled: true,
      error: 'falhou',
    }),
    'loading',
  );
  assert.equal(
    resolveQueryViewStatus({
      loading: false,
      itemCount: 2,
      enabled: true,
      fetchAttempted: true,
      error: 'falhou',
    }),
    'ready',
  );
}

function testReadyWithItems() {
  assert.equal(
    resolveQueryViewStatus({
      loading: false,
      itemCount: 3,
      enabled: true,
      fetchAttempted: true,
    }),
    'ready',
  );
  assert.equal(
    resolveQueryViewStatus({
      loading: false,
      refreshing: true,
      itemCount: 3,
      enabled: true,
      fetchAttempted: true,
    }),
    'ready',
  );
}

testLoadingWhileAuthOrDisabled();
testLoadingWhileFetchInFlight();
testEmptyOnlyAfterSettled();
testErrorOnlyAfterSettled();
testReadyWithItems();

console.log('queryViewState.test.ts: ok');
