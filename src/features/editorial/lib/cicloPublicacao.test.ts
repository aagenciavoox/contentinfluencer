import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import {
  cicloDaPublicacao,
  criarCicloDeRepost,
  maiorCiclo,
  publicacoesPorCiclo,
} from './cicloPublicacao.ts';

function pub(partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id'>): ContentPlataforma {
  return {
    contentId: 'c1',
    platformId: 'ig',
    legenda: '',
    hashtags: '',
    publishDate: null,
    publicationKind: 'post',
    status: 'publicada',
    ciclo: 1,
    ...partial,
  };
}

function testCicloLegadoENovo() {
  assert.equal(cicloDaPublicacao({ publicationKind: 'post' }), 1);
  assert.equal(cicloDaPublicacao({ publicationKind: 'repost' }), 2);
  assert.equal(cicloDaPublicacao({ publicationKind: 'repost', ciclo: 3 }), 3);
  assert.equal(maiorCiclo([pub({ id: 'a', ciclo: 1 }), pub({ id: 'b', publicationKind: 'repost', ciclo: 2 })]), 2);
}

function testCriarCicloPreservaAnterior() {
  const base = [
    pub({ id: 'a', platformId: 'ig', status: 'publicada', ciclo: 1 }),
    pub({ id: 'b', platformId: 'tt', status: 'publicada', ciclo: 1 }),
  ];
  const next = criarCicloDeRepost({
    publicacoes: base,
    contentId: 'c1',
    platformIds: ['ig'],
    publishDate: '2026-11-01T12:00:00.000Z',
    criarId: () => 'novo',
  });
  assert.equal(next.length, 3);
  assert.equal(next[0]?.status, 'publicada');
  assert.equal(next[0]?.ciclo, 1);
  assert.equal(next[2]?.ciclo, 2);
  assert.equal(next[2]?.publicationKind, 'repost');
  assert.equal(next[2]?.status, 'prevista');
  assert.equal(next[2]?.contaNaGrade, true);
}

function testMesmoCicloAgrupaRedes() {
  const map = publicacoesPorCiclo([
    pub({ id: 'a', platformId: 'ig', ciclo: 2, publicationKind: 'repost' }),
    pub({ id: 'b', platformId: 'tt', ciclo: 2, publicationKind: 'repost' }),
    pub({ id: 'c', platformId: 'ig', ciclo: 1 }),
  ]);
  assert.equal(map.get(1)?.length, 1);
  assert.equal(map.get(2)?.length, 2);
}

testCicloLegadoENovo();
testCriarCicloPreservaAnterior();
testMesmoCicloAgrupaRedes();
console.log('cicloPublicacao tests passed');
