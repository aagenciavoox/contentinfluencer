import assert from 'node:assert/strict';
import {createEmptyPostIt, postItEditDraft, postItMudou, savePostItEdit} from './postIt.ts';
import {mesmasRedes, normalizarRedesPostIt, postItRapidoPodeSalvar} from './redesPostIt.ts';

const NOW = '2026-10-16T12:00:00.000Z';

function testNormalizaRedes() {
  assert.deepEqual(normalizarRedesPostIt(null), []);
  assert.deepEqual(normalizarRedesPostIt('instagram'), []);
  assert.deepEqual(normalizarRedesPostIt(['youtube', 'Instagram ', 'youtube', 'facebook', 3]), ['instagram', 'youtube']);
}

function testMesmasRedesIgnoraOrdem() {
  assert.equal(mesmasRedes(['tiktok', 'instagram'], ['instagram', 'tiktok']), true);
  assert.equal(mesmasRedes(undefined, []), true);
  assert.equal(mesmasRedes(['tiktok'], []), false);
}

function testRapidoPedeSoANota() {
  assert.equal(postItRapidoPodeSalvar({texto: '   '}), false);
  assert.equal(postItRapidoPodeSalvar({texto: 'gancho do tênis'}), true);
}

function testCriaSemDataComRedes() {
  const postIt = createEmptyPostIt({texto: 'nota', redes: ['youtube', 'instagram'], now: NOW});
  assert.equal(postIt.date, null);
  assert.deepEqual(postIt.redes, ['instagram', 'youtube']);
}

function testSalvarGravaRedesEDetectaMudanca() {
  const postIt = createEmptyPostIt({texto: 'nota', date: '2026-10-20', now: NOW});
  const draft = {...postItEditDraft(postIt), redes: ['tiktok' as const]};
  const saved = savePostItEdit(postIt, draft, NOW);
  assert.deepEqual(saved.redes, ['tiktok']);
  assert.equal(saved.date, '2026-10-20');
  assert.equal(postItMudou(postIt, saved), true);
  const semRedes = savePostItEdit(saved, {texto: 'nota', date: saved.date}, NOW);
  assert.deepEqual(semRedes.redes, ['tiktok']);
  assert.equal(postItMudou(saved, semRedes), false);
}

const tests = [
  ['normalizes post-it networks', testNormalizaRedes],
  ['compares networks ignoring order', testMesmasRedesIgnoraOrdem],
  ['quick post-it only needs the note', testRapidoPedeSoANota],
  ['creates a post-it without date and with networks', testCriaSemDataComRedes],
  ['saves networks and detects the change', testSalvarGravaRedesEDetectaMudanca],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
