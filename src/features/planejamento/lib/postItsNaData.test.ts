import assert from 'node:assert/strict';
import type {Content, ContentPlataforma} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {levarRoteiroAoDia, postItsNaDataDoRoteiro, roteiroPublicado} from './postItsNaData.ts';

function conta(platformId: string, publishDate: string | null, extra: Partial<ContentPlataforma> = {}): ContentPlataforma {
  return {
    id: `p-${platformId}`,
    contentId: 'r1',
    platformId,
    legenda: '',
    hashtags: '',
    publishDate,
    publishTime: '18:00',
    status: 'prevista',
    ...extra,
  };
}

function roteiro(overrides: Partial<Content> = {}): Content {
  return createContentDraft({
    id: 'r1',
    title: 'Cosmere sem TCC',
    status: CONTENT_STATUS.ROTEIRO,
    publishDate: null,
    ...overrides,
  });
}

const postIt = (date: string | null, contentId: string | null = 'r1') => ({id: 'p1', date, contentId});

function testPostItFicaNoDiaDoRoteiro() {
  const content = roteiro({publishDate: '2026-11-05T12:00:00.000Z'});
  const [alinhado] = postItsNaDataDoRoteiro({
    postIts: [postIt('2026-11-02')],
    contents: [content],
    series: [],
    redeReferenciaId: null,
  });
  assert.equal(alinhado.date, '2026-11-05');
}

function testRoteiroSemDataMantemODiaDoPostIt() {
  const original = postIt('2026-11-02');
  const [alinhado] = postItsNaDataDoRoteiro({
    postIts: [original],
    contents: [roteiro()],
    series: [],
    redeReferenciaId: null,
  });
  assert.equal(alinhado, original);
}

function testPostItSoltoNaoMuda() {
  const solto = postIt('2026-11-02', null);
  const [alinhado] = postItsNaDataDoRoteiro({postIts: [solto], contents: [], series: [], redeReferenciaId: null});
  assert.equal(alinhado, solto);
}

function testArrastarLevaTodasAsContasMantendoHorario() {
  const content = roteiro({
    publishDate: '2026-11-02T12:00:00.000Z',
    plataformas: [conta('ig', '2026-11-02T12:00:00.000Z'), conta('tt', '2026-11-03T12:00:00.000Z', {publishTime: '20:00'})],
  });
  const movido = levarRoteiroAoDia(content, '2026-11-10');
  assert.ok(movido);
  assert.deepEqual(movido.plataformas.map(item => item.publishDate?.slice(0, 10)), ['2026-11-10', '2026-11-10']);
  assert.deepEqual(movido.plataformas.map(item => item.publishTime), ['18:00', '20:00']);
  assert.equal(movido.publishDate?.slice(0, 10), '2026-11-10');
}

function testContaPublicadaNaoMuda() {
  const content = roteiro({
    plataformas: [
      conta('ig', '2026-11-02T12:00:00.000Z', {status: 'publicada'}),
      conta('tt', '2026-11-03T12:00:00.000Z'),
    ],
  });
  const movido = levarRoteiroAoDia(content, '2026-11-10');
  assert.ok(movido);
  assert.equal(movido.plataformas[0].publishDate?.slice(0, 10), '2026-11-02');
  assert.equal(movido.plataformas[1].publishDate?.slice(0, 10), '2026-11-10');
}

function testRoteiroPublicadoNaoMuda() {
  const content = roteiro({status: CONTENT_STATUS.POSTADO, postedAt: '2026-11-02T12:00:00.000Z'});
  assert.equal(roteiroPublicado(content), true);
  assert.equal(levarRoteiroAoDia(content, '2026-11-10'), null);
}

function testMesmoDiaNaoGrava() {
  const content = roteiro({
    publishDate: '2026-11-10T12:00:00.000Z',
    plataformas: [conta('ig', '2026-11-10T12:00:00.000Z')],
  });
  assert.equal(levarRoteiroAoDia(content, '2026-11-10'), null);
}

function testSemDiaRetiraAPrevisao() {
  const content = roteiro({
    publishDate: '2026-11-10T12:00:00.000Z',
    plataformas: [conta('ig', '2026-11-10T12:00:00.000Z')],
  });
  const retirado = levarRoteiroAoDia(content, null);
  assert.ok(retirado);
  assert.equal(retirado.publishDate, null);
  assert.equal(retirado.plataformas[0].publishDate, null);
}

function testRoteiroSemContaGanhaODia() {
  const movido = levarRoteiroAoDia(roteiro(), '2026-11-10');
  assert.ok(movido);
  assert.equal(movido.publishDate?.slice(0, 10), '2026-11-10');
}

const tests = [
  ['linked post-it sits on the roteiro day', testPostItFicaNoDiaDoRoteiro],
  ['undated roteiro keeps the post-it day', testRoteiroSemDataMantemODiaDoPostIt],
  ['loose post-it is unchanged', testPostItSoltoNaoMuda],
  ['moving takes every planned account to the day, keeping times', testArrastarLevaTodasAsContasMantendoHorario],
  ['a published account keeps its date', testContaPublicadaNaoMuda],
  ['a published roteiro does not move', testRoteiroPublicadoNaoMuda],
  ['same day writes nothing', testMesmoDiaNaoGrava],
  ['no day clears the planned dates', testSemDiaRetiraAPrevisao],
  ['roteiro without accounts gets the day', testRoteiroSemContaGanhaODia],
] as const;

for (const [name, test] of tests) {
  test();
  console.log(`ok - ${name}`);
}
