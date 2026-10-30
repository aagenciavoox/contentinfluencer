import assert from 'node:assert/strict';
import type {BibliotecaItem, Serie, Tema} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {avisosDeOrientacao} from './orientacaoEditorial.ts';
import type {PlanejamentoPostIt} from './postIt.ts';
import {periodoDaSemana} from './periodoPlanejamento.ts';

const serieA = {
  id: 'serie-a',
  name: 'Descomplicando',
  frequenciaRecomendada: 'Semanal',
  frequenciaVezes: 1,
  frequenciaUnidade: 'semana',
} as Serie;

const serieB = {
  id: 'serie-b',
  name: 'Outra',
  frequenciaRecomendada: 'sob demanda',
} as Serie;

const temaHalloween = {id: 'tema-1', nome: 'Halloween', userId: '', createdAt: ''} as Tema;
const obraSanderson = {id: 'obra-1', titulo: 'Sanderson'} as Pick<BibliotecaItem, 'id' | 'titulo'>;

function postIt(partial: Partial<PlanejamentoPostIt> & Pick<PlanejamentoPostIt, 'id' | 'date'>): PlanejamentoPostIt {
  return {
    userId: '',
    texto: '',
    contentId: null,
    createdAt: '2026-10-04T12:00:00.000Z',
    updatedAt: '2026-10-04T12:00:00.000Z',
    ...partial,
  };
}

function testObraApareceDuasVezesNaSemana() {
  const c1 = createContentDraft({
    id: 'c1',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serieA.id,
    bibliotecaItemId: obraSanderson.id,
  }, serieA);
  const c2 = createContentDraft({
    id: 'c2',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serieB.id,
    bibliotecaItemId: obraSanderson.id,
  }, serieB);
  const periodo = {inicio: '2026-11-01', fim: '2026-11-07'};
  const avisos = avisosDeOrientacao({
    postIts: [
      postIt({id: 'p1', date: '2026-11-02', contentId: c1.id}),
      postIt({id: 'p2', date: '2026-11-05', contentId: c2.id}),
    ],
    contents: [c1, c2],
    series: [serieA, serieB],
    temas: [],
    obras: [obraSanderson],
    periodo,
  });
  const obra = avisos.find(aviso => aviso.tipo === 'obra-repetida');
  assert.ok(obra);
  assert.match(obra!.texto, /2 pautas da mesma obra: Sanderson/);
  assert.deepEqual(obra!.postItIds.sort(), ['p1', 'p2']);
  assert.equal(obra!.severidade, 'info');
  assert.deepEqual(obra!.intervalo, {inicio:'2026-11-02', fim:'2026-11-08'});
}

function testSequenciaIntencionalSuprimeObra() {
  const c1 = createContentDraft({
    id: 'c1',
    status: CONTENT_STATUS.IDEIA,
    bibliotecaItemId: obraSanderson.id,
  });
  const c2 = createContentDraft({
    id: 'c2',
    status: CONTENT_STATUS.IDEIA,
    bibliotecaItemId: obraSanderson.id,
  });
  const avisos = avisosDeOrientacao({
    postIts: [
      postIt({id: 'p1', date: '2026-11-02', contentId: c1.id}),
      postIt({id: 'p2', date: '2026-11-05', contentId: c2.id}),
    ],
    contents: [c1, c2],
    series: [],
    temas: [],
    obras: [obraSanderson],
    periodo: {inicio: '2026-11-01', fim: '2026-11-07'},
    sequenciaPorConteudo: {c1: 'seq-1', c2: 'seq-1'},
  });
  assert.equal(avisos.some(aviso => aviso.tipo === 'obra-repetida'), false);
}

function testTemaConcentrado() {
  const contents = [1, 2, 3].map(n => createContentDraft({
    id: `c${n}`,
    status: CONTENT_STATUS.IDEIA,
    temaIds: n < 3 ? [temaHalloween.id] : [],
  }));
  const avisos = avisosDeOrientacao({
    postIts: contents.map((content, index) => postIt({
      id: `p${index + 1}`,
      date: `2026-11-0${index + 2}`,
      contentId: content.id,
    })),
    contents,
    series: [],
    temas: [temaHalloween],
    obras: [],
    periodo: {inicio: '2026-11-01', fim: '2026-11-07'},
  });
  // 2 de 3 > 1/3
  assert.ok(avisos.some(aviso => aviso.tipo === 'tema-concentrado'));
}

function testQuadroEmDiasSeguidos() {
  const avisos = avisosDeOrientacao({
    postIts: [
      postIt({id: 'p1', date: '2026-11-03', serieId: serieA.id, texto: 'a'}),
      postIt({id: 'p2', date: '2026-11-04', serieId: serieA.id, texto: 'b'}),
    ],
    contents: [],
    series: [serieA],
    temas: [],
    obras: [],
    periodo: {inicio: '2026-11-01', fim: '2026-11-07'},
  });
  assert.ok(avisos.some(aviso => aviso.tipo === 'quadro-seguido'));
}

function testSerieAcimaDaFrequencia() {
  const contents = [1, 2].map(n => createContentDraft({
    id: `c${n}`,
    status: CONTENT_STATUS.IDEIA,
    seriesId: serieA.id,
  }, serieA));
  const avisos = avisosDeOrientacao({
    postIts: [
      postIt({id: 'p1', date: '2026-11-02', contentId: contents[0].id}),
      postIt({id: 'p2', date: '2026-11-05', contentId: contents[1].id}),
    ],
    contents,
    series: [serieA],
    temas: [],
    obras: [],
    periodo: {inicio: '2026-11-01', fim: '2026-11-07'},
  });
  assert.ok(avisos.some(aviso => aviso.tipo === 'serie-acima'));
}

function testSobDemandaNaoCobra() {
  const content = createContentDraft({
    id: 'c1',
    status: CONTENT_STATUS.IDEIA,
    seriesId: serieB.id,
  }, serieB);
  const avisos = avisosDeOrientacao({
    postIts: [postIt({id: 'p1', date: '2026-11-02', contentId: content.id})],
    contents: [content],
    series: [serieB],
    temas: [],
    obras: [],
    periodo: {inicio: '2026-11-01', fim: '2026-11-07'},
  });
  assert.equal(avisos.some(aviso => aviso.tipo === 'serie-acima' || aviso.tipo === 'serie-abaixo'), false);
}

function testPeriodoDaSemanaDomingoASabado() {
  const periodo = periodoDaSemana(new Date(2026, 10, 4)); // quarta 4 nov 2026
  assert.equal(periodo.inicio, '2026-11-01');
  assert.equal(periodo.fim, '2026-11-07');
}

function testPostItVinculadoNaoDuplicaObra() {
  const content = createContentDraft({
    id: 'c1',
    status: CONTENT_STATUS.IDEIA,
    bibliotecaItemId: obraSanderson.id,
    publishDate: '2026-11-02',
  });
  const avisos = avisosDeOrientacao({
    postIts: [postIt({id: 'p1', date: '2026-11-02', contentId: content.id})],
    contents: [content],
    series: [],
    temas: [],
    obras: [obraSanderson],
    periodo: {inicio: '2026-11-01', fim: '2026-11-07'},
  });
  assert.equal(avisos.some(aviso => aviso.tipo === 'obra-repetida'), false);
}

testObraApareceDuasVezesNaSemana();
testSequenciaIntencionalSuprimeObra();
testTemaConcentrado();
testQuadroEmDiasSeguidos();
testSerieAcimaDaFrequencia();
testSobDemandaNaoCobra();
testPeriodoDaSemanaDomingoASabado();
testPostItVinculadoNaoDuplicaObra();
