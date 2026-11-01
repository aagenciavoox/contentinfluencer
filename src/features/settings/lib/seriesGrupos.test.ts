import assert from 'node:assert/strict';
import type { Content, ContentPlataforma, Platform, Serie, Temporada } from '../../../lib/database.ts';
import {
  agruparPadrao,
  conteudosQueMudam,
  modosDeAgrupar,
  montarGrupos,
  moverConteudo,
  redeDoBloco,
  redesDeCostume,
  redesDoConteudo,
  redesUsadas,
  rotuloDoModo,
} from './seriesGrupos.ts';
import { FILTROS_PADRAO } from './seriesSecoes.ts';

const contas = [
  { id: 'ig', nome: 'Instagram', rede: 'instagram', ativo: true },
  { id: 'tt', nome: 'TikTok', rede: 'tiktok', ativo: true },
  { id: 'yt', nome: 'Canal', rede: 'youtube', ativo: true },
  { id: 'yt2', nome: 'Cortes', rede: 'youtube', ativo: true },
] as Platform[];

function serie(id: string, extra: Partial<Serie> = {}): Serie {
  return { id, name: id, parentId: null, plataformas: [], ...extra } as Serie;
}

function publicacao(platformId: string, extra: Partial<ContentPlataforma> = {}): ContentPlataforma {
  return { id: `${platformId}-pub`, platformId, status: 'agendada', ...extra } as ContentPlataforma;
}

let ordem = 0;
function conteudo(id: string, extra: Partial<Content> = {}): Content {
  ordem += 1;
  return {
    id,
    title: id,
    status: 'roteiro',
    seriesId: 'ciencia',
    temporadaId: null,
    plataformas: [publicacao('ig'), publicacao('tt')],
    createdAt: `2026-10-${String(ordem).padStart(2, '0')}T10:00:00.000Z`,
    updatedAt: null,
    deletedAt: null,
    archivedAt: null,
    ...extra,
  } as Content;
}

const series = [
  serie('ciencia', {
    usaTemporadas: true,
    tipoAgrupamento: 'serie',
    plataformas: [{ serieId: 'ciencia', platformId: 'ig', hashtags: '' }, { serieId: 'ciencia', platformId: 'tt', hashtags: '' }],
  }),
  serie('sobre-voce', { parentId: 'ciencia', tipoAgrupamento: 'quadro' }),
  serie('sinais', { parentId: 'ciencia', tipoAgrupamento: 'quadro' }),
  serie('solta', { tipoAgrupamento: 'serie' }),
];
const temporadas = [
  { id: 't1', serieId: 'ciencia', nome: 'Temporada 1', createdAt: '2026-10-01' },
  { id: 't2', serieId: 'ciencia', nome: 'Temporada 2', createdAt: '2026-10-02' },
] as Temporada[];

// Duas contas de YouTube contam como uma rede só.
assert.deepEqual(redesDoConteudo(conteudo('a', { plataformas: [publicacao('yt'), publicacao('yt2')] }), contas), ['youtube']);
// Conta desmarcada não conta.
assert.deepEqual(
  redesDoConteudo(conteudo('b', { plataformas: [publicacao('ig'), publicacao('yt', { status: 'nao_publicada' })] }), contas),
  ['instagram'],
);

// O quadro sem contas usa as da série; sem contas em lugar nenhum, os destinos padrão.
assert.deepEqual([...redesDeCostume('sinais', series, contas, [])].sort(), ['instagram', 'tiktok']);
assert.deepEqual([...redesDeCostume('solta', series, contas, ['yt'])], ['youtube']);
assert.equal(redesDeCostume('solta', series, contas, []).size, 0);
// Sem contas e sem destinos padrão, valem as redes que os conteúdos usam.
const usadas = redesUsadas([conteudo('u1', { plataformas: [publicacao('yt')] }), conteudo('u2')], contas);
assert.deepEqual([...usadas].sort(), ['instagram', 'tiktok', 'youtube']);
assert.deepEqual([...redesDeCostume('solta', series, contas, [], usadas)].sort(), ['instagram', 'tiktok', 'youtube']);
assert.deepEqual([...redesDeCostume('solta', series, contas, ['yt'], usadas)], ['youtube']);

// Ganha bloco quem vai para uma rede só, quando a série costuma ir para mais de uma (ou para outra).
const costume = new Set(['instagram', 'tiktok'] as const);
assert.equal(redeDoBloco(['youtube'], costume), 'youtube');
assert.equal(redeDoBloco(['instagram'], costume), 'instagram');
assert.equal(redeDoBloco(['youtube'], new Set(['instagram', 'tiktok', 'youtube'] as const)), 'youtube');
assert.equal(redeDoBloco(['instagram', 'youtube'], costume), null);
assert.equal(redeDoBloco([], costume), null);
// Série que só posta no YouTube: só YouTube é o normal dela.
assert.equal(redeDoBloco(['youtube'], new Set(['youtube'] as const)), null);
assert.equal(redeDoBloco(['instagram'], new Set(['youtube'] as const)), 'instagram');
assert.equal(redeDoBloco(['youtube'], new Set()), null);

// Modos: temporada só quando a série usa temporadas e fora da página de uma temporada.
assert.deepEqual(modosDeAgrupar({ serieId: 'ciencia', series }), ['temporada', 'quadro', 'rede']);
assert.deepEqual(modosDeAgrupar({ serieId: 'sinais', series }), ['temporada', 'quadro', 'rede']);
assert.deepEqual(modosDeAgrupar({ serieId: 'ciencia', series, temporadaId: 't1' }), ['quadro', 'rede']);
assert.deepEqual(modosDeAgrupar({ serieId: 'solta', series }), ['quadro', 'rede']);
assert.equal(agruparPadrao(['temporada', 'quadro', 'rede']), 'temporada');
assert.equal(agruparPadrao(['quadro', 'rede']), 'quadro');
assert.equal(rotuloDoModo('quadro', 'serie', true), 'Quadro');
assert.equal(rotuloDoModo('quadro', 'familia', true), 'Série');
assert.equal(rotuloDoModo('quadro', 'serie', false), 'Nenhum');

const contents = [
  conteudo('choramos', { seriesId: 'sobre-voce', temporadaId: 't1' }),
  conteudo('cerebro', { seriesId: 'sinais', temporadaId: 't1' }),
  conteudo('luto', { seriesId: 'sobre-voce', temporadaId: 't1', plataformas: [publicacao('yt')] }),
  conteudo('so-insta', { temporadaId: 't1', plataformas: [publicacao('ig')] }),
  conteudo('sem-temporada', { plataformas: [] }),
  conteudo('arquivado', { temporadaId: 't1', archivedAt: '2026-10-20' }),
  conteudo('outra-serie', { seriesId: 'solta' }),
];
const base = {
  serieId: 'ciencia',
  tipo: 'serie' as const,
  series,
  temporadas,
  contents,
  contas,
  destinosPadrao: [],
  filtros: FILTROS_PADRAO,
};

// Por temporada: temporadas do escopo (vazias também), e "Sem temporada" só com conteúdo.
const porTemporada = montarGrupos({ ...base, agruparPor: 'temporada' });
assert.deepEqual(porTemporada.map(grupo => grupo.rotulo), ['Temporada 1', 'Temporada 2', 'Sem temporada']);
const t1 = porTemporada[0];
assert.equal(t1.temporadaId, 't1');
assert.equal(t1.total, 4);
assert.deepEqual(t1.contents.map(content => content.id), ['choramos', 'cerebro']);
assert.deepEqual(t1.blocos.map(bloco => [bloco.rotulo, bloco.contents.map(content => content.id)]), [
  ['Só Instagram', ['so-insta']],
  ['Só YouTube', ['luto']],
]);
assert.equal(porTemporada[1].total, 0);

// Série sem contas em que tudo vai só para o YouTube: é o normal dela, sem bloco.
const soYoutube = montarGrupos({
  ...base,
  serieId: 'solta',
  agruparPor: 'quadro',
  contents: [conteudo('y1', { seriesId: 'solta', plataformas: [publicacao('yt')] }), conteudo('y2', { seriesId: 'solta', plataformas: [publicacao('yt2')] })],
});
assert.equal(soYoutube[0].blocos.length, 0);
assert.equal(soYoutube[0].contents.length, 2);

// Por quadro: direto na série primeiro, depois cada quadro, com o bloco dentro dele.
const porQuadro = montarGrupos({ ...base, agruparPor: 'quadro' });
assert.deepEqual(porQuadro.map(grupo => grupo.rotulo), ['Direto na série', 'sinais', 'sobre-voce']);
assert.equal(porQuadro[2].filhoId, 'sobre-voce');
assert.equal(porQuadro[2].serieId, 'sobre-voce');
assert.deepEqual(porQuadro[2].blocos.map(bloco => bloco.rede), ['youtube']);

// Por rede: a rede vira o grupo e não há bloco.
const porRede = montarGrupos({ ...base, agruparPor: 'rede' });
assert.deepEqual(porRede.map(grupo => [grupo.rotulo, grupo.total]), [
  ['Só Instagram', 1],
  ['Só YouTube', 1],
  ['Várias redes', 2],
  ['Sem rede ainda', 1],
]);
assert.ok(porRede.every(grupo => grupo.blocos.length === 0));

// Com filtro, grupo e bloco sem resultado somem; o total continua o do grupo inteiro.
const filtrado = montarGrupos({ ...base, agruparPor: 'temporada', filtros: { ...FILTROS_PADRAO, busca: 'luto' } });
assert.deepEqual(filtrado.map(grupo => [grupo.rotulo, grupo.visiveis, grupo.total]), [['Temporada 1', 1, 4]]);
assert.equal(filtrado[0].contents.length, 0);
assert.equal(filtrado[0].blocos[0].contents[0].id, 'luto');

// Página da temporada: só os conteúdos dela.
const daTemporada = montarGrupos({ ...base, agruparPor: 'quadro', temporadaId: 't1' });
assert.equal(daTemporada.reduce((soma, grupo) => soma + grupo.total, 0), 4);

// Mover: o que veio da série segue o destino, o escolhido na mão fica, as redes não mudam.
const seriesComPilar = series.map(item => item.id === 'sinais' ? { ...item, pilarPrincipalId: 'pilar-sinais' } : item);
const herdado = conteudo('herdado', { seriesId: 'sobre-voce', temporadaId: 't1', pilarId: 'pilar-velho', pilarOrigem: 'herdada', plataformas: [publicacao('yt')] });
const escolhido = conteudo('escolhido', { seriesId: 'sobre-voce', pilarId: 'meu-pilar', pilarOrigem: 'escolhida' });
const movido = moverConteudo(herdado, { serieId: 'sinais', temporada: 'manter' }, seriesComPilar, temporadas, 'agora');
assert.equal(movido.seriesId, 'sinais');
assert.equal(movido.temporadaId, 't1');
assert.equal(movido.pilarId, 'pilar-sinais');
assert.deepEqual(movido.plataformas, herdado.plataformas);
assert.equal(movido.updatedAt, 'agora');
assert.equal(moverConteudo(escolhido, { serieId: 'sinais', temporada: 't2' }, seriesComPilar, temporadas, 'agora').pilarId, 'meu-pilar');
assert.equal(moverConteudo(herdado, { serieId: 'sinais', temporada: 'nenhuma' }, series, temporadas, 'agora').temporadaId, null);
// Temporada que não é do escopo do destino não fica.
assert.equal(moverConteudo(herdado, { serieId: 'solta', temporada: 'manter' }, series, temporadas, 'agora').temporadaId, null);

// Sem quadro escolhido, cada um fica onde está e só a temporada muda.
const soTemporada = moverConteudo(escolhido, { serieId: null, temporada: 't2' }, seriesComPilar, temporadas, 'agora');
assert.equal(soTemporada.seriesId, 'sobre-voce');
assert.equal(soTemporada.temporadaId, 't2');
assert.equal(soTemporada.pilarId, 'meu-pilar');

// Quem já está no destino não conta como mudança.
assert.deepEqual(
  conteudosQueMudam([herdado, escolhido], { serieId: 'sobre-voce', temporada: 't1' }, series, temporadas).map(content => content.id),
  ['escolhido'],
);
