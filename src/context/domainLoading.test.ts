import assert from 'node:assert/strict';
import type { AppDataDomain } from '../lib/database';
import {
  applyDomainStatus,
  clearDomainStatus,
  isDomainAlreadyLoaded,
  markDomainsLoaded,
  resolveDomainStatus,
  subtractInFlightDomains,
  type DomainStatusMap,
} from './domainLoading.ts';

function inFlight(entries: Array<[AppDataDomain, string]>): Map<AppDataDomain, string> {
  return new Map(entries);
}

function testFetchesEverythingWhenNothingIsInFlight() {
  const result = subtractInFlightDomains(['production', 'content'], inFlight([]));
  assert.deepEqual(result.toFetch, ['production', 'content']);
  assert.deepEqual(result.pending, []);
}

function testSkipsDomainsAlreadyInFlight() {
  // `['production','content']` em voo; o bootstrap pede `['bootstrap','production','content']`.
  const batch = 'production+content';
  const result = subtractInFlightDomains(
    ['bootstrap', 'production', 'content'],
    inFlight([['production', batch], ['content', batch]]),
  );
  assert.deepEqual(result.toFetch, ['bootstrap']);
  assert.deepEqual(result.pending, [batch]);
}

function testWaitsOnlyOnceForEachPromise() {
  const first = 'first';
  const second = 'second';
  const result = subtractInFlightDomains(
    ['library', 'agenda', 'projects', 'ideas'],
    inFlight([['library', first], ['agenda', second], ['projects', second]]),
  );
  assert.deepEqual(result.toFetch, ['ideas']);
  assert.deepEqual(result.pending, [first, second]);
}

function testReturnsNothingToFetchWhenAllAreInFlight() {
  const batch = 'library';
  const result = subtractInFlightDomains(['library'], inFlight([['library', batch]]));
  assert.deepEqual(result.toFetch, []);
  assert.deepEqual(result.pending, [batch]);
}

function testFullContentListCoversItsAliases() {
  const batch = 'content';
  const summary = subtractInFlightDomains(['content-summary'], inFlight([['content', batch]]));
  assert.deepEqual(summary.toFetch, []);
  assert.deepEqual(summary.pending, [batch]);

  const schedule = subtractInFlightDomains(['content-schedule'], inFlight([['content', batch]]));
  assert.deepEqual(schedule.toFetch, []);
  assert.deepEqual(schedule.pending, [batch]);
}

function testLimitedSummaryDoesNotCoverFullList() {
  const result = subtractInFlightDomains(['content'], inFlight([['content-summary', 'summary']]));
  assert.deepEqual(result.toFetch, ['content']);
  assert.deepEqual(result.pending, []);
}

function testIgnoresRepeatedDomains() {
  const result = subtractInFlightDomains(['library', 'library'], inFlight([]));
  assert.deepEqual(result.toFetch, ['library']);
}

function testLoadedAliasesMatchPreviousBehavior() {
  const loaded = new Set<AppDataDomain>();
  markDomainsLoaded(loaded, ['content-schedule']);
  assert.equal(isDomainAlreadyLoaded(loaded, 'content'), true);
  assert.equal(isDomainAlreadyLoaded(loaded, 'content-summary'), true);
  assert.equal(isDomainAlreadyLoaded(loaded, 'library'), false);

  const summaryOnly = new Set<AppDataDomain>(['content-summary']);
  assert.equal(isDomainAlreadyLoaded(summaryOnly, 'content-summary'), true);
  assert.equal(isDomainAlreadyLoaded(summaryOnly, 'content'), false);
}

function testStatusGoesFromLoadingToReady() {
  const empty: DomainStatusMap = {};
  const loading = applyDomainStatus(empty, ['library'], 'loading');
  assert.deepEqual(loading, { library: 'loading' });
  const ready = applyDomainStatus(loading, ['library'], 'ready');
  assert.deepEqual(ready, { library: 'ready' });
  assert.deepEqual(empty, {}, 'não altera o objeto anterior');
}

function testStatusGoesFromLoadingToError() {
  const loading = applyDomainStatus({}, ['recording'], 'loading');
  assert.deepEqual(applyDomainStatus(loading, ['recording'], 'error'), { recording: 'error' });
}

function testErrorCanBeRetried() {
  const failed: DomainStatusMap = { library: 'error' };
  const retry = applyDomainStatus(failed, ['library'], 'loading');
  assert.deepEqual(retry, { library: 'loading' });
  assert.deepEqual(applyDomainStatus(retry, ['library'], 'ready'), { library: 'ready' });
}

function testReadyStaysReadyDuringRevalidationAndAfterFailure() {
  // Cache persistido na tela: a revalidação não volta para o skeleton.
  const fromCache = applyDomainStatus({}, ['library'], 'ready');
  assert.equal(applyDomainStatus(fromCache, ['library'], 'loading'), fromCache);
  assert.equal(applyDomainStatus(fromCache, ['library'], 'error'), fromCache);
}

function testUnchangedStatusKeepsSameObject() {
  const current: DomainStatusMap = { library: 'loading', content: 'ready' };
  assert.equal(applyDomainStatus(current, ['library'], 'loading'), current);
  assert.equal(applyDomainStatus(current, ['content'], 'ready'), current);
  assert.equal(applyDomainStatus(current, [], 'ready'), current);
}

function testMixedUpdateOnlyTouchesNonReadyDomains() {
  const current: DomainStatusMap = { content: 'ready' };
  assert.deepEqual(
    applyDomainStatus(current, ['content', 'production'], 'loading'),
    { content: 'ready', production: 'loading' },
  );
}

function testResolveStatusFollowsAliases() {
  assert.equal(resolveDomainStatus({}, 'library'), undefined);
  assert.equal(resolveDomainStatus({ content: 'ready' }, 'content-summary'), 'ready');
  assert.equal(resolveDomainStatus({ 'content-schedule': 'ready' }, 'content'), 'ready');
  assert.equal(resolveDomainStatus({ 'content-summary': 'ready' }, 'content'), undefined);
  assert.equal(resolveDomainStatus({ content: 'loading', 'content-schedule': 'ready' }, 'content'), 'ready');
  assert.equal(resolveDomainStatus({ content: 'error', 'content-schedule': 'loading' }, 'content'), 'loading');
  assert.equal(resolveDomainStatus({ recording: 'error' }, 'recording'), 'error');
}

function testClearStatus() {
  const current: DomainStatusMap = { content: 'ready', library: 'ready' };
  assert.deepEqual(clearDomainStatus(current, ['content', 'ideas']), { library: 'ready' });
  assert.equal(clearDomainStatus(current, ['ideas']), current);
}

const tests: Array<[string, () => void]> = [
  ['fetches every domain when nothing is in flight', testFetchesEverythingWhenNothingIsInFlight],
  ['skips domains already in flight and waits for their promise', testSkipsDomainsAlreadyInFlight],
  ['waits only once for each in-flight promise', testWaitsOnlyOnceForEachPromise],
  ['returns nothing to fetch when every domain is in flight', testReturnsNothingToFetchWhenAllAreInFlight],
  ['full content list in flight covers summary and schedule', testFullContentListCoversItsAliases],
  ['limited summary in flight does not cover the full list', testLimitedSummaryDoesNotCoverFullList],
  ['ignores repeated domains', testIgnoresRepeatedDomains],
  ['loaded aliases keep the previous behavior', testLoadedAliasesMatchPreviousBehavior],
  ['status goes from loading to ready', testStatusGoesFromLoadingToReady],
  ['status goes from loading to error', testStatusGoesFromLoadingToError],
  ['a failed domain can be retried', testErrorCanBeRetried],
  ['ready stays ready during revalidation and after a failure', testReadyStaysReadyDuringRevalidationAndAfterFailure],
  ['unchanged status keeps the same object', testUnchangedStatusKeepsSameObject],
  ['mixed update only touches domains that are not ready', testMixedUpdateOnlyTouchesNonReadyDomains],
  ['resolved status follows content aliases', testResolveStatusFollowsAliases],
  ['clearing status removes only the given domains', testClearStatus],
];

for (const [name, fn] of tests) {
  fn();
  console.log(`ok - ${name}`);
}
