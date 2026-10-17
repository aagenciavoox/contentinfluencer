import assert from 'node:assert/strict';
import type {Platform} from '../../../lib/database.ts';
import {
  mapaDeRedesDaCriacao,
  opcoesDoFiltroRede,
  parseRedeFilter,
  passaNoFiltroRede,
  redesDoItemDeCriacao,
  SEM_REDE,
} from './creationRedeFilter.ts';

function conta(id: string, nome: string, rede?: Platform['rede']): Platform {
  return {id, userId: 'u1', nome, ativo: true, createdAt: '2026-10-17T10:00:00.000Z', ...(rede ? {rede} : {})};
}

const contas = [
  conta('p-ig', 'Instagram', 'instagram'),
  conta('p-tt', '  tiktok ', undefined),
  conta('p-yt', 'YouTube', 'youtube'),
  conta('p-blog', 'Blog', 'outra'),
  conta('p-site', 'Meu site', 'blog'),
  conta('p-news', 'Newsletter', 'outra'),
];

assert.equal(parseRedeFilter('Blog'), 'blog');
assert.equal(parseRedeFilter(' instagram '), 'instagram');
assert.equal(parseRedeFilter(SEM_REDE), SEM_REDE);
assert.equal(parseRedeFilter('facebook'), '');
assert.equal(parseRedeFilter(null), '');
console.log('ok - rede filter: reads the query param safely');

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

assert.equal(passaNoFiltroRede(['instagram'], ''), true);
assert.equal(passaNoFiltroRede(['instagram', 'blog'], 'blog'), true);
assert.equal(passaNoFiltroRede(['instagram'], 'blog'), false);
assert.equal(passaNoFiltroRede([], SEM_REDE), true);
assert.equal(passaNoFiltroRede(undefined, SEM_REDE), true);
assert.equal(passaNoFiltroRede(['tiktok'], SEM_REDE), false);
console.log('ok - rede filter: Todas, uma rede e Sem rede');

const semOutra = opcoesDoFiltroRede([conta('p-ig', 'Instagram', 'instagram'), conta('p-blog', 'Blog', 'outra')]);
assert.deepEqual(semOutra.map(option => option.label), ['Todas as redes', 'Instagram', 'TikTok', 'YouTube', 'Blog/site', 'Sem rede']);
assert.deepEqual(semOutra.map(option => option.value), ['', 'instagram', 'tiktok', 'youtube', 'blog', SEM_REDE]);
const comOutra = opcoesDoFiltroRede(contas);
assert.ok(comOutra.some(option => option.value === 'outra'));
console.log('ok - rede filter: options list Blog/site and only show Outra when needed');
