import type {Pilar, Serie} from '../../../lib/database';
import {contaDaRef, redeDaConta, type ContaRef} from '../../contas/lib/contas.ts';

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

/**
 * Hashtags de série e pilar ficam por conta. A conta sem linha própria usa as
 * da outra conta da mesma plataforma, para uma conta nova não começar vazia.
 */
function hashtagsForPlatform(
  plataformas: Array<{platformId: string; hashtags: string}> | undefined,
  platformId: string,
  contas: readonly ContaRef[] = [],
): string[] {
  const linhas = plataformas ?? [];
  const exata = linhas.find(item => item.platformId === platformId && item.hashtags.trim());
  if (exata) return parseHashtags(exata.hashtags);
  const conta = contaDaRef(platformId, contas);
  if (!conta) return [];
  const daConta = linhas.find(item => contaDaRef(item.platformId, contas)?.id === conta.id && item.hashtags.trim());
  if (daConta) return parseHashtags(daConta.hashtags);
  const rede = redeDaConta(conta);
  // Blog/site e outras plataformas não somam hashtags por rede.
  if (!rede || rede === 'outra' || rede === 'blog') return [];
  const daRede = linhas.filter(item => {
    const outra = contaDaRef(item.platformId, contas);
    return outra != null && redeDaConta(outra) === rede && item.hashtags.trim();
  });
  return daRede.reduce<string[]>((tags, item) => mergeHashtags(tags, parseHashtags(item.hashtags)), []);
}

/**
 * Uma sugestão só: a série primeiro, depois o pilar, sem repetidas.
 * O aviso da rede não corta a lista.
 */
export function suggestHashtags({
  platformId,
  serie,
  pilar,
  contas = [],
}: {
  /** Id da conta da publicação. */
  platformId: string;
  serie: Pick<Serie, 'plataformas'> | null;
  pilar: Pick<Pilar, 'plataformas'> | null;
  contas?: readonly ContaRef[];
}): string[] {
  const serieTags = hashtagsForPlatform(serie?.plataformas, platformId, contas);
  const pilarTags = hashtagsForPlatform(pilar?.plataformas, platformId, contas);
  return mergeHashtags(serieTags, pilarTags);
}

export function captionHashtagPresets(
  platformId: string,
  serie: Pick<Serie, 'name' | 'plataformas'> | null,
  pilar: Pick<Pilar, 'nome' | 'plataformas'> | null,
  contas: readonly ContaRef[] = [],
): CaptionHashtagPreset[] {
  const presets: CaptionHashtagPreset[] = [];
  const serieTags = hashtagsForPlatform(serie?.plataformas, platformId, contas);
  if (serie && serieTags.length > 0) {
    presets.push({
      key: 'serie',
      sourceLabel: 'série',
      name: serie.name,
      tags: serieTags,
    });
  }
  const pilarTags = hashtagsForPlatform(pilar?.plataformas, platformId, contas);
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
