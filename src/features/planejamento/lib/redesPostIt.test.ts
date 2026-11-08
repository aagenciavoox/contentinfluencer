import assert from 'node:assert/strict';
import {createEmptyPostIt, postItEditDraft, postItMudou, savePostItEdit} from './postIt.ts';
import {redesDoCartao, redesDoConteudo} from './redesDoCartao.ts';
import {alternarRedeNoFoco, mesmasRedes, normalizarRedesPostIt, ordenarChipsDoFoco, postItRapidoPodeSalvar} from './redesPostIt.ts';

const NOW = '2026-10-16T12:00:00.000Z';

function testNormalizaRedes() {
  assert.deepEqual(normalizarRedesPostIt(null), []);
  assert.deepEqual(normalizarRedesPostIt('instagram'), []);
  // Preserva a ordem de entrada; deduplica e descarta desconhecidos.
  assert.deepEqual(normalizarRedesPostIt(['youtube', 'Instagram ', 'youtube', 'facebook', 3]), ['youtube', 'instagram']);
  assert.deepEqual(normalizarRedesPostIt(['youtube-shorts', 'Instagram ']), ['youtube-shorts', 'instagram']);
  assert.deepEqual(normalizarRedesPostIt(['tiktok', 'youtube']), ['tiktok', 'youtube']);
  assert.deepEqual(normalizarRedesPostIt(['youtube', 'tiktok']), ['youtube', 'tiktok']);
}

function testOrdemDeCliqueNoFoco() {
  // A depois B grava A,B; invertido grava B,A.
  assert.deepEqual(
    alternarRedeNoFoco(alternarRedeNoFoco([], 'youtube'), 'instagram-carrossel'),
    ['youtube', 'instagram-carrossel'],
  );
  assert.deepEqual(
    alternarRedeNoFoco(alternarRedeNoFoco([], 'instagram-carrossel'), 'youtube'),
    ['instagram-carrossel', 'youtube'],
  );
  // Exclusão não bagunca a ordem do que ficou.
  assert.deepEqual(
    alternarRedeNoFoco(['tiktok', 'youtube-shorts'], 'youtube'),
    ['tiktok', 'youtube'],
  );
}


function testOrdenaChipsSelecionadosNaOrdemGravada() {
  const chips = [
    {destino: 'instagram-video' as const, id: 'ig'},
    {destino: 'tiktok' as const, id: 'tt'},
    {destino: 'youtube-shorts' as const, id: 'sh'},
    {destino: 'instagram-carrossel' as const, id: 'car'},
    {destino: 'youtube' as const, id: 'yt'},
  ];
  // Selecionados primeiro na ordem do clique; demais na ordem de exibição.
  assert.deepEqual(
    ordenarChipsDoFoco(chips, ['youtube', 'instagram-carrossel']).map(item => item.id),
    ['yt', 'car', 'ig', 'tt', 'sh'],
  );
  assert.deepEqual(
    ordenarChipsDoFoco(chips, ['instagram-carrossel', 'youtube']).map(item => item.id),
    ['car', 'yt', 'ig', 'tt', 'sh'],
  );
  // Sem seleção: curtos, YouTube longo e carrossel por último.
  assert.deepEqual(
    ordenarChipsDoFoco(chips, []).map(item => item.id),
    ['ig', 'tt', 'sh', 'yt', 'car'],
  );
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
  assert.deepEqual(postIt.redes, ['youtube', 'instagram']);
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
  // Sem formato nem escrita, YouTube deduz para Shorts
  assert.deepEqual(redesDoConteudo(content, CONTAS), ['youtube-shorts', 'instagram-video']);
  // Com modo de escrita YouTube ou formato longo, vira YouTube longo
  assert.deepEqual(redesDoConteudo({...content, writingMode: 'youtube' as const}, CONTAS), ['youtube', 'instagram-video']);
  assert.deepEqual(redesDoConteudo({plataformas: [{platformId: 'c-yt', formatoPublicacao: 'video-longo' as const}]}, CONTAS), ['youtube']);
  assert.deepEqual(redesDoConteudo({plataformas: [{platformId: 'TikTok'}]}, CONTAS), ['tiktok']);
  assert.deepEqual(redesDoConteudo(null, CONTAS), []);
}

function testCartaoUsaConteudoAntesDoPostIt() {
  const postIt = {redes: ['tiktok' as const]};
  assert.deepEqual(redesDoCartao({content: {plataformas: [{platformId: 'c-ig'}]}, postIt, contas: CONTAS}), ['instagram-video']);
  assert.deepEqual(redesDoCartao({content: {plataformas: []}, postIt, contas: CONTAS}), ['tiktok']);
  assert.deepEqual(redesDoCartao({content: {plataformas: [{platformId: 'c-x'}]}, postIt, contas: CONTAS}), ['tiktok']);
  assert.deepEqual(redesDoCartao({content: null, postIt: null, contas: CONTAS}), []);
}

const tests = [
  ['derives content networks from its accounts', testRedesDoConteudoPelaConta],
  ['card prefers content networks and falls back to the post-it', testCartaoUsaConteudoAntesDoPostIt],
  ['normalizes post-it networks', testNormalizaRedes],
  ['keeps click order on focus chips', testOrdemDeCliqueNoFoco],
  ['shows selected chips in saved order', testOrdenaChipsSelecionadosNaOrdemGravada],
  ['compares networks ignoring order', testMesmasRedesIgnoraOrdem],
  ['quick post-it only needs the note', testRapidoPedeSoANota],
  ['creates a post-it without date and with networks', testCriaSemDataComRedes],
  ['saves networks and detects the change', testSalvarGravaRedesEDetectaMudanca],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
