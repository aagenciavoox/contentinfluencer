import assert from 'node:assert/strict';
import type {Platform} from '../../../lib/database.ts';
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
// Link antigo com "Sem rede" vira filtro vazio.
assert.deepEqual(parseRedesFilter('sem-rede'), []);
assert.deepEqual(parseRedesFilter(null), []);
assert.equal(serializeRedesFilter(['tiktok', 'instagram']), 'instagram,tiktok');
assert.equal(serializeRedesFilter([]), '');
console.log('ok - rede filter: reads and writes several networks in the query param');

assert.deepEqual(alternarRedeNoFiltro([], 'tiktok'), ['tiktok']);
assert.deepEqual(alternarRedeNoFiltro(['tiktok'], 'instagram'), ['instagram', 'tiktok']);
assert.deepEqual(alternarRedeNoFiltro(['instagram', 'tiktok'], 'instagram'), ['tiktok']);
console.log('ok - rede filter: toggles one network at a time');

const item = (id: string, platformIds: string[]) => ({id, plataformas: platformIds.map(platformId => ({platformId}))});

assert.deepEqual(redesDoItemDeCriacao(item('c1', ['p-ig', 'p-yt']), contas), ['instagram', 'youtube']);
// Nome com espaços e maiúsculas, sem rede cadastrada.
assert.deepEqual(redesDoItemDeCriacao(item('c2', ['p-tt']), contas), ['tiktok']);
// Conta antiga "Blog" marcada como outra conta como Blog/site; Newsletter segue outra.
assert.deepEqual(redesDoItemDeCriacao(item('c3', ['p-blog']), contas), ['blog']);
assert.deepEqual(redesDoItemDeCriacao(item('c4', ['p-site']), contas), ['blog']);
assert.deepEqual(redesDoItemDeCriacao(item('c5', ['p-news']), contas), ['outra']);
// Ref antiga pelo nome da rede, sem conta cadastrada.
assert.deepEqual(redesDoItemDeCriacao(item('c6', ['Instagram']), []), ['instagram']);
console.log('ok - rede filter: maps each publication to its network, normalizing names');

// Sem publicação: valem as redes anotadas nos post-its ligados.
const postIts = [{contentId: 'c7', redes: ['tiktok' as const]}, {contentId: null, redes: ['youtube' as const]}];
assert.deepEqual(redesDoItemDeCriacao(item('c7', []), contas, postIts), ['tiktok']);
assert.deepEqual(redesDoItemDeCriacao(item('c8', []), contas, postIts), []);
const mapa = mapaDeRedesDaCriacao([item('c1', ['p-ig']), item('c8', [])], contas, postIts);
assert.deepEqual(mapa.get('c1'), ['instagram']);
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
assert.equal(passaNoFiltroRede(['instagram', 'youtube'], curtos), false);
assert.equal(passaNoFiltroRede(['instagram', 'tiktok', 'youtube'], curtos), false);
assert.equal(passaNoFiltroRede([], curtos), false);
// Só YouTube: só quem sai apenas no YouTube.
assert.equal(passaNoFiltroRede(['youtube'], ['youtube']), true);
assert.equal(passaNoFiltroRede(['instagram', 'youtube'], ['youtube']), false);
assert.equal(passaNoFiltroRede(['instagram', 'tiktok'], ['youtube']), false);
// As três: todo item com rede entre elas passa; sem rede, não.
const tres = ['instagram', 'tiktok', 'youtube'] as const;
assert.equal(passaNoFiltroRede(['instagram', 'tiktok', 'youtube'], tres), true);
assert.equal(passaNoFiltroRede(['youtube'], tres), true);
assert.equal(passaNoFiltroRede([], tres), false);
console.log('ok - rede filter: passes items only on the marked networks');

assert.deepEqual(
  redesDoFiltroRapido([conta('a', 'TikTok', 'tiktok'), conta('b', 'Instagram', 'instagram'), conta('c', 'Insta 2', 'instagram')]),
  ['instagram', 'tiktok'],
);
// Conta desativada não entra; rede marcada fora das contas continua para ser desmarcada.
assert.deepEqual(
  redesDoFiltroRapido([conta('a', 'Instagram', 'instagram'), conta('b', 'YouTube', 'youtube', false)], ['youtube']),
  ['instagram', 'youtube'],
);
assert.deepEqual(redesDoFiltroRapido(contas), ['instagram', 'tiktok', 'youtube', 'blog', 'outra']);
console.log('ok - rede filter: quick icons follow the active accounts');
