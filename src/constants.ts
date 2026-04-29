// ─── Status pipeline ─────────────────────────────────────────────────────────

export const STATUS_STAGES: string[] = [
  'Ideia',
  'Pronto para Gravar',
  'Gravado',
  'A Editar',
  'Editado',
  'Programado',
  'Postado',
];

// Cores e ícones por status (para calendário e listas)
export const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'Ideia':             { color: '#6b7280', label: 'IDÉ' },
  'Pronto para Gravar':{ color: '#f59e0b', label: 'GRV' },
  'Gravado':           { color: '#3b82f6', label: 'GRD' },
  'A Editar':          { color: '#8b5cf6', label: 'EDI' },
  'Editado':           { color: '#06b6d4', label: 'EDO' },
  'Programado':        { color: '#10b981', label: 'PRG' },
  'Postado':           { color: '#22c55e', label: 'PST' },
};

// ─── Formatos visuais ─────────────────────────────────────────────────────────

export const VISUAL_FORMATS: string[] = [
  'Talking Head',
  'Tela Verde',
  'Voiceover',
  'POV Texto',
  'Reação',
  'Vlog',
  'Misto',
];

// ─── Plataformas padrão ───────────────────────────────────────────────────────

export const DEFAULT_PLATFORMS: string[] = ['Instagram', 'TikTok', 'YouTube', 'Blog'];
