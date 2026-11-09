import assert from 'node:assert/strict';
import type {Content} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {datasNaGrade, passaNoFiltroData} from '../../editorial/lib/datasNaGrade.ts';
import {candidatosDoEncaixe, descricaoDoCandidato, ultimosQuadros} from './encaixe.ts';
import {createEmptyPostIt} from './postIt.ts';

const NOW = '2026-10-04T12:00:00.000Z';

function conteudo(id: string, overrides: Partial<Content> = {}): Content {
  return createContentDraft({
    id,
    title: id,
    status: CONTENT_STATUS.ROTEIRO,
    publishDate: null,
    funcao: null,
    ...overrides,
  });
}

const series = [{id: 'serie-a', funcaoPadrao: null, pilarPrincipalId: 'pilar-a'}];

function testOrdemEExclusoes() {
  const espaco = createEmptyPostIt({id: 'espaco', date: '2026-10-15', objetivo: 'atrair', serieId: 'serie-a', pilarId: 'pilar-a', now: NOW});
  const contents = [
    conteudo('ideia-objetivo', {status: CONTENT_STATUS.IDEIA, funcao: 'atrair', funcaoOrigem: 'escolhida'}),
    conteudo('producao-objetivo', {status: CONTENT_STATUS.PRODUCAO, funcao: 'atrair', funcaoOrigem: 'escolhida'}),
    conteudo('objetivo-e-serie', {funcao: 'atrair', funcaoOrigem: 'escolhida', seriesId: 'serie-a'}),
    conteudo('so-pilar', {pilarId: 'pilar-a'}),
    conteudo('nada-em-comum', {status: CONTENT_STATUS.PRODUCAO}),
    conteudo('ja-tem-data', {funcao: 'atrair', funcaoOrigem: 'escolhida', publishDate: '2026-10-20T12:00:00.000Z'}),
    conteudo('em-outro-post-it', {funcao: 'atrair', funcaoOrigem: 'escolhida'}),
    conteudo('postado', {status: CONTENT_STATUS.POSTADO, funcao: 'atrair', funcaoOrigem: 'escolhida'}),
    conteudo('arquivado', {funcao: 'atrair', funcaoOrigem: 'escolhida', archivedAt: NOW}),
  ];
  const postIts = [
    espaco,
    {...createEmptyPostIt({id: 'outro', date: null, now: NOW}), contentId: 'em-outro-post-it'},
  ];
  const datas = datasNaGrade({contents, series, postIts, redeReferenciaId: null});
  const lista = candidatosDoEncaixe({postIt: espaco, postIts, contents, series, datas});

  assert.deepEqual(
    lista.combinam.map(candidato => candidato.content.id),
    // O peso só separa os blocos; dentro de "combinam" vale a etapa e o título.
    ['producao-objetivo', 'objetivo-e-serie', 'so-pilar', 'ideia-objetivo'],
  );
  assert.deepEqual(lista.outros.map(candidato => candidato.content.id), ['nada-em-comum']);
  assert.equal(descricaoDoCandidato(lista.combinam[1]), 'Atrair · mesma série · mesmo pilar');
  assert.equal(descricaoDoCandidato(lista.outros[0]), 'Sem objetivo');
  assert.equal(lista.combinam[0].etapa, 'producao');
}

function testFiltroDeData() {
  const contents = [
    conteudo('datado', {publishDate: '2026-10-05T12:00:00.000Z'}),
    conteudo('pelo-post-it'),
    conteudo('sem-data'),
  ];
  const postIts = [{...createEmptyPostIt({id: 'p', date: '2026-10-09', now: NOW}), contentId: 'pelo-post-it'}];
  const datas = datasNaGrade({contents, series: [], postIts, redeReferenciaId: null});
  const semana = {modo: 'intervalo', inicio: '2026-10-04', fim: '2026-10-10'} as const;

  assert.deepEqual(datas.get('datado'), ['2026-10-05']);
  assert.equal(passaNoFiltroData(datas.get('datado'), semana), true);
  assert.equal(passaNoFiltroData(datas.get('pelo-post-it'), semana), true);
  assert.equal(passaNoFiltroData(datas.get('sem-data'), semana), false);
  assert.equal(passaNoFiltroData(datas.get('sem-data'), {modo: 'sem-data'}), true);
  assert.equal(passaNoFiltroData(datas.get('datado'), {modo: 'sem-data'}), false);
  assert.equal(passaNoFiltroData(datas.get('datado'), {modo: 'intervalo', inicio: '2026-10-06', fim: '2026-10-31'}), false);
}

testOrdemEExclusoes();
testFiltroDeData();

// ---------------------------------------------------------------- Fase 3.5: ordem pelo plano

const vazio = new Map<string, readonly string[]>();
const linhaAbaixo = (serieId: string, temporadaId: string | null = null) => ({
  serieId,
  temporadaId,
  abaixo: [{inicio: '2026-10-01', fim: '2026-10-07'}] as never[],
});
const linhaEmDia = (serieId: string, temporadaId: string | null = null) => ({serieId, temporadaId, abaixo: [] as never[]});

function testRitmoDentroDoBloco() {
  const espaco = createEmptyPostIt({id: 'espaco', date: '2026-10-15', objetivo: 'atrair', now: NOW});
  const seriesRitmo = [
    {id: 's-atras', funcaoPadrao: null},
    {id: 's-em-dia', funcaoPadrao: null},
  ];
  const contents = [
    conteudo('a-em-dia-producao', {status: CONTENT_STATUS.PRODUCAO, seriesId: 's-em-dia'}),
    conteudo('b-atras-ideia', {status: CONTENT_STATUS.IDEIA, seriesId: 's-atras'}),
    conteudo('c-combina', {funcao: 'atrair', funcaoOrigem: 'escolhida'}),
    conteudo('d-combina-atras', {status: CONTENT_STATUS.IDEIA, funcao: 'atrair', funcaoOrigem: 'escolhida', seriesId: 's-atras'}),
  ];
  const ritmo = {linhas: [linhaAbaixo('s-atras'), linhaEmDia('s-em-dia')]};
  const lista = candidatosDoEncaixe({postIt: espaco, postIts: [espaco], contents, series: seriesRitmo, datas: vazio, ritmo});

  // Os blocos não se misturam: o que está atrás e não combina continua em "outros".
  assert.deepEqual(lista.combinam.map(c => c.content.id), ['d-combina-atras', 'c-combina']);
  assert.deepEqual(lista.outros.map(c => c.content.id), ['b-atras-ideia', 'a-em-dia-producao']);
  assert.deepEqual(lista.outros[0].destaques, ['ritmo']);
  assert.equal(descricaoDoCandidato(lista.outros[0]), 'Sem objetivo · ritmo em aberto');
  assert.deepEqual(lista.outros[1].destaques, []);

  // Sem continuidade, volta à etapa e ao título.
  const semRitmo = candidatosDoEncaixe({postIt: espaco, postIts: [espaco], contents, series: seriesRitmo, datas: vazio});
  assert.deepEqual(semRitmo.outros.map(c => c.content.id), ['a-em-dia-producao', 'b-atras-ideia']);
  assert.deepEqual(semRitmo.combinam.map(c => c.content.id), ['c-combina', 'd-combina-atras']);
}

function testRitmoDoQuadroEDaWave() {
  const espaco = createEmptyPostIt({id: 'espaco', date: null, now: NOW});
  const seriesArvore = [
    {id: 'mae', funcaoPadrao: null, tipoAgrupamento: 'serie' as const},
    {id: 'quadro', funcaoPadrao: null, parentId: 'mae', tipoAgrupamento: 'quadro' as const},
    {id: 'rascunho', funcaoPadrao: null, status: 'rascunho' as const},
  ];
  const contents = [
    conteudo('a-wave-em-dia', {status: CONTENT_STATUS.PRODUCAO, seriesId: 'quadro', temporadaId: 't-em-dia'}),
    conteudo('b-do-quadro', {status: CONTENT_STATUS.IDEIA, seriesId: 'quadro'}),
    conteudo('c-rascunho', {status: CONTENT_STATUS.IDEIA, seriesId: 'rascunho'}),
  ];
  // A série mãe está atrás; a wave tem linha própria e está em dia: conta só a da wave.
  const ritmo = {linhas: [linhaAbaixo('mae'), linhaEmDia('quadro', 't-em-dia'), linhaAbaixo('rascunho')]};
  const lista = candidatosDoEncaixe({postIt: espaco, postIts: [espaco], contents, series: seriesArvore, datas: vazio, ritmo});
  assert.deepEqual(lista.outros.map(c => c.content.id), ['b-do-quadro', 'a-wave-em-dia', 'c-rascunho']);
  assert.ok(lista.outros[0].destaques.includes('ritmo'));
  // Rascunho de série fica fora do ritmo.
  assert.ok(!lista.outros[2].destaques.includes('ritmo'));
}

function testSequenciaIntercalarEUltimoQuadro() {
  const espaco = createEmptyPostIt({id: 'espaco', date: '2026-10-15', now: NOW});
  const seriesSeq = [
    {id: 'mae', funcaoPadrao: null, tipoAgrupamento: 'serie' as const, modoSequencia: 'intercalar' as const},
    {id: 'q1', funcaoPadrao: null, parentId: 'mae', tipoAgrupamento: 'quadro' as const},
    {id: 'q2', funcaoPadrao: null, parentId: 'mae', tipoAgrupamento: 'quadro' as const},
  ];
  const contents = [
    conteudo('antigo-q2', {seriesId: 'q2', publishDate: '2026-10-01T12:00:00.000Z'}),
    conteudo('recente-q1', {seriesId: 'q1', publishDate: '2026-10-10T12:00:00.000Z'}),
    conteudo('a-ep-q1', {status: CONTENT_STATUS.PRODUCAO, seriesId: 'q1'}),
    conteudo('b-ep-q2', {status: CONTENT_STATUS.IDEIA, seriesId: 'q2'}),
  ];
  const datas = datasNaGrade({contents, series: seriesSeq, postIts: [espaco], redeReferenciaId: null});
  assert.equal(ultimosQuadros({contents, series: seriesSeq, datas, postIts: []}).get('mae'), 'q1');

  const lista = candidatosDoEncaixe({postIt: espaco, postIts: [espaco], contents, series: seriesSeq, datas});
  // Intercalar: depois de q1, o próximo é de q2, mesmo sendo ideia.
  assert.deepEqual(lista.outros.map(c => c.content.id), ['b-ep-q2', 'a-ep-q1']);
  assert.deepEqual(lista.outros[0].destaques, ['sequencia']);
  assert.equal(descricaoDoCandidato(lista.outros[0]), 'Sem objetivo · próximo na sequência');
  assert.deepEqual(lista.outros[1].destaques, []);

  // Seguir um só, com o último quadro vindo do que já está encaixado num post-it.
  const seguir = seriesSeq.map(serie => serie.id === 'mae' ? {...serie, modoSequencia: 'seguir_um' as const} : serie);
  const encaixado = {...createEmptyPostIt({id: 'p2', date: '2026-10-20', now: NOW}), contentId: 'ligado-q2'};
  const comEncaixe = [...contents, conteudo('ligado-q2', {seriesId: 'q2'})];
  const postIts = [espaco, encaixado];
  const datas2 = datasNaGrade({contents: comEncaixe, series: seguir, postIts, redeReferenciaId: null});
  assert.equal(ultimosQuadros({contents: comEncaixe, series: seguir, datas: datas2, postIts}).get('mae'), 'q2');
  const seguindo = candidatosDoEncaixe({postIt: espaco, postIts, contents: comEncaixe, series: seguir, datas: datas2});
  assert.deepEqual(seguindo.outros.map(c => c.content.id), ['b-ep-q2', 'a-ep-q1']);
}

function testOrdemDaTemporadaSemModo() {
  const espaco = createEmptyPostIt({id: 'espaco', date: null, now: NOW});
  const seriesSemModo = [{id: 's', funcaoPadrao: null, modoSequencia: null}];
  const contents = [
    conteudo('a-ep2', {status: CONTENT_STATUS.PRODUCAO, seriesId: 's', ordemEpisodio: 2}),
    conteudo('b-ep1', {status: CONTENT_STATUS.IDEIA, seriesId: 's', ordemEpisodio: 1}),
    conteudo('c-sem-numero-producao', {status: CONTENT_STATUS.PRODUCAO, seriesId: 's'}),
    conteudo('d-avulso', {status: CONTENT_STATUS.PRODUCAO}),
  ];
  const lista = candidatosDoEncaixe({postIt: espaco, postIts: [espaco], contents, series: seriesSemModo, datas: vazio});
  // null = ordem da temporada: o 1 antes do 2; sem número vai depois.
  const ids = lista.outros.map(c => c.content.id);
  assert.ok(ids.indexOf('b-ep1') < ids.indexOf('a-ep2'));
  assert.ok(ids.indexOf('a-ep2') < ids.indexOf('c-sem-numero-producao'));
  assert.deepEqual(lista.outros.find(c => c.content.id === 'b-ep1')?.destaques, ['sequencia']);
}

function testWaveIncompletaNaMesmaSerie() {
  const espaco = createEmptyPostIt({id: 'espaco', date: null, now: NOW});
  const seriesWave = [{id: 's', funcaoPadrao: null}];
  const contents = [
    conteudo('a-wave-fechada', {status: CONTENT_STATUS.PRODUCAO, seriesId: 's', temporadaId: 't-fechada'}),
    conteudo('b-wave-andando', {status: CONTENT_STATUS.IDEIA, seriesId: 's', temporadaId: 't-andando'}),
  ];
  const ritmo = {
    linhas: [],
    temporadas: [{id: 't-fechada', status: 'ativa' as const}, {id: 't-andando', status: 'ativa' as const}],
    progressoDasOndas: new Map([
      ['t-fechada', {publicados: 3, total: 3, diasDesdeUltima: 1}],
      ['t-andando', {publicados: 1, total: 4, diasDesdeUltima: 2}],
    ]),
  };
  const lista = candidatosDoEncaixe({postIt: espaco, postIts: [espaco], contents, series: seriesWave, datas: vazio, ritmo});
  assert.deepEqual(lista.outros.map(c => c.content.id), ['b-wave-andando', 'a-wave-fechada']);
  // Rascunho de temporada não conta como wave em andamento.
  const rascunho = {...ritmo, temporadas: [{id: 't-andando', status: 'rascunho' as const}]};
  const semWave = candidatosDoEncaixe({postIt: espaco, postIts: [espaco], contents, series: seriesWave, datas: vazio, ritmo: rascunho});
  assert.deepEqual(semWave.outros.map(c => c.content.id), ['a-wave-fechada', 'b-wave-andando']);
}

testRitmoDentroDoBloco();
testRitmoDoQuadroEDaWave();
testSequenciaIntercalarEUltimoQuadro();
testOrdemDaTemporadaSemModo();
testWaveIncompletaNaMesmaSerie();

// ---------------------------------------------------------------- Etapa Edição e objetivo abaixo da proporção

function testEdicaoEObjetivoAbaixoDaProporcao() {
  const espaco = createEmptyPostIt({id: 'espaco', date: '2026-10-15', now: NOW});
  const contents = [
    conteudo('a-ideia', {status: CONTENT_STATUS.IDEIA}),
    conteudo('b-roteiro-atrair', {funcao: 'atrair', funcaoOrigem: 'escolhida'}),
    conteudo('c-roteiro-converter', {funcao: 'converter', funcaoOrigem: 'escolhida'}),
    conteudo('d-roteiro-sem-objetivo'),
    conteudo('e-edicao', {status: CONTENT_STATUS.EDICAO}),
    conteudo('f-producao', {status: CONTENT_STATUS.PRODUCAO}),
  ];

  // Edição > Produção > Roteiro > Ideia. Sem proporção, o título desempata.
  const semPlano = candidatosDoEncaixe({postIt: espaco, postIts: [espaco], contents, series: [], datas: vazio});
  assert.deepEqual(semPlano.outros.map(c => c.content.id),
    ['e-edicao', 'f-producao', 'b-roteiro-atrair', 'c-roteiro-converter', 'd-roteiro-sem-objetivo', 'a-ideia']);

  // Converter está 25 pontos abaixo do plano e Atrair 10 acima: dentro de Roteiro, Converter sobe. Sem objetivo vai por último.
  const ritmo = {
    linhas: [],
    objetivos: [
      {funcao: 'atrair' as const, previstoPct: 50, desejadoPct: 40},
      {funcao: 'converter' as const, previstoPct: 5, desejadoPct: 30},
    ],
  };
  const comPlano = candidatosDoEncaixe({postIt: espaco, postIts: [espaco], contents, series: [], datas: vazio, ritmo});
  assert.deepEqual(comPlano.outros.map(c => c.content.id),
    ['e-edicao', 'f-producao', 'c-roteiro-converter', 'b-roteiro-atrair', 'd-roteiro-sem-objetivo', 'a-ideia']);

  // A etapa vem antes do objetivo; o ritmo vem antes da etapa.
  const seriesRitmo = [{id: 's-atras', funcaoPadrao: null}];
  const comAtraso = candidatosDoEncaixe({
    postIt: espaco,
    postIts: [espaco],
    contents: [...contents, conteudo('g-ideia-atras', {status: CONTENT_STATUS.IDEIA, seriesId: 's-atras'})],
    series: seriesRitmo,
    datas: vazio,
    ritmo: {...ritmo, linhas: [linhaAbaixo('s-atras')]},
  });
  assert.equal(comAtraso.outros[0].content.id, 'g-ideia-atras');
  assert.equal(comAtraso.outros[1].content.id, 'e-edicao');
}

testEdicaoEObjetivoAbaixoDaProporcao();

console.log('encaixe tests passed');
