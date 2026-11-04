import assert from 'node:assert/strict';
import type {Content, ContentPlataforma} from '../../../lib/database.ts';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {createEmptyPostIt} from './postIt.ts';
import {
  executarSalvarNoCalendario,
  linhasParaSalvarNoCalendario,
  salvarRoteiroNoCalendario,
  tirarRoteiroDoCalendario,
} from './salvarNoCalendario.ts';

const NOW = '2026-11-04T12:00:00.000Z';

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

{
  const content = roteiro({
    plataformas: [conta('ig', null), conta('tt', null, {publishTime: '20:00'})],
  });
  const movido = salvarRoteiroNoCalendario(content, {modo: 'mesmo', date: '2026-11-10', time: '19:00'});
  assert.ok(movido);
  assert.equal(movido.publishDate?.slice(0, 10), '2026-11-10');
  assert.deepEqual(movido.plataformas.map(item => item.publishDate?.slice(0, 10)), ['2026-11-10', '2026-11-10']);
  assert.deepEqual(movido.plataformas.map(item => item.publishTime), ['19:00', '19:00']);
}

{
  const content = roteiro({
    plataformas: [
      conta('ig', '2026-11-02T12:00:00.000Z', {status: 'publicada'}),
      conta('tt', null),
    ],
  });
  const movido = salvarRoteiroNoCalendario(content, {modo: 'mesmo', date: '2026-11-10'});
  assert.ok(movido);
  assert.equal(movido.plataformas.find(item => item.platformId === 'ig')?.publishDate?.slice(0, 10), '2026-11-02');
  assert.equal(movido.plataformas.find(item => item.platformId === 'tt')?.publishDate?.slice(0, 10), '2026-11-10');
}

{
  const content = roteiro({
    plataformas: [conta('ig', null), conta('tt', null)],
  });
  const movido = salvarRoteiroNoCalendario(content, {
    modo: 'por-conta',
    contas: [
      {platformId: 'ig', date: '2026-11-10', time: '09:00'},
      {platformId: 'tt', date: '2026-11-11', time: '21:00'},
    ],
  });
  assert.ok(movido);
  assert.equal(movido.plataformas.find(item => item.platformId === 'ig')?.publishDate?.slice(0, 10), '2026-11-10');
  assert.equal(movido.plataformas.find(item => item.platformId === 'ig')?.publishTime, '09:00');
  assert.equal(movido.plataformas.find(item => item.platformId === 'tt')?.publishDate?.slice(0, 10), '2026-11-11');
  assert.equal(movido.plataformas.find(item => item.platformId === 'tt')?.publishTime, '21:00');
}

{
  const content = roteiro({
    publishDate: '2026-11-10T12:00:00.000Z',
    publishDateEnabled: true,
    plataformas: [
      conta('ig', '2026-11-10T12:00:00.000Z', {status: 'programada'}),
      conta('tt', '2026-11-10T12:00:00.000Z', {status: 'publicada'}),
    ],
  });
  const tirado = tirarRoteiroDoCalendario(content);
  assert.ok(tirado);
  assert.equal(tirado.plataformas.find(item => item.platformId === 'ig')?.publishDate, null);
  assert.equal(tirado.plataformas.find(item => item.platformId === 'ig')?.status, 'prevista');
  assert.equal(tirado.plataformas.find(item => item.platformId === 'tt')?.status, 'publicada');
  assert.equal(tirado.plataformas.find(item => item.platformId === 'tt')?.publishDate?.slice(0, 10), '2026-11-10');
}

{
  const solto = createEmptyPostIt({id: 'p1', texto: 'nota solta', date: '2026-11-12', now: NOW});
  const ligado = {
    ...createEmptyPostIt({id: 'p2', texto: 'já roteiro', date: '2026-11-13', now: NOW}),
    contentId: 'r1',
  };
  const linhas = linhasParaSalvarNoCalendario([solto, ligado], [roteiro()]);
  assert.equal(linhas.length, 2);
  assert.equal(linhas[0]?.destino, 'roteiro');
  assert.equal(linhas[0]?.opcoes.ideia, true);
  assert.equal(linhas[1]?.destino, 'manter');
  assert.equal(linhas[1]?.opcoes.manter, true);
}

{
  const solto = createEmptyPostIt({id: 'p1', texto: 'abrir editor', date: '2026-11-12', now: NOW});
  const resultado = executarSalvarNoCalendario({
    postIts: [solto],
    contents: [],
    linhas: linhasParaSalvarNoCalendario([solto], []),
    time: '15:00',
    now: NOW,
  });
  assert.equal(resultado.contents.length, 1);
  assert.equal(resultado.contents[0]?.status, CONTENT_STATUS.ROTEIRO);
  assert.equal(resultado.contents[0]?.publishDate?.slice(0, 10), '2026-11-12');
  assert.equal(resultado.contents[0]?.publishTime, '15:00');
  assert.equal(resultado.postIts[0]?.contentId, resultado.contents[0]?.id);
  assert.equal(resultado.openScriptId, resultado.contents[0]?.id);
}

{
  const a = createEmptyPostIt({id: 'a', texto: 'um', date: '2026-11-12', now: NOW});
  const b = createEmptyPostIt({id: 'b', texto: 'dois', date: '2026-11-13', now: NOW});
  const resultado = executarSalvarNoCalendario({
    postIts: [a, b],
    contents: [],
    linhas: linhasParaSalvarNoCalendario([a, b], []).map(linha => ({...linha, destino: 'roteiro' as const})),
    now: NOW,
  });
  assert.equal(resultado.contents.length, 2);
  assert.equal(resultado.openScriptId, null);
}

console.log('salvarNoCalendario tests passed');
