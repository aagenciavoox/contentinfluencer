import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import { hojeNoFuso, noFuso } from './fuso.ts';
import { formatoDaPublicacao, publicacaoProgramada, publicacoesDaAgenda, resumoDePublicacoes } from './publicacoes.ts';

const contas = [
  { id: 'ig', nome: 'Instagram', rede: 'instagram' as const, ativo: true },
  { id: 'tt', nome: 'TikTok', rede: 'tiktok' as const, ativo: true },
  { id: 'yt', nome: 'YouTube', rede: 'youtube' as const, ativo: true },
];

// Terça, 3 de novembro de 2026, 14h em São Paulo.
const AGORA = new Date('2026-11-03T17:00:00Z');

function pub(id: string, platformId: string, extra: Partial<ContentPlataforma> = {}): ContentPlataforma {
  return { id, contentId: 'c', platformId, legenda: '', hashtags: '', publishDate: null, status: 'prevista', ...extra };
}

function conteudo(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    status: 'Roteiro',
    formatoVisual: 'Reels',
    deletedAt: null,
    contaNaGrade: true,
    seriesId: null,
    funcao: null,
    plataformas: [] as ContentPlataforma[],
    ...extra,
  };
}

// --- Fuso: o dia vem do perfil, não do navegador.
assert.deepEqual(noFuso('2026-11-04T01:30:00Z', 'America/Sao_Paulo'), { data: '2026-11-03', hora: '22:30' });
assert.equal(hojeNoFuso(new Date('2026-11-04T01:30:00Z'), 'America/Sao_Paulo'), '2026-11-03');
assert.equal(hojeNoFuso(new Date('2026-11-04T01:30:00Z'), 'Fuso/Inexistente'), '2026-11-03', 'fuso inválido volta ao padrão');

// --- Um conteúdo em três contas: um conteúdo único, três publicações, cada uma com a própria situação.
{
  const c = conteudo('c1', {
    plataformas: [
      pub('a', 'ig', { status: 'publicada', publishDate: '2026-11-01', realizadaManualEm: '2026-11-02T22:00:00Z' }),
      pub('b', 'tt', { publishDate: '2026-11-01' }),
      pub('d', 'yt', { publishDate: '2026-11-10' }),
    ],
  });
  const agenda = publicacoesDaAgenda({ contents: [c], contas, agora: AGORA });
  assert.equal(agenda.length, 3);
  const ig = agenda.find(p => p.platformId === 'ig')!;
  assert.equal(ig.situacao, 'realizada');
  assert.equal(ig.data, '2026-11-02', 'publicada usa a data real, no fuso');
  assert.equal(ig.etapa, 'postado');
  const tt = agenda.find(p => p.platformId === 'tt')!;
  assert.equal(tt.situacao, 'vencida', 'previsão que passou não vira publicada');
  assert.equal(tt.etapa, 'roteiro', 'publicar em uma conta não marca as outras');
  assert.equal(agenda.find(p => p.platformId === 'yt')!.situacao, 'prevista');

  const resumo = resumoDePublicacoes(agenda, { inicio: '2026-11-01', fim: '2026-11-30' });
  assert.equal(resumo.total, 3);
  assert.equal(resumo.conteudosUnicos, 1);
  assert.deepEqual([resumo.realizadas, resumo.previstas, resumo.vencidas], [1, 1, 1]);
  assert.equal(resumoDePublicacoes(agenda, { inicio: '2026-11-01', fim: '2026-11-30' }, { platformIds: ['ig'] }).total, 1);
}

// --- Repost é outra publicação (outro ciclo); não publicada e removida ficam fora; lixeira também.
{
  const c = conteudo('c2', {
    plataformas: [
      pub('o', 'ig', { publishDate: '2026-11-05' }),
      pub('r', 'ig', { publishDate: '2026-11-20', ciclo: 2, publicationKind: 'repost' }),
      pub('x', 'tt', { publishDate: '2026-11-05', status: 'nao_publicada' }),
      pub('y', 'yt', { publishDate: '2026-11-05', status: 'removida' }),
    ],
  });
  const agenda = publicacoesDaAgenda({ contents: [c, conteudo('lixo', { deletedAt: '2026-11-01', plataformas: [pub('z', 'ig', { publishDate: '2026-11-05' })] })], contas, agora: AGORA });
  assert.deepEqual(agenda.map(p => [p.id, p.ciclo]), [['o', 1], ['r', 2]]);
}

// --- Stories fica fora das metas, mas continua na agenda.
{
  // Mesma regra da grade: Stories pela regra fica fora; ligado à mão, entra.
  const c = conteudo('c3', { formatoVisual: 'Stories', contaNaGradeOrigem: 'regra', plataformas: [pub('s', 'ig', { publishDate: '2026-11-05' })] });
  const agenda = publicacoesDaAgenda({ contents: [c], contas, agora: AGORA });
  assert.equal(agenda.length, 1);
  assert.equal(agenda[0].contaNaMeta, false);
  assert.equal(resumoDePublicacoes(agenda, { inicio: '2026-11-01', fim: '2026-11-30' }).total, 0);
}

// --- Programado: não feita, data futura, conteúdo em Produção ou Edição.
{
  const agora = { data: '2026-11-03', hora: '14:00' };
  const base = { situacao: 'prevista' as const, etapa: 'producao' as const, hora: null };
  assert.equal(publicacaoProgramada({ ...base, data: '2026-11-04', agora }), true);
  assert.equal(publicacaoProgramada({ ...base, data: '2026-11-03', agora }), false, 'só a data: hoje ainda não é futuro');
  assert.equal(publicacaoProgramada({ ...base, data: '2026-11-03', hora: '18:00', agora }), true, 'com horário compara o instante');
  assert.equal(publicacaoProgramada({ ...base, data: '2026-11-03', hora: '10:00', agora }), false);
  assert.equal(publicacaoProgramada({ ...base, etapa: 'roteiro', data: '2026-11-10', agora }), false, 'roteiro mostra etapa e data');
  assert.equal(publicacaoProgramada({ ...base, etapa: 'edicao', data: '2026-11-10', agora }), true);
  assert.equal(publicacaoProgramada({ ...base, situacao: 'realizada', etapa: 'postado', data: '2026-11-10', agora }), false);

  const c = conteudo('c4', { status: 'Produção', plataformas: [pub('p', 'ig', { publishDate: '2026-11-10' })] });
  assert.equal(publicacoesDaAgenda({ contents: [c], contas, agora: AGORA })[0].programado, true);
}

// --- Formato: o escrito vale; YouTube sem dado não vira vídeo longo.
assert.equal(formatoDaPublicacao({ formatoVisual: 'Vídeo longo' }, 'youtube'), 'video-longo');
assert.equal(formatoDaPublicacao({ formatoVisual: null, writingMode: 'youtube' }, 'youtube'), 'video-longo');
assert.equal(formatoDaPublicacao({ formatoVisual: 'Reels' }, 'youtube'), 'short');
assert.equal(formatoDaPublicacao({ formatoVisual: 'Reels' }, 'instagram'), 'reels');
assert.equal(formatoDaPublicacao({ formatoVisual: null }, 'youtube'), 'sem-classificacao');
assert.equal(formatoDaPublicacao({ formatoVisual: 'Post estático' }, 'instagram'), 'post-estatico');
assert.equal(formatoDaPublicacao({ formatoVisual: 'Talking Head' }, 'instagram'), 'outro:talking head');

console.log('publicacoes: ok');
