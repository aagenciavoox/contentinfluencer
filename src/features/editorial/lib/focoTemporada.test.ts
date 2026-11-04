import assert from 'node:assert/strict';
import { focoEfetivo, publicacoesDoEpisodioNaTemporada, rotuloDoFoco } from './focoTemporada.ts';

const contas = [
  { id: 'ig', nome: 'Instagram', rede: 'instagram' as const, ativo: true },
  { id: 'tt', nome: 'TikTok', rede: 'tiktok' as const, ativo: true },
  { id: 'yt', nome: 'YouTube', rede: 'youtube' as const, ativo: true },
];

const curtas = publicacoesDoEpisodioNaTemporada({
  contentId: 'c1',
  focoRedes: ['youtube-shorts', 'tiktok', 'instagram'],
  contas,
  destinosPadrao: ['ig'],
});
assert.deepEqual(
  curtas.map(item => [item.platformId, item.formatoPublicacao ?? null]).sort(),
  [['ig', 'reels'], ['tt', 'reels'], ['yt', 'short']],
);

const longo = publicacoesDoEpisodioNaTemporada({
  contentId: 'c2',
  focoRedes: ['youtube'],
  contas,
  destinosPadrao: ['ig', 'tt', 'yt'],
});
assert.deepEqual(longo.map(item => [item.platformId, item.formatoPublicacao]), [['yt', 'video-longo']]);

const semFoco = publicacoesDoEpisodioNaTemporada({
  contentId: 'c3',
  focoRedes: [],
  contas,
  destinosPadrao: ['yt'],
});
assert.deepEqual(semFoco.map(item => item.platformId), ['yt']);
assert.equal(semFoco[0]?.formatoPublicacao, 'short');

assert.equal(rotuloDoFoco(['tiktok', 'instagram', 'youtube-shorts']), 'Instagram · TikTok · YouTube Shorts');
assert.equal(
  rotuloDoFoco(['youtube', 'instagram-carrossel', 'youtube-shorts', 'tiktok', 'instagram-video']),
  'Instagram (vídeo) · TikTok · YouTube Shorts · Instagram (carrossel) · YouTube (vídeo longo)',
);
assert.deepEqual(
  focoEfetivo(['youtube'], ['instagram', 'tiktok']).map(rede => rede),
  ['youtube'],
);
assert.deepEqual(focoEfetivo([], ['tiktok', 'instagram-video']), ['instagram-video', 'tiktok']);

console.log('ok - foco temporada');
