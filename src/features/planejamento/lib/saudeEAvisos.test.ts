import assert from 'node:assert/strict';
import type {Serie} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {computeSerieMetrics} from '../../recommendations/computeSerieMetrics.ts';
import {DEFAULT_EDITORIAL_SETTINGS} from '../../editorial/lib/editorialSettings.ts';
import {preparoDoPeriodo, saudeDoMes} from './monthHealth.ts';
import {avisosDeOrientacao, janelaDosProximosDias, semanaCorrente} from './orientacaoEditorial.ts';
import {abreAnaliseAoLocalizar} from './detalheDoAviso.ts';
import {continuidadeDasSeries, janelaDaContinuidade} from './saudeIndicadores.ts';
import type {PlanejamentoPostIt} from './postIt.ts';

const HOJE = new Date(2026, 9, 30, 12);
const PERIODO = {inicio: '2026-10-26', fim: '2026-11-08'};

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
  const roteiro = createContentDraft({
    id: 'r1',
    title: 'Cosmere sem TCC',
    status: CONTENT_STATUS.ROTEIRO,
    publishDate: '2026-10-31',
  });
  const lista = avisos({
    postIts: [postIt({id: 'p1', date: '2026-10-31', contentId: 'r1'})],
    contents: [roteiro],
    antecedenciaPostagemDias: 1,
  });
  const aviso = lista.find(item => item.tipo === 'vespera-sem-pronto');
  assert.ok(aviso);
  assert.match(aviso.texto, /Cosmere sem TCC/);
  assert.deepEqual(aviso.postItIds, ['p1']);
  assert.deepEqual(aviso.contentIds, ['r1']);
}

function testVesperaProntaNaoAvisa() {
  const pronto = createContentDraft({
    id: 'r1',
    status: CONTENT_STATUS.EDICAO,
    edicaoConcluidaEm: '2026-10-29T12:00:00.000Z',
    publishDate: '2026-10-31',
    legendaBase: 'Legenda pronta',
  });
  const lista = avisos({
    postIts: [postIt({id: 'p1', date: '2026-10-31', contentId: 'r1'})],
    contents: [pronto],
    antecedenciaPostagemDias: 1,
  });
  assert.equal(lista.some(item => item.tipo === 'vespera-sem-pronto'), false);
}

function testReservaDeHoje() {
  const lista = avisos({
    postIts: [postIt({id: 'p1', date: '2026-10-30'})],
    antecedenciaPostagemDias: 1,
  });
  assert.equal(lista.some(item => item.tipo === 'vespera-sem-pronto'), false);
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
    acompanharContinuidade: true,
  } as Serie;
  const aviso = avisos({series: [serie]}).find(item => item.tipo === 'serie-abaixo');
  assert.equal(aviso?.texto, 'Mais 2 episódios de Descomplicando pra fechar o período.');
  // Sem acompanhamento, a mesma série não é cobrada.
  assert.equal(avisos({series: [{...serie, acompanharContinuidade: false}]}).some(item => item.tipo === 'serie-abaixo'), false);
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
    // Antes do dia do post-it: ainda não é reserva pendente.
    hoje: '2026-11-01',
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

function serieAcompanhada(id: string, name: string, vezes: number, unidade = 'semana'): Serie {
  return {id, name, frequenciaVezes: vezes, frequenciaUnidade: unidade, acompanharContinuidade: true} as Serie;
}

function continuidadeNo(trecho: {inicio: string; fim: string}, series: Serie[], postIts: PlanejamentoPostIt[] = []) {
  const itens = saudeDoMes({
    postIts,
    contents: [],
    series,
    pilares: [],
    settings: DEFAULT_EDITORIAL_SETTINGS,
    periodo: janelaDaContinuidade(trecho),
    hoje: '2026-10-30',
  }).itens;
  return continuidadeDasSeries({series, itens, periodo: trecho, hoje: '2026-10-30'});
}

function testCapacidadeDaSemana() {
  // Regra de ouro: cada série pede no máximo 1 por semana; 5 séries pedem 5.
  const series = ['a', 'b', 'c', 'd', 'e'].map(id => serieAcompanhada(id, `Série ${id}`, 1));
  const semana = continuidadeNo(semanaCorrente(HOJE), series);
  // Ritmo gravado acima de 1 por semana não aumenta o pedido da semana.
  const acima = [serieAcompanhada('a', 'Descomplicando', 3), serieAcompanhada('b', 'Cosmere', 2)];
  assert.equal(avisos({series: acima, continuidadeDaSemana: continuidadeNo(semanaCorrente(HOJE), acima), diasGravacao: [2], limiteGravacoesDia: 2}).some(item => item.tipo === 'capacidade-semana'), false);
  assert.deepEqual(semanaCorrente(HOJE), {inicio: '2026-10-26', fim: '2026-11-01'});
  const lista = avisos({series, continuidadeDaSemana: semana, diasGravacao: [2, 4], limiteGravacoesDia: 2});
  const aviso = lista.find(item => item.tipo === 'capacidade-semana');
  assert.equal(aviso?.texto, 'Esta semana pede 5 roteiros e cabem 4 gravações (2 dias × 2).');
  assert.equal(aviso?.severidade, 'revisar');
  assert.deepEqual(aviso?.intervalo, {inicio: '2026-10-26', fim: '2026-11-01'});
  assert.equal(aviso && abreAnaliseAoLocalizar(aviso), true);
  // Sem limite ou sem dias de gravação não há conta: nada de inventar zero.
  assert.equal(avisos({series, continuidadeDaSemana: semana, diasGravacao: [2, 4], limiteGravacoesDia: null}).some(item => item.tipo === 'capacidade-semana'), false);
  assert.equal(avisos({series, continuidadeDaSemana: semana, diasGravacao: [], limiteGravacoesDia: 2}).some(item => item.tipo === 'capacidade-semana'), false);
  // Cabe tudo: sem aviso.
  assert.equal(avisos({series, continuidadeDaSemana: semana, diasGravacao: [2, 4, 5], limiteGravacoesDia: 2}).some(item => item.tipo === 'capacidade-semana'), false);
  // Sem continuidade (Editorial), o aviso nem é montado.
  assert.equal(avisos({series, diasGravacao: [2], limiteGravacoesDia: 1}).some(item => item.tipo === 'capacidade-semana'), false);
}

function testCapacidadeConverteMetaMensal() {
  // 4 por mês vira 4 ÷ (30/7) por semana, como no Ajustes; com 4 séries semanais passa de 4.
  const series = [...['a', 'b', 'c', 'd'].map(id => serieAcompanhada(id, `Série ${id}`, 1)), serieAcompanhada('m', 'Mensal', 4, 'mes')];
  const semana = continuidadeNo(semanaCorrente(HOJE), series);
  const aviso = avisos({series, continuidadeDaSemana: semana, diasGravacao: [2, 4], limiteGravacoesDia: 2}).find(item => item.tipo === 'capacidade-semana');
  assert.ok(aviso);
  assert.match(aviso.texto, /^Esta semana pede 4,9 roteiros e cabem 4 gravações/);
}

function testAusenciaNosProximosDias() {
  const series = [serieAcompanhada('a', 'Descomplicando', 1), serieAcompanhada('b', 'Cosmere', 1)];
  const janela = janelaDosProximosDias(HOJE);
  assert.deepEqual(janela, {inicio: '2026-10-30', fim: '2026-11-10'});
  const proxima = continuidadeNo(janela, series, [postIt({id: 'p1', date: '2026-11-04', serieId: 'a'})]);
  const lista = avisos({series, continuidadeProxima: proxima}).filter(item => item.tipo === 'ausencia-12-dias');
  assert.deepEqual(lista.map(item => item.texto), ['Cosmere não aparece nos próximos 12 dias.']);
  assert.equal(lista[0].severidade, 'info');
  assert.equal(lista[0].intervalo?.inicio, '2026-10-30');
  assert.equal(abreAnaliseAoLocalizar(lista[0]), true);
}

function testAusenciaNoFimDoMes() {
  const series = [serieAcompanhada('a', 'Descomplicando', 1), serieAcompanhada('b', 'Cosmere', 1)];
  const outubro = {inicio: '2026-10-01', fim: '2026-10-31'};
  // Post-it sem roteiro no dia de hoje (30/10): ainda conta. Num dia já passado seria reserva pendente.
  const doMes = continuidadeNo(outubro, series, [postIt({id: 'p1', date: '2026-10-30', serieId: 'a'})]);
  const ausencias = (hoje: Date) => avisos({series, continuidadeDoMes: doMes, mesDaVista: outubro, hoje}).filter(item => item.tipo === 'ausencia-mes');
  assert.deepEqual(ausencias(HOJE).map(item => item.texto), ['Cosmere ainda não apareceu em outubro.']);
  assert.equal(ausencias(HOJE)[0].severidade, 'info');
  assert.equal(ausencias(HOJE)[0].intervalo?.inicio, '2026-10-01');
  // Antes da última semana do mês, ainda não.
  assert.equal(ausencias(new Date(2026, 9, 20, 12)).length, 0);
  assert.equal(ausencias(new Date(2026, 9, 24, 12)).length, 1);
  // Mês já encerrado também avisa.
  assert.deepEqual(ausencias(new Date(2026, 10, 5, 12)).map(item => item.texto), ['Cosmere não apareceu em outubro.']);
}

const tests = [
  ['warns when tomorrow is still a roteiro', testVesperaEmRoteiro],
  ['ready publication does not warn', testVesperaProntaNaoAvisa],
  ['a loose post-it alone does not warn', testReservaDeHoje],
  ['warns when a day has more recordings than the limit', testGravacoesAcimaDoLimite],
  ['series below frequency asks to reserve episodes', testFaltaReservarEpisodio],
  ['preparation is separate from filling', testPreparoSeparaDePreenchimento],
  ['a classified reserva counts in its objective', testReservaClassificadaContaNoObjetivo],
  ['series metrics include the quadros once', testSerieSomaOsQuadros],
  ['current week asks more than recording capacity', testCapacidadeDaSemana],
  ['monthly goals convert to a weekly rhythm', testCapacidadeConverteMetaMensal],
  ['tracked series absent in the next 12 days', testAusenciaNosProximosDias],
  ['tracked series absent in the month near its end', testAusenciaNoFimDoMes],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
