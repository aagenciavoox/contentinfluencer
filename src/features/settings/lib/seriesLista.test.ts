import assert from 'node:assert/strict';
import type { Content, Serie, Temporada } from '../../../lib/database.ts';
import {
  FILTROS_LISTA_PADRAO,
  aplicarOrdem,
  colunaDeOrdemDisponivel,
  contagemDoGrupo,
  episodiosDaPagina,
  filtrosListaAtivos,
  filtrosValidos,
  montarLista,
  ordenarLista,
  passaNosFiltros,
  planoMoverParaOFim,
  resolverAgrupar,
  resolverOrdem,
  setasDisponiveis,
  textoExibindo,
  type ContextoLista,
  type FiltrosLista,
} from './seriesLista.ts';
import { moverEpisodio } from './ordemEpisodios.ts';

const serie = (id: string, parentId: string | null, name = id) => ({ id, parentId, name } as unknown as Serie);
const series = [serie('s', null, 'Série'), serie('q1', 's', 'Quadro 1'), serie('q2', 's', 'Quadro 2'), serie('outra', null)];
const temporadas = [
  { id: 't1', serieId: 's', nome: 'T1', userId: 'u', createdAt: '2026-01-01' },
  { id: 't2', serieId: 's', nome: 'T2', userId: 'u', createdAt: '2026-01-02' },
] as Temporada[];
const contas = [
  { id: 'ig', nome: '@anne', rede: 'instagram' },
  { id: 'tt', nome: '@anne', rede: 'tiktok' },
] as ContextoLista['contas'];

let n = 0;
const ep = (id: string, seriesId: string, extra: Partial<Content> = {}): Content => ({
  id,
  seriesId,
  title: id,
  status: 'Roteiro',
  createdAt: `2026-01-${String(++n).padStart(2, '0')}T00:00:00Z`,
  updatedAt: '2026-02-01T00:00:00Z',
  archivedAt: null,
  deletedAt: null,
  temporadaId: null,
  publishDate: null,
  plataformas: [],
  ...extra,
} as unknown as Content);
const pub = (platformId: string, status: string) => ({ platformId, status, ciclo: 1 });

const contents = [
  ep('direto-ideia', 's', { status: 'Ideia', title: 'Café da manhã' }),
  ep('direto-t1', 's', { temporadaId: 't1' }),
  ep('q1-edicao', 'q1', { status: 'Edição', temporadaId: 't1', plataformas: [pub('ig', 'prevista')] as never }),
  // Duas contas, só uma publicada: continua Roteiro e aparece uma vez.
  ep('q2-duas', 'q2', { temporadaId: 't2', plataformas: [pub('ig', 'publicada'), pub('tt', 'prevista')] as never }),
  ep('q2-pub', 'q2', { status: 'Publicado', plataformas: [pub('tt', 'publicada')] as never }),
  ep('q2-pub', 'q2', { status: 'Publicado' }),
  ep('fora', 'outra'),
  ep('apagado', 's', { deletedAt: '2026-01-05T00:00:00Z' }),
  ep('temp-alheia', 'q1', { temporadaId: 'x-de-outra-serie' }),
];

const ctx: ContextoLista = { serieId: 's', series, contas, temporadasValidas: temporadas };
const episodios = episodiosDaPagina('s', series, contents);
assert.deepEqual(episodios.map(c => c.id), ['direto-ideia', 'direto-t1', 'q1-edicao', 'q2-duas', 'q2-pub', 'temp-alheia']);

const f = (patch: Partial<FiltrosLista>): FiltrosLista => ({ ...FILTROS_LISTA_PADRAO, ...patch });
const ids = (filtros: FiltrosLista) => episodios.filter(c => passaNosFiltros(c, filtros, ctx)).map(c => c.id);

// Etapa: Edição entra em Produção; parcial não é Postado.
assert.deepEqual(ids(f({ etapa: 'producao' })), ['q1-edicao']);
assert.deepEqual(ids(f({ etapa: 'postados' })), ['q2-pub']);
assert.deepEqual(ids(f({ etapa: 'roteiros' })), ['direto-t1', 'q2-duas', 'temp-alheia']);
// Quadro.
assert.deepEqual(ids(f({ quadro: 'sem' })), ['direto-ideia', 'direto-t1']);
assert.deepEqual(ids(f({ quadro: 'q2' })), ['q2-duas', 'q2-pub']);
// Conta: cada episódio uma vez, sem mexer nas publicações.
const antes = JSON.stringify(contents);
assert.deepEqual(ids(f({ conta: 'ig' })), ['q1-edicao', 'q2-duas']);
assert.deepEqual(ids(f({ conta: 'tt' })), ['q2-duas', 'q2-pub']);
assert.equal(JSON.stringify(contents), antes);
// Temporada: a de outra série conta como sem temporada.
assert.deepEqual(ids(f({ temporada: 'sem' })), ['direto-ideia', 'q2-pub', 'temp-alheia']);
assert.deepEqual(ids(f({ temporada: 't1' })), ['direto-t1', 'q1-edicao']);
// Combinações e busca sem acento.
assert.deepEqual(ids(f({ temporada: 't1', quadro: 'q1', etapa: 'producao' })), ['q1-edicao']);
assert.deepEqual(ids(f({ temporada: 't1', quadro: 'q2' })), []);
assert.deepEqual(ids(f({ busca: 'cafe' })), ['direto-ideia']);
assert.equal(filtrosListaAtivos(FILTROS_LISTA_PADRAO), false);
assert.equal(filtrosListaAtivos(f({ conta: 'ig' })), true);

// Agrupar: só apresentação, cada episódio num grupo só.
const porQuadro = montarLista({ episodios, filtros: FILTROS_LISTA_PADRAO, agrupar: 'quadro', ordem: 'criacao', ctx, temporadas });
assert.deepEqual(porQuadro.map(g => [g.id, g.contents.map(c => c.id)]), [
  ['sem-quadro', ['direto-ideia', 'direto-t1']],
  ['quadro:q1', ['q1-edicao', 'temp-alheia']],
  ['quadro:q2', ['q2-duas', 'q2-pub']],
]);
const porTemporada = montarLista({ episodios, filtros: FILTROS_LISTA_PADRAO, agrupar: 'temporada', ordem: 'criacao', ctx, temporadas });
assert.deepEqual(porTemporada.map(g => [g.id, g.contents.map(c => c.id)]), [
  ['temporada:t1', ['direto-t1', 'q1-edicao']],
  ['temporada:t2', ['q2-duas']],
  ['sem-temporada', ['direto-ideia', 'q2-pub', 'temp-alheia']],
]);
const nenhum = montarLista({ episodios, filtros: FILTROS_LISTA_PADRAO, agrupar: 'nenhum', ordem: 'criacao', ctx, temporadas });
assert.equal(nenhum.length, 1);
assert.equal(nenhum[0].contents.length, 6);
assert.equal(JSON.stringify(contents), antes);
// Com filtro, grupos vazios somem e a contagem vira "X de Y".
const filtrado = montarLista({ episodios, filtros: f({ etapa: 'producao' }), agrupar: 'quadro', ordem: 'criacao', ctx, temporadas });
assert.deepEqual(filtrado.map(g => g.id), ['quadro:q1']);
assert.equal(contagemDoGrupo(filtrado[0].visiveis, filtrado[0].total, true), '1 de 2 episódios');
assert.equal(contagemDoGrupo(8, 8, false), '8 episódios');
assert.equal(textoExibindo(3, 8), 'Exibindo 3 de 8 episódios');

// Escolha lembrada e volta para uma válida.
assert.equal(resolverAgrupar(undefined, { temQuadros: true, temTemporadas: false }), 'quadro');
assert.equal(resolverAgrupar(undefined, { temQuadros: false, temTemporadas: true }), 'nenhum');
assert.equal(resolverAgrupar('temporada', { temQuadros: true, temTemporadas: true }), 'temporada');
assert.equal(resolverAgrupar('temporada', { temQuadros: true, temTemporadas: false }), 'quadro');
assert.equal(resolverAgrupar('rede', { temQuadros: false, temTemporadas: false }), 'nenhum');
assert.equal(resolverOrdem('manual', true), 'manual');
assert.equal(resolverOrdem('manual', false), 'publicacao');
assert.equal(resolverOrdem('lixo', true), 'manual');
assert.deepEqual(filtrosValidos(f({ quadro: 'sumiu', temporada: 't1', conta: 'ig' }), { quadros: ['q1'], contas: ['ig'], temporadas: null }), f({ conta: 'ig' }));

// Setas na ordem manual, sem filtro e com a coluna — também dentro do quadro.
const base = { ordem: 'manual' as const, filtros: FILTROS_LISTA_PADRAO, ordemDisponivel: true };
assert.equal(setasDisponiveis(base), true);
assert.equal(setasDisponiveis({ ...base, ordem: 'titulo' }), false);
assert.equal(setasDisponiveis({ ...base, filtros: f({ busca: 'x' }) }), false);
assert.equal(setasDisponiveis({ ...base, ordemDisponivel: false }), false);
assert.equal(colunaDeOrdemDisponivel([{}, { ordemEpisodio: undefined }]), false);
assert.equal(colunaDeOrdemDisponivel([{ ordemEpisodio: null }]), true);

// Ordem estável: números antes, depois criação, depois id; repetir não muda.
const a = ep('a', 's', { ordemEpisodio: 2 } as never), b = ep('b', 's', { ordemEpisodio: 1 } as never), c = ep('c', 's'), d = ep('d', 's');
assert.deepEqual(ordenarLista([d, c, a, b], 'manual').map(x => x.id), ['b', 'a', 'c', 'd']);
assert.deepEqual(ordenarLista(ordenarLista([d, c, a, b], 'manual'), 'manual').map(x => x.id), ['b', 'a', 'c', 'd']);
// Publicação: sem data no fim, empate pela ordem manual.
const p1 = ep('p1', 's', { publishDate: '2026-03-02', ordemEpisodio: 2 } as never);
const p2 = ep('p2', 's', { publishDate: '2026-03-02', ordemEpisodio: 1 } as never);
const p3 = ep('p3', 's', { publishDate: '2026-03-01' } as never);
assert.deepEqual(ordenarLista([c, p1, p2, p3], 'publicacao').map(x => x.id), ['p3', 'p2', 'p1', 'c']);
// Ordenar em grupo reproduz a ordem relativa da manual.
const grupos = montarLista({ episodios: [a, b, c, d], filtros: FILTROS_LISTA_PADRAO, agrupar: 'nenhum', ordem: 'manual', ctx, temporadas });
assert.deepEqual(grupos[0].contents.map(x => x.id), ['b', 'a', 'c', 'd']);

// Mover para o fim: sem número nos outros, renumera tudo e o movido vai por último.
assert.deepEqual(planoMoverParaOFim([c, d, ep('e', 's')], new Set(['c'])).map(x => [x.id, x.ordemEpisodio]), [['d', 1], ['e', 2], ['c', 3]]);
// Com números, só muda quem precisa.
const m1 = ep('m1', 's', { ordemEpisodio: 1 } as never), m2 = ep('m2', 's', { ordemEpisodio: 2 } as never), m3 = ep('m3', 's', { ordemEpisodio: 3 } as never);
assert.deepEqual(planoMoverParaOFim([m1, m2, m3], new Set(['m1'])), [{ id: 'm2', ordemEpisodio: 1 }, { id: 'm3', ordemEpisodio: 2 }, { id: 'm1', ordemEpisodio: 3 }]);
assert.deepEqual(planoMoverParaOFim([m1, m2, m3], new Set(['m3'])), []);
// Dois movidos mantêm a ordem entre eles.
assert.deepEqual(planoMoverParaOFim([m1, m2, m3], new Set(['m2', 'm1'])).map(x => x.id), ['m3', 'm1', 'm2']);

// Reordenar muda só o número: título, datas, série, temporada e contas ficam.
const lista = [m1, m2, m3];
const novas = moverEpisodio(lista, 'm3', 'subir').map(x => ({ id: x.item.id, ordemEpisodio: x.ordemEpisodio }));
const depois = aplicarOrdem(lista, novas);
assert.deepEqual(depois.map(x => [x.id, x.ordemEpisodio]), [['m1', 1], ['m2', 3], ['m3', 2]]);
for (const [i, item] of depois.entries()) {
  const { ordemEpisodio: _o, ...resto } = item;
  const { ordemEpisodio: _p, ...original } = lista[i];
  assert.deepEqual(resto, original);
}
assert.equal(depois[1].updatedAt, '2026-02-01T00:00:00Z');

console.log('seriesLista: ok');
