import assert from 'node:assert/strict';
import {createEmptyPostIt, postItEditDraft, postItMudou, savePostItEdit} from './postIt.ts';
import {redesDoCartao, redesDoConteudo} from './redesDoCartao.ts';
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

const CONTAS = [
  {id: 'c-ig', nome: 'Insta da Diza', rede: 'instagram' as const},
  {id: 'c-yt', nome: 'YouTube'},
  {id: 'c-x', nome: 'Conta sem rede'},
];

function testRedesDoConteudoPelaConta() {
  const content = {plataformas: [{platformId: 'c-yt'}, {platformId: 'c-ig'}, {platformId: 'c-ig'}, {platformId: 'c-x'}]};
  assert.deepEqual(redesDoConteudo(content, CONTAS), ['instagram', 'youtube']);
  assert.deepEqual(redesDoConteudo({plataformas: [{platformId: 'TikTok'}]}, CONTAS), ['tiktok']);
  assert.deepEqual(redesDoConteudo(null, CONTAS), []);
}

function testCartaoUsaConteudoAntesDoPostIt() {
  const postIt = {redes: ['tiktok' as const]};
  assert.deepEqual(redesDoCartao({content: {plataformas: [{platformId: 'c-ig'}]}, postIt, contas: CONTAS}), ['instagram']);
  assert.deepEqual(redesDoCartao({content: {plataformas: []}, postIt, contas: CONTAS}), ['tiktok']);
  assert.deepEqual(redesDoCartao({content: {plataformas: [{platformId: 'c-x'}]}, postIt, contas: CONTAS}), ['tiktok']);
  assert.deepEqual(redesDoCartao({content: null, postIt: null, contas: CONTAS}), []);
}

const tests = [
  ['derives content networks from its accounts', testRedesDoConteudoPelaConta],
  ['card prefers content networks and falls back to the post-it', testCartaoUsaConteudoAntesDoPostIt],
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
