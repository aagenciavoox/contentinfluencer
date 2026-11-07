import assert from 'node:assert/strict';
import { comStatus, podeSerRascunho, roteirosPorSemana, statusDaSerie, textoDaAtivacao } from './statusSerie.ts';

// status deduzido do ativa no banco antigo
{
  assert.equal(statusDaSerie({ ativa: false }), 'arquivada');
  assert.equal(statusDaSerie({ ativa: true }), 'ativa');
  assert.equal(statusDaSerie({ ativa: false, status: 'rascunho' }), 'rascunho');
}

// comStatus mantém ativa coerente
{
  assert.equal(comStatus({ ativa: true }, 'rascunho').ativa, false);
  assert.equal(comStatus({ ativa: false }, 'ativa').ativa, true);
  assert.equal(comStatus({ ativa: true }, 'arquivada').ativa, false);
}

// quadro não fica em rascunho
{
  assert.equal(podeSerRascunho({ tipoAgrupamento: 'quadro', parentId: 'x' }), false);
  assert.equal(podeSerRascunho({ tipoAgrupamento: 'serie', parentId: null }), true);
  assert.equal(podeSerRascunho({ tipoAgrupamento: null, parentId: 'x' }), false);
}

// roteiros por semana a partir da meta
{
  assert.equal(roteirosPorSemana({ frequenciaVezes: 3, frequenciaUnidade: 'semana' }), 3);
  assert.equal(roteirosPorSemana({ frequenciaVezes: 2, frequenciaUnidade: 'quinzena' }), 1);
  assert.equal(roteirosPorSemana({ frequenciaVezes: 3, frequenciaUnidade: 'trimestre' }), 0.2);
  assert.equal(roteirosPorSemana({ frequenciaVezes: null, frequenciaUnidade: null }), null);
}

// aviso de ativação
{
  assert.equal(textoDaAtivacao({ name: 'Descomplicando', frequenciaVezes: 2, frequenciaUnidade: 'semana' }),
    'Descomplicando vai pedir 2 roteiros por semana neste mês.');
  assert.match(textoDaAtivacao({ name: 'Natal', frequenciaVezes: null, frequenciaUnidade: null }), /sem ritmo/);
}
