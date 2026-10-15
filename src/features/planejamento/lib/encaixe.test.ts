import assert from 'node:assert/strict';
import type {Content} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {datasNaGrade, passaNoFiltroData} from '../../editorial/lib/datasNaGrade.ts';
import {candidatosDoEncaixe, descricaoDoCandidato} from './encaixe.ts';
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
    ['objetivo-e-serie', 'producao-objetivo', 'ideia-objetivo', 'so-pilar'],
  );
  assert.deepEqual(lista.outros.map(candidato => candidato.content.id), ['nada-em-comum']);
  assert.equal(descricaoDoCandidato(lista.combinam[0]), 'Atrair · mesma série · mesmo pilar');
  assert.equal(descricaoDoCandidato(lista.outros[0]), 'Sem objetivo');
  assert.equal(lista.combinam[1].etapa, 'producao');
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

console.log('encaixe tests passed');
