import assert from 'node:assert/strict';
import type {Pilar, Serie} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {periodoDoMes, saudeDoMes, seriesDoPilarNoMes} from './monthHealth.ts';
import type {PlanejamentoPostIt} from './postIt.ts';

const PERIODO = {inicio: '2026-10-01', fim: '2026-10-31'};
const PERCENTUAIS = {
  atrair: 100,
  converter: 0,
  aprofundar: 0,
  comunidade: 0,
  acao: 0,
  reter: 0,
};

const serie = {
  id: 'serie-1',
  name: 'Leituras',
  funcaoPadrao: 'atrair',
  pilarPrincipalId: 'pilar-1',
  pilarIds: ['pilar-1'],
} as Serie;

const pilar = {
  id: 'pilar-1',
  nome: 'Literatura',
  ativo: true,
  frequenciaSemanal: 2,
  cor: '#336699',
} as Pilar;

function postIt(partial: Partial<PlanejamentoPostIt> & Pick<PlanejamentoPostIt, 'id'>): PlanejamentoPostIt {
  return {
    userId: '',
    texto: '',
    date: '2026-10-12',
    contentId: null,
    createdAt: '2026-10-04T12:00:00.000Z',
    updatedAt: '2026-10-04T12:00:00.000Z',
    ...partial,
  };
}

function saude(input: {
  postIts?: PlanejamentoPostIt[];
  contents?: ReturnType<typeof createContentDraft>[];
}) {
  return saudeDoMes({
    postIts: input.postIts ?? [],
    contents: input.contents ?? [],
    series: [serie],
    pilares: [pilar],
    settings: {redeReferenciaId: null, distribuicaoFuncoes: PERCENTUAIS},
    periodo: PERIODO,
  });
}

function testPeriodoDoMes() {
  const periodo = periodoDoMes(new Date(2026, 9, 15));
  assert.equal(periodo.inicio, '2026-10-01');
  assert.equal(periodo.fim, '2026-10-31');
}

function testPostItHerdadoContaNoPilarENaFuncao() {
  const content = createContentDraft({
    id: 'ideia-1',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: null,
  }, serie);
  const counts = saude({
    postIts: [postIt({id: 'post-1', contentId: content.id})],
    contents: [content],
  });
  assert.equal(counts.pilares[0]?.planejado, 1);
  assert.equal(counts.pilares[0]?.meta, 10);
  assert.equal(counts.funcoes.find(linha => linha.id === 'atrair')?.planejado, 1);
}

function testPostItVazioNaoConta() {
  const counts = saude({
    postIts: [postIt({id: 'vazio', contentId: null, texto: 'nota'})],
  });
  assert.equal(counts.somaPlanejado, 0);
}

function testDataOficialContaQuandoNaoHaPostIt() {
  const content = createContentDraft({
    id: 'roteiro-1',
    status: CONTENT_STATUS.ROTEIRO,
    seriesId: serie.id,
    publishDate: '2026-10-08',
  }, serie);
  const counts = saude({contents: [content]});
  assert.equal(counts.pilares[0]?.planejado, 1);
}

function testPostItNaoDuplicaOOriginalNoMesmoMes() {
  const content = createContentDraft({
    id: 'roteiro-2',
    status: CONTENT_STATUS.ROTEIRO,
    seriesId: serie.id,
    publishDate: '2026-10-03',
  }, serie);
  const counts = saude({
    postIts: [postIt({id: 'post-2', contentId: content.id, date: '2026-10-20'})],
    contents: [content],
  });
  assert.equal(counts.pilares[0]?.planejado, 1);
}

function testPostItForaDoMesNaoConta() {
  const content = createContentDraft({
    id: 'ideia-2',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: null,
  }, serie);
  const counts = saude({
    postIts: [postIt({id: 'post-3', contentId: content.id, date: '2026-11-02'})],
    contents: [content],
  });
  assert.equal(counts.somaPlanejado, 0);
}

function testSeriesDoPilarMostraQuantidadeEZero() {
  const outra = {
    id: 'serie-2',
    name: 'Bastidores',
    funcaoPadrao: 'atrair',
    pilarPrincipalId: 'pilar-2',
    pilarIds: ['pilar-2'],
    cor: '#112233',
  } as Serie;
  const vazia = {
    id: 'serie-3',
    name: 'Arquivo',
    funcaoPadrao: null,
    pilarPrincipalId: 'pilar-1',
    pilarIds: ['pilar-1'],
    cor: '#445566',
  } as Serie;
  const content = createContentDraft({
    id: 'ideia-serie',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: null,
  }, serie);
  const segundo = createContentDraft({
    id: 'ideia-serie-b',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serie.id,
    publishDate: null,
  }, serie);
  const counts = saude({
    postIts: [
      postIt({id: 'post-a', contentId: content.id}),
      postIt({id: 'post-b', contentId: segundo.id, date: '2026-10-18'}),
    ],
    contents: [content, segundo],
  });
  const linhas = seriesDoPilarNoMes('pilar-1', [serie, outra, vazia], counts.entries);
  assert.deepEqual(linhas.map(linha => [linha.nome, linha.quantidade]), [
    ['Leituras', 2],
    ['Arquivo', 0],
  ]);
}

testPeriodoDoMes();
testPostItHerdadoContaNoPilarENaFuncao();
testPostItVazioNaoConta();
testDataOficialContaQuandoNaoHaPostIt();
testPostItNaoDuplicaOOriginalNoMesmoMes();
testPostItForaDoMesNaoConta();
testSeriesDoPilarMostraQuantidadeEZero();
