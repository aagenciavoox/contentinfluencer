import assert from 'node:assert/strict';
import type {BibliotecaItem, Serie, Tema} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {LIMITES_CONCENTRACAO_PADRAO, excecaoCobre} from '../../editorial/lib/concentracao.ts';
import {avisosDeOrientacao, mapaSequenciaPorConteudo, excecaoFoiDeProposito} from './orientacaoEditorial.ts';
import type {PlanejamentoPostIt} from './postIt.ts';
import {periodoDaSemana} from './periodoPlanejamento.ts';

const serieA = {
  id: 'serie-a',
  name: 'Descomplicando',
  frequenciaRecomendada: 'Semanal',
  frequenciaVezes: 1,
  frequenciaUnidade: 'semana',
  acompanharContinuidade: true,
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
  assert.equal(obra!.texto, '2 pautas da mesma obra em 7 dias: Sanderson (avisa a partir de 2).');
  assert.deepEqual(obra!.postItIds.sort(), ['p1', 'p2']);
  assert.equal(obra!.severidade, 'info');
  assert.deepEqual(obra!.intervalo, {inicio:'2026-11-02', fim:'2026-11-08'});
}

// Limites de Ritmo & Regras Gerais e exceção intencional (só no período dela).
function testLimitesEExcecaoDeObra() {
  const c1 = createContentDraft({id: 'c1', status: CONTENT_STATUS.IDEIA, bibliotecaItemId: obraSanderson.id});
  const c2 = createContentDraft({id: 'c2', status: CONTENT_STATUS.IDEIA, bibliotecaItemId: obraSanderson.id});
  const base = {
    postIts: [
      postIt({id: 'p1', date: '2026-11-02', contentId: c1.id}),
      postIt({id: 'p2', date: '2026-11-05', contentId: c2.id}),
    ],
    contents: [c1, c2],
    series: [],
    temas: [],
    obras: [obraSanderson],
    periodo: {inicio: '2026-11-01', fim: '2026-11-07'},
  };
  const limiteMaior = {...LIMITES_CONCENTRACAO_PADRAO, obraRepeticoes: 3, obraJanelaDias: 7, assuntoFracaoMax: 1 / 3, assuntoMinPautas: 3};
  assert.equal(avisosDeOrientacao({...base, concentracao: limiteMaior}).some(aviso => aviso.tipo === 'obra-repetida'), false);
  const excecao = {id: 'e', tipo: 'obra' as const, alvoId: obraSanderson.id, platformId: null, inicio: '2026-11-01', fim: '2026-11-30', nota: 'maratona'};
  assert.equal(avisosDeOrientacao({...base, excecoesConcentracao: [excecao]}).some(aviso => aviso.tipo === 'obra-repetida'), false);
  // Exceção vencida (antes do período) não cala o aviso.
  const vencida = {...excecao, inicio: '2026-10-01', fim: '2026-10-31'};
  assert.ok(avisosDeOrientacao({...base, excecoesConcentracao: [vencida]}).some(aviso => aviso.tipo === 'obra-repetida'));
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

// Dias seguidos não avisa sozinho: vira regra opcional do acompanhamento, desligada por padrão.
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
  assert.equal(avisos.some(aviso => /dias seguidos/.test(aviso.texto)), false);
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

// Acompanhamento desligado não gera cobrança, mesmo com meta e acima dela.
function testSemAcompanhamentoNaoCobra() {
  const solta = {...serieA, id: 'serie-solta', acompanharContinuidade: false} as Serie;
  const contents = [1, 2].map(n => createContentDraft({
    id: `s${n}`,
    status: CONTENT_STATUS.IDEIA,
    seriesId: solta.id,
  }, solta));
  const avisos = avisosDeOrientacao({
    postIts: [
      postIt({id: 'p1', date: '2026-11-02', contentId: contents[0].id}),
      postIt({id: 'p2', date: '2026-11-05', contentId: contents[1].id}),
    ],
    contents,
    series: [solta],
    temas: [],
    obras: [],
    periodo: {inicio: '2026-11-01', fim: '2026-11-14'},
  });
  assert.equal(avisos.some(aviso => aviso.id.startsWith('serie-')), false);
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

function testPeriodoDaSemanaSegundaADomingo() {
  const periodo = periodoDaSemana(new Date(2026, 10, 4)); // quarta 4 nov 2026
  assert.equal(periodo.inicio, '2026-11-02');
  assert.equal(periodo.fim, '2026-11-08');
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
testLimitesEExcecaoDeObra();
testTemaConcentrado();
testQuadroEmDiasSeguidos();
testSerieAcimaDaFrequencia();
testSemAcompanhamentoNaoCobra();
testSobDemandaNaoCobra();
testPeriodoDaSemanaSegundaADomingo();
testPostItVinculadoNaoDuplicaObra();

// Sequência deriva de série/wave + conjunto de obras, sem agrupar itens sem obra/escopo.
{
  const criar = (id: string, obra: string | null = 'obra-1', seriesId: string | null = 'serie-a', temporadaId: string | null = null) =>
    createContentDraft({id, bibliotecaItemId: obra, seriesId, temporadaId, temaIds: ['tema-1']});
  const a = criar('a');
  const b = criar('b');
  const outra = criar('outra', 'obra-2');
  const semObra = criar('sem-obra', null);
  const semSerie = criar('sem-serie', 'obra-1', null);
  const wave1 = criar('w1', 'obra-1', 'serie-a', 'wave-1');
  const wave2 = criar('w2', 'obra-1', 'serie-a', 'wave-2');
  const mapa = mapaSequenciaPorConteudo([a, b, outra, semObra, semSerie, wave1, wave2]);
  assert.equal(mapa.a, mapa.b);
  assert.notEqual(mapa.a, mapa.outra);
  assert.equal(mapa['sem-obra'], undefined);
  assert.equal(mapa['sem-serie'], undefined);
  assert.notEqual(mapa.w1, mapa.w2);
  assert.notEqual(mapa.a, mapa.w1);

  const base = {
    contents: [a, b],
    postIts: [postIt({id: 'pa', date: '2026-11-02', contentId: 'a'}), postIt({id: 'pb', date: '2026-11-08', contentId: 'b'})],
    series: [], temas: [temaHalloween], obras: [obraSanderson],
    periodo: {inicio: '2026-11-01', fim: '2026-11-30'},
  };
  const avisos = avisosDeOrientacao(base);
  const janela = avisos.find(item => item.id.startsWith('tema-janela:'))!;
  assert.ok(janela, '2 em 7 avisa mesmo abaixo do mínimo de 3 para a fração');
  assert.equal(janela.texto, '2 pautas do mesmo assunto em 7 dias: Halloween (avisa a partir de 2).');
  assert.equal(avisos.some(item => item.id === 'tema:tema-1'), false);
  assert.equal(avisosDeOrientacao({...base, sequenciaPorConteudo: mapa}).length, 0);
  const separados = {...base, postIts: [base.postIts[0], {...base.postIts[1], date: '2026-11-09'}]};
  assert.equal(avisosDeOrientacao(separados).some(item => item.id.startsWith('tema-janela:')), false);
  const tres = {...base, contents: [...base.contents, criar('c', null, null)], postIts: [...base.postIts, postIt({id: 'pc', date: '2026-11-03', contentId: 'c'})]};
  const ambos = avisosDeOrientacao(tres).filter(item => item.tipo === 'tema-concentrado');
  assert.equal(ambos.length, 2, 'fração e janela coexistem');
  assert.equal(new Set(ambos.map(item => item.id)).size, 2);
  const todos = avisosDeOrientacao(tres);
  const intencionais = todos.flatMap((aviso, index) => {
    const excecao = excecaoFoiDeProposito(aviso, `e${index}`);
    return excecao ? [excecao] : [];
  });
  assert.deepEqual(avisosDeOrientacao({...tres, excecoesConcentracao: intencionais}), [], 'toast inteiro some sem reaparecer em janela deslocada');
  const multi = mapaSequenciaPorConteudo([{...a, id: 'ma', livroIds: ['z', 'a']}, {...b, id: 'mb', livroIds: ['a', 'z']}]);
  assert.equal(multi.ma, multi.mb, 'ordem das obras não muda a sequência');
  assert.ok(avisosDeOrientacao({...base, concentracao: {...LIMITES_CONCENTRACAO_PADRAO, obraJanelaDias: 1}}).some(item => item.id.startsWith('tema-janela:')), 'janela de assunto independe da obra');
  assert.equal(avisosDeOrientacao({...base, concentracao: {...LIMITES_CONCENTRACAO_PADRAO, assuntoRepeticoes: 3}}).some(item => item.id.startsWith('tema-janela:')), false);

  for (const aviso of avisos) {
    const excecao = excecaoFoiDeProposito(aviso, 'excecao')!;
    assert.equal(excecao.platformId, null);
    assert.equal(excecao.nota, 'foi de propósito');
    assert.ok(excecaoCobre([excecao], {tipo: excecao.tipo, alvoId: aviso.alvoId!}, aviso.intervalo!));
    assert.equal(avisosDeOrientacao({...base, excecoesConcentracao: [excecao]}).some(item => item.id === aviso.id), false);
  }
  assert.equal(excecaoFoiDeProposito({...janela, alvoId: undefined}, 'e'), null);
  assert.equal(excecaoFoiDeProposito({...janela, intervalo: undefined}, 'e'), null);
  assert.equal(excecaoFoiDeProposito({...janela, tipo: 'serie-acima'}, 'e'), null);
  // Obras diferentes da mesma série continuam gerando janela de assunto.
  assert.ok(avisosDeOrientacao({...base, contents: [a, {...outra, id: 'b'}], sequenciaPorConteudo: {...mapa, b: mapa.outra}}).some(item => item.id.startsWith('tema-janela:')));
}
