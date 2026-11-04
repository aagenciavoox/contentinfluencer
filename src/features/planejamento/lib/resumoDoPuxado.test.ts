import assert from 'node:assert/strict';
import type { Content, Platform } from '../../../lib/database.ts';
import type { PublicacaoNaAgenda } from '../../editorial/lib/publicacoes.ts';
import { destinosDoResumo, legendaBaseDoResumo, resumoDasLegendas, textoDoResumo, trecho } from './resumoDoPuxado.ts';

const platforms = [
  { id: 'ig', nome: 'Anne', handle: '@anne', rede: 'instagram' },
  { id: 'tt', nome: 'Anne', handle: '@anne', rede: 'tiktok' },
] as unknown as Platform[];

const conteudo = (extra: Partial<Content> = {}): Content => ({
  id: 'c1',
  title: 'Resenha',
  status: 'Roteiro',
  legendaBase: 'Legenda base do conteúdo',
  plataformas: [
    { id: 'p-ig', contentId: 'c1', platformId: 'ig', legenda: '', hashtags: '', publishDate: null, legendaPropria: false },
    { id: 'p-tt', contentId: 'c1', platformId: 'tt', legenda: '', hashtags: '', publishDate: null, legendaPropria: true },
  ],
  ...extra,
} as unknown as Content);

const agenda = (extra: Partial<PublicacaoNaAgenda>[]): PublicacaoNaAgenda[] => extra.map(item => ({
  id: 'p-ig', contentId: 'c1', serieId: null, platformId: 'ig', rede: 'instagram', ciclo: 1, formato: 'reels',
  data: '2026-11-10', hora: '18:00', situacao: 'prevista', programado: false, contaNaMeta: true, etapa: 'roteiro', objetivo: null,
  ...item,
} as PublicacaoNaAgenda));

function testTrechoNaoCortaPalavra() {
  assert.deepEqual(trecho('um dois três', 100), { texto: 'um dois três', cortado: false });
  assert.deepEqual(trecho('palavra  grande\n\noutra', 12), { texto: 'palavra…', cortado: true });
}

function testDestinosComLegendaPorConta() {
  const destinos = destinosDoResumo(conteudo(), agenda([
    {},
    { id: 'p-tt', platformId: 'tt', rede: 'tiktok', data: null, hora: null, situacao: 'sem-data' },
    // Mesma conta duas vezes (ciclos) conta uma vez só.
    { id: 'p-ig-2', ciclo: 2 },
  ]), platforms);
  assert.equal(destinos.length, 2);
  assert.equal(destinos[0].nome, 'Instagram @anne');
  assert.equal(destinos[0].rotuloFormato, 'Reels');
  assert.equal(destinos[0].rotuloSituacao, 'prevista');
  // Usa a base: tem legenda.
  assert.deepEqual(destinos[0].legenda, { tem: true, estado: 'base', trecho: 'Legenda base do conteúdo' });
  // Versão própria vazia: sem legenda, mesmo com base.
  assert.deepEqual(destinos[1].legenda, { tem: false, estado: 'propria', trecho: '' });
  assert.equal(destinos[1].rotuloSituacao, 'sem data');
}

function testResumoDasLegendas() {
  const destinos = destinosDoResumo(conteudo(), agenda([{}, { id: 'p-tt', platformId: 'tt', rede: 'tiktok' }]), platforms);
  assert.equal(resumoDasLegendas(destinos, legendaBaseDoResumo(conteudo())), '1 de 2 contas com legenda');
  assert.equal(resumoDasLegendas([], legendaBaseDoResumo(conteudo())), 'Legenda-base pronta');
  assert.equal(resumoDasLegendas([], legendaBaseDoResumo(conteudo({ legendaBase: null }))), 'Sem legenda');
  assert.equal(resumoDasLegendas([destinos[0]], null), 'Com legenda');
}

function testTextoDoResumo() {
  // Select leve: corpo ausente.
  assert.deepEqual(textoDoResumo(conteudo()), { estado: 'carregando' });
  assert.deepEqual(textoDoResumo(conteudo({ script: '', notes: null })), { estado: 'vazio' });
  const pronto = textoDoResumo(conteudo({ script: '<p>Oi, <b>gente</b>.</p>', notes: null }));
  assert.deepEqual(pronto, { estado: 'pronto', trecho: 'Oi, gente.', palavras: 2, cortado: false });
  // Ideia sem roteiro mostra o texto da ideia.
  const ideia = textoDoResumo(conteudo({ status: 'Ideia', script: null, notes: 'Falar do livro novo' }));
  assert.equal(ideia.estado === 'pronto' && ideia.trecho, 'Falar do livro novo');
}

testTrechoNaoCortaPalavra();
testDestinosComLegendaPorConta();
testResumoDasLegendas();
testTextoDoResumo();
