import assert from 'node:assert/strict';
import type { Anotacao, BibliotecaItem } from '../../../lib/database';
import {
  buildLibraryPeriodAnalysis,
  consumedFromHistory,
  findPeriod,
  formatConsumption,
  libraryPeriodOptions,
  periodRangeText,
} from './libraryPeriodAnalysis.ts';

function item(id: string, tipo: BibliotecaItem['tipo'], status: BibliotecaItem['status'], extra: Partial<BibliotecaItem> = {}): BibliotecaItem {
  return {
    id, userId: 'u', tipo, titulo: id, autorDiretor: '', capaUrl: null, status,
    dataInicio: null, dataFim: null, avaliacao: null, notasGerais: null, potencialConteudo: null,
    totalPaginas: null, paginasLidas: null, generoIds: [], anotacoes: [],
    createdAt: '2025-01-01T12:00:00.000Z', updatedAt: '2025-01-01T12:00:00.000Z', deletedAt: null,
    ...extra,
  } as BibliotecaItem;
}

function note(id: string, createdAt: string): Anotacao {
  return { id, userId: 'u', itemId: 'x', texto: id, tipo: 'Anotação', capituloRef: null, contentPotential: false, createdAt, deletedAt: null };
}

const now = new Date(2026, 9, 16, 12);
const d = (y: number, m: number, day = 10) => new Date(y, m, day, 12).toISOString();

// Opções de período: atual + anteriores em cada granularidade.
const options = libraryPeriodOptions([item('old', 'livro', 'Lido', { dataFim: d(2023, 3) })], now);
const ids = options.map(option => option.id);
assert.equal(ids[0], 'ano:2026');
assert.ok(ids.includes('semestre:2026-S2'));
assert.ok(ids.includes('semestre:2026-S1'));
assert.ok(ids.includes('trimestre:2026-T4'));
assert.ok(ids.includes('trimestre:2026-T3'));
assert.ok(ids.includes('trimestre:2026-T1'));
assert.ok(ids.includes('ano:2025'));
assert.ok(ids.includes('ano:2023'));
const year = findPeriod(options, 'ano:2026');
assert.equal(year.current, true);
assert.equal(periodRangeText(year, now), 'Entre janeiro e outubro');
assert.equal(periodRangeText(findPeriod(options, 'trimestre:2026-T3'), now), 'Entre julho e setembro');
assert.equal(findPeriod(options, 'nao-existe').id, 'ano:2026');

const items: BibliotecaItem[] = [
  item('livro-2026', 'livro', 'Lido', { dataFim: d(2026, 1), totalPaginas: 300, avaliacao: 4, generoIds: ['g1'] }),
  item('livro-2025', 'livro', 'Lido', { dataFim: d(2025, 5), totalPaginas: 200, avaliacao: 2 }),
  item('livro-lendo', 'livro', 'Lendo', { totalPaginas: 400, paginasLidas: 120, updatedAt: d(2026, 8), generoIds: ['g1', 'g2'] }),
  item('livro-lendo-velho', 'livro', 'Lendo', { totalPaginas: 100, paginasLidas: 50, updatedAt: d(2025, 8) }),
  item('manga', 'manga', 'Lido', { dataFim: d(2026, 7), totalPaginas: 180 }),
  item('filme', 'filme', 'Assistido', { dataFim: d(2026, 3), ficha: { duracao: '2h 10min' } }),
  item('serie', 'série', 'Assistindo', { paginasLidas: 6, totalPaginas: 10, updatedAt: d(2026, 9), ficha: { duracaoPorEpisodio: '45 min' } }),
  item('anime', 'anime', 'Assistido', { dataFim: d(2026, 2), ficha: { episodios: '12' } }),
  item('apagado', 'livro', 'Lido', { dataFim: d(2026, 1), totalPaginas: 999, deletedAt: d(2026, 2) }),
  item('anotado', 'livro', 'Quero ler', { anotacoes: [note('n1', d(2026, 4)), note('n2', d(2026, 5)), note('n3', d(2024, 5))] }),
];
const generos = [
  { id: 'g1', userId: 'u', nome: 'Fantasia', tipo: null, createdAt: '' },
  { id: 'g2', userId: 'u', nome: 'Drama', tipo: null, createdAt: '' },
];

const all = buildLibraryPeriodAnalysis(items, year, 'todos', generos);
assert.equal(all.inCollection, 9, 'item apagado não conta');
assert.equal(all.completed, 4, 'só concluídos com dataFim em 2026');
assert.equal(all.active, 3, 'em andamento é a situação atual, independe do período');
assert.equal(all.notes, 2);
assert.equal(all.itemsAnnotated, 1);
assert.deepEqual(all.topAnnotated.map(entry => [entry.id, entry.notes]), [['anotado', 2]]);
assert.deepEqual(all.genres.map(entry => [entry.label, entry.count]), [['Fantasia', 2], ['Drama', 1]]);
assert.equal(all.ratings.count, 1);
assert.equal(all.ratings.average, 4);

const row = (id: string) => all.formats.find(entry => entry.id === id)!;
// Livros: 300 (concluído em 2026) + 120 (lendo, atualizado em 2026). O de 2025 e o lendo antigo ficam fora.
assert.equal(row('livro').amount, 420);
assert.equal(row('livro').inCollection, 5);
assert.equal(row('livro').completed, 1);
assert.equal(row('livro').active, 2);
assert.equal(formatConsumption(row('livro')), '420 páginas');
assert.equal(formatConsumption(row('manga')), '180 capítulos', 'mangá conta capítulos por padrão');
assert.equal(row('filme').amount, 130);
assert.equal(formatConsumption(row('filme')), '2h 10min');
assert.equal(formatConsumption(row('série')), '6 episódios · 4h 30min');
assert.equal(formatConsumption(row('anime')), '12 episódios', 'sem duração por episódio, sem horas');
assert.equal(formatConsumption(row('quadrinho')), '—');
assert.deepEqual(all.formats.map(entry => entry.id), ['livro', 'manga', 'quadrinho', 'filme', 'série', 'anime']);

// Trimestre anterior (T3 2026): só o mangá concluído em agosto e o livro lendo atualizado em setembro.
const q3 = buildLibraryPeriodAnalysis(items, findPeriod(options, 'trimestre:2026-T3'), 'todos', generos);
assert.equal(q3.completed, 1);
assert.equal(q3.formats.find(entry => entry.id === 'livro')!.amount, 120);
assert.equal(q3.formats.find(entry => entry.id === 'manga')!.amount, 180);
assert.equal(q3.notes, 0);

// Filtro de formato.
const onlyBooks = buildLibraryPeriodAnalysis(items, year, 'livro', generos);
assert.equal(onlyBooks.inCollection, 5);
assert.equal(onlyBooks.completed, 1);
assert.deepEqual(onlyBooks.formats.map(entry => entry.id), ['livro']);
assert.ok(onlyBooks.activeItems.every(entry => entry.tipo === 'livro'));

// Histórico de progresso: soma dos avanços no período; sem histórico, cai na estimativa.
const ev = (id: string, occurredAt: string, delta: number, valorAtual: number) => ({ id, itemId: 'h', occurredAt, delta, valorAtual, unidade: 'paginas' as const });
const history = [ev('e1', d(2025, 11), 50, 50), ev('e2', d(2026, 1), 100, 150), ev('e3', d(2026, 7), -20, 130), ev('e4', d(2026, 8), 70, 200)];
assert.equal(consumedFromHistory(history, year), 170, 'só avanços de 2026; retrocesso não desconta');
assert.equal(consumedFromHistory(history, findPeriod(options, 'trimestre:2026-T3')), 70);
const withHistory = buildLibraryPeriodAnalysis([
  item('h', 'livro', 'Lido', { dataFim: d(2026, 8), totalPaginas: 400, progressoEventos: history }),
  item('sem-historico', 'livro', 'Lido', { dataFim: d(2026, 8), totalPaginas: 300 }),
  item('manga-h', 'manga', 'Lendo', { paginasLidas: 30, updatedAt: d(2026, 9), progressoEventos: [
    { id: 'm1', itemId: 'manga-h', occurredAt: d(2026, 9), delta: 12, valorAtual: 30, unidade: 'capitulos' },
  ] }),
], year, 'todos');
assert.equal(withHistory.formats.find(entry => entry.id === 'livro')!.amount, 170 + 300, 'histórico + estimativa para quem não tem');
assert.equal(formatConsumption(withHistory.formats.find(entry => entry.id === 'manga')!), '12 capítulos');
assert.equal(withHistory.completed, 2);

// Gêneros chegam como nome nos itens; sem cadastro, o próprio valor vira rótulo.
const byName = buildLibraryPeriodAnalysis([item('g', 'livro', 'Lido', { generoIds: ['Terror'] })], year, 'todos');
assert.deepEqual(byName.genres.map(entry => entry.label), ['Terror']);

console.log('libraryPeriodAnalysis tests passed');
