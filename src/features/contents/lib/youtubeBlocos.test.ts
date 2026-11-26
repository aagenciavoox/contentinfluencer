import assert from 'node:assert/strict';
import {
  anexarBlocos,
  blocosDesdeRoteiro,
  blocosParaHtml,
  htmlParaBlocos,
  metricasDosBlocos,
  moverBloco,
  readYoutubeBlocos,
  reordenarBloco,
} from './youtubeBlocos.ts';

const corrido = [
  '<p>Antes de começar.</p>',
  '<h2 data-bloco="abertura">Abertura</h2><p>Gancho.</p><div data-na-tela>capa do livro</div>',
  '<h1 data-bloco="fim">Encerramento</h1><p>Fecha.</p>',
].join('');

const blocos = htmlParaBlocos(corrido, [
  { id: 'abertura', nome: 'Abertura', roteiro: '<p>velho</p>', referencias: 'trilha leve' },
  { id: 'fim', nome: 'Encerramento', roteiro: '', referencias: 'https://exemplo.com/capa.jpg' },
]);

assert.equal(blocos.length, 3);
assert.equal(blocos[0]?.nome, '');
assert.equal(blocos[0]?.roteiro, '<p>Antes de começar.</p>');
assert.equal(blocos[1]?.referencias, 'trilha leve');
assert.match(blocos[1]?.roteiro ?? '', /data-na-tela/);
assert.equal(blocos[2]?.id, 'fim');
assert.equal(blocos[2]?.referencias, 'https://exemplo.com/capa.jpg');
assert.equal(blocosParaHtml(blocos).includes('trilha leve'), false);
assert.equal(blocosParaHtml(blocos).includes('https://exemplo.com/capa.jpg'), false);

const deNovo = htmlParaBlocos(blocosParaHtml(blocos), blocos);
assert.deepEqual(deNovo.map(bloco => [bloco.id, bloco.nome, bloco.referencias]), blocos.map(bloco => [bloco.id, bloco.nome, bloco.referencias]));
assert.match(deNovo[1]?.roteiro ?? '', /data-na-tela/);

const semId = htmlParaBlocos('<h2>Abertura</h2><p>novo</p>', blocos);
assert.equal(semId[0]?.id, 'abertura');
assert.equal(semId[0]?.referencias, 'trilha leve');

const vazio = blocosDesdeRoteiro('<p></p>');
assert.equal(vazio.length, 1);
assert.equal(vazio[0]?.nome, '');
assert.equal(vazio[0]?.referencias, '');

const comModelo = anexarBlocos(vazio, [{ nome: 'Contexto', texto: 'O que aconteceu' }]);
assert.equal(comModelo[1]?.nome, 'Contexto');
assert.match(comModelo[1]?.roteiro ?? '', /O que aconteceu/);
assert.deepEqual(moverBloco(comModelo, comModelo[1].id, -1).map(bloco => bloco.nome), ['Contexto', '']);

assert.equal(readYoutubeBlocos(null), null);
assert.equal(readYoutubeBlocos('não é json'), null);
assert.equal(readYoutubeBlocos([{ nome: 'Cena', roteiro: '<p>a</p>', referencias: 'som' }])?.[0]?.nome, 'Cena');

const ordenaveis = [
  { id: 'b1', nome: 'Abertura', roteiro: '<p>' + 'palavra '.repeat(65) + '</p><div data-na-tela>texto ignorado</div>', referencias: 'nota ignorada' },
  { id: 'b2', nome: 'Meio', roteiro: '<p></p>', referencias: '' },
  { id: 'b3', nome: 'Fim', roteiro: '<p>' + 'palavra '.repeat(130) + '</p>', referencias: '' },
];
assert.deepEqual(reordenarBloco(ordenaveis, 'b3', 'b1').map(b => b.id), ['b3', 'b1', 'b2']);
assert.deepEqual(reordenarBloco(ordenaveis, 'b1', 'b3').map(b => b.id), ['b2', 'b3', 'b1']);

const metricas = metricasDosBlocos(ordenaveis);
assert.equal(metricas.porId.b1?.palavras, 65);
assert.equal(metricas.porId.b1?.segundos, 30);
assert.equal(metricas.porId.b1?.janelaTempo, '~00:00 – 00:30');
assert.equal(metricas.porId.b2?.palavras, 0);
assert.equal(metricas.porId.b2?.janelaTempo, null);
assert.equal(metricas.porId.b3?.palavras, 130);
assert.equal(metricas.porId.b3?.janelaTempo, '~00:30 – 01:30');
assert.equal(metricas.totalPalavras, 195);
assert.equal(metricas.totalDuracaoCurta, '~1 min 30s');

console.log('ok - youtubeBlocos');
