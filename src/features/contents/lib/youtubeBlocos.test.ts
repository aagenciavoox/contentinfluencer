import assert from 'node:assert/strict';
import {
  anexarBlocos,
  blocosDesdeRoteiro,
  blocosParaHtml,
  htmlParaBlocos,
  moverBloco,
  readYoutubeBlocos,
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

console.log('ok - youtubeBlocos');
