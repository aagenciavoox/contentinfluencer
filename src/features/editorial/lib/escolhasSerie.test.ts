import assert from 'node:assert/strict';
import {
  aplicarEscolhasDaSerie,
  aplicarEscolhasHerdadas,
  congelarRedeReferencia,
  copiarFuncaoHerdada,
  marcarEscolhaManual,
} from './escolhasSerie.ts';

const serie = {
  id: 'serie-1',
  funcaoPadrao: 'atrair' as const,
  pilarPrincipalId: 'pilar-1',
  pilarIds: ['pilar-1'],
};

function testPreencheVazioComOrigemHerdada() {
  const content = aplicarEscolhasDaSerie({
    seriesId: null,
    pilarId: null,
    funcao: null,
    classificacaoCongeladaEm: null,
  }, serie);
  assert.equal(content.seriesId, 'serie-1');
  assert.equal(content.pilarId, 'pilar-1');
  assert.equal(content.pilarOrigem, 'herdada');
  assert.equal(content.funcao, 'atrair');
  assert.equal(content.funcaoOrigem, 'herdada');
}

function testNaoSobrescreveEscolhaManual() {
  const content = aplicarEscolhasDaSerie({
    seriesId: null,
    pilarId: 'pilar-meu',
    pilarOrigem: 'escolhida' as const,
    funcao: 'converter' as const,
    funcaoOrigem: 'escolhida' as const,
    classificacaoCongeladaEm: null,
  }, {...serie, funcaoPadrao: 'comunidade' as const, pilarPrincipalId: 'pilar-serie'});
  assert.equal(content.seriesId, 'serie-1');
  assert.equal(content.pilarId, 'pilar-meu');
  assert.equal(content.pilarOrigem, 'escolhida');
  assert.equal(content.funcao, 'converter');
  assert.equal(content.funcaoOrigem, 'escolhida');
}

function testNenhumaNaoVoltaASerPreenchida() {
  const content = aplicarEscolhasDaSerie({
    pilarId: null,
    pilarOrigem: 'nenhuma' as const,
    funcao: null,
    funcaoOrigem: 'nenhuma' as const,
    classificacaoCongeladaEm: null,
  }, serie);
  assert.equal(content.pilarId, null);
  assert.equal(content.pilarOrigem, 'nenhuma');
  assert.equal(content.funcao, null);
  assert.equal(content.funcaoOrigem, 'nenhuma');
}

function testHerdadaAcompanhaASerie() {
  const content = aplicarEscolhasDaSerie({
    seriesId: 'serie-antiga',
    pilarId: 'pilar-antigo',
    pilarOrigem: 'herdada' as const,
    funcao: 'atrair' as const,
    funcaoOrigem: 'herdada' as const,
    classificacaoCongeladaEm: null,
  }, {...serie, id: 'serie-2', funcaoPadrao: 'acao' as const, pilarPrincipalId: 'pilar-2'});
  assert.equal(content.seriesId, 'serie-2');
  assert.equal(content.pilarId, 'pilar-2');
  assert.equal(content.funcao, 'acao');
  assert.equal(content.funcaoOrigem, 'herdada');
}

function testCongeladoNaoMuda() {
  const original = {
    seriesId: 'serie-antiga',
    pilarId: 'pilar-antigo',
    pilarOrigem: 'herdada' as const,
    funcao: 'atrair' as const,
    funcaoOrigem: 'herdada' as const,
    classificacaoCongeladaEm: '2026-10-01T00:00:00.000Z',
  };
  const content = aplicarEscolhasDaSerie(original, serie);
  assert.equal(content, original);
  const herdado = aplicarEscolhasHerdadas(original, {pilarId: 'pilar-1', funcao: 'reter'});
  assert.equal(herdado, original);
}

function testOrigemVaziaComValorAindaRecebeASerie() {
  const content = aplicarEscolhasDaSerie({
    pilarId: 'pilar-antigo',
    pilarOrigem: null,
    funcao: 'converter' as const,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
  }, serie);
  assert.equal(content.pilarId, 'pilar-1');
  assert.equal(content.pilarOrigem, 'herdada');
  assert.equal(content.funcao, 'atrair');
  assert.equal(content.funcaoOrigem, 'herdada');
}

function testSemSerieLimpaOVinculoEMantemEscolha() {
  const content = aplicarEscolhasDaSerie({
    seriesId: 'serie-1',
    pilarId: 'pilar-meu',
    pilarOrigem: 'escolhida' as const,
    funcao: 'acao' as const,
    funcaoOrigem: 'escolhida' as const,
    classificacaoCongeladaEm: null,
  }, null);
  assert.equal(content.seriesId, null);
  assert.equal(content.pilarId, 'pilar-meu');
  assert.equal(content.funcao, 'acao');
}

function testHerdadaSomeQuandoASerieNaoTemValor() {
  const content = aplicarEscolhasDaSerie({
    pilarId: 'pilar-1',
    pilarOrigem: 'herdada' as const,
    funcao: 'atrair' as const,
    funcaoOrigem: 'herdada' as const,
    classificacaoCongeladaEm: null,
  }, {id: 'serie-varia', funcaoPadrao: 'varia', pilarPrincipalId: null, pilarIds: []});
  assert.equal(content.seriesId, 'serie-varia');
  assert.equal(content.pilarId, null);
  assert.equal(content.pilarOrigem, 'herdada');
  assert.equal(content.funcao, null);
  assert.equal(content.funcaoOrigem, 'herdada');
}

function testEscolhaManual() {
  const comPilar = marcarEscolhaManual({pilarId: null, funcao: null}, 'pilar', 'pilar-2');
  assert.equal(comPilar.pilarId, 'pilar-2');
  assert.equal(comPilar.pilarOrigem, 'escolhida');
  const semPilar = marcarEscolhaManual(comPilar, 'pilar', null);
  assert.equal(semPilar.pilarId, null);
  assert.equal(semPilar.pilarOrigem, 'nenhuma');
  const comFuncao = marcarEscolhaManual({funcao: null}, 'funcao', 'reter');
  assert.equal(comFuncao.funcao, 'reter');
  assert.equal(comFuncao.funcaoOrigem, 'escolhida');
  const semFuncao = marcarEscolhaManual(comFuncao, 'funcao', '');
  assert.equal(semFuncao.funcao, null);
  assert.equal(semFuncao.funcaoOrigem, 'nenhuma');
}

function testCopiaHerdadaNaoViraAplicada() {
  const herdada = copiarFuncaoHerdada({
    funcao: 'atrair' as const,
    funcaoOrigem: 'herdada' as const,
    classificacaoCongeladaEm: '2026-10-01T00:00:00.000Z',
  }, 'comunidade');
  assert.equal(herdada.funcao, 'comunidade');
  assert.equal(herdada.funcaoOrigem, 'herdada');
  const escolhida = copiarFuncaoHerdada({
    funcao: 'atrair' as const,
    funcaoOrigem: 'escolhida' as const,
  }, 'comunidade');
  assert.equal(escolhida.funcao, 'atrair');
  assert.equal(escolhida.funcaoOrigem, 'escolhida');
}

function testCongelaRedeUmaVez() {
  const primeiro = congelarRedeReferencia({redeReferenciaCongeladaId: null}, 'ig');
  assert.equal(primeiro.redeReferenciaCongeladaId, 'ig');
  const segundo = congelarRedeReferencia(primeiro, 'tt');
  assert.equal(segundo.redeReferenciaCongeladaId, 'ig');
  const semRede = congelarRedeReferencia({redeReferenciaCongeladaId: null}, '  ');
  assert.equal(semRede.redeReferenciaCongeladaId, null);
}

function testPostItHerdado() {
  const content = aplicarEscolhasHerdadas({
    seriesId: 'serie-1',
    pilarId: null,
    funcao: null,
    classificacaoCongeladaEm: null,
  }, {pilarId: 'pilar-post', funcao: 'reter'});
  assert.equal(content.pilarId, 'pilar-post');
  assert.equal(content.pilarOrigem, 'herdada');
  assert.equal(content.funcao, 'reter');
  assert.equal(content.funcaoOrigem, 'herdada');
}

testPreencheVazioComOrigemHerdada();
testNaoSobrescreveEscolhaManual();
testNenhumaNaoVoltaASerPreenchida();
testHerdadaAcompanhaASerie();
testCongeladoNaoMuda();
testOrigemVaziaComValorAindaRecebeASerie();
testSemSerieLimpaOVinculoEMantemEscolha();
testHerdadaSomeQuandoASerieNaoTemValor();
testEscolhaManual();
testCopiaHerdadaNaoViraAplicada();
testCongelaRedeUmaVez();
testPostItHerdado();

console.log('escolhasSerie tests passed');
