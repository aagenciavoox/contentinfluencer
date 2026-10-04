import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import {
  alternarDestino,
  criarRepost,
  destinosPadraoAtivos,
  destinoMarcado,
  publicacoesDosDestinos,
} from './destinations.ts';

const instagram = { id: '11111111-1111-4111-8111-111111111111', nome: 'Instagram' };
const tiktok = { id: '22222222-2222-4222-8222-222222222222', nome: 'TikTok' };
let seq = 0;
const criarId = () => `id-${seq += 1}`;

function publicacao(partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'platformId'>): ContentPlataforma {
  return {
    contentId: 'c1',
    legenda: '',
    hashtags: '',
    publishDate: null,
    publicationKind: 'post',
    status: 'agendada',
    legendaPropria: false,
    contaNaGrade: true,
    ...partial,
  };
}

function testMarcarCriaAgendada() {
  seq = 0;
  const next = alternarDestino({
    publicacoes: [],
    plataforma: instagram,
    contentId: 'c1',
    marcar: true,
    criarId,
  });
  assert.equal(next.length, 1);
  assert.equal(next[0]?.id, 'id-1');
  assert.equal(next[0]?.platformId, instagram.id);
  assert.equal(next[0]?.status, 'agendada');
  assert.equal(next[0]?.publicationKind, 'post');
  assert.equal(destinoMarcado(next, instagram), true);
}

function testDesmarcarRemoveNaoPublicada() {
  seq = 0;
  const agendada = publicacao({ id: 'ag', platformId: 'Instagram' });
  const next = alternarDestino({
    publicacoes: [agendada],
    plataforma: instagram,
    contentId: 'c1',
    marcar: false,
    criarId,
  });
  assert.deepEqual(next, []);
}

function testDesmarcarMantemPublicadaERepost() {
  const publicada = publicacao({ id: 'pub', platformId: instagram.id, status: 'publicada' });
  const repost = publicacao({
    id: 'rep',
    platformId: instagram.id,
    publicationKind: 'repost',
    status: 'agendada',
    publishDate: '2026-10-10',
  });
  const next = alternarDestino({
    publicacoes: [publicada, repost],
    plataforma: instagram,
    contentId: 'c1',
    marcar: false,
  });
  assert.deepEqual(next.map(item => item.id), ['pub', 'rep']);
  assert.equal(destinoMarcado(next, instagram), true);
}

function testDestinosPadraoIgnoraInativa() {
  const escolhidas = destinosPadraoAtivos(
    [instagram.id, 'nao-existe', tiktok.id],
    [instagram],
  );
  assert.deepEqual(escolhidas.map(item => item.id), [instagram.id]);
  const publicacoes = publicacoesDosDestinos({
    destinos: escolhidas,
    contentId: 'c1',
    criarId: () => 'fixo',
  });
  assert.equal(publicacoes[0]?.status, 'agendada');
  assert.equal(publicacoes[0]?.platformId, instagram.id);
}

function testRepostTemDataPropria() {
  const next = criarRepost({
    publicacoes: [publicacao({ id: 'orig', platformId: instagram.id, status: 'publicada' })],
    contentId: 'c1',
    platformId: instagram.id,
    publishDate: '2026-10-12',
    criarId: () => 'repost-1',
  });
  const repost = next.find(item => item.id === 'repost-1');
  assert.equal(repost?.publicationKind, 'repost');
  assert.equal(repost?.publishDate, '2026-10-12');
  assert.equal(repost?.status, 'agendada');
}

testMarcarCriaAgendada();
testDesmarcarRemoveNaoPublicada();
testDesmarcarMantemPublicadaERepost();
testDestinosPadraoIgnoraInativa();
testRepostTemDataPropria();
console.log('destinations tests passed');