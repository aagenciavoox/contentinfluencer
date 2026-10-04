import assert from 'node:assert/strict';
import {
  aplicarFuncaoNoEvento,
  avisoDiasInvalido,
  avisoDiasParaSalvar,
  escolhaFuncaoNoEvento,
  isProjetoEvento,
  parseAvisoDiasInput,
  readAvisoDias,
  rotuloAvisoDias,
  rotuloProjetoTipo,
} from './evento.ts';

function testTipoEvento() {
  assert.equal(isProjetoEvento('evento'), true);
  assert.equal(isProjetoEvento('publi'), false);
  assert.equal(rotuloProjetoTipo('evento'), 'Evento');
  assert.equal(rotuloProjetoTipo('campanha'), 'Publi');
}

function testAvisoDias() {
  assert.equal(readAvisoDias(null), null);
  assert.equal(readAvisoDias(undefined), null);
  assert.equal(readAvisoDias(''), null);
  assert.equal(readAvisoDias(0), 0);
  assert.equal(readAvisoDias(120), 120);
  assert.equal(readAvisoDias('12'), 12);
  assert.equal(readAvisoDias(121), null);
  assert.equal(readAvisoDias(-1), null);
  assert.equal(readAvisoDias(12.5), null);
  assert.equal(readAvisoDias('12 dias'), null);

  assert.equal(parseAvisoDiasInput(''), null);
  assert.equal(parseAvisoDiasInput(' 7 '), 7);
  assert.equal(parseAvisoDiasInput('121'), 'invalid');
  assert.equal(avisoDiasInvalido('evento', '200'), true);
  assert.equal(avisoDiasInvalido('publi', '200'), false);
  assert.equal(avisoDiasParaSalvar('publi', '10'), null);
  assert.equal(avisoDiasParaSalvar('evento', '10'), 10);
  assert.equal(avisoDiasParaSalvar('evento', 'x'), 'invalid');
  assert.equal(rotuloAvisoDias(null), 'Sem aviso de antecedência');
  assert.equal(rotuloAvisoDias(0), 'Aviso no dia do evento');
  assert.equal(rotuloAvisoDias(1), 'Aviso com 1 dia de antecedência');
  assert.equal(rotuloAvisoDias(12), 'Aviso com 12 dias de antecedência');
}

function testCadaRoteiroGuardaAPropriaFuncao() {
  const atrair = {
    id: 'a',
    funcao: 'atrair' as const,
    funcaoOrigem: 'escolhida' as const,
    classificacaoCongeladaEm: null,
  };
  const converter = {
    id: 'b',
    funcao: 'converter' as const,
    funcaoOrigem: 'escolhida' as const,
    classificacaoCongeladaEm: null,
  };

  const atualizado = aplicarFuncaoNoEvento(atrair, 'acao');
  assert.equal(atualizado.funcao, 'acao');
  assert.equal(atualizado.funcaoOrigem, 'escolhida');
  assert.equal(atrair.funcao, 'atrair');
  assert.equal(converter.funcao, 'converter');
  assert.notEqual(atualizado, atrair);

  const herdado = aplicarFuncaoNoEvento(converter, 'herdada');
  assert.equal(herdado.funcao, null);
  assert.equal(herdado.funcaoOrigem, 'herdada');
  assert.equal(escolhaFuncaoNoEvento(herdado), 'herdada');
  assert.equal(escolhaFuncaoNoEvento({ funcao: null, funcaoOrigem: null }), 'indefinida');

  const publicado = {
    funcao: 'atrair' as const,
    funcaoOrigem: 'escolhida' as const,
    classificacaoCongeladaEm: '2026-10-04T12:00:00.000Z',
  };
  const intacto = aplicarFuncaoNoEvento(publicado, 'acao');
  assert.equal(intacto, publicado);
  assert.equal(intacto.funcao, 'atrair');
}

testTipoEvento();
testAvisoDias();
testCadaRoteiroGuardaAPropriaFuncao();

console.log('evento tests passed');
