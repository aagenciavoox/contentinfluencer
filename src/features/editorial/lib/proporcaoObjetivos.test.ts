import assert from 'node:assert/strict';
import {
  frasesDoResumo,
  metasDaProporcao,
  metasDoPeriodo,
  proporcaoFechaEm100,
  proporcaoIgual,
  readProporcao,
  resumoDasMetas,
  somaDaProporcao,
} from './proporcaoObjetivos.ts';

function testArredondamentoBateComOLimite() {
  const proporcao = { atrair: 40, converter: 30, aprofundar: 20, comunidade: 10 };
  assert.deepEqual(metasDaProporcao(10, proporcao), { atrair: 4, converter: 3, aprofundar: 2, comunidade: 1 });
  // 7 × (40/30/20/10) = 2,8 / 2,1 / 1,4 / 0,7 → maior resto: 3, 2, 1, 1.
  assert.deepEqual(metasDaProporcao(7, proporcao), { atrair: 3, converter: 2, aprofundar: 1, comunidade: 1 });
  for (const limite of [0, 1, 2, 3, 5, 9, 13, 31]) {
    const metas = metasDaProporcao(limite, proporcaoIgual());
    const soma = Object.values(metas).reduce((total, valor) => total + (valor ?? 0), 0);
    assert.equal(soma, limite, `limite ${limite}`);
  }
}

function testSemLimiteOuSemProporcao() {
  assert.deepEqual(metasDaProporcao(null, { atrair: 100 }), {});
  assert.deepEqual(metasDaProporcao(8, null), {});
  assert.deepEqual(metasDaProporcao(8, { atrair: 0 }), {});
  const periodo = metasDoPeriodo({ limite: null, proporcao: { atrair: 60, converter: 40 }, ajustes: {} });
  assert.equal(periodo.atrair.meta, null);
  assert.equal(periodo.atrair.percentual, 60);
  assert.equal(periodo.atrair.origem, null);
}

function testAjustePassaNaFrente() {
  const periodo = metasDoPeriodo({
    limite: 10,
    proporcao: { atrair: 50, converter: 50 },
    ajustes: { converter: 2, reter: 1 },
  });
  assert.equal(periodo.atrair.meta, 5);
  assert.equal(periodo.atrair.origem, 'proporcao');
  assert.equal(periodo.converter.meta, 2);
  assert.equal(periodo.converter.calculada, 5);
  assert.equal(periodo.converter.origem, 'ajustada');
  // Meta antiga sem proporção continua valendo como ajuste.
  assert.equal(periodo.reter.meta, 1);
  assert.equal(periodo.reter.origem, 'ajustada');
  assert.equal(periodo.aprofundar.meta, null);
  // Ajuste 0 é um número escolhido, não "sem ajuste".
  assert.equal(metasDoPeriodo({ limite: 4, proporcao: { atrair: 100 }, ajustes: { atrair: 0 } }).atrair.meta, 0);
}

function testResumoFaltaEPassou() {
  const resumo = resumoDasMetas([
    { funcao: 'atrair', meta: 3, previsto: 4 },
    { funcao: 'converter', meta: 2, previsto: 1 },
    { funcao: 'aprofundar', meta: 3, previsto: 1 },
    { funcao: 'comunidade', meta: 2, previsto: 2 },
    { funcao: 'reter', meta: null, previsto: 5 },
  ]);
  assert.deepEqual(resumo.faltam, [{ funcao: 'converter', quantidade: 1 }, { funcao: 'aprofundar', quantidade: 2 }]);
  assert.deepEqual(resumo.passaram, [{ funcao: 'atrair', quantidade: 1 }]);
  assert.deepEqual(frasesDoResumo(resumo), ['Falta 1 de Converter', 'Faltam 2 de Aprofundar', 'Atrair passou 1']);
}

function testSomaELeitura() {
  assert.deepEqual(proporcaoIgual(), { atrair: 17, converter: 17, aprofundar: 17, comunidade: 17, acao: 16, reter: 16 });
  assert.equal(proporcaoFechaEm100(proporcaoIgual()), true);
  assert.equal(somaDaProporcao({ atrair: 50, converter: 30 }), 80);
  assert.equal(proporcaoFechaEm100({ atrair: 50, converter: 30 }), false);
  assert.deepEqual(readProporcao({ atrair: 60, converter: 40.5, reter: 120, outra: 3 }), { atrair: 60 });
  assert.equal(readProporcao({}), null);
  assert.equal(readProporcao('60'), null);
}

testArredondamentoBateComOLimite();
testSemLimiteOuSemProporcao();
testAjustePassaNaFrente();
testResumoFaltaEPassou();
testSomaELeitura();

console.log('proporcaoObjetivos tests passed');
