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

export const VISUAL_FORMATS: string[] = [
  'Talking Head',
  'Tela Verde',
  'Voiceover',
  'POV Texto',
  'Reacao',
  'Vlog',
  'Misto',
];

export const DEFAULT_PLATFORMS: string[] = ['Instagram', 'TikTok', 'YouTube', 'Blog'];
