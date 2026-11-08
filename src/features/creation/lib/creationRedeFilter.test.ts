import assert from 'node:assert/strict';
import type {Platform, WritingMode} from '../../../lib/database.ts';
import {
  alternarRedeNoFiltro,
  mapaDeRedesDaCriacao,
  parseRedesFilter,
  passaNoFiltroRede,
  redesDoFiltroRapido,
  redesDoItemDeCriacao,
  serializeRedesFilter,
} from './creationRedeFilter.ts';

function conta(id: string, nome: string, rede?: Platform['rede'], ativo = true): Platform {
  return {id, userId: 'u1', nome, ativo, createdAt: '2026-10-17T10:00:00.000Z', ...(rede ? {rede} : {})};
}

const contas = [
  conta('p-ig', 'Instagram', 'instagram'),
  conta('p-tt', '  tiktok ', undefined),
  conta('p-yt', 'YouTube', 'youtube'),
  conta('p-blog', 'Blog', 'outra'),
  conta('p-site', 'Meu site', 'blog'),
  conta('p-news', 'Newsletter', 'outra'),
];

assert.deepEqual(parseRedesFilter('Blog'), ['blog']);
assert.deepEqual(parseRedesFilter(' tiktok , instagram,tiktok '), ['instagram', 'tiktok']);
assert.deepEqual(parseRedesFilter('facebook,youtube'), ['youtube']);
assert.deepEqual(parseRedesFilter('youtube-shorts,instagram'), ['instagram', 'youtube-shorts']);
// Link antigo com "Sem rede" vira filtro vazio.
assert.deepEqual(parseRedesFilter('sem-rede'), []);
assert.deepEqual(parseRedesFilter(null), []);
assert.equal(serializeRedesFilter(['tiktok', 'instagram']), 'instagram,tiktok');
assert.equal(serializeRedesFilter(['youtube-shorts', 'youtube']), 'youtube-shorts,youtube');
assert.equal(serializeRedesFilter([]), '');
console.log('ok - rede filter: reads and writes several networks in the query param');

assert.deepEqual(alternarRedeNoFiltro([], 'tiktok'), ['tiktok']);
assert.deepEqual(alternarRedeNoFiltro(['tiktok'], 'instagram'), ['instagram', 'tiktok']);
assert.deepEqual(alternarRedeNoFiltro(['instagram', 'tiktok'], 'instagram'), ['tiktok']);
console.log('ok - rede filter: toggles one network at a time');

const item = (
  id: string,
  platformIds: string[],
  extra?: {formatoVisual?: string | null; writingMode?: WritingMode | null; formatoPublicacao?: 'short' | 'video-longo'},
) => ({
  id,
  formatoVisual: extra?.formatoVisual,
  writingMode: extra?.writingMode,
  plataformas: platformIds.map(platformId => ({
    platformId,
    ...(extra?.formatoPublicacao ? {formatoPublicacao: extra.formatoPublicacao} : {}),
  })),
});

// Sem formato nem roteiro de YouTube, a publicação de YouTube deduz para Shorts.
assert.deepEqual(redesDoItemDeCriacao(item('c1', ['p-ig', 'p-yt']), contas), ['instagram-video', 'youtube-shorts']);
// Modo de escrita YouTube ou formato visual "Vídeo longo" vira YouTube longo.
assert.deepEqual(redesDoItemDeCriacao(item('c1-longo', ['p-ig', 'p-yt'], {writingMode: 'youtube'}), contas), ['instagram-video', 'youtube']);
assert.deepEqual(redesDoItemDeCriacao(item('c1-longo-v', ['p-yt'], {formatoVisual: 'Vídeo longo'}), contas), ['youtube']);
// Escolha manual na publicação prevalece sobre a dedução.
assert.deepEqual(redesDoItemDeCriacao(item('c1-escolha-longo', ['p-yt'], {formatoPublicacao: 'video-longo'}), contas), ['youtube']);
assert.deepEqual(redesDoItemDeCriacao(item('c1-escolha-short', ['p-yt'], {formatoPublicacao: 'short', writingMode: 'youtube'}), contas), ['youtube-shorts']);
assert.deepEqual(redesDoItemDeCriacao(item('c-ig-reels', ['p-ig'], {formatoVisual: 'Reels'}), contas), ['instagram-video']);
assert.deepEqual(redesDoItemDeCriacao(item('c-ig-carr', ['p-ig'], {writingMode: 'carrossel'}), contas), ['instagram-carrossel']);
assert.deepEqual(redesDoItemDeCriacao(item('c-tt-video', ['p-tt'], {formatoVisual: 'Reels'}), contas), ['tiktok']);
assert.deepEqual(redesDoItemDeCriacao(item('c-tt-carr', ['p-tt'], {writingMode: 'carrossel'}), contas), ['tiktok']);
assert.deepEqual(redesDoItemDeCriacao(item('c-ig-sem', ['p-ig']), contas), ['instagram-video']);
// Nome com espaços e maiúsculas, sem rede cadastrada.
assert.deepEqual(redesDoItemDeCriacao(item('c2', ['p-tt']), contas), ['tiktok']);
// Conta antiga "Blog" marcada como outra conta como Blog/site; Newsletter segue outra.
assert.deepEqual(redesDoItemDeCriacao(item('c3', ['p-blog']), contas), ['blog']);
assert.deepEqual(redesDoItemDeCriacao(item('c4', ['p-site']), contas), ['blog']);
assert.deepEqual(redesDoItemDeCriacao(item('c5', ['p-news']), contas), ['outra']);
// Ref antiga pelo nome da rede, sem conta cadastrada.
assert.deepEqual(redesDoItemDeCriacao(item('c6', ['Instagram']), []), ['instagram-video']);
console.log('ok - rede filter: maps each publication to its network, normalizing names');

// Sem publicação: valem as redes anotadas nos post-its ligados; sem formato escrito, YouTube deduz para Shorts.
const postIts = [
  {contentId: 'c7', redes: ['tiktok' as const]},
  {contentId: null, redes: ['youtube' as const]},
  {contentId: 'c-postit-yt', redes: ['youtube' as const]},
  {contentId: 'c-postit-yt-longo', redes: ['youtube' as const]},
];
assert.deepEqual(redesDoItemDeCriacao(item('c7', []), contas, postIts), ['tiktok']);
assert.deepEqual(redesDoItemDeCriacao(item('c-postit-yt', []), contas, postIts), ['youtube-shorts']);
assert.deepEqual(redesDoItemDeCriacao(item('c-postit-yt-longo', [], {writingMode: 'youtube'}), contas, postIts), ['youtube']);
assert.deepEqual(redesDoItemDeCriacao(item('c8', []), contas, postIts), []);
const mapa = mapaDeRedesDaCriacao([item('c1', ['p-ig']), item('c8', [])], contas, postIts);
assert.deepEqual(mapa.get('c1'), ['instagram-video']);
assert.deepEqual(mapa.get('c8'), []);
console.log('ok - rede filter: falls back to linked post-its when there is no publication');

// Sem filtro, passa tudo, inclusive quem não tem rede.
assert.equal(passaNoFiltroRede(['instagram'], []), true);
assert.equal(passaNoFiltroRede([], []), true);
assert.equal(passaNoFiltroRede(undefined, null), true);
// TikTok e Instagram: só TikTok, só Instagram e os dois passam; quem também vai pro YouTube, não.
const curtos = ['instagram', 'tiktok'] as const;
assert.equal(passaNoFiltroRede(['tiktok'], curtos), true);
assert.equal(passaNoFiltroRede(['instagram'], curtos), true);
assert.equal(passaNoFiltroRede(['instagram', 'tiktok'], curtos), true);
assert.equal(passaNoFiltroRede(['youtube'], curtos), false);
assert.equal(passaNoFiltroRede(['youtube-shorts'], curtos), false);
assert.equal(passaNoFiltroRede(['instagram', 'youtube'], curtos), false);
assert.equal(passaNoFiltroRede(['instagram', 'youtube-shorts'], curtos), false);
assert.equal(passaNoFiltroRede(['instagram', 'tiktok', 'youtube'], curtos), false);
assert.equal(passaNoFiltroRede([], curtos), false);
// Só YouTube (vídeo longo): só quem sai apenas em vídeo longo do YouTube.
assert.equal(passaNoFiltroRede(['youtube'], ['youtube']), true);
assert.equal(passaNoFiltroRede(['youtube-shorts'], ['youtube']), false);
assert.equal(passaNoFiltroRede(['instagram', 'youtube'], ['youtube']), false);
assert.equal(passaNoFiltroRede(['instagram', 'tiktok'], ['youtube']), false);
// Só Shorts: só quem sai apenas em Shorts do YouTube.
assert.equal(passaNoFiltroRede(['youtube-shorts'], ['youtube-shorts']), true);
assert.equal(passaNoFiltroRede(['youtube'], ['youtube-shorts']), false);
assert.equal(passaNoFiltroRede(['instagram', 'youtube-shorts'], ['youtube-shorts']), false);
// YouTube longo e Shorts juntos no filtro: passam ambos, mas não quem sai em outra rede.
assert.equal(passaNoFiltroRede(['youtube'], ['youtube', 'youtube-shorts']), true);
assert.equal(passaNoFiltroRede(['youtube-shorts'], ['youtube', 'youtube-shorts']), true);
assert.equal(passaNoFiltroRede(['instagram', 'youtube'], ['youtube', 'youtube-shorts']), false);
// As redes combinadas: todo item com rede entre elas passa; sem rede, não.
const tres = ['instagram', 'tiktok', 'youtube'] as const;
assert.equal(passaNoFiltroRede(['instagram', 'tiktok', 'youtube'], tres), true);
assert.equal(passaNoFiltroRede(['youtube'], tres), true);
assert.equal(passaNoFiltroRede(['youtube-shorts'], tres), false);
assert.equal(passaNoFiltroRede([], tres), false);
console.log('ok - rede filter: passes items only on the marked networks');

assert.deepEqual(
  redesDoFiltroRapido([conta('a', 'TikTok', 'tiktok'), conta('b', 'Instagram', 'instagram'), conta('c', 'Insta 2', 'instagram')]),
  ['instagram-video', 'tiktok', 'instagram-carrossel'],
);
// Conta desativada não entra; rede marcada fora das contas continua para ser desmarcada.
assert.deepEqual(
  redesDoFiltroRapido([conta('a', 'Instagram', 'instagram'), conta('b', 'YouTube', 'youtube', false)], ['youtube']),
  ['instagram-video', 'youtube', 'instagram-carrossel'],
);
assert.deepEqual(
  redesDoFiltroRapido([conta('a', 'Instagram', 'instagram'), conta('b', 'YouTube', 'youtube', false)], ['youtube-shorts']),
  ['instagram-video', 'youtube-shorts', 'instagram-carrossel'],
);
assert.deepEqual(
  redesDoFiltroRapido(contas),
  [
    'instagram-video', 'tiktok', 'youtube-shorts',
    'youtube',
    'instagram-carrossel', 'blog', 'outra',
  ],
);
console.log('ok - rede filter: quick icons follow the active accounts');
