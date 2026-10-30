import assert from 'node:assert/strict';
import type { Content, ContentMetric, ContentPlataforma } from '../../../lib/database.ts';
import { intervalo } from '../../../lib/dates.ts';
import {
  FORMULA_ENGAJAMENTO,
  filtrarPublicacoes,
  interacoesDaMetrica,
  taxaDeEngajamento,
} from './publicacoes.ts';

function pub(partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'platformId'>): ContentPlataforma {
  return {
    contentId: 'c1',
    legenda: '',
    hashtags: '',
    publishDate: '2026-10-10',
    ...partial,
  };
}

function conteudo(plataformas: ContentPlataforma[]): Content {
  return {
    id: 'c1',
    userId: 'u',
    title: 'Leia comigo',
    status: 'Postado',
    slotType: null,
    seriesId: 's1',
    pilarId: 'p1',
    lookId: null,
    cenarioId: null,
    bibliotecaItemId: null,
    formatoVisual: null,
    energiaNecessaria: null,
    funcao: 'atrair',
    funcaoOrigem: 'escolhida',
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
    publishDate: null,
    recordingDate: null,
    link: 'https://conteudo-antigo.example',
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    deletedAt: null,
    plataformas,
  };
}

const contas = [
  { id: 'ig-a', nome: 'Principal', rede: 'instagram' as const, handle: 'diza' },
  { id: 'ig-b', nome: 'Leituras', rede: 'instagram' as const, handle: 'leituras' },
];

const metricas: ContentMetric[] = [{
  id: 'm1',
  userId: 'u',
  contentId: 'c1',
  platformId: 'ig-a',
  publicacaoId: 'pub-a',
  origem: 'manual',
  atualizadoEm: '2026-10-12T00:00:00.000Z',
  views: 0,
  likes: 0,
  comments: null,
  saves: null,
  shares: null,
  reposts: null,
  newFollowers: null,
  accountsReached: null,
  watchTime: null,
  retentionRate: null,
  completionRate: null,
  qualitativeNotes: null,
  registeredAt: '2026-10-12T00:00:00.000Z',
  createdAt: '2026-10-12T00:00:00.000Z',
}];

const contents = [conteudo([
  pub({ id: 'pub-a', platformId: 'ig-a', postUrl: 'https://ig.example/a', externoId: 'ext-a' }),
  pub({ id: 'pub-b', platformId: 'ig-b', publishDate: '2026-10-20', postUrl: 'https://ig.example/b' }),
])];

const filtro = { inicio: '2026-10-01', fim: '2026-10-31', base: 'planejada' as const, rede: null, contaId: null };
const linhas = filtrarPublicacoes({
  contents,
  contas,
  series: [{ id: 's1', name: 'Leia comigo' }],
  pilares: [{ id: 'p1', nome: 'Ciência' }],
  metricas,
  filtro,
});

assert.equal(linhas.length, 2);
assert.equal(linhas[0].publicacaoId, 'pub-b');
assert.equal(linhas[1].link, 'https://ig.example/a');
assert.notEqual(linhas[1].link, contents[0].link);
assert.equal(linhas[1].views, 0);
assert.equal(linhas[0].views, null);
assert.equal(linhas[1].alcance, null);
assert.equal(linhas[1].interacoes, 0);
assert.equal(linhas[1].taxa, null);
assert.equal(taxaDeEngajamento(metricas[0]), null);
assert.equal(interacoesDaMetrica(null), null);
assert.match(FORMULA_ENGAJAMENTO, /visualizações/);

const soUma = filtrarPublicacoes({
  contents,
  contas,
  series: [],
  pilares: [],
  metricas,
  filtro: { ...filtro, contaId: 'ig-b' },
});
assert.deepEqual(soUma.map(item => item.publicacaoId), ['pub-b']);
assert.equal(soUma[0].serie, null);
assert.equal(soUma[0].objetivo, 'Atrair alcance');
assert.equal(soUma[0].periodoEditorial, intervalo('2026-10-18', '2026-10-24'));

const semDataEfetiva = filtrarPublicacoes({
  contents,
  contas,
  series: [],
  pilares: [],
  metricas,
  filtro: { ...filtro, base: 'efetiva' },
});
assert.equal(semDataEfetiva.length, 0);

console.log('publicacoes.test.ts passed');
