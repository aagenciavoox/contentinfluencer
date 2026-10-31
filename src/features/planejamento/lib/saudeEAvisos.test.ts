import assert from 'node:assert/strict';
import type {Serie} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {computeSerieMetrics} from '../../recommendations/computeSerieMetrics.ts';
import {DEFAULT_EDITORIAL_SETTINGS} from '../../editorial/lib/editorialSettings.ts';
import {preparoDoPeriodo, saudeDoMes} from './monthHealth.ts';
import {avisosDeOrientacao} from './orientacaoEditorial.ts';
import type {PlanejamentoPostIt} from './postIt.ts';

const HOJE = new Date(2026, 9, 30, 12);
const PERIODO = {inicio: '2026-10-25', fim: '2026-11-07'};

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

function avisos(input: Partial<Parameters<typeof avisosDeOrientacao>[0]>) {
  return avisosDeOrientacao({
    postIts: [],
    contents: [],
    series: [],
    temas: [],
    obras: [],
    periodo: PERIODO,
    hoje: HOJE,
    ...input,
  });
}

function testVesperaEmRoteiro() {
  const roteiro = createContentDraft({id: 'r1', title: 'Cosmere sem TCC', status: CONTENT_STATUS.ROTEIRO});
  const lista = avisos({
    postIts: [postIt({id: 'p1', date: '2026-10-31', contentId: 'r1'})],
    contents: [roteiro],
  });
  const aviso = lista.find(item => item.tipo === 'vespera-sem-pronto');
  assert.ok(aviso);
  assert.equal(aviso.texto, 'A publicação de amanhã (Cosmere sem TCC) ainda está em roteiro.');
  assert.deepEqual(aviso.postItIds, ['p1']);
}

function testVesperaProntaNaoAvisa() {
  const pronto = createContentDraft({
    id: 'r1',
    status: CONTENT_STATUS.EDICAO,
    edicaoConcluidaEm: '2026-10-29T12:00:00.000Z',
  });
  const lista = avisos({
    postIts: [postIt({id: 'p1', date: '2026-10-31', contentId: 'r1'})],
    contents: [pronto],
  });
  assert.equal(lista.some(item => item.tipo === 'vespera-sem-pronto'), false);
}

function testReservaDeHoje() {
  const lista = avisos({postIts: [postIt({id: 'p1', date: '2026-10-30'})]});
  assert.equal(lista.find(item => item.tipo === 'vespera-sem-pronto')?.texto, 'A publicação de hoje ainda é só um post-it.');
}

function testGravacoesAcimaDoLimite() {
  const contents = ['a', 'b', 'c', 'd'].map(id => createContentDraft({
    id,
    status: CONTENT_STATUS.PRODUCAO,
    recordingDate: '2026-11-03',
  }));
  const lista = avisos({contents, limiteGravacoesDia: 2});
  const aviso = lista.find(item => item.tipo === 'gravacoes-no-dia');
  assert.ok(aviso);
  assert.equal(aviso.texto, 'Há 4 gravações previstas para 3 de novembro, um dia com limite de 2.');
  assert.equal(avisos({contents, limiteGravacoesDia: null}).some(item => item.tipo === 'gravacoes-no-dia'), false);
  assert.equal(avisos({contents, limiteGravacoesDia: 4}).some(item => item.tipo === 'gravacoes-no-dia'), false);
}

function testFaltaReservarEpisodio() {
  const serie = {
    id: 'desc',
    name: 'Descomplicando',
    frequenciaRecomendada: 'Semanal',
    frequenciaVezes: 1,
    frequenciaUnidade: 'semana',
  } as Serie;
  const aviso = avisos({series: [serie]}).find(item => item.tipo === 'serie-abaixo');
  assert.equal(aviso?.texto, 'Faltam reservar 2 episódios de Descomplicando neste período.');
}

function testPreparoSeparaDePreenchimento() {
  const contents = [
    createContentDraft({id: 'pub', status: CONTENT_STATUS.POSTADO}),
    createContentDraft({id: 'pronto', status: CONTENT_STATUS.EDICAO, edicaoConcluidaEm: '2026-10-29T12:00:00.000Z'}),
    createContentDraft({id: 'edit', status: CONTENT_STATUS.EDICAO}),
  ];
  const preparo = preparoDoPeriodo([
    {contentId: 'pub', etapa: 'postado'},
    {contentId: 'pronto', etapa: 'edicao'},
    {contentId: 'edit', etapa: 'edicao'},
    {contentId: 'r', etapa: 'roteiro'},
    {contentId: 'g', etapa: 'producao'},
    {contentId: 'p', etapa: 'planejamento', postItId: 'p'},
  ], contents);
  assert.deepEqual(preparo, {total: 6, publicadas: 1, prontas: 1, escrita: 2, gravacao: 1, edicao: 1});
}

function testReservaClassificadaContaNoObjetivo() {
  const saude = saudeDoMes({
    postIts: [postIt({id: 'p1', date: '2026-11-03', objetivo: 'atrair'})],
    contents: [],
    series: [],
    pilares: [],
    settings: {...DEFAULT_EDITORIAL_SETTINGS, preferencias: {...DEFAULT_EDITORIAL_SETTINGS.preferencias, limiteSemanal: 7}},
    periodo: {inicio: '2026-11-01', fim: '2026-11-07'},
  });
  assert.equal(saude.semObjetivoPorEtapa.planejamento, 0);
  assert.equal(saude.objetivos.find(linha => linha.id === 'atrair')?.previsto, 1);
}

function testSerieSomaOsQuadros() {
  const familia = {id: 'desc', parentId: null, ativa: true} as Serie;
  const quadro = {id: 'cosmere', parentId: 'desc', ativa: true} as Serie;
  const contents = [
    createContentDraft({id: 'e1', seriesId: 'desc', status: CONTENT_STATUS.ROTEIRO}),
    createContentDraft({
      id: 'e2',
      seriesId: 'cosmere',
      status: CONTENT_STATUS.ROTEIRO,
      plataformas: [
        {id: 'a', contentId: 'e2', platformId: 'ig', legenda: '', hashtags: '', publishDate: null, status: 'publicada'},
        {id: 'b', contentId: 'e2', platformId: 'tt', legenda: '', hashtags: '', publishDate: null, status: 'prevista'},
      ],
    }),
  ];
  const metricas = computeSerieMetrics(familia, contents, HOJE, [familia, quadro]);
  assert.equal(metricas.episodios, 2);
  assert.equal(metricas.publicacoesRealizadas, 1);
  assert.equal(metricas.publicacoesPrevistas, 1);
  assert.equal(computeSerieMetrics(familia, contents, HOJE).episodios, 1);
}

const tests = [
  ['warns when tomorrow is still a roteiro', testVesperaEmRoteiro],
  ['ready publication does not warn', testVesperaProntaNaoAvisa],
  ['a reserva for today warns', testReservaDeHoje],
  ['warns when a day has more recordings than the limit', testGravacoesAcimaDoLimite],
  ['series below frequency asks to reserve episodes', testFaltaReservarEpisodio],
  ['preparation is separate from filling', testPreparoSeparaDePreenchimento],
  ['a classified reserva counts in its objective', testReservaClassificadaContaNoObjetivo],
  ['series metrics include the quadros once', testSerieSomaOsQuadros],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
