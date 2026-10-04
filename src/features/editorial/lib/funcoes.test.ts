import assert from 'node:assert/strict';
import type { FuncaoEditorial, FuncaoOrigem } from '../../../lib/database.ts';
import {
  FUNCAO_LABELS,
  FUNCOES,
  FUNIL_DA_FUNCAO,
  contaNaGradePadrao,
  resolveFuncao,
  rotuloEtapaDaFuncao,
  rotuloFuncaoPadrao,
} from './funcoes.ts';

function testMapaCobreAsSeisFuncoes() {
  assert.deepEqual(FUNCOES, ['atrair', 'converter', 'aprofundar', 'comunidade', 'acao', 'reter']);
  for (const funcao of FUNCOES) {
    assert.equal(typeof FUNCAO_LABELS[funcao], 'string');
    assert.ok(FUNCAO_LABELS[funcao].length > 0);
  }

  const etapas: Record<FuncaoEditorial, 'topo' | 'meio' | 'fundo' | null> = {
    atrair: 'topo',
    converter: 'topo',
    aprofundar: 'meio',
    comunidade: 'meio',
    acao: 'fundo',
    reter: null,
  };
  assert.deepEqual(FUNIL_DA_FUNCAO, etapas);
  assert.equal(rotuloEtapaDaFuncao('atrair'), 'Topo');
  assert.equal(rotuloEtapaDaFuncao('acao'), 'Fundo');
  assert.equal(rotuloEtapaDaFuncao('reter'), 'Fora');
  assert.equal(rotuloFuncaoPadrao('varia'), 'Varia por conteúdo');
  assert.equal(rotuloFuncaoPadrao(null), null);
}

function testSeisEstados() {
  const serie = { funcaoPadrao: 'converter' as const };
  const casos: Array<{
    origem: FuncaoOrigem | null;
    funcao: FuncaoEditorial | null;
    estado: string;
    resolvida: FuncaoEditorial | null;
  }> = [
    { origem: 'herdada', funcao: null, estado: 'herdada', resolvida: 'converter' },
    { origem: 'escolhida', funcao: 'atrair', estado: 'escolhida', resolvida: 'atrair' },
    { origem: 'nenhuma', funcao: null, estado: 'nenhuma', resolvida: null },
    { origem: null, funcao: null, estado: 'indefinida', resolvida: null },
    { origem: 'aplicada', funcao: 'acao', estado: 'aplicada', resolvida: 'acao' },
    { origem: 'migrada', funcao: 'reter', estado: 'migrada', resolvida: 'reter' },
  ];

  for (const caso of casos) {
    const resolved = resolveFuncao(
      { funcao: caso.funcao, funcaoOrigem: caso.origem, classificacaoCongeladaEm: null },
      serie,
    );
    assert.equal(resolved.estado, caso.estado, caso.estado);
    assert.equal(resolved.funcao, caso.resolvida, caso.estado);
    assert.equal(resolved.congelada, false);
  }
}

function testCongeladaNaoAcompanhaASerie() {
  const serieAtual = { funcaoPadrao: 'comunidade' as const };
  const herdada = resolveFuncao(
    { funcao: null, funcaoOrigem: 'herdada', classificacaoCongeladaEm: null },
    serieAtual,
  );
  assert.equal(herdada.funcao, 'comunidade');
  assert.equal(herdada.congelada, false);

  const congelada = resolveFuncao(
    {
      funcao: 'converter',
      funcaoOrigem: 'herdada',
      classificacaoCongeladaEm: '2026-10-04T12:00:00.000Z',
    },
    serieAtual,
  );
  assert.equal(congelada.funcao, 'converter');
  assert.equal(congelada.estado, 'herdada');
  assert.equal(congelada.congelada, true);
}

function testContaNaGradePadrao() {
  assert.equal(contaNaGradePadrao('Reels', 'atrair'), true);
  assert.equal(contaNaGradePadrao('Stories', 'atrair'), false);
  assert.equal(contaNaGradePadrao('Live', 'converter'), false);
  assert.equal(contaNaGradePadrao('Reels', 'reter'), false);
  assert.equal(contaNaGradePadrao(null, null), true);
}

testMapaCobreAsSeisFuncoes();
testSeisEstados();
testCongeladaNaoAcompanhaASerie();
testContaNaGradePadrao();

console.log('funcoes tests passed');
