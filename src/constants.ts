export const STATUS_STAGES: string[] = [
  'Ideia',
  'Roteiro',
  'Produção',
  'Programado',
  'Postado',
];

export const STATUS_CONFIG: Record<string, {color: string; label: string}> = {
  Ideia: {color: 'var(--status-idea)', label: 'IDE'},
  Roteiro: {color: 'var(--status-writing)', label: 'ROT'},
  'Produção': {color: 'var(--status-production)', label: 'PRD'},
  Programado: {color: 'var(--status-scheduled)', label: 'PRG'},
  Postado: {color: 'var(--status-posted)', label: 'PST'},
};

/**
 * Valores salvos em `contents.formato_visual` e `series.formato_visual_padrao`.
 * Não altere um valor existente (ex.: 'Reacao'): roteiros antigos já o guardam.
 * Para o texto exibido, use `getVisualFormatLabel`.
 */
export const VISUAL_FORMATS: string[] = [
  'Talking Head',
  'Tela Verde',
  'Voiceover',
  'POV Texto',
  'Reacao',
  'Vlog',
  'Misto',
];

/** Rótulos de exibição para valores salvos sem acento. */
export const VISUAL_FORMAT_LABELS: Record<string, string> = {
  Reacao: 'Reação',
};

/** Texto exibido para um formato visual salvo. Valores desconhecidos aparecem como estão. */
export function getVisualFormatLabel(value: string): string {
  return VISUAL_FORMAT_LABELS[value] ?? value;
}

export const DEFAULT_PLATFORMS: string[] = ['Instagram', 'TikTok', 'YouTube', 'Blog'];
