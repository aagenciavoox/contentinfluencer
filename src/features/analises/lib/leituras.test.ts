import assert from 'node:assert/strict';
import type { Content, ContentMetric, ContentPlataforma, ContaMetrica } from '../../../lib/database.ts';
import { filtrarPublicacoes } from './publicacoes.ts';
import { leituraMaisProxima, somarPublicacoes } from './leituras.ts';

function leitura(partial: Partial<ContaMetrica> & Pick<ContaMetrica, 'id' | 'platformId' | 'registradoEm'>): ContaMetrica {
  return {
    userId: 'u',
    seguidores: null,
    alcance: null,
    visualizacoes: null,
    interacoes: null,
    janelaDias: null,
    extras: {},
    origem: 'manual',
    externoRef: null,
    nota: '',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...partial,
  };
}

const leituras = [
  leitura({ id: 'antiga', platformId: 'ig', registradoEm: '2026-10-01', seguidores: 100, updatedAt: '2026-10-01T00:00:00.000Z' }),
  leitura({ id: 'perto', platformId: 'ig', registradoEm: '2026-10-09', seguidores: 140, updatedAt: '2026-10-09T00:00:00.000Z' }),
  leitura({ id: 'outra', platformId: 'tt', registradoEm: '2026-10-10', seguidores: 9, updatedAt: '2026-10-10T00:00:00.000Z' }),
  leitura({ id: 'manual', platformId: 'ig', registradoEm: '2026-10-12', seguidores: 150, origem: 'manual', updatedAt: '2026-10-12T00:00:00.000Z' }),
  leitura({ id: 'api', platformId: 'ig', registradoEm: '2026-10-12', seguidores: 151, origem: 'api', updatedAt: '2026-10-13T00:00:00.000Z' }),
];

assert.equal(leituraMaisProxima(leituras, 'ig', '2026-10-10')?.id, 'perto');
assert.equal(leituraMaisProxima(leituras, 'ig', '2026-10-12')?.id, 'api');
assert.equal(leituraMaisProxima(leituras, 'tt', '2026-10-01')?.id, 'outra');
assert.equal(leituraMaisProxima(leituras, 'ig', '2026-10-03')?.id, 'antiga');
assert.equal(leituraMaisProxima([], 'ig', '2026-10-10'), null);
assert.equal(leituraMaisProxima(leituras, 'ausente', '2026-10-10'), null);

const empate = [
  leitura({ id: 'antes', platformId: 'ig', registradoEm: '2026-10-01', updatedAt: '2026-10-20T00:00:00.000Z' }),
  leitura({ id: 'depois', platformId: 'ig', registradoEm: '2026-10-05', updatedAt: '2026-10-01T00:00:00.000Z' }),
];
assert.equal(leituraMaisProxima(empate, 'ig', '2026-10-03')?.id, 'antes');

assert.deepEqual(somarPublicacoes([]), { views: null, alcance: null, interacoes: null });
assert.deepEqual(somarPublicacoes([
  { views: null, alcance: null, interacoes: null },
  { views: null, alcance: 0, interacoes: null },
]), { views: null, alcance: 0, interacoes: null });
assert.deepEqual(somarPublicacoes([
  { views: 10, alcance: null, interacoes: 0 },
  { views: 5, alcance: 3, interacoes: 2 },
  { views: null, alcance: 1, interacoes: null },
]), { views: 15, alcance: 4, interacoes: 2 });

function pub(partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'platformId' | 'publishDate'>): ContentPlataforma {
  return { contentId: 'c1', legenda: '', hashtags: '', ...partial };
}

const contents = [{
  id: 'c1',
  title: 'No período',
  deletedAt: null,
  seriesId: null,
  pilarId: null,
  funcao: null,
  plataformas: [
    pub({ id: 'dentro', platformId: 'ig', publishDate: '2026-10-10' }),
    pub({ id: 'fora', platformId: 'ig', publishDate: '2026-11-02' }),
  ],
}] as Content[];

const metricas = [
  { id: 'm-dentro', publicacaoId: 'dentro', views: 20, likes: 4, comments: 1, saves: null, shares: null, accountsReached: 8 },
  { id: 'm-fora', publicacaoId: 'fora', views: 100, likes: 50, comments: null, saves: null, shares: null, accountsReached: 40 },
] as ContentMetric[];

const noPeriodo = filtrarPublicacoes({
  contents,
  contas: [{ id: 'ig', nome: 'Principal', rede: 'instagram', handle: 'diza' }],
  series: [],
  pilares: [],
  metricas,
  filtro: { inicio: '2026-10-01', fim: '2026-10-31', base: 'planejada', rede: null, contaId: null },
});

assert.deepEqual(noPeriodo.map(linha => linha.publicacaoId), ['dentro']);
assert.deepEqual(somarPublicacoes(noPeriodo), { views: 20, alcance: 8, interacoes: 5 });

console.log('leituras.test.ts passed');
