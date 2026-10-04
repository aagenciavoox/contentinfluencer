import assert from 'node:assert/strict';
import {
  distribuirEspacos,
  percentuaisFechamEm100,
  semanasDaContagem,
  somaEspacosSemana,
  totalDaContagem,
} from './distribuirEspacos.ts';

const EXEMPLO = [35, 30, 20, 15];

function testQuatorzeEspacos() {
  assert.deepEqual(distribuirEspacos(14, EXEMPLO), [5, 4, 3, 2]);
}

function testGradePequena() {
  assert.equal(semanasDaContagem(3), 4);
  assert.equal(totalDaContagem(3), 12);
  assert.deepEqual(distribuirEspacos(totalDaContagem(3), EXEMPLO), [4, 4, 2, 2]);
  assert.equal(semanasDaContagem(7), 4);
  assert.equal(totalDaContagem(7), 28);
  assert.equal(semanasDaContagem(8), 1);
  assert.equal(totalDaContagem(8), 8);
  assert.equal(totalDaContagem(0), 0);
}

function testSomaIgualAoTotal() {
  const amostras = [
    EXEMPLO,
    [20, 20, 20, 20, 10, 10],
    [100],
    [0, 0, 100],
    [1, 1, 1],
    [0, 0, 0],
  ];
  for (const total of [0, 1, 2, 3, 7, 8, 12, 14, 15, 37]) {
    for (const percentuais of amostras) {
      const resultado = distribuirEspacos(total, percentuais);
      assert.equal(resultado.length, percentuais.length);
      const soma = resultado.reduce((acc, valor) => acc + valor, 0);
      assert.equal(soma, total, `${total} :: ${percentuais.join('/')}`);
    }
  }
  assert.equal(distribuirEspacos(-4, [50, 50]).reduce((acc, valor) => acc + valor, 0), 0);
  assert.deepEqual(distribuirEspacos(5, []), []);
  assert.equal(percentuaisFechamEm100(EXEMPLO), true);
  assert.equal(percentuaisFechamEm100([20, 20, 20, 20, 10, 10]), true);
  assert.equal(percentuaisFechamEm100([30, 30, 30]), false);
  assert.equal(percentuaisFechamEm100([]), false);
}

function testSomaDosPilares() {
  assert.equal(somaEspacosSemana([
    { ativo: true, frequenciaSemanal: 3 },
    { ativo: true, frequenciaSemanal: 2 },
    { ativo: false, frequenciaSemanal: 9 },
    { ativo: true, frequenciaSemanal: null },
    { ativo: true, frequenciaSemanal: 0 },
  ]), 5);
}

testQuatorzeEspacos();
testGradePequena();
testSomaIgualAoTotal();
testSomaDosPilares();

console.log('distribuirEspacos tests passed');
