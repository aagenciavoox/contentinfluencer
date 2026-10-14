import assert from 'node:assert/strict';
import { expectativaNoIntervalo, lerFrequencia } from './frequenciaSerie.ts';

const SEMANA = { inicio: '2026-10-11', fim: '2026-10-17' };
const TRES_DIAS = { inicio: '2026-10-11', fim: '2026-10-13' };
const MES = { inicio: '2026-10-01', fim: '2026-10-31' };

function testSemanalNaSemanaCheia() {
  const freq = lerFrequencia({ frequenciaRecomendada: 'Semanal' });
  assert.deepEqual(freq, { vezes: 1, unidade: 'semana', aPartirDe: null });
  assert.equal(expectativaNoIntervalo(freq, SEMANA.inicio, SEMANA.fim), 1);
}

function testDuasPorSemanaNaSemanaCheia() {
  const freq = lerFrequencia({
    frequenciaRecomendada: 'Semanal',
    vezes: 2,
    unidade: 'semana',
  });
  assert.deepEqual(freq, { vezes: 2, unidade: 'semana', aPartirDe: null });
  assert.equal(expectativaNoIntervalo(freq, SEMANA.inicio, SEMANA.fim), 2);
}

function testMensalNumaSemanaDoMes() {
  const freq = lerFrequencia({ frequenciaRecomendada: 'Mensal' });
  assert.equal(expectativaNoIntervalo(freq, SEMANA.inicio, SEMANA.fim), 0);
}

function testMensalNoMesCheio() {
  const freq = lerFrequencia({ frequenciaRecomendada: 'Mensal' });
  assert.deepEqual(freq, { vezes: 1, unidade: 'mes', aPartirDe: null });
  assert.equal(expectativaNoIntervalo(freq, MES.inicio, MES.fim), 1);
}

function testSobDemandaNaoTemNumero() {
  const sobDemanda = lerFrequencia({ frequenciaRecomendada: 'Sob demanda' });
  const vazio = lerFrequencia({ frequenciaRecomendada: '  ' });
  assert.equal(sobDemanda.unidade, 'sob-demanda');
  assert.equal(vazio.unidade, 'sob-demanda');
  assert.equal(expectativaNoIntervalo(sobDemanda, MES.inicio, MES.fim), null);
  assert.equal(expectativaNoIntervalo(vazio, SEMANA.inicio, SEMANA.fim), null);
  assert.equal(expectativaNoIntervalo(lerFrequencia({}), SEMANA.inicio, SEMANA.fim), null);
}

function testAPartirDeDepoisDoPeriodo() {
  const freq = lerFrequencia({
    frequenciaRecomendada: 'Semanal',
    aPartirDe: '2026-10-18',
  });
  assert.equal(expectativaNoIntervalo(freq, SEMANA.inicio, SEMANA.fim), 0);
}

function testQuinzenalEm14Dias() {
  const freq = lerFrequencia({
    frequenciaRecomendada: 'Quinzenal',
    aPartirDe: '2026-10-11',
  });
  assert.deepEqual(freq, { vezes: 1, unidade: 'quinzena', aPartirDe: '2026-10-11' });
  assert.equal(expectativaNoIntervalo(freq, '2026-10-11', '2026-10-24'), 1);
  assert.equal(expectativaNoIntervalo(freq, '2026-10-11', '2026-10-23'), 0);
}

function testSemanaParcialArredondaPorSemana() {
  const uma = lerFrequencia({ frequenciaRecomendada: 'Semanal' });
  const duas = lerFrequencia({ vezes: 2, unidade: 'semana' });
  assert.equal(Math.round(1 * 3 / 7), 0);
  assert.equal(Math.round(2 * 3 / 7), 1);
  assert.equal(expectativaNoIntervalo(uma, TRES_DIAS.inicio, TRES_DIAS.fim), 0);
  assert.equal(expectativaNoIntervalo(duas, TRES_DIAS.inicio, TRES_DIAS.fim), 1);
}

function testAntesDaPartidaNaoConta() {
  const semanal = lerFrequencia({
    frequenciaRecomendada: 'Semanal',
    aPartirDe: '2026-10-11',
  });
  assert.equal(expectativaNoIntervalo(semanal, '2026-10-04', '2026-10-17'), 1);

  const mensal = lerFrequencia({
    frequenciaRecomendada: 'Mensal',
    aPartirDe: '2026-10-01',
  });
  assert.equal(expectativaNoIntervalo(mensal, '2026-09-01', '2026-10-31'), 1);
}

testSemanalNaSemanaCheia();
testDuasPorSemanaNaSemanaCheia();
testMensalNumaSemanaDoMes();
testMensalNoMesCheio();
testSobDemandaNaoTemNumero();
testAPartirDeDepoisDoPeriodo();
testQuinzenalEm14Dias();
testSemanaParcialArredondaPorSemana();
testAntesDaPartidaNaoConta();

console.log('frequenciaSerie tests passed');
