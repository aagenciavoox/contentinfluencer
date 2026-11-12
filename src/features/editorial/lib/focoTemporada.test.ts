import assert from 'node:assert/strict';
import { focoEfetivo, publicacoesDoEpisodioNaTemporada, rotuloDoFoco, sugestaoDoFoco, textoDaSugestaoDoFoco } from './focoTemporada.ts';

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
  'Instagram (vídeo) · TikTok · YouTube Shorts · YouTube (vídeo longo) · Instagram (carrossel)',
);
assert.deepEqual(
  focoEfetivo(['youtube'], ['instagram', 'tiktok']).map(rede => rede),
  ['youtube'],
);
assert.deepEqual(focoEfetivo([], ['tiktok', 'instagram-video']), ['tiktok', 'instagram-video']);


assert.deepEqual(sugestaoDoFoco(['instagram-carrossel']), { writingMode: 'carrossel', formatoVisual: 'Carrossel' });
assert.deepEqual(sugestaoDoFoco(['youtube']), { writingMode: 'youtube', formatoVisual: 'YouTube' });
assert.deepEqual(sugestaoDoFoco(['instagram-video']), { writingMode: 'texto', formatoVisual: 'Reels' });
assert.equal(sugestaoDoFoco([]), null);
assert.equal(sugestaoDoFoco(null), null);

// Ordem do próprio foco manda quando há mais de uma rede.
assert.deepEqual(
  sugestaoDoFoco(['youtube', 'instagram-carrossel']),
  { writingMode: 'youtube', formatoVisual: 'YouTube' },
);
assert.deepEqual(
  sugestaoDoFoco(['instagram-carrossel', 'youtube']),
  { writingMode: 'carrossel', formatoVisual: 'Carrossel' },
);
assert.deepEqual(
  sugestaoDoFoco(['tiktok', 'youtube-shorts']),
  { writingMode: 'texto', formatoVisual: 'Reels' },
);
assert.deepEqual(
  sugestaoDoFoco(['youtube-shorts', 'tiktok']),
  { writingMode: 'texto', formatoVisual: 'Shorts' },
);

// Só blog/outra no foco: nenhuma sugestao (fila fixa também não mapeia).
assert.equal(sugestaoDoFoco(['blog', 'outra']), null);

assert.equal(
  textoDaSugestaoDoFoco({ writingMode: 'carrossel', formatoVisual: 'Carrossel' }),
  'Neste foco, o episódio nasce como Carrossel (modo carrossel).',
);

console.log('ok - foco temporada');


// --- Destinos do episódio novo: temporada → quadro → série → padrão, sem data inventada.
{
  const { destinosDoNovoEpisodio } = await import('./focoTemporada.ts');
  const contasD = [
    { id: 'ig', nome: 'Instagram', rede: 'instagram' as const, ativo: true },
    { id: 'tt', nome: 'TikTok', rede: 'tiktok' as const, ativo: true },
    { id: 'yt', nome: 'YouTube', rede: 'youtube' as const, ativo: true },
    { id: 'off', nome: 'Antiga', rede: 'instagram' as const, ativo: false },
  ];
  const series = [
    { id: 'S', parentId: null, tipoAgrupamento: 'serie' as const, plataformas: [{ platformId: 'yt' }, { platformId: 'off' }] },
    { id: 'Q', parentId: 'S', tipoAgrupamento: 'quadro' as const, plataformas: [{ platformId: 'tt', formato: 'carrossel' as const }] },
    { id: 'Q2', parentId: 'S', tipoAgrupamento: 'quadro' as const, plataformas: [] },
    { id: 'F', parentId: null, tipoAgrupamento: 'familia' as const, plataformas: [] },
  ];
  const base = { contentId: 'n1', series, contas: contasD, destinosPadrao: ['ig'] };

  const daTemporada = destinosDoNovoEpisodio({ ...base, temporada: { focoRedes: ['instagram'] }, serieId: 'Q' });
  assert.equal(daTemporada.origem, 'temporada');
  assert.deepEqual(daTemporada.publicacoes.map(p => p.platformId), ['ig']);

  const doQuadro = destinosDoNovoEpisodio({ ...base, temporada: { focoRedes: [] }, serieId: 'Q' });
  assert.equal(doQuadro.origem, 'quadro');
  assert.deepEqual(doQuadro.publicacoes.map(p => [p.platformId, p.formatoPublicacao]), [['tt', 'carrossel']]);

  const daSerie = destinosDoNovoEpisodio({ ...base, temporada: null, serieId: 'Q2' });
  assert.equal(daSerie.origem, 'serie', 'quadro sem destinos herda da série');
  assert.deepEqual(daSerie.publicacoes.map(p => [p.platformId, p.formatoPublicacao]), [['yt', 'short']], 'conta inativa fica de fora; formato padrão da rede');

  const padrao = destinosDoNovoEpisodio({ ...base, temporada: null, serieId: 'F' });
  assert.equal(padrao.origem, 'padrao');

  for (const r of [daTemporada, doQuadro, daSerie, padrao]) {
    assert.ok(r.publicacoes.every(p => !p.publishDate), 'nenhuma data é inventada');
  }
}