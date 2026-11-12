import assert from 'node:assert/strict';
import type { ClubeConteudo, ClubePasta, ClubeSerie, Content, Serie } from '../../../lib/database.ts';
import { episodiosDaPagina } from '../../settings/lib/seriesLista.ts';
import {
  candidatosDeSerie,
  candidatosParaPuxar,
  exclusivaDoClube,
  htmlInicialDoClube,
  itensDoClube,
  proximaOrdem,
  proximaOrdemDeSerie,
  reordenarVinculos,
  ordenarItensDoClube,
  moverConteudosDePasta,
  rotuloDaOrigem,
  seriesDoClube,
} from './clubeLista.ts';

const serie: Serie = {
  id: 's1',
  userId: 'u',
  name: 'Descomplicando',
  template: '',
  notes: '',
  slotPadrao: null,
  formatoVisualPadrao: [],
  estruturaRoteiro: null,
  cor: '#448361',
  capaUrl: null,
  ativa: true,
  frequenciaRecomendada: null,
  parentId: null,
  tipoAgrupamento: 'serie',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  pilarIds: [],
  plataformas: [],
} as Serie;

const quadro: Serie = {
  ...serie,
  id: 'q1',
  name: 'Clube do mês',
  parentId: 's1',
  tipoAgrupamento: 'quadro',
};

function conteudo(parcial: Partial<Content> & Pick<Content, 'id'>): Content {
  return {
    userId: 'u',
    title: parcial.id,
    status: 'Roteiro',
    slotType: null,
    seriesId: null,
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
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    publishDate: null,
    recordingDate: null,
    link: null,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    deletedAt: null,
    plataformas: [],
    ...parcial,
  };
}

const episodio = conteudo({
  id: 'ep',
  title: 'Episódio da série',
  seriesId: 'q1',
  ordemEpisodio: 4,
});

const vinculo: ClubeConteudo = {
  id: 'v1',
  userId: 'u',
  clubeId: 'clube',
  contentId: 'ep',
  ordem: 1,
  pastaId: null,
  createdAt: '2026-01-02',
};

const exclusiva = conteudo({
  id: 'peca',
  title: 'Pauta',
  seriesId: null,
  clubeId: 'clube',
});

const vinculoExclusivo: ClubeConteudo = {
  id: 'v2',
  userId: 'u',
  clubeId: 'clube',
  contentId: 'peca',
  ordem: 2,
  pastaId: null,
  createdAt: '2026-01-03',
};

assert.equal(exclusivaDoClube('clube', exclusiva), true);
assert.equal(exclusivaDoClube('clube', episodio), false);

const itens = itensDoClube('clube', [vinculoExclusivo, vinculo], [episodio, exclusiva]);
assert.deepEqual(itens.map(item => [item.content.id, item.atalho, item.vinculo.ordem]), [
  ['ep', true, 1],
  ['peca', false, 2],
]);
assert.equal(itens[0].content, episodio);
assert.equal(episodio.seriesId, 'q1');
assert.equal(episodio.ordemEpisodio, 4);

assert.deepEqual(
  episodiosDaPagina('s1', [serie, quadro], [episodio, exclusiva]).map(item => item.id),
  ['ep'],
);

assert.equal(candidatosParaPuxar('clube', [vinculo], [episodio, exclusiva]).length, 0);
assert.deepEqual(
  candidatosParaPuxar('clube', [], [episodio, exclusiva]).map(item => item.id),
  ['ep'],
);

const reordenados = reordenarVinculos([vinculo, vinculoExclusivo], 'clube', ['peca', 'ep']);
assert.deepEqual(
  itensDoClube('clube', reordenados, [episodio, exclusiva]).map(item => [item.content.id, item.vinculo.ordem]),
  [['peca', 1], ['ep', 2]],
);
assert.equal(reordenados.find(item => item.contentId === 'ep')?.contentId, 'ep');
assert.equal(proximaOrdem('clube', reordenados), 3);

const semAtalho = reordenados.filter(item => item.contentId !== 'ep');
assert.equal(itensDoClube('clube', semAtalho, [episodio, exclusiva]).some(item => item.content.id === 'ep'), false);
assert.equal(episodio.seriesId, 'q1');

assert.equal(
  rotuloDaOrigem(episodio, [serie, quadro]),
  'Quadro · Clube do mês · Descomplicando · Ep. 4',
);

const html = htmlInicialDoClube();
for (const rotulo of ['Leitura do mês', 'Pauta do encontro', 'Materiais de apoio', 'Recados do apoio', 'O que falta fazer']) {
  assert.equal(html.includes(`[${rotulo}]`), true);
}

const familia: Serie = {
  ...serie,
  id: 'f1',
  name: 'Casa',
  tipoAgrupamento: 'familia',
};

const vinculoSerie: ClubeSerie = {
  id: 'vs1',
  userId: 'u',
  clubeId: 'clube',
  serieId: 's1',
  pastaId: 'pasta',
  ordem: 1,
  createdAt: '2026-01-04',
};

const pasta: ClubePasta = {
  id: 'pasta',
  userId: 'u',
  clubeId: 'clube',
  nome: 'Encontros',
  ordem: 1,
  createdAt: '2026-01-04',
  updatedAt: '2026-01-04',
};

const noClube = seriesDoClube('clube', [vinculoSerie], [serie, quadro, familia], pasta.id);
assert.equal(noClube.length, 1);
assert.equal(noClube[0].serie, serie);
assert.equal(noClube[0].serie.id, 's1');
assert.equal(serie.parentId, null);
assert.equal(serie.tipoAgrupamento, 'serie');
assert.deepEqual(seriesDoClube('clube', [vinculoSerie], [serie], null), []);
assert.deepEqual(
  candidatosDeSerie('clube', [vinculoSerie], [serie, quadro, familia]).map(item => item.id),
  ['q1'],
);
assert.equal(proximaOrdemDeSerie('clube', [vinculoSerie], 'pasta'), 2);
assert.equal(pasta.clubeId, 'clube');

const semSerie = seriesDoClube('clube', [], [serie], null);
assert.equal(semSerie.length, 0);
assert.equal(serie.id, 's1');

const movidos = moverConteudosDePasta([vinculo, vinculoExclusivo], 'clube', ['ep'], 'pasta');
const movido = movidos.find(item => item.contentId === 'ep');
assert.equal(movido?.pastaId, 'pasta');
assert.equal(movido?.contentId, 'ep');
assert.equal(episodio.seriesId, 'q1');
assert.equal(episodio.ordemEpisodio, 4);
assert.equal(movidos.find(item => item.contentId === 'peca')?.pastaId, null);

const porData = ordenarItensDoClube(
  itensDoClube('clube', [
    { ...vinculo, contentId: 'tarde', ordem: 1 },
    { ...vinculoExclusivo, contentId: 'cedo', ordem: 2 },
  ], [
    conteudo({ id: 'tarde', title: 'Tarde', seriesId: 's1', publishDate: '2026-05-01', createdAt: '2026-01-02' }),
    conteudo({ id: 'cedo', title: 'Cedo', seriesId: null, clubeId: 'clube', publishDate: '2026-03-01', createdAt: '2026-04-01' }),
  ]),
  'publicacao',
);
assert.deepEqual(porData.map(item => item.content.id), ['cedo', 'tarde']);
assert.equal(porData[0].content.seriesId, null);

console.log('ok - clubeLista');
