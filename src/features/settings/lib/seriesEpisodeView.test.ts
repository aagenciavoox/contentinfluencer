import assert from 'node:assert/strict';
import type { Content, Serie, Temporada } from '../../../lib/database.ts';
import { linhaDoEpisodio, montarVistaEpisodios, temporadaInicial } from './seriesEpisodeView.ts';

const serieBase = {
  userId: 'u',
  template: '',
  notes: '',
  slotPadrao: null,
  formatoVisualPadrao: [],
  estruturaRoteiro: null,
  bordao: null,
  cor: null,
  capaUrl: null,
  ativa: true,
  frequenciaRecomendada: null,
  funcaoPadrao: null,
  energiaPadrao: null,
  pilarIds: [],
  plataformas: [],
  createdAt: '',
  updatedAt: '',
} satisfies Omit<Serie, 'id' | 'name' | 'parentId' | 'usaTemporadas'>;

const series = [
  { ...serieBase, id: 'branbran', name: 'Branbran', parentId: null, usaTemporadas: true },
  { ...serieBase, id: 'comece', name: 'Por onde começo?', parentId: 'branbran', usaTemporadas: false, notes: 'Dúvidas iniciais.' },
  { ...serieBase, id: 'solta', name: 'Solta', parentId: null, usaTemporadas: false },
] satisfies Serie[];

const temporadas = [
  { id: 't1', userId: 'u', serieId: 'branbran', nome: 'Temporada 1', createdAt: '2026-01-01' },
] satisfies Temporada[];

function conteudo(parcial: Pick<Content, 'id' | 'seriesId' | 'title'> & Partial<Content>): Content {
  return {
    userId: 'u',
    status: 'Roteiro',
    slotType: null,
    pilarId: null,
    lookId: null,
    cenarioId: null,
    bibliotecaItemId: null,
    formatoVisual: null,
    energiaNecessaria: null,
    funcao: null,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
    publishDate: null,
    recordingDate: null,
    link: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-01-02',
    updatedAt: '',
    deletedAt: null,
    plataformas: [],
    temporadaId: null,
    ...parcial,
  };
}

const contents = [
  conteudo({ id: 'c1', seriesId: 'comece', temporadaId: 't1', title: 'Depois', createdAt: '2026-02-01' }),
  conteudo({ id: 'c0', seriesId: 'comece', temporadaId: 't1', title: 'Antes', createdAt: '2026-01-01' }),
  conteudo({ id: 'c2', seriesId: 'branbran', temporadaId: null, title: 'Direto' }),
  conteudo({ id: 'c3', seriesId: 'solta', title: 'Único', postedAt: '2026-10-26T15:00:00', status: 'Publicado' }),
];

const temporada = montarVistaEpisodios({
  serieId: 'branbran',
  series,
  temporadas,
  contents,
  temporadaSelecionada: 't1',
});
assert.equal(temporada.grupos?.length, 1);
assert.equal(temporada.grupos?.[0]?.serieId, 'comece');
assert.deepEqual(temporada.grupos?.[0]?.contents.map(item => item.id), ['c0', 'c1']);

const semTemporada = montarVistaEpisodios({
  serieId: 'branbran',
  series,
  temporadas,
  contents,
  temporadaSelecionada: null,
});
assert.equal(semTemporada.grupos?.some(grupo => grupo.serieId === 'comece' && grupo.contents.length === 0), true);
assert.equal(semTemporada.grupos?.some(grupo => grupo.serieId === 'branbran' && grupo.contents.some(item => item.id === 'c2')), true);

const simples = montarVistaEpisodios({
  serieId: 'solta',
  series,
  temporadas: [],
  contents,
  temporadaSelecionada: null,
});
assert.equal(simples.grupos, null);
assert.deepEqual(simples.episodios.map(item => item.id), ['c3']);
assert.equal(simples.temporadas.length, 0);

assert.equal(
  linhaDoEpisodio(conteudo({ id: 'c3', seriesId: 'solta', title: 'Único', postedAt: '2026-10-26T15:00:00', status: 'Publicado' })),
  'Publicado · 26 out',
);
assert.equal(
  linhaDoEpisodio(conteudo({ id: 'c2', seriesId: 'branbran', title: 'Direto', status: 'Roteiro' })),
  'Roteiro · Sem data',
);

assert.equal(temporadaInicial(temporadas, [{ temporadaId: null }], ''), null);
assert.equal(temporadaInicial(temporadas, [{ temporadaId: 't1' }, { temporadaId: null }], ''), 't1');
assert.equal(temporadaInicial(temporadas, [{ temporadaId: null }], 't1'), 't1');
assert.equal(temporadaInicial([{ id: 'vazia' }], [], ''), 'vazia');

console.log('seriesEpisodeView.test.ts passed');
