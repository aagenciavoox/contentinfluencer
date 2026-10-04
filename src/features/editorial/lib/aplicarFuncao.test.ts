import assert from 'node:assert/strict';
import {
  aplicarFuncaoPublicada,
  conteudosParaAplicarFuncao,
  devePerguntarAplicarFuncao,
} from './aplicarFuncao.ts';

const base = {
  id: 'c1',
  seriesId: 'serie-1',
  funcao: 'atrair' as const,
  funcaoOrigem: 'herdada' as const,
  classificacaoCongeladaEm: '2026-10-01T12:00:00.000Z',
  deletedAt: null,
};

function testSoHerdadosCongelados() {
  const alvos = conteudosParaAplicarFuncao([
    base,
    { ...base, id: 'escolhida', funcaoOrigem: 'escolhida' },
    { ...base, id: 'aberto', classificacaoCongeladaEm: null },
    { ...base, id: 'outra', seriesId: 'serie-2' },
    { ...base, id: 'apagado', deletedAt: '2026-10-02T00:00:00.000Z' },
  ], 'serie-1');
  assert.deepEqual(alvos.map(item => item.id), ['c1']);
}

function testPerguntaSoComFuncaoConcreta() {
  assert.equal(devePerguntarAplicarFuncao('atrair', 'converter', 2), true);
  assert.equal(devePerguntarAplicarFuncao('atrair', 'atrair', 2), false);
  assert.equal(devePerguntarAplicarFuncao('atrair', 'varia', 2), false);
  assert.equal(devePerguntarAplicarFuncao('atrair', null, 2), false);
  assert.equal(devePerguntarAplicarFuncao('atrair', 'converter', 0), false);
}

function testAplicaEMarcaOrigem() {
  const atualizado = aplicarFuncaoPublicada(base, 'comunidade');
  assert.equal(atualizado.funcao, 'comunidade');
  assert.equal(atualizado.funcaoOrigem, 'aplicada');
  assert.equal(atualizado.classificacaoCongeladaEm, base.classificacaoCongeladaEm);
}

testSoHerdadosCongelados();
testPerguntaSoComFuncaoConcreta();
testAplicaEMarcaOrigem();

console.log('aplicarFuncao tests passed');
