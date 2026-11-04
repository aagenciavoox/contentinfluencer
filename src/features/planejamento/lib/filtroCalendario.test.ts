import assert from 'node:assert/strict';
import type { PublicacaoNaAgenda } from '../../editorial/lib/publicacoes.ts';
import { contaNoFiltro, conteudoPassa, indiceDaAgenda, postItPassa } from './filtroCalendario.ts';
import type { PlanejamentoPostIt } from './postIt.ts';

function publicacao(contentId: string, rede: PublicacaoNaAgenda['rede'], formato: PublicacaoNaAgenda['formato'], data = '2026-11-10'): PublicacaoNaAgenda {
  return {
    id: `${contentId}-${rede}`, contentId, serieId: null, platformId: `conta-${rede}`, rede, ciclo: 1, formato,
    data, hora: null, situacao: 'prevista', programado: false, contaNaMeta: true, etapa: 'roteiro', objetivo: null,
  };
}

const indice = indiceDaAgenda([
  publicacao('junto', 'instagram', 'reels'),
  publicacao('junto', 'tiktok', 'reels'),
  publicacao('so-instagram', 'instagram', 'reels'),
  publicacao('so-tiktok', 'tiktok', 'reels'),
  publicacao('yt', 'youtube', 'video-longo'),
  publicacao('yt-short', 'youtube', 'short'),
]);

// Regra da Criação: Reels caem em instagram-video / tiktok-video.
assert.equal(conteudoPassa(indice, 'so-instagram', { redes: ['instagram-video'], formato: null }), true);
assert.equal(conteudoPassa(indice, 'so-instagram', { redes: ['instagram'], formato: null }), false, 'vídeo não passa no chip da rede inteira');
assert.equal(conteudoPassa(indice, 'junto', { redes: ['instagram-video'], formato: null }), false, 'sai também no TikTok');
assert.equal(conteudoPassa(indice, 'junto', { redes: ['instagram-video', 'tiktok'], formato: null }), true, 'as duas marcadas');
assert.equal(conteudoPassa(indice, 'so-tiktok', { redes: ['instagram-video'], formato: null }), false);
assert.equal(conteudoPassa(indice, 'so-tiktok', { redes: ['tiktok'], formato: null }), true);
// YouTube longo × Shorts como itens separados no filtro de redes:
assert.equal(conteudoPassa(indice, 'yt', { redes: ['youtube'], formato: null }), true, 'YouTube longo passa no filtro de YouTube');
assert.equal(conteudoPassa(indice, 'yt-short', { redes: ['youtube'], formato: null }), false, 'Shorts fica de fora do filtro de YouTube longo');
assert.equal(conteudoPassa(indice, 'yt-short', { redes: ['youtube-shorts'], formato: null }), true, 'Shorts passa no filtro de Shorts');
assert.equal(conteudoPassa(indice, 'yt', { redes: ['youtube-shorts'], formato: null }), false, 'YouTube longo fica de fora do filtro de Shorts');
assert.equal(conteudoPassa(indice, 'yt', { redes: ['youtube', 'youtube-shorts'], formato: null }), true, 'ambos marcados');
assert.equal(conteudoPassa(indice, 'yt-short', { redes: ['youtube', 'youtube-shorts'], formato: null }), true, 'ambos marcados');
// Formato: em alguma conta do conteúdo.
assert.equal(conteudoPassa(indice, 'yt', { redes: ['youtube'], formato: 'video-longo' }), true);
assert.equal(conteudoPassa(indice, 'yt', { redes: [], formato: 'short' }), false);
// Instagram num dia e TikTok em outro: o conteúdo sai nas duas redes, então fica fora nos dois dias.
{
  const separado = indiceDaAgenda([publicacao('dias', 'instagram', 'reels', '2026-11-10'), publicacao('dias', 'tiktok', 'reels', '2026-11-12')]);
  assert.equal(conteudoPassa(separado, 'dias', { redes: ['instagram-video'], formato: null }), false);
}
// Sem filtro passa tudo.
assert.equal(conteudoPassa(indice, 'junto', { redes: [], formato: null }), true);

// Post-it sem conteúdo: as redes anotadas, com a mesma regra; com formato, some.
const postIt = { id: 'p', date: '2026-11-10', contentId: null, redes: ['instagram', 'tiktok'] } as unknown as PlanejamentoPostIt;
assert.equal(postItPassa(indice, postIt, { redes: ['instagram', 'tiktok'], formato: null }), true);
assert.equal(postItPassa(indice, postIt, { redes: ['tiktok'], formato: null }), false);
assert.equal(postItPassa(indice, postIt, { redes: [], formato: 'reels' }), false);
// Post-it solto com YouTube Shorts ou YouTube longo anotados:
const postItShorts = { id: 'pshorts', date: '2026-11-10', contentId: null, redes: ['youtube-shorts'] } as unknown as PlanejamentoPostIt;
assert.equal(postItPassa(indice, postItShorts, { redes: ['youtube-shorts'], formato: null }), true);
assert.equal(postItPassa(indice, postItShorts, { redes: ['youtube'], formato: null }), false);

const postItLongo = { id: 'plongo', date: '2026-11-10', contentId: null, redes: ['youtube'] } as unknown as PlanejamentoPostIt;
assert.equal(postItPassa(indice, postItLongo, { redes: ['youtube'], formato: null }), true);
assert.equal(postItPassa(indice, postItLongo, { redes: ['youtube-shorts'], formato: null }), false);

// Conta do YouTube entra na Saúde filtrada com YouTube ou Shorts marcados:
assert.equal(contaNoFiltro('youtube', ['youtube']), true);
assert.equal(contaNoFiltro('youtube', ['youtube-shorts']), true);
assert.equal(contaNoFiltro('youtube', ['instagram']), false);
assert.equal(contaNoFiltro('instagram', ['youtube-shorts']), false);
assert.equal(contaNoFiltro('instagram', ['instagram-video']), true);
assert.equal(contaNoFiltro('instagram', ['instagram-carrossel']), true);
assert.equal(contaNoFiltro('tiktok', ['tiktok']), true);
assert.equal(contaNoFiltro('instagram', ['tiktok']), false);
assert.equal(contaNoFiltro('instagram', []), true);

console.log('filtroCalendario: ok');
