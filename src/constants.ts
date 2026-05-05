export const STATUS_STAGES: string[] = [
  'Ideia',
  'Roteiro',
  'Pronto para Gravar',
  'Gravado',
  'A Editar',
  'Editado',
  'Programado',
  'Postado',
];

export const STATUS_CONFIG: Record<string, {color: string; label: string}> = {
  Ideia: {color: '#6b7280', label: 'IDE'},
  Roteiro: {color: '#2563eb', label: 'ROT'},
  'Pronto para Gravar': {color: '#f59e0b', label: 'GRV'},
  Gravado: {color: '#3b82f6', label: 'GRD'},
  'A Editar': {color: '#8b5cf6', label: 'EDI'},
  Editado: {color: '#06b6d4', label: 'EDO'},
  Programado: {color: '#10b981', label: 'PRG'},
  Postado: {color: '#22c55e', label: 'PST'},
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
