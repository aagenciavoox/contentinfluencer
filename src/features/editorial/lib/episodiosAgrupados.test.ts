import assert from 'node:assert/strict';
import type { Content } from '../../../lib/database.ts';
import { agruparEpisodios } from './episodiosAgrupados.ts';

const series = [
  { id: 'branbran', name: 'Branbran', parentId: null, usaTemporadas: true, userId: 'u', template: '', notes: '', slotPadrao: null, formatoVisualPadrao: [], estruturaRoteiro: null, bordao: null, cor: null, capaUrl: null, ativa: true, frequenciaRecomendada: null, funcaoPadrao: null, energiaPadrao: null, createdAt: '', updatedAt: '', pilarIds: [], plataformas: [] },
  { id: 'comece', name: 'Por onde começo?', parentId: 'branbran', usaTemporadas: false, userId: 'u', template: '', notes: '', slotPadrao: null, formatoVisualPadrao: [], estruturaRoteiro: null, bordao: null, cor: null, capaUrl: null, ativa: true, frequenciaRecomendada: null, funcaoPadrao: null, energiaPadrao: null, createdAt: '', updatedAt: '', pilarIds: [], plataformas: [] },
];

const temporadas = [
  { id: 't1', userId: 'u', serieId: 'branbran', nome: 'Temporada 1', createdAt: '2026-01-01' },
];

const contents: Content[] = [
  { id: 'c1', seriesId: 'comece', temporadaId: 't1', deletedAt: null, title: 'A', status: 'Roteiro', slotType: null, pilarId: null, lookId: null, cenarioId: null, bibliotecaItemId: null, formatoVisual: null, energiaNecessaria: null, funcao: null, funcaoOrigem: null, classificacaoCongeladaEm: null, contaNaGrade: true, publishDate: null, recordingDate: null, link: null, script: null, scriptNotes: [], tags: [], notes: null, referencias: null, createdAt: '', updatedAt: '', userId: 'u', plataformas: [] },
  { id: 'c2', seriesId: 'branbran', temporadaId: null, deletedAt: null, title: 'B', status: 'Roteiro', slotType: null, pilarId: null, lookId: null, cenarioId: null, bibliotecaItemId: null, formatoVisual: null, energiaNecessaria: null, funcao: null, funcaoOrigem: null, classificacaoCongeladaEm: null, contaNaGrade: true, publishDate: null, recordingDate: null, link: null, script: null, scriptNotes: [], tags: [], notes: null, referencias: null, createdAt: '', updatedAt: '', userId: 'u', plataformas: [] },
];

const grupos = agruparEpisodios({
  serieId: 'branbran',
  series,
  temporadas,
  contents: [...contents],
});

assert.ok(grupos.some(g => g.rotulo === 'Temporada 1'));
assert.ok(grupos.some(g => g.rotulo === 'Sem temporada'));
const t1 = grupos.find(g => g.id === 'temp:t1');
assert.ok(t1?.subgrupos.some(s => s.serieId === 'comece' && s.contents.some(c => c.id === 'c1')));

console.log('ok - episodiosAgrupados');
