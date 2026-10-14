import assert from 'node:assert/strict';
import { postItTemPauta, roteiroTemPauta, temPautaLigada } from './pautaConteudo.ts';

function testPostIt() {
  assert.equal(postItTemPauta(''), false);
  assert.equal(postItTemPauta('   '), false);
  assert.equal(postItTemPauta(null), false);
  assert.equal(postItTemPauta('Sem título'), false);
  assert.equal(postItTemPauta('  Post-it vazio  '), false);
  assert.equal(postItTemPauta('uma ideia'), true);
  assert.equal(postItTemPauta('sem título'), true);
}

function testRoteiro() {
  assert.equal(roteiroTemPauta('autor', ''), true);
  assert.equal(roteiroTemPauta('autor', '<p></p>'), true);
  assert.equal(roteiroTemPauta('modelo', '<p>texto pronto</p>'), false);
  assert.equal(roteiroTemPauta('modelo', null), false);
  assert.equal(roteiroTemPauta(null, ''), false);
  assert.equal(roteiroTemPauta(null, '<p></p>'), false);
  assert.equal(roteiroTemPauta(null, '<p><br></p>'), false);
  assert.equal(roteiroTemPauta(undefined, '<p><br/></p>'), false);
  assert.equal(roteiroTemPauta(null, '<p>Olá</p>'), false);
}

function testTituloNaoContaELigacaoEhUmaVez() {
  assert.equal(temPautaLigada({
    title: 'Um título bonito',
    scriptOrigem: 'modelo',
    script: '<p></p>',
    textoPostIt: 'Sem título',
  }), false);
  assert.equal(temPautaLigada({
    title: 'Sem título',
    scriptOrigem: 'modelo',
    textoPostIt: 'gancho do vídeo',
  }), true);
  assert.equal(temPautaLigada({
    title: 'Qualquer coisa',
    scriptOrigem: 'autor',
    textoPostIt: 'Post-it vazio',
  }), true);
  assert.equal(temPautaLigada({
    scriptOrigem: 'autor',
    textoPostIt: 'gancho',
  }), true);
}

testPostIt();
testRoteiro();
testTituloNaoContaELigacaoEhUmaVez();

console.log('pautaConteudo tests passed');
