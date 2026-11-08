import assert from 'node:assert/strict';
import { frequenciaParaGravar, linhasDaOnda, ondaDasLinhas } from './metaDaOnda.ts';

const vazia = frequenciaParaGravar({ vezes: null, unidade: 'semana', aPartirDe: '2026-11-01', tipo: 'serie' });
assert.ok(!('erro' in vazia));
if (!('erro' in vazia)) {
  assert.equal(vazia.vezes, null);
  assert.equal(vazia.recomendada, null);
}

const quadro = frequenciaParaGravar({ vezes: null, unidade: 'semana', aPartirDe: null, tipo: 'quadro' });
assert.ok(!('erro' in quadro) && quadro.recomendada === 'Sob demanda');

const quinzena = frequenciaParaGravar({ vezes: 1, unidade: 'quinzena', aPartirDe: null, tipo: 'temporada' });
assert.ok('erro' in quinzena);

const trimestre = frequenciaParaGravar({ vezes: 1, unidade: 'trimestre', aPartirDe: null, tipo: 'serie' });
assert.ok(!('erro' in trimestre) && trimestre.recomendada === 'Trimestral');

const acima = frequenciaParaGravar({ vezes: 99, unidade: 'semana', aPartirDe: null, tipo: 'serie' });
assert.ok('erro' in acima && acima.campo === 'quantidade');
assert.match(acima && 'erro' in acima ? acima.erro : '', /60/);

const zero = frequenciaParaGravar({ vezes: 0, unidade: 'semana', aPartirDe: null, tipo: 'serie' });
assert.ok('erro' in zero && zero.campo === 'quantidade');

const ok = frequenciaParaGravar({ vezes: 2, unidade: 'semana', aPartirDe: '2026-11-04', tipo: 'serie' });
assert.ok(!('erro' in ok));
if (!('erro' in ok)) {
  assert.equal(ok.vezes, 2);
  assert.equal(ok.unidade, 'semana');
  assert.equal(ok.aPartirDe, '2026-11-04');
  assert.equal(ok.recomendada, '2 por semana');
}

// --- Janela e regras da wave: gravadas no acompanhamento e lidas de volta.
{
  const { acompanhamento } = linhasDaOnda({
    id: 't1', userId: 'u', serieId: 's', acompanhar: true,
    acompanhamentoInicio: '2026-11-01', acompanhamentoTermino: '', distanciaMaxDias: 6.7, evitarDiasSeguidos: true,
  });
  assert.equal(acompanhamento?.inicio, '2026-11-01');
  assert.equal(acompanhamento?.termino, null);
  assert.equal(acompanhamento?.distancia_max_dias, 6);
  assert.equal(acompanhamento?.evitar_dias_seguidos, true);
  const lida = ondaDasLinhas('t1', [acompanhamento!], []);
  assert.equal(lida.inicio, '2026-11-01');
  assert.equal(lida.termino, null);
  assert.equal(lida.distanciaMaxDias, 6);
  assert.equal(lida.evitarDiasSeguidos, true);
}

console.log('metaDaOnda: ok');
