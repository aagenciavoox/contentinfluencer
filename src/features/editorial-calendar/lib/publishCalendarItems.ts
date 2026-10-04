import type { Content } from '../../../lib/database.ts';
import { platformKey } from '../../../components/ui/platformName.ts';
import { buildGradeEntries, type GradeSerie } from '../../editorial/lib/gradeEntries.ts';
const TODAS_AS_REDES = 'todas';

export type PublishCalendarItem = {
  id: string;
  contentId: string;
  date: string | null;
  time: string | null;
  plataformaId?: string;
  platformNames: string[];
};

type PlatformRef = { id: string; nome: string };

function canonicalPlatformId(ref: string, platforms: readonly PlatformRef[]): string {
  if (platforms.some(platform => platform.id === ref)) return ref;
  const key = platformKey(ref);
  return platforms.find(platform => platformKey(platform.nome) === key)?.id ?? ref;
}

function platformName(ref: string, platforms: readonly PlatformRef[]): string {
  const id = canonicalPlatformId(ref, platforms);
  return platforms.find(platform => platform.id === id)?.nome
    ?? platforms.find(platform => platformKey(platform.nome) === platformKey(ref))?.nome
    ?? ref;
}

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of names) {
    const key = platformKey(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

/**
 * "Todas" mostra um item por entrada da grade, com as redes daquele roteiro.
 * Uma rede mostra um item por publicação dela, na data dessa publicação.
 */
export function buildPublishCalendarItems(input: {
  contents: readonly Content[];
  platforms: readonly PlatformRef[];
  series: readonly GradeSerie[];
  redeReferenciaId: string | null;
  platformFilter?: string;
}): PublishCalendarItem[] {
  const platformFilter = input.platformFilter || TODAS_AS_REDES;
  const referenciaId = input.redeReferenciaId
    ? canonicalPlatformId(input.redeReferenciaId, input.platforms)
    : null;

  if (platformFilter !== TODAS_AS_REDES) {
    const filtro = platformKey(platformFilter);
    const itens: PublishCalendarItem[] = [];
    for (const content of input.contents) {
      if (content.deletedAt || content.archivedAt) continue;
      for (const publicacao of content.plataformas ?? []) {
        const nome = platformName(publicacao.platformId, input.platforms);
        if (platformKey(nome) !== filtro && platformKey(publicacao.platformId) !== filtro) continue;
        itens.push({
          id: `${content.id}:pub:${publicacao.id}`,
          contentId: content.id,
          date: publicacao.publishDate,
          time: publicacao.publishTime ?? null,
          plataformaId: publicacao.id,
          platformNames: [nome],
        });
      }
    }
    return itens;
  }

  const series: GradeSerie[] = input.series.map(serie => ({
    id: serie.id,
    funcaoPadrao: serie.funcaoPadrao,
  }));
  const entries = buildGradeEntries({
    contents: input.contents.map(content => ({
      ...content,
      plataformas: (content.plataformas ?? []).map(publicacao => ({
        ...publicacao,
        platformId: canonicalPlatformId(publicacao.platformId, input.platforms),
      })),
    })),
    series,
    settings: { redeReferenciaId: referenciaId },
  });

  return entries.map(entry => {
    const content = input.contents.find(item => item.id === entry.contentId);
    const publicacoes = (content?.plataformas ?? []).map(publicacao => ({
      ...publicacao,
      platformId: canonicalPlatformId(publicacao.platformId, input.platforms),
    }));
    const repostId = entry.tipo === 'repost'
      ? entry.id.split(':repost:')[1]
      : undefined;
    const nomes = entry.tipo === 'repost'
      ? [platformName(referenciaId || '', input.platforms)].filter(nome => nome && nome !== (referenciaId || ''))
      : uniqueNames(
        publicacoes
          .filter(publicacao => publicacao.publicationKind !== 'repost')
          .map(publicacao => platformName(publicacao.platformId, input.platforms)),
      );
    const original = publicacoes.find(publicacao =>
      publicacao.publicationKind !== 'repost' && publicacao.platformId === referenciaId,
    );

    return {
      id: entry.id,
      contentId: entry.contentId,
      date: entry.data,
      time: entry.hora,
      plataformaId: repostId || original?.id,
      platformNames: entry.tipo === 'repost' && referenciaId
        ? [platformName(referenciaId, input.platforms)]
        : nomes,
    };
  });
}

