import type {Pilar, Serie} from '../../../lib/database';

export type CaptionHashtagPreset = {
  key: 'serie' | 'pilar';
  sourceLabel: 'série' | 'pilar';
  name: string;
  tags: string[];
};

export function parseHashtags(value: string): string[] {
  return value
    .split(/\s+/)
    .map(tag => tag.trim())
    .filter(Boolean)
    .map(tag => (tag.startsWith('#') ? tag : `#${tag}`));
}

export function joinHashtags(tags: string[]): string {
  return tags.join(' ');
}

function hashtagsForPlatform(
  plataformas: Array<{platformId: string; hashtags: string}> | undefined,
  platformId: string,
): string[] {
  const raw = plataformas?.find(item => item.platformId === platformId)?.hashtags ?? '';
  return parseHashtags(raw);
}

/**
 * Uma sugestão só: a série primeiro, depois o pilar, sem repetidas.
 * O aviso da rede não corta a lista.
 */
export function suggestHashtags({
  platformId,
  serie,
  pilar,
}: {
  platformId: string;
  serie: Pick<Serie, 'plataformas'> | null;
  pilar: Pick<Pilar, 'plataformas'> | null;
}): string[] {
  const serieTags = hashtagsForPlatform(serie?.plataformas, platformId);
  const pilarTags = hashtagsForPlatform(pilar?.plataformas, platformId);
  return mergeHashtags(serieTags, pilarTags);
}

export function captionHashtagPresets(
  platformId: string,
  serie: Pick<Serie, 'name' | 'plataformas'> | null,
  pilar: Pick<Pilar, 'nome' | 'plataformas'> | null,
): CaptionHashtagPreset[] {
  const presets: CaptionHashtagPreset[] = [];
  const serieTags = hashtagsForPlatform(serie?.plataformas, platformId);
  if (serie && serieTags.length > 0) {
    presets.push({
      key: 'serie',
      sourceLabel: 'série',
      name: serie.name,
      tags: serieTags,
    });
  }
  const pilarTags = hashtagsForPlatform(pilar?.plataformas, platformId);
  if (pilar && pilarTags.length > 0) {
    presets.push({
      key: 'pilar',
      sourceLabel: 'pilar',
      name: pilar.nome,
      tags: pilarTags,
    });
  }
  return presets;
}

export function mergeHashtags(current: string[], incoming: string[]): string[] {
  const merged = [...current];
  incoming.forEach(tag => {
    if (!merged.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
      merged.push(tag);
    }
  });
  return merged;
}
