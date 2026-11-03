import assert from 'node:assert/strict';
import { checkEditorialConfig, type PilarConfig, type SerieConfig } from './checkEditorialConfig.ts';

const PILAR: PilarConfig = { id: 'pilar-1', nome: 'Literatura', ativo: true };

function serie(partial: Partial<SerieConfig> & Pick<SerieConfig, 'id'>): SerieConfig {
  return {
    name: partial.id,
    ativa: true,
    funcaoPadrao: null,
    frequenciaRecomendada: 'Semanal',
    pilarIds: ['pilar-1'],
    ...partial,
  };
}

const FECHADA = {
  atrair: 35,
  converter: 30,
  aprofundar: 20,
  comunidade: 15,
  acao: 0,
  reter: 0,
};

function testDistribuicaoForaDe100() {
  // Fase 4: só as 5 funções da grade entram na soma — Reter não conta aqui.
  const notas = checkEditorialConfig({
    pilares: [PILAR],
    series: [],
    settings: {
      redeReferenciaId: 'ig',
      distribuicaoFuncoes: { ...FECHADA, atrair: 45 },
    },
    plataformas: [{ id: 'ig', ativo: true }],
  });
  assert.equal(notas.some(nota => nota.chave === 'distribuicao' && nota.mensagem.includes('110')), true);
}

function testReterLegadoNaoGeraAvisoDeCapacidade() {
  const notas = checkEditorialConfig({
    pilares: [PILAR],
    series: [],
    settings: {
      redeReferenciaId: 'ig',
      distribuicaoFuncoes: { ...FECHADA, reter: 10 },
    },
    plataformas: [{ id: 'ig', ativo: true }],
  });
  assert.equal(notas.some(nota => nota.chave === 'distribuicao'), false);
  assert.equal(notas.some(nota => nota.chave === 'distribuicao-reter'), false);
}

function testDistribuicaoVaziaNaoApontaSoma() {
  const notas = checkEditorialConfig({
    pilares: [PILAR],
    series: [],
    settings: { redeReferenciaId: 'ig', distribuicaoFuncoes: null },
    plataformas: [{ id: 'ig', ativo: true }],
  });
  assert.equal(notas.some(nota => nota.chave === 'distribuicao'), false);
}

function testSeriesAcimaDoPilarNaoViraErroDeCapacidade() {
  const notas = checkEditorialConfig({
    pilares: [PILAR],
    series: [
      serie({ id: 's1', frequenciaRecomendada: 'Semanal' }),
      serie({ id: 's2', frequenciaRecomendada: 'Semanal' }),
      serie({ id: 's3', frequenciaRecomendada: 'Quinzenal' }),
      serie({ id: 'inativa', ativa: false, frequenciaRecomendada: 'Semanal' }),
      serie({ id: 'solta', frequenciaRecomendada: 'Sob demanda' }),
    ],
    settings: { redeReferenciaId: 'ig', distribuicaoFuncoes: null },
    plataformas: [{ id: 'ig', ativo: true }],
  });
  assert.equal(notas.some(item => item.chave.startsWith('pilar-capacidade')), false);
}

function testSeriesCabemNoPilar() {
  const notas = checkEditorialConfig({
    pilares: [{ ...PILAR }],
    series: [
      serie({ id: 'q1', frequenciaRecomendada: 'Quinzenal' }),
      serie({ id: 'q2', frequenciaRecomendada: 'Quinzenal' }),
      serie({ id: 'm1', frequenciaRecomendada: 'Mensal' }),
      serie({ id: 'm2', frequenciaRecomendada: 'Mensal' }),
    ],
    settings: { redeReferenciaId: 'ig', distribuicaoFuncoes: null },
    plataformas: [{ id: 'ig', ativo: true }],
  });
  assert.equal(notas.some(nota => nota.chave.startsWith('pilar-capacidade')), false);
}

function testFuncaoComEspacoSemSerieNaoViraErro() {
  const notas = checkEditorialConfig({
    pilares: [{ id: 'pilar-1', nome: 'Literatura', ativo: true }],
    series: [
      serie({ id: 's1', funcaoPadrao: 'atrair' }),
      serie({ id: 'varia', funcaoPadrao: 'varia' }),
      serie({ id: 'inativa', funcaoPadrao: 'converter', ativa: false }),
    ],
    settings: { redeReferenciaId: 'ig', distribuicaoFuncoes: FECHADA },
    plataformas: [{ id: 'ig', ativo: true }],
  });
  assert.equal(notas.some(nota => nota.chave.startsWith('funcao-sem-serie')), false);
  assert.equal(notas.some(nota => nota.chave.startsWith('pilar-capacidade')), false);
}

function testRedeDeReferencia() {
  const semRede = checkEditorialConfig({
    pilares: [],
    series: [],
    settings: { redeReferenciaId: null, distribuicaoFuncoes: null },
  });
  assert.equal(semRede.some(nota => nota.mensagem.includes('ainda não está escolhida')), true);

  const inativa = checkEditorialConfig({
    pilares: [],
    series: [],
    settings: { redeReferenciaId: 'ig', distribuicaoFuncoes: null },
    plataformas: [{ id: 'ig', ativo: false }],
  });
  assert.equal(inativa.some(nota => nota.mensagem.includes('não está entre as redes ativas')), true);

  const ok = checkEditorialConfig({
    pilares: [],
    series: [],
    settings: { redeReferenciaId: 'ig', distribuicaoFuncoes: null },
    plataformas: [{ id: 'ig', ativo: true }],
  });
  assert.equal(ok.some(nota => nota.chave === 'rede-referencia'), false);
}

function testSerieContaNoPilarPrincipal() {
  const notas = checkEditorialConfig({
    pilares: [
      { id: 'pilar-1', nome: 'Literatura', ativo: true },
      { id: 'pilar-2', nome: 'Bastidores', ativo: true },
    ],
    series: [
      serie({
        id: 's1',
        pilarPrincipalId: 'pilar-2',
        pilarIds: ['pilar-1', 'pilar-2'],
        frequenciaRecomendada: 'Semanal',
      }),
      serie({ id: 's2', pilarIds: ['pilar-2'], frequenciaRecomendada: 'Semanal' }),
    ],
    settings: { redeReferenciaId: 'ig', distribuicaoFuncoes: null },
    plataformas: [{ id: 'ig', ativo: true }],
  });
  assert.equal(notas.some(nota => nota.chave === 'pilar-capacidade:pilar-1'), false);
  assert.equal(notas.some(nota => nota.chave === 'pilar-capacidade:pilar-2'), false);
}

testDistribuicaoForaDe100();
testReterLegadoNaoGeraAvisoDeCapacidade();
testDistribuicaoVaziaNaoApontaSoma();
testSeriesAcimaDoPilarNaoViraErroDeCapacidade();
testSeriesCabemNoPilar();
testFuncaoComEspacoSemSerieNaoViraErro();
testRedeDeReferencia();
testSerieContaNoPilarPrincipal();

console.log('checkEditorialConfig tests passed');
