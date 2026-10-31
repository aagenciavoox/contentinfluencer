import assert from 'node:assert/strict';
import type { Content, Serie, Temporada } from '../../../lib/database.ts';
import {
  contagensDasSeries,
  contarConteudos,
  pilarEfetivoDaSerie,
  textoRoteirosIdeias,
  tipoDaSerie,
  tipoSugeridoParaFilho,
} from './serieAgrupamento.ts';
import { FILTROS_PADRAO, contagemDoEscopo, destinoDoConteudo, montarSecoes, passaNoFiltro } from './seriesSecoes.ts';

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
} satisfies Omit<Serie, 'id' | 'name'>;

const series: Serie[] = [
  { ...serieBase, id: 'desc', name: 'Descomplicando', parentId: null, pilarPrincipalId: 'fantasia' },
  { ...serieBase, id: 'branbran', name: 'Descomplicando Branbran', parentId: 'desc', usaTemporadas: true },
  { ...serieBase, id: 'comece', name: 'Por onde começo?', parentId: 'branbran' },
  { ...serieBase, id: 'cosmere', name: 'Cosmere sem TCC', parentId: 'branbran' },
  { ...serieBase, id: 'tolkien', name: 'Descomplicando Tolkien', parentId: 'desc', semPilar: true },
  { ...serieBase, id: 'rpg', name: 'Livros por classe de RPG', parentId: null },
  { ...serieBase, id: 'quadro-solto', name: 'Quadro solto', parentId: 'rpg' },
];

// Tipo deduzido pela árvore quando não foi escolhido.
assert.equal(tipoDaSerie('desc', series), 'familia');
assert.equal(tipoDaSerie('branbran', series), 'serie');
assert.equal(tipoDaSerie('comece', series), 'quadro');
assert.equal(tipoDaSerie('tolkien', series), 'serie');
assert.equal(tipoDaSerie('rpg', series), 'serie');
assert.equal(tipoDaSerie('quadro-solto', series), 'quadro');
// Escolha explícita vence a dedução.
const comEscolha = series.map(item => (item.id === 'rpg' ? { ...item, tipoAgrupamento: 'familia' as const } : item));
assert.equal(tipoDaSerie('rpg', comEscolha), 'familia');
assert.equal(tipoDaSerie('quadro-solto', comEscolha), 'serie');
assert.equal(tipoSugeridoParaFilho('desc', series), 'serie');
assert.equal(tipoSugeridoParaFilho('branbran', series), 'quadro');
assert.equal(tipoSugeridoParaFilho(null, series), 'serie');
// Ciclo gravado no banco não trava a dedução.
assert.ok(['familia', 'serie', 'quadro'].includes(tipoDaSerie('a', [{ id: 'a', parentId: 'b' }, { id: 'b', parentId: 'a' }])));

// Pilar: herdar e "sem pilar" são coisas diferentes.
assert.deepEqual(pilarEfetivoDaSerie('comece', series), { pilarId: 'fantasia', origemSerieId: 'desc', estado: 'herdado' });
assert.deepEqual(pilarEfetivoDaSerie('desc', series), { pilarId: 'fantasia', origemSerieId: 'desc', estado: 'proprio' });
assert.deepEqual(pilarEfetivoDaSerie('tolkien', series), { pilarId: null, origemSerieId: 'tolkien', estado: 'sem-pilar' });
assert.deepEqual(pilarEfetivoDaSerie('rpg', series), { pilarId: null, origemSerieId: null, estado: 'vazio' });

const conteudo = (patch: Partial<Content> & Pick<Content, 'id'>): Content => ({
  title: patch.id,
  status: 'Roteiro',
  seriesId: null,
  temporadaId: null,
  deletedAt: null,
  archivedAt: null,
  plataformas: [],
  createdAt: `2026-10-0${patch.id.length % 9 + 1}`,
  updatedAt: '',
  ...patch,
} as Content);

const temporadas: Temporada[] = [
  { id: 't1', userId: 'u', serieId: 'branbran', nome: 'Temporada 1 — Portas de entrada', createdAt: '' },
  { id: 't2', userId: 'u', serieId: 'branbran', nome: 'Temporada 2', createdAt: '' },
];

const contents: Content[] = [
  conteudo({ id: 'c1', title: 'Por onde começar a ler Brandon Sanderson', seriesId: 'comece', temporadaId: 't1' }),
  conteudo({
    id: 'c2',
    title: 'Mistborn ou O Caminho dos Reis?',
    seriesId: 'comece',
    temporadaId: 't1',
    status: 'Produção',
  }),
  conteudo({ id: 'c3', title: 'Tress é uma boa porta de entrada?', seriesId: 'comece', temporadaId: 't1', status: 'Ideia' }),
  conteudo({
    id: 'c4',
    title: 'Preciso seguir uma ordem na Cosmere?',
    seriesId: 'comece',
    temporadaId: 't1',
    status: 'Publicado',
    plataformas: [
      { id: 'p1', contentId: 'c4', platformId: 'ig', legenda: '', hashtags: '', publishDate: null, status: 'publicada' },
      { id: 'p2', contentId: 'c4', platformId: 'yt', legenda: '', hashtags: '', publishDate: null, status: 'publicada' },
      { id: 'p3', contentId: 'c4', platformId: 'tt', legenda: '', hashtags: '', publishDate: null, status: 'publicada' },
    ],
  }),
  conteudo({ id: 'c5', title: 'Sem temporada', seriesId: 'comece' }),
  conteudo({ id: 'c6', title: 'Direto na série', seriesId: 'branbran', status: 'Ideia' }),
  conteudo({ id: 'c7', title: 'Cosmere', seriesId: 'cosmere', temporadaId: 't2' }),
  conteudo({ id: 'c8', title: 'Na lixeira', seriesId: 'comece', deletedAt: '2026-10-01' }),
  conteudo({ id: 'c9', title: 'Arquivado', seriesId: 'cosmere', archivedAt: '2026-10-01' }),
  conteudo({ id: 'c10', title: 'Na família', seriesId: 'desc' }),
];

// Um roteiro publicado em três contas continua sendo um roteiro.
assert.deepEqual(contarConteudos(contents.filter(item => item.id === 'c4')), {
  conteudos: 1,
  ideias: 0,
  roteiros: 1,
  publicacoes: 3,
});
// O mesmo conteúdo não conta duas vezes; lixeira e arquivo ficam fora.
assert.equal(contarConteudos([contents[0], contents[0], contents[7], contents[8]]).conteudos, 1);

const contagens = contagensDasSeries(series, contents);
assert.deepEqual(contagens.get('comece')?.total, { conteudos: 5, ideias: 1, roteiros: 4, publicacoes: 3 });
assert.deepEqual(contagens.get('branbran')?.diretos, { conteudos: 1, ideias: 1, roteiros: 0, publicacoes: 0 });
assert.equal(contagens.get('branbran')?.total.conteudos, 7);
// A família reconhece os conteúdos dos descendentes, cada um uma vez.
assert.equal(contagens.get('desc')?.total.conteudos, 8);
assert.equal(contagens.get('rpg')?.total.conteudos, 0);
assert.equal(textoRoteirosIdeias(contagens.get('comece')!.total), '4 roteiros · 1 ideia');
assert.equal(textoRoteirosIdeias(contagens.get('rpg')!.total), 'Nenhum conteúdo');

// "Roteiros" inclui Produção e Publicado.
assert.equal(passaNoFiltro(contents[1], { ...FILTROS_PADRAO, tipo: 'roteiros' }), true);
assert.equal(passaNoFiltro(contents[3], { ...FILTROS_PADRAO, tipo: 'roteiros' }), true);
assert.equal(passaNoFiltro(contents[2], { ...FILTROS_PADRAO, tipo: 'roteiros' }), false);
assert.equal(passaNoFiltro(contents[2], { ...FILTROS_PADRAO, tipo: 'ideias' }), true);
assert.equal(passaNoFiltro(contents[1], { ...FILTROS_PADRAO, etapa: 'producao' }), true);
assert.equal(passaNoFiltro(contents[0], { ...FILTROS_PADRAO, busca: 'brandon' }), true);
assert.equal(passaNoFiltro(contents[1], { ...FILTROS_PADRAO, busca: 'caminho dos reis' }), true);

// Página da série: diretos primeiro, depois um grupo por quadro, com temporadas dentro.
const secoes = montarSecoes({ serieId: 'branbran', series, temporadas, contents, filtros: FILTROS_PADRAO });
assert.deepEqual(secoes.map(secao => secao.id), ['direto', 'filho:cosmere', 'filho:comece']);
assert.equal(secoes[0].rotulo, 'Diretos na série');
const comece = secoes[2];
assert.equal(comece.contagem.conteudos, 5);
assert.deepEqual(comece.temporadas?.map(faixa => [faixa.rotulo, faixa.total]), [
  ['Temporada 1 — Portas de entrada', 4],
  ['Sem temporada', 1],
]);
assert.equal(secoes[1].temporadas?.[0].rotulo, 'Temporada 2');

// Filtro esconde grupos vazios, mas a contagem da seção continua sendo a do escopo inteiro.
const soIdeias = montarSecoes({
  serieId: 'branbran',
  series,
  temporadas,
  contents,
  filtros: { ...FILTROS_PADRAO, tipo: 'ideias' },
});
assert.deepEqual(soIdeias.map(secao => [secao.id, secao.visiveis, secao.contagem.conteudos]), [
  ['direto', 1, 1],
  ['filho:comece', 1, 5],
]);

// Página da temporada: só os conteúdos dela.
const daTemporada = montarSecoes({
  serieId: 'branbran',
  series,
  temporadas,
  contents,
  filtros: FILTROS_PADRAO,
  temporadaId: 't1',
});
assert.equal(daTemporada.reduce((soma, secao) => soma + secao.visiveis, 0), 4);

// O total da página não depende do filtro.
assert.equal(contagemDoEscopo({ serieId: 'branbran', series, contents }).conteudos, 7);
assert.equal(contagemDoEscopo({ serieId: 'branbran', series, contents, temporadaId: 't1' }).conteudos, 4);

// Quadro sem filhos nem temporadas: lista simples.
const solto = montarSecoes({ serieId: 'tolkien', series, temporadas, contents, filtros: FILTROS_PADRAO });
assert.equal(solto.length, 1);
assert.equal(solto[0].temporadas, null);
assert.equal(solto[0].rotulo, 'Conteúdos');

// Destino pelo nome da rede, com o progresso de publicação à parte.
const contas = [
  { id: 'ig', nome: 'Instagram', rede: 'instagram' as const },
  { id: 'yt', nome: 'YouTube', rede: 'youtube' as const },
  { id: 'tt', nome: 'TikTok', rede: 'tiktok' as const },
];
assert.deepEqual(destinoDoConteudo(contents[3], contas), {
  rotulo: 'Instagram · YouTube · TikTok',
  progresso: '3 de 3 publicados',
});
assert.deepEqual(destinoDoConteudo(contents[0], contas), { rotulo: '', progresso: null });

console.log('serieAgrupamento.test.ts: ok');
