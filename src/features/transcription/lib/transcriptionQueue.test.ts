import assert from 'node:assert/strict';
import { TranscriptionUserError } from './transcriptionErrors.ts';
import type { Transcript } from './transcriptFormats.ts';
import {
  createTranscriptionQueue,
  hasPendingWork,
  queueSummary,
  waitingPositions,
  type QueueDeps,
} from './transcriptionQueue.ts';

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void; reject: (error: unknown) => void };

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function transcriptFor(name: string): Transcript {
  return { text: `texto de ${name}`, language: 'pt', duration: 3, segments: [] };
}

/** Deps controladas pelo teste: cada etapa só termina quando o teste manda. */
function fakeDeps() {
  const extractions = new Map<string, Deferred<{ blob: Blob; fileName: string }>>();
  const transcriptions = new Map<string, Deferred<Transcript>>();
  const started: string[] = [];
  const signals = new Map<string, AbortSignal>();
  let nextId = 0;

  const deps: QueueDeps = {
    createId: () => `item-${++nextId}`,
    extract: (file, { signal, onProgress }) => {
      started.push(`extract:${file.name}`);
      signals.set(file.name, signal);
      onProgress(0.5);
      const step = deferred<{ blob: Blob; fileName: string }>();
      extractions.set(file.name, step);
      return step.promise;
    },
    transcribe: (_audio, fileName, language) => {
      started.push(`transcribe:${fileName}:${language}`);
      const step = deferred<Transcript>();
      transcriptions.set(fileName, step);
      return step.promise;
    },
  };

  const finishExtraction = async (name: string) => {
    extractions.get(name)!.resolve({ blob: new Blob(['a']), fileName: name });
    await tick();
  };
  const finishTranscription = async (name: string) => {
    transcriptions.get(name)!.resolve(transcriptFor(name));
    await tick();
  };

  return { deps, started, signals, extractions, transcriptions, finishExtraction, finishTranscription };
}

const file = (name: string) => new File(['video'], name, { type: 'video/mp4' });

async function testProcessesOneVideoAtATimeInOrder() {
  const fake = fakeDeps();
  const queue = createTranscriptionQueue(fake.deps);
  queue.addFiles([file('a.mp4'), file('b.mp4')], 'pt');
  await tick();

  assert.deepEqual(fake.started, ['extract:a.mp4']);
  assert.deepEqual(queue.getState().items.map(item => item.status), ['extracting', 'waiting']);
  assert.equal(queue.getState().items[0].progress, 0.5);

  await fake.finishExtraction('a.mp4');
  assert.deepEqual(queue.getState().items.map(item => item.status), ['transcribing', 'waiting']);
  assert.deepEqual(fake.started, ['extract:a.mp4', 'transcribe:a.mp4:pt']);

  await fake.finishTranscription('a.mp4');
  assert.deepEqual(queue.getState().items.map(item => item.status), ['done', 'extracting']);
  assert.equal(queue.getState().items[0].transcript?.text, 'texto de a.mp4');
  assert.deepEqual(fake.started.at(-1), 'extract:b.mp4');

  await fake.finishExtraction('b.mp4');
  await fake.finishTranscription('b.mp4');
  assert.deepEqual(queue.getState().items.map(item => item.status), ['done', 'done']);
  assert.equal(hasPendingWork(queue.getState()), false);
}

async function testFilesAddedLaterWaitTheirTurnWithTheirLanguage() {
  const fake = fakeDeps();
  const queue = createTranscriptionQueue(fake.deps);
  queue.addFiles([file('a.mp4')], 'pt');
  await tick();
  queue.addFiles([file('b.mp4')], 'en');
  await tick();
  assert.deepEqual(fake.started, ['extract:a.mp4']);

  await fake.finishExtraction('a.mp4');
  await fake.finishTranscription('a.mp4');
  await fake.finishExtraction('b.mp4');
  assert.equal(fake.started.at(-1), 'transcribe:b.mp4:en');
}

async function testRemovingTheActiveVideoAbortsAndMovesOn() {
  const fake = fakeDeps();
  const queue = createTranscriptionQueue(fake.deps);
  queue.addFiles([file('a.mp4'), file('b.mp4')], 'pt');
  await tick();

  const [first] = queue.getState().items;
  queue.remove(first.id);
  await tick();
  assert.equal(fake.signals.get('a.mp4')?.aborted, true);
  assert.deepEqual(queue.getState().items.map(item => [item.file.name, item.status]), [['b.mp4', 'extracting']]);

  // A extração antiga terminando depois não mexe em nada.
  await fake.finishExtraction('a.mp4');
  assert.deepEqual(queue.getState().items.map(item => item.status), ['extracting']);
  assert.equal(fake.started.filter(entry => entry.startsWith('transcribe:a.mp4')).length, 0);
}

async function testErrorKeepsQueueGoingAndCanBeRetried() {
  const fake = fakeDeps();
  const queue = createTranscriptionQueue(fake.deps);
  queue.addFiles([file('a.mp4'), file('b.mp4')], 'pt');
  await tick();

  fake.extractions.get('a.mp4')!.reject(new TranscriptionUserError('Este arquivo não tem som.'));
  await tick();
  assert.deepEqual(queue.getState().items.map(item => item.status), ['error', 'extracting']);
  assert.equal(queue.getState().items[0].error, 'Este arquivo não tem som.');

  queue.retry(queue.getState().items[0].id);
  await fake.finishExtraction('b.mp4');
  await fake.finishTranscription('b.mp4');
  assert.deepEqual(queue.getState().items.map(item => item.status), ['extracting', 'done']);
}

async function testUnknownErrorsGetAGentleMessage() {
  const fake = fakeDeps();
  const queue = createTranscriptionQueue(fake.deps);
  queue.addFiles([file('a.mp4')], 'pt');
  await tick();
  await fake.finishExtraction('a.mp4');
  fake.transcriptions.get('a.mp4')!.reject(new TypeError('Failed to fetch'));
  await tick();
  assert.match(queue.getState().items[0].error ?? '', /tentar de novo/);
}

async function testRateLimitPausesUntilResume() {
  const fake = fakeDeps();
  const queue = createTranscriptionQueue(fake.deps);
  queue.addFiles([file('a.mp4'), file('b.mp4')], 'pt');
  await tick();
  await fake.finishExtraction('a.mp4');
  fake.transcriptions.get('a.mp4')!.reject(new TranscriptionUserError('O limite gratuito chegou ao teto.', 'rate-limit'));
  await tick();

  assert.equal(queue.getState().pausedMessage, 'O limite gratuito chegou ao teto.');
  assert.deepEqual(queue.getState().items.map(item => item.status), ['waiting', 'waiting']);
  assert.equal(fake.started.filter(entry => entry === 'extract:b.mp4').length, 0);
  assert.equal(hasPendingWork(queue.getState()), true);

  queue.resume();
  await tick();
  assert.equal(queue.getState().pausedMessage, null);
  assert.deepEqual(queue.getState().items.map(item => item.status), ['extracting', 'waiting']);
  assert.equal(fake.started.filter(entry => entry === 'extract:a.mp4').length, 2);
}

async function testClearDoneKeepsTheRest() {
  const fake = fakeDeps();
  const queue = createTranscriptionQueue(fake.deps);
  queue.addFiles([file('a.mp4'), file('b.mp4')], 'pt');
  await tick();
  await fake.finishExtraction('a.mp4');
  await fake.finishTranscription('a.mp4');
  queue.clearDone();
  assert.deepEqual(queue.getState().items.map(item => item.file.name), ['b.mp4']);
}

async function testNotifiesSubscribersUntilUnsubscribed() {
  const fake = fakeDeps();
  const queue = createTranscriptionQueue(fake.deps);
  let calls = 0;
  const unsubscribe = queue.subscribe(() => {
    calls += 1;
  });
  queue.addFiles([file('a.mp4')], 'pt');
  await tick();
  assert.ok(calls > 0);
  unsubscribe();
  const before = calls;
  queue.clearDone();
  assert.equal(calls, before);
}

function testWaitingPositionsCountOnlyWaitingItems() {
  const base = { file: file('x.mp4'), language: 'pt' as const, progress: 0, transcript: null, error: null };
  const positions = waitingPositions([
    { ...base, id: 'a', status: 'done' },
    { ...base, id: 'b', status: 'transcribing' },
    { ...base, id: 'c', status: 'waiting' },
    { ...base, id: 'd', status: 'error' },
    { ...base, id: 'e', status: 'waiting' },
  ]);
  assert.deepEqual([...positions], [['c', 1], ['e', 2]]);
}

function testSummarizesTheQueue() {
  const base = { file: file('x.mp4'), language: 'pt' as const, progress: 0, transcript: null, error: null };
  assert.equal(
    queueSummary([
      { ...base, id: 'a', status: 'done' },
      { ...base, id: 'b', status: 'done' },
      { ...base, id: 'c', status: 'extracting' },
      { ...base, id: 'd', status: 'waiting' },
      { ...base, id: 'e', status: 'error' },
    ]),
    '2 prontas · 1 em andamento · 1 na fila · 1 para tentar de novo',
  );
  assert.equal(queueSummary([{ ...base, id: 'a', status: 'done' }]), '1 pronta');
  assert.equal(queueSummary([]), '');
}

const tests = [
  ['queue transcribes one video at a time, in order', testProcessesOneVideoAtATimeInOrder],
  ['queue keeps later files waiting with their own language', testFilesAddedLaterWaitTheirTurnWithTheirLanguage],
  ['queue aborts the active video when removed and moves on', testRemovingTheActiveVideoAbortsAndMovesOn],
  ['queue keeps going after an error and allows retry', testErrorKeepsQueueGoingAndCanBeRetried],
  ['queue gives unknown errors a gentle message', testUnknownErrorsGetAGentleMessage],
  ['queue pauses on the free limit until resumed', testRateLimitPausesUntilResume],
  ['queue clears finished items only', testClearDoneKeepsTheRest],
  ['queue notifies subscribers until they unsubscribe', testNotifiesSubscribersUntilUnsubscribed],
  ['queue numbers only the waiting items', testWaitingPositionsCountOnlyWaitingItems],
  ['queue summarizes its items', testSummarizesTheQueue],
] as const;

for (const [name, test] of tests) {
  await test();
  console.log(`ok - ${name}`);
}
