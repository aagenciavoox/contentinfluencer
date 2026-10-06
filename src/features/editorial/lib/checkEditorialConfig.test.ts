import assert from 'node:assert/strict';
import { checkEditorialConfig, excedentesDosPilares, formatarPeso, pesoSemanalSerie, type PilarConfig, type SerieConfig } from './checkEditorialConfig.ts';

const PILAR: PilarConfig = { id: 'pilar-1', nome: 'Literatura', ativo: true, frequenciaSemanal: 2 };

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

function testPesos() {
  assert.equal(pesoSemanalSerie('Semanal'), 1);
  assert.equal(pesoSemanalSerie('quinzenal'), 0.5);
  assert.equal(pesoSemanalSerie('Mensal'), 0.25);
  assert.equal(pesoSemanalSerie('Sob demanda'), 0);
  assert.equal(pesoSemanalSerie(null), 0);
}

function testDistribuicaoForaDe100() {
  const notas = checkEditorialConfig({
    pilares: [PILAR],
    series: [],
    settings: {
      redeReferenciaId: 'ig',
      distribuicaoFuncoes: { ...FECHADA, reter: 10 },
    },
    plataformas: [{ id: 'ig', ativo: true }],
  });
  assert.equal(notas.some(nota => nota.chave === 'distribuicao' && nota.mensagem.includes('110')), true);
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

function testSeriesAcimaDoPilar() {
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
  const nota = notas.find(item => item.chave === 'pilar-capacidade:pilar-1');
  assert.ok(nota);
  assert.match(nota.mensagem, /2,5 espaços por semana/);
  assert.match(nota.mensagem, /o pilar tem 2 espaços/);
}

function testSeriesCabemNoPilar() {
  const notas = checkEditorialConfig({
    pilares: [{ ...PILAR, frequenciaSemanal: 2 }],
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

function testFuncaoComEspacoSemSerie() {
  const notas = checkEditorialConfig({
    pilares: [{ id: 'pilar-1', nome: 'Literatura', ativo: true, frequenciaSemanal: 8 }],
    series: [
      serie({ id: 's1', funcaoPadrao: 'atrair' }),
      serie({ id: 'varia', funcaoPadrao: 'varia' }),
      serie({ id: 'inativa', funcaoPadrao: 'converter', ativa: false }),
    ],
    settings: { redeReferenciaId: 'ig', distribuicaoFuncoes: FECHADA },
    plataformas: [{ id: 'ig', ativo: true }],
  });
  const chaves = notas.map(nota => nota.chave);
  assert.equal(chaves.includes('funcao-sem-serie:atrair'), false);
  assert.equal(chaves.includes('funcao-sem-serie:converter'), true);
  assert.equal(chaves.includes('funcao-sem-serie:aprofundar'), true);
  assert.equal(chaves.includes('funcao-sem-serie:acao'), false);
  assert.match(
    notas.find(nota => nota.chave === 'funcao-sem-serie:converter')?.mensagem ?? '',
    /Converter em seguidor/,
  );
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
      { id: 'pilar-1', nome: 'Literatura', ativo: true, frequenciaSemanal: 1 },
      { id: 'pilar-2', nome: 'Bastidores', ativo: true, frequenciaSemanal: 1 },
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
  assert.equal(notas.some(nota => nota.chave === 'pilar-capacidade:pilar-2'), true);
}

function testExcedentesDosPilares() {
  assert.equal(formatarPeso(2.5), '2,5');
  assert.equal(formatarPeso(2), '2');
  const rows = excedentesDosPilares(
    [PILAR, { id: 'pilar-2', nome: 'Psicologia', ativo: true, frequenciaSemanal: 1 }],
    [
      serie({ id: 's1' }),
      serie({ id: 's2' }),
      serie({ id: 's3', frequenciaRecomendada: 'Quinzenal' }),
      serie({ id: 'cabe', pilarIds: ['pilar-2'], frequenciaRecomendada: 'Quinzenal' }),
    ],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.id, 'pilar-1');
  assert.equal(rows[0]?.ocupado, 2.5);
  assert.equal(rows[0]?.previsto, 2);
}

testPesos();
testDistribuicaoForaDe100();
testDistribuicaoVaziaNaoApontaSoma();
testSeriesAcimaDoPilar();
testSeriesCabemNoPilar();
testFuncaoComEspacoSemSerie();
testRedeDeReferencia();
testSerieContaNoPilarPrincipal();
testExcedentesDosPilares();

console.log('checkEditorialConfig tests passed');
