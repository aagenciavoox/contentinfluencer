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
const LIMITE_POR_CAMPO: Record<string, Partial<Record<PlatformCopyField, number>>> = {
  instagram: { legenda: 2200, hashtags: 2200 },
  tiktok: { legenda: 2200, hashtags: 2200 },
  youtube: { titulo: 100, legenda: 5000 },
  blog: { legenda: 10000 },
};

/** Limite do campo nesta rede. Campo que a rede não mostra não recebe limite. */
export function limiteDoCampo(
  redeOuNome: string | null | undefined,
  campo: PlatformCopyField,
): number | null {
  if (!redeOuNome || !platformShowsField(redeOuNome, campo)) return null;
  return LIMITE_POR_CAMPO[platformKey(redeOuNome)]?.[campo] ?? null;
}

/** Limite de caracteres da legenda pela rede (ou pelo nome, em conta antiga). Vazio quando não há. */
export function limiteDeCaracteres(redeOuNome: string | null | undefined): number | null {
  return limiteDoCampo(redeOuNome, 'legenda');
}
