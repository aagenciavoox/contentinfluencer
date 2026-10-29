import type { ContentPlataforma } from '../../../lib/database.ts';
import { generateUUID } from '../../../utils/uuid.ts';
import { criarPublicacaoAgendada } from './destinations.ts';

/** Ciclo efetivo: coluna nova ou, no legado, repost conta como ciclo 2+. */
export function cicloDaPublicacao(
  publicacao: Pick<ContentPlataforma, 'ciclo' | 'publicationKind'>,
): number {
  if (typeof publicacao.ciclo === 'number' && publicacao.ciclo >= 1) return publicacao.ciclo;
  return publicacao.publicationKind === 'repost' ? 2 : 1;
}

export function maiorCiclo(
  publicacoes: readonly Pick<ContentPlataforma, 'ciclo' | 'publicationKind'>[],
): number {
  let max = 1;
  for (const publicacao of publicacoes) {
    const ciclo = cicloDaPublicacao(publicacao);
    if (ciclo > max) max = ciclo;
  }
  return max;
}

/**
 * Repost = novo ciclo no mesmo conteúdo.
 * Preserva ciclo 1 e métricas; não reabre Edição nem volta o conteúdo publicado.
 */
export function criarCicloDeRepost(input: {
  publicacoes: readonly ContentPlataforma[];
  contentId: string;
  platformIds: readonly string[];
  publishDate: string;
  publishTime?: string | null;
  criarId?: () => string;
}): ContentPlataforma[] {
  const criarId = input.criarId ?? generateUUID;
  const ciclo = maiorCiclo(input.publicacoes) + 1;
  const data = input.publishDate.trim();
  const novas = input.platformIds.map(platformId => ({
    ...criarPublicacaoAgendada(input.contentId, platformId, criarId()),
    publicationKind: 'repost' as const,
    ciclo,
    publishDate: data || null,
    publishTime: input.publishTime ?? null,
    publishDateEnabled: Boolean(data),
    contaNaGrade: true,
    status: 'prevista' as const,
  }));
  return [...input.publicacoes, ...novas];
}

/** Agrupa publicações ativas por ciclo (redes do mesmo ciclo contam uma vez na grade). */
export function publicacoesPorCiclo(
  publicacoes: readonly ContentPlataforma[],
): Map<number, ContentPlataforma[]> {
  const map = new Map<number, ContentPlataforma[]>();
  for (const publicacao of publicacoes) {
    if (publicacao.status === 'nao_publicada' || publicacao.status === 'removida') continue;
    const ciclo = cicloDaPublicacao(publicacao);
    const lista = map.get(ciclo) ?? [];
    lista.push(publicacao);
    map.set(ciclo, lista);
  }
  return map;
}
