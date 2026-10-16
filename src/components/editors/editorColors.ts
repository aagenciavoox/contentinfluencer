/**
 * Paletas do editor de roteiro.
 * Destaque: tons pastel; o texto destacado sempre usa tinta escura (ver ReadableHighlight),
 * então continua legível no tema escuro.
 * Cor do texto: tons médios com contraste >= 3,5:1 no fundo claro (#FFFFFF) e no escuro (#1B1B19).
 */
export type EditorColor = { name: string; value: string };

export const HIGHLIGHT_COLORS: EditorColor[] = [
  { name: 'Amarelo', value: '#FFF3A3' },
  { name: 'Verde', value: '#C9F2C7' },
  { name: 'Azul', value: '#C7E0FF' },
  { name: 'Rosa', value: '#FFD1E8' },
  { name: 'Laranja', value: '#FFDDB0' },
  { name: 'Roxo', value: '#E3D4FF' },
  { name: 'Cinza', value: '#E4E4E0' },
];

export const TEXT_COLORS: EditorColor[] = [
  { name: 'Vermelho', value: '#D2453B' },
  { name: 'Laranja', value: '#C76A12' },
  { name: 'Verde', value: '#2E8B4E' },
  { name: 'Azul', value: '#3A73C9' },
  { name: 'Roxo', value: '#8A5CD1' },
  { name: 'Rosa', value: '#C2477F' },
  { name: 'Cinza', value: '#7A7A75' },
];

/** Tinta escura usada sobre qualquer destaque (pastel), nos dois temas. */
export const HIGHLIGHT_INK = '#111111';

/** Fundos de referência dos temas (--bg-elevated claro e escuro). */
export const THEME_SURFACES = { light: '#FFFFFF', dark: '#1B1B19' } as const;
