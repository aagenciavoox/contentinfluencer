import assert from 'node:assert/strict';
import type { Content, Serie, Temporada } from '../../../lib/database.ts';
import {
  ROTULO_SEM_QUADRO,
  alternarVarios,
  aplicarMovimento,
  chaveDaSelecao,
  depoisDoEnvio,
  destinosDeQuadro,
  estadoDaMarcacao,
  ordemAposSeta,
  ordemAposSetaNaSecao,
  ordemFinalNoFim,
  planoDefinirQuadro,
  planoDefinirTemporada,
  temporadasComuns,
} from './selecaoEpisodios.ts';
import { FILTROS_LISTA_PADRAO, ROTULO_SO_YOUTUBE, episodiosDaPagina, exibidosDoGrupo, montarLista, separarSoYoutube, type ContextoLista } from './seriesLista.ts';

const serie = (id: string, parentId: string | null, extra: Partial<Serie> = {}) =>
  ({ id, parentId, name: id.toUpperCase(), ativa: true, pilarIds: [], ...extra } as unknown as Serie);
const series = [
  serie('s', null, { usaTemporadas: true, pilarPrincipalId: 'p-s', funcaoPadrao: 'atrair' } as Partial<Serie>),
  serie('q1', 's', { pilarPrincipalId: 'p-q1', funcaoPadrao: 'converter' } as Partial<Serie>),
  serie('q2', 's'),
  serie('q3', 's', { ativa: false }),
  serie('outra', null, { usaTemporadas: true }),
];
const temporadas = [
  { id: 't1', serieId: 's', nome: 'T1', userId: 'u', createdAt: '1' },
  { id: 't2', serieId: 's', nome: 'T2', userId: 'u', createdAt: '2' },
  { id: 'tx', serieId: 'outra', nome: 'TX', userId: 'u', createdAt: '3' },
] as Temporada[];

let n = 0;
const ep = (id: string, seriesId: string, extra: Partial<Content> = {}): Content => ({
  id, seriesId, title: id, status: 'Roteiro', script: `roteiro ${id}`, legendaBase: `legenda ${id}`,
  publishDate: '2026-03-01', createdAt: `2026-01-${String(++n).padStart(2, '0')}`, updatedAt: '2026-02-01',
  archivedAt: null, deletedAt: null, temporadaId: null, plataformas: [{ platformId: 'ig', status: 'publicada', ciclo: 1 }],
  pilarId: null, pilarOrigem: null, funcao: null, funcaoOrigem: null, classificacaoCongeladaEm: null,
  ...extra,
} as unknown as Content);

// Marcação do grupo: nenhum, parcial e todos; alternar só mexe nos ids do grupo.
assert.equal(estadoDaMarcacao([], new Set()), 'nenhum');
assert.equal(estadoDaMarcacao(['a', 'b'], new Set(['a'])), 'parcial');
assert.equal(estadoDaMarcacao(['a', 'b'], new Set(['a', 'b', 'z'])), 'todos');
assert.deepEqual([...alternarVarios(new Set(['a', 'z']), ['a', 'b'])].sort(), ['a', 'b', 'z']);
assert.deepEqual([...alternarVarios(new Set(['a', 'b', 'z']), ['a', 'b'])], ['z']);

// Seleção com filtros: o grupo marca só os visíveis dele.
const contents = [
  ep('d1', 's', { status: 'Ideia' }),
  ep('d2', 's', { temporadaId: 't1' }),
  ep('a1', 'q1', { temporadaId: 't1' }),
  ep('a2', 'q1', { status: 'Ideia' }),
  ep('b1', 'q2', { temporadaId: 't2' }),
];
const ctx: ContextoLista = { serieId: 's', series, contas: [], temporadasValidas: temporadas.slice(0, 2) };
const episodios = episodiosDaPagina('s', series, contents);
const grupos = montarLista({ episodios, filtros: { ...FILTROS_LISTA_PADRAO, etapa: 'ideias' }, agrupar: 'quadro', ordem: 'criacao', ctx, temporadas });
const q1 = grupos.find(g => g.id === 'quadro:q1')!;
assert.deepEqual(alternarVarios(new Set(), q1.contents.map(c => c.id)), new Set(['a2']));
// Recolher ou trocar agrupamento não muda a chave; busca e filtros mudam.
assert.equal(chaveDaSelecao(FILTROS_LISTA_PADRAO), chaveDaSelecao({ ...FILTROS_LISTA_PADRAO }));
assert.notEqual(chaveDaSelecao(FILTROS_LISTA_PADRAO), chaveDaSelecao({ ...FILTROS_LISTA_PADRAO, busca: 'x' }));
assert.equal(chaveDaSelecao({ ...FILTROS_LISTA_PADRAO, busca: 'x ' }), chaveDaSelecao({ ...FILTROS_LISTA_PADRAO, busca: 'x' }));

// Falha mantém seleção e formulário; sucesso limpa.
const sel = new Set(['a1', 'b1']);
assert.deepEqual(depoisDoEnvio(false, sel), { selecionados: sel, formularioAberto: true });
assert.deepEqual(depoisDoEnvio(true, sel), { selecionados: new Set(), formularioAberto: false });

// Destinos: sem quadro primeiro, só quadros ativos.
assert.deepEqual(destinosDeQuadro('s', series), [
  { id: 's', label: ROTULO_SEM_QUADRO }, { id: 'q1', label: 'Q1' }, { id: 'q2', label: 'Q2' },
]);

// Definir quadro: quem já está no destino fica de fora; herdado muda, manual fica; texto, contas, datas e etapa ficam.
const herdado = ep('h', 's', { pilarId: 'p-s', pilarOrigem: 'herdada', funcao: 'atrair', funcaoOrigem: 'herdada', temporadaId: 't1' } as Partial<Content>);
const manual = ep('m', 's', { pilarId: 'p-meu', pilarOrigem: 'escolhida', funcao: 'reter', funcaoOrigem: 'escolhida', status: 'Edição' } as Partial<Content>);
const jaLa = ep('j', 'q1');
const plano = planoDefinirQuadro([herdado, manual, jaLa], 'q1', series, temporadas, '2026-11-02T00:00:00Z');
assert.deepEqual(plano.jaNoDestino, ['j']);
assert.deepEqual(plano.mudam.map(c => c.id), ['h', 'm']);
const [h2, m2] = plano.mudam;
assert.equal(h2.seriesId, 'q1');
assert.equal(h2.pilarId, 'p-q1');
assert.equal(h2.funcao, 'converter');
assert.equal(h2.temporadaId, 't1'); // t1 é da série e vale no quadro.
assert.equal(m2.pilarId, 'p-meu');
assert.equal(m2.funcao, 'reter');
for (const [antes, depois] of [[herdado, h2], [manual, m2]] as const) {
  assert.equal(depois.script, antes.script);
  assert.equal(depois.legendaBase, antes.legendaBase);
  assert.deepEqual(depois.plataformas, antes.plataformas);
  assert.equal(depois.publishDate, antes.publishDate);
  assert.equal(depois.status, antes.status);
  assert.equal(depois.title, antes.title);
}
assert.deepEqual(plano.perdemTemporada, []);
// Temporada que não vale no destino: avisada, não some calada.
const deFora = ep('f', 's', { temporadaId: 'tx' });
const perde = planoDefinirQuadro([deFora], 'q2', series, temporadas, 'agora');
assert.deepEqual(perde.perdemTemporada.map(c => c.id), ['f']);

// Temporadas em comum.
assert.deepEqual(temporadasComuns([ep('x', 's'), ep('y', 'q1')], series, temporadas).map(t => t.id), ['t1', 't2']);
assert.deepEqual(temporadasComuns([ep('x', 's'), ep('y', 'outra')], series, temporadas), []);
const semEscopo = [serie('solta', null)];
assert.deepEqual(temporadasComuns([ep('z', 'solta')], semEscopo, temporadas), []);

// Definir temporada: só temporadaId muda; quem já está nela fica de fora; conta quem troca.
const pt = planoDefinirTemporada([ep('t-a', 's', { temporadaId: 't1' }), ep('t-b', 'q1', { temporadaId: 't2' }), ep('t-c', 'q2')], 't2', 'agora');
assert.deepEqual(pt.jaNoDestino, ['t-b']);
assert.deepEqual(pt.mudam.map(c => [c.id, c.seriesId, c.temporadaId]), [['t-a', 's', 't2'], ['t-c', 'q2', 't2']]);
assert.equal(pt.substituem, 1);
assert.equal(planoDefinirTemporada([ep('t-d', 's', { temporadaId: 't1' })], null, 'agora').substituem, 1);

// Ordem: movidos vão para o fim; seta troca vizinhos; nas pontas, nada.
const o = (id: string, ordemEpisodio: number | null) => ep(id, 's', { ordemEpisodio } as Partial<Content>);
assert.deepEqual(ordemFinalNoFim([o('a', 1), o('b', 2), o('c', null)], new Set(['a'])), ['b', 'c', 'a']);
assert.deepEqual(ordemAposSeta([{ id: 'a' }, { id: 'b' }, { id: 'c' }], 'c', 'subir'), ['a', 'c', 'b']);
assert.equal(ordemAposSeta([{ id: 'a' }, { id: 'b' }], 'a', 'subir'), null);

// Aplicar no estado: sem duplicar, só os mudados trocam, ordem numerada, resto igual.
const base = [o('a', 1), o('b', 2), o('c', null)];
const antesJson = JSON.stringify(base);
const depois = aplicarMovimento(base, [{ ...base[0], seriesId: 'q1' }], ['b', 'c', 'a']);
assert.equal(depois.length, 3);
assert.deepEqual(depois.map(c => [c.id, c.seriesId, c.ordemEpisodio]), [['a', 'q1', 3], ['b', 's', 1], ['c', 's', 2]]);
assert.equal(depois[1].updatedAt, base[1].updatedAt);
assert.equal(depois[1].script, base[1].script);
assert.equal(JSON.stringify(base), antesJson);

// "Só YouTube": separa sem mudar a ordem nem a contagem do grupo; sem regra, não há bloco.
const yt = new Set(['a2', 'b1']);
const comYt = montarLista({ episodios, filtros: FILTROS_LISTA_PADRAO, agrupar: 'nenhum', ordem: 'criacao', ctx, temporadas, soYoutube: c => yt.has(c.id) });
assert.equal(comYt.length, 1);
assert.deepEqual(comYt[0].contents.map(c => c.id), ['d1', 'd2', 'a1']);
assert.deepEqual(comYt[0].blocos.map(b => [b.rotulo, b.total, b.contents.map(c => c.id)]), [[ROTULO_SO_YOUTUBE, 2, ['a2', 'b1']]]);
assert.equal(comYt[0].visiveis, 5);
assert.equal(montarLista({ episodios, filtros: FILTROS_LISTA_PADRAO, agrupar: 'nenhum', ordem: 'criacao', ctx, temporadas }).at(0)?.blocos.length, 0);
// Em cada grupo (quadro), o bloco é do grupo; a caixa do grupo cobre as duas partes.
const porQuadro = montarLista({ episodios, filtros: FILTROS_LISTA_PADRAO, agrupar: 'quadro', ordem: 'criacao', ctx, temporadas, soYoutube: c => yt.has(c.id) });
const gq1 = porQuadro.find(g => g.id === 'quadro:q1')!;
assert.deepEqual(exibidosDoGrupo(gq1).map(c => c.id), ['a1', 'a2']);
assert.equal(estadoDaMarcacao(exibidosDoGrupo(gq1).map(c => c.id), new Set(['a1'])), 'parcial');
assert.deepEqual(alternarVarios(new Set(), exibidosDoGrupo(gq1).map(c => c.id)), new Set(['a1', 'a2']));
// Com filtro, o bloco mostra só os visíveis mas guarda o total.
const sepFiltro = separarSoYoutube(['x', 'y', 'z'], ['x', 'z'], v => v !== 'x');
assert.deepEqual(sepFiltro, { principais: ['x'], soYt: ['z'], totalSoYt: 2 });

// Seta dentro da seção: troca com o vizinho da mesma seção na ordem completa; o resto fica.
const global = ['n1', 'y1', 'n2', 'y2', 'n3'];
assert.deepEqual(ordemAposSetaNaSecao(global, [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }], 'n2', 'subir'), ['n2', 'y1', 'n1', 'y2', 'n3']);
assert.deepEqual(ordemAposSetaNaSecao(global, [{ id: 'y1' }, { id: 'y2' }], 'y1', 'descer'), ['n1', 'y2', 'n2', 'y1', 'n3']);
assert.equal(ordemAposSetaNaSecao(global, [{ id: 'y1' }, { id: 'y2' }], 'y2', 'descer'), null);
assert.equal(new Set(ordemAposSetaNaSecao(global, [{ id: 'n1' }, { id: 'n2' }], 'n1', 'descer')).size, global.length);

console.log('selecaoEpisodios: ok');
