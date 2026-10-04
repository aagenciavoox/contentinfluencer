export interface PlatformColor {
  chip: string;
  dot: string;
}

const PLATFORM_COLOR_PRESETS: Record<string, PlatformColor> = {
  instagram: {
    chip: 'border-[color-mix(in_srgb,var(--accent-pink)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)] text-[var(--accent-pink)]',
    dot: 'var(--accent-pink)',
  },
  tiktok: {
    chip: 'border-[color-mix(in_srgb,var(--accent-green)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-green)_12%,transparent)] text-[var(--accent-green)]',
    dot: 'var(--accent-green)',
  },
  youtube: {
    chip: 'border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]',
    dot: 'var(--danger)',
  },
  blog: {
    chip: 'border-[color-mix(in_srgb,var(--accent-blue)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-blue)_12%,transparent)] text-[var(--accent-blue)]',
    dot: 'var(--accent-blue)',
  },
};

const FALLBACK_COLORS: PlatformColor[] = [
  {
    chip: 'border-[color-mix(in_srgb,var(--accent-purple)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-purple)_12%,transparent)] text-[var(--accent-purple)]',
    dot: 'var(--accent-purple)',
  },
  {
    chip: 'border-[color-mix(in_srgb,var(--accent-orange)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-orange)_12%,transparent)] text-[var(--accent-orange)]',
    dot: 'var(--accent-orange)',
  },
  {
    chip: 'border-[color-mix(in_srgb,var(--accent-green)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-green)_12%,transparent)] text-[var(--accent-green)]',
    dot: 'var(--accent-green)',
  },
  {
    chip: 'border-[color-mix(in_srgb,var(--info)_35%,transparent)] bg-[color-mix(in_srgb,var(--info)_12%,transparent)] text-[var(--info)]',
    dot: 'var(--info)',
  },
  {
    chip: 'border-[color-mix(in_srgb,var(--accent-pink)_35%,transparent)] bg-[color-mix(in_srgb,var(--accent-pink)_12%,transparent)] text-[var(--accent-pink)]',
    dot: 'var(--accent-pink)',
  },
];

export function getPlatformColor(platformName: string): PlatformColor {
  const preset = PLATFORM_COLOR_PRESETS[platformName.trim().toLowerCase()];
  if (preset) return preset;
  if (platformName === 'Sem plataforma') {
    return {
      chip: 'border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-secondary)]',
      dot: 'var(--text-tertiary)',
    };
  }
  let hash = 0;
  for (let i = 0; i < platformName.length; i++) {
    hash = (hash * 31 + platformName.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}
