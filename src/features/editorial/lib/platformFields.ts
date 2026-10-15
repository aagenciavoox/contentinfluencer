import { platformKey } from '../../../components/ui/platformName.ts';

export const PLATFORM_COPY_FIELDS = ['titulo', 'legenda', 'hashtags'] as const;

export type PlatformCopyField = (typeof PLATFORM_COPY_FIELDS)[number];

/**
 * Campos visíveis no editor de cada rede.
 * Título só no YouTube. Hashtags no Instagram e no TikTok. A legenda aparece em todas.
 */
export function visiblePlatformFields(platformName: string): PlatformCopyField[] {
  const key = platformKey(platformName);
  if (key === 'youtube') return ['titulo', 'legenda'];
  if (key === 'instagram' || key === 'tiktok') return ['legenda', 'hashtags'];
  return ['legenda'];
}

export function platformShowsField(platformName: string, field: PlatformCopyField): boolean {
  return visiblePlatformFields(platformName).includes(field);
}
const LIMITE_DE_CARACTERES: Record<string, number> = {
  instagram: 2200,
  tiktok: 2200,
  youtube: 5000,
  blog: 10000,
};

/** Limite de caracteres da legenda pela rede (ou pelo nome, em conta antiga). Vazio quando não há. */
export function limiteDeCaracteres(redeOuNome: string | null | undefined): number | null {
  if (!redeOuNome) return null;
  return LIMITE_DE_CARACTERES[platformKey(redeOuNome)] ?? null;
}
