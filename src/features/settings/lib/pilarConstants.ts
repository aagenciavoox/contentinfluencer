const SHADE_NAMES = ['pálido', 'claro', 'suave', 'médio', 'vivo', 'forte', 'escuro', 'profundo'] as const;

const NAMED_CORES: Record<string, string> = {
  '#F5C543': 'Amarelo',
  '#D9730D': 'Laranja',
  '#D44C47': 'Vermelho',
  '#E8A0BF': 'Rosa',
  '#9065B0': 'Roxo',
  '#6366F1': 'Índigo',
  '#4A90D9': 'Azul',
  '#2EAADC': 'Ciano',
  '#448361': 'Verde',
  '#FFFFFF': 'Branco',
  '#F5F0E4': 'Bege',
  '#E7E5E4': 'Areia',
  '#D6D3D1': 'Cinza claro',
  '#A8A29E': 'Cinza',
  '#78716C': 'Cinza médio',
  '#57534E': 'Cinza escuro',
  '#37352F': 'Preto',
};

const COLOR_FAMILIES: { name: string; shades: string[] }[] = [
  {
    name: 'Amarelo',
    shades: ['#FFFBEB', '#FEF3C7', '#FDE68A', '#F5C543', '#EAB308', '#CA8A04', '#A16207', '#713F12'],
  },
  {
    name: 'Laranja',
    shades: ['#FFF7ED', '#FFEDD5', '#FDBA74', '#FB923C', '#D9730D', '#EA580C', '#C2410C', '#9A3412'],
  },
  {
    name: 'Vermelho',
    shades: ['#FEF2F2', '#FECACA', '#F87171', '#EF4444', '#D44C47', '#DC2626', '#B91C1C', '#7F1D1D'],
  },
  {
    name: 'Rosa',
    shades: ['#FDF2F8', '#FBCFE8', '#F9A8D4', '#E8A0BF', '#F472B6', '#EC4899', '#DB2777', '#9D174D'],
  },
  {
    name: 'Roxo',
    shades: ['#FAF5FF', '#E9D5FF', '#D8B4FE', '#C084FC', '#9065B0', '#9333EA', '#7E22CE', '#581C87'],
  },
  {
    name: 'Índigo',
    shades: ['#EEF2FF', '#E0E7FF', '#A5B4FC', '#818CF8', '#6366F1', '#4F46E5', '#4338CA', '#312E81'],
  },
  {
    name: 'Azul',
    shades: ['#EFF6FF', '#DBEAFE', '#93C5FD', '#60A5FA', '#4A90D9', '#2563EB', '#1D4ED8', '#1E3A8A'],
  },
  {
    name: 'Ciano',
    shades: ['#ECFEFF', '#CFFAFE', '#67E8F9', '#22D3EE', '#2EAADC', '#0891B2', '#0E7490', '#155E75'],
  },
  {
    name: 'Verde',
    shades: ['#F0FDF4', '#BBF7D0', '#86EFAC', '#4ADE80', '#448361', '#16A34A', '#15803D', '#14532D'],
  },
  {
    name: 'Lima',
    shades: ['#F7FEE7', '#D9F99D', '#BEF264', '#A3E635', '#84CC16', '#65A30D', '#4D7C0F', '#3F6212'],
  },
  {
    name: 'Neutro',
    shades: ['#FFFFFF', '#F5F0E4', '#E7E5E4', '#D6D3D1', '#A8A29E', '#78716C', '#57534E', '#37352F'],
  },
];

export const PILAR_PRESET_CORES = COLOR_FAMILIES.flatMap(family => family.shades);

export const PILAR_DEFAULT_COR = '#F5C543';

export const PILAR_COR_LABELS: Record<string, string> = Object.fromEntries(
  COLOR_FAMILIES.flatMap(family =>
    family.shades.map((hex, index) => [
      hex,
      NAMED_CORES[hex] ?? `${family.name} ${SHADE_NAMES[index]}`,
    ]),
  ),
);

export const PILAR_DESCRICAO_MAX = 500;

export function normalizeEntityColor(value: string): string {
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toUpperCase() : trimmed;
}

export function entityColorLabel(value: string): string {
  const normalized = normalizeEntityColor(value);
  return PILAR_COR_LABELS[normalized] || (normalized ? `Personalizada · ${normalized}` : 'Personalizada');
}

export function pilarSlugFromNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'pilar';
}
