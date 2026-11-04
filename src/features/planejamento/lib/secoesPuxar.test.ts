import assert from 'node:assert/strict';
import type {Content, Serie, Temporada} from '../../../lib/database.ts';
import type {PreferenciaLista} from '../../settings/lib/preferenciaLista.ts';
import {posicoesNaSerie, secoesDaSerie} from './secoesPuxar.ts';

const serie = (id: string, name: string, parentId: string | null, usaTemporadas = false) =>
  ({id, name, parentId, usaTemporadas} as unknown as Serie);
const series = [
  serie('s-res', 'Resenhas', null, true),
  serie('q-cla', 'Clássicos', 's-res'),
  serie('q-bru', 'Brasileiros', 's-res'),
  serie('s-hum', 'Humor', null),
];
const temporadas = [
  {id: 't2', userId: 'u', serieId: 's-res', nome: 'Temporada 2', createdAt: '2026-02-01'},
  {id: 't1', userId: 'u', serieId: 's-res', nome: 'Temporada 1', createdAt: '2026-01-01'},
] as Temporada[];

let n = 0;
const ep = (id: string, seriesId: string | null, extra: Partial<Content> = {}): Content => ({
  id,
  title: id,
  seriesId,
  status: 'Roteiro',
  publishDate: null,
  temporadaId: null,
  plataformas: [],
  createdAt: `2026-01-${String(++n).padStart(2, '0')}T00:00:00Z`,
  updatedAt: '2026-02-01T00:00:00Z',
  archivedAt: null,
  deletedAt: null,
  ...extra,
} as unknown as Content);

const comPreferencia = (salvas: Record<string, PreferenciaLista> = {}, ordemDisponivel = true) => ({
  preferencia: (id: string) => salvas[id] ?? {},
  ordemDisponivel,
});
const resumo = (secoes: ReturnType<typeof secoesDaSerie>) =>
  secoes.map(secao => [secao.rotulo, secao.contents.map(item => item.id)]);

const lista = [
  ep('c', 'q-cla', {ordemEpisodio: 1}),
  ep('b', 's-res', {temporadaId: 't1', ordemEpisodio: 2}),
  ep('a', 's-res', {temporadaId: 't1', ordemEpisodio: 1}),
  ep('d', 's-res', {temporadaId: 't2', ordemEpisodio: 3}),
  ep('e', 's-res', {temporadaId: null, ordemEpisodio: null}),
  ep('f', 'q-bru', {ordemEpisodio: null}),
];

function testSemPreferenciaSalvaAgrupaPorQuadroEmOrdemManual() {
  const secoes = secoesDaSerie(lista, ['s-res'], series, temporadas, comPreferencia());
  assert.deepEqual(resumo(secoes), [
    ['Sem quadro', ['a', 'b', 'd', 'e']],
    ['Brasileiros', ['f']],
    ['Clássicos', ['c']],
  ]);
  assert.ok(secoes.every(secao => secao.numerar));
}

function testPreferenciaPorTemporadaPoeAsTemporadasPrimeiroESemTemporadaPorUltimo() {
  const secoes = secoesDaSerie(lista, ['s-res'], series, temporadas, comPreferencia({'s-res': {agrupar: 'temporada'}}));
  assert.deepEqual(resumo(secoes), [
    ['Temporada 1', ['a', 'b']],
    ['Temporada 2', ['d']],
    ['Sem temporada', ['c', 'e', 'f']],
  ]);
}

function testPreferenciaDeOrdemETituloNaoNumera() {
  const secoes = secoesDaSerie(lista, ['s-res'], series, temporadas, comPreferencia({'s-res': {agrupar: 'nenhum', ordem: 'titulo'}}));
  assert.deepEqual(resumo(secoes), [[null, ['a', 'b', 'c', 'd', 'e', 'f']]]);
  assert.equal(secoes[0].numerar, false);
}

function testSemColunaDeOrdemCaiNaPublicacao() {
  const secoes = secoesDaSerie(lista, ['s-res'], series, temporadas, comPreferencia({'s-res': {agrupar: 'nenhum', ordem: 'manual'}}, false));
  // Sem data de publicação, vale a ordem manual e depois a de criação: c, b, a, d, e, f viraram manual 1,2,3 + sem número.
  assert.deepEqual(resumo(secoes), [[null, ['c', 'a', 'b', 'd', 'e', 'f']]]);
  assert.equal(secoes[0].numerar, false);
}

function testPreferenciaInvalidaVoltaAoPadrao() {
  // "temporada" numa série sem temporadas não vale: Humor não tem quadro nem temporada, fica sem cabeçalho.
  const humor = [ep('y', 's-hum', {ordemEpisodio: 2}), ep('x', 's-hum', {ordemEpisodio: 1})];
  const secoes = secoesDaSerie(humor, ['s-hum'], series, temporadas, comPreferencia({'s-hum': {agrupar: 'temporada'}}));
  assert.deepEqual(resumo(secoes), [[null, ['x', 'y']]]);
}

function testVariasSeriesPrefixamONomeECadaUmaSegueASuaPreferencia() {
  const itens = [ep('x', 's-hum'), ep('c', 'q-cla', {temporadaId: 't1'})];
  const secoes = secoesDaSerie(itens, ['s-hum', 's-res'], series, temporadas, comPreferencia({'s-res': {agrupar: 'temporada'}}));
  assert.deepEqual(secoes.map(secao => secao.rotulo), ['Humor', 'Resenhas · Temporada 1']);
}

function testQuadroEscolhidoJuntoComASerieNaoDuplica() {
  const secoes = secoesDaSerie([ep('c', 'q-cla')], ['q-cla', 's-res'], series, temporadas, comPreferencia());
  assert.equal(secoes.length, 1);
  assert.deepEqual(secoes[0].contents.map(item => item.id), ['c']);
}

function testPosicaoNaoRecontaQuemOModalEsconde() {
  // A conta usa a série inteira. Quem o modal esconde continua ocupando o lugar.
  const todas = posicoesNaSerie(lista, ['s-res'], series, temporadas, comPreferencia({'s-res': {agrupar: 'temporada'}}));
  assert.equal(todas.get('a')?.indicativo, '1 de 2 ep da Temporada 1');
  assert.equal(todas.get('b')?.indicativo, '2 de 2 ep da Temporada 1');
  assert.equal(todas.get('d')?.indicativo, '1 de 1 ep da Temporada 2');
  assert.equal(todas.get('b')?.numero, 2);
}

function testForaDaEscolhaNaoSome() {
  const secoes = secoesDaSerie([ep('x', 's-hum'), ep('z', null)], ['s-hum'], series, temporadas, comPreferencia());
  assert.deepEqual(resumo(secoes), [[null, ['x']], ['Outros', ['z']]]);
}

testSemPreferenciaSalvaAgrupaPorQuadroEmOrdemManual();
testPreferenciaPorTemporadaPoeAsTemporadasPrimeiroESemTemporadaPorUltimo();
testPreferenciaDeOrdemETituloNaoNumera();
testSemColunaDeOrdemCaiNaPublicacao();
testPreferenciaInvalidaVoltaAoPadrao();
testVariasSeriesPrefixamONomeECadaUmaSegueASuaPreferencia();
testQuadroEscolhidoJuntoComASerieNaoDuplica();
testPosicaoNaoRecontaQuemOModalEsconde();
testForaDaEscolhaNaoSome();
