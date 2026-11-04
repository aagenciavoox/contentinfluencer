import assert from 'node:assert/strict';
import type { PublicacaoNaAgenda } from '../../editorial/lib/publicacoes.ts';
import { conteudoPassa, indiceDaAgenda, postItPassa } from './filtroCalendario.ts';
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
]);

// Regra da Criação: passa o que sai só nas redes marcadas.
assert.equal(conteudoPassa(indice, 'so-instagram', { redes: ['instagram'], formato: null }), true);
assert.equal(conteudoPassa(indice, 'junto', { redes: ['instagram'], formato: null }), false, 'sai também no TikTok');
assert.equal(conteudoPassa(indice, 'junto', { redes: ['instagram', 'tiktok'], formato: null }), true, 'as duas marcadas');
assert.equal(conteudoPassa(indice, 'so-tiktok', { redes: ['instagram'], formato: null }), false);
// Formato: em alguma conta do conteúdo.
assert.equal(conteudoPassa(indice, 'yt', { redes: ['youtube'], formato: 'video-longo' }), true);
assert.equal(conteudoPassa(indice, 'yt', { redes: [], formato: 'short' }), false);
// Instagram num dia e TikTok em outro: o conteúdo sai nas duas redes, então fica fora nos dois dias.
{
  const separado = indiceDaAgenda([publicacao('dias', 'instagram', 'reels', '2026-11-10'), publicacao('dias', 'tiktok', 'reels', '2026-11-12')]);
  assert.equal(conteudoPassa(separado, 'dias', { redes: ['instagram'], formato: null }), false);
}
// Sem filtro passa tudo.
assert.equal(conteudoPassa(indice, 'junto', { redes: [], formato: null }), true);

// Post-it sem conteúdo: as redes anotadas, com a mesma regra; com formato, some.
const postIt = { id: 'p', date: '2026-11-10', contentId: null, redes: ['instagram', 'tiktok'] } as unknown as PlanejamentoPostIt;
assert.equal(postItPassa(indice, postIt, { redes: ['instagram', 'tiktok'], formato: null }), true);
assert.equal(postItPassa(indice, postIt, { redes: ['tiktok'], formato: null }), false);
assert.equal(postItPassa(indice, postIt, { redes: [], formato: 'reels' }), false);

console.log('filtroCalendario: ok');
