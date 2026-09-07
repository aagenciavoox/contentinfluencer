/** Canonical suggested genres for library create/edit UIs (PT labels). */
export const GENEROS_SUGERIDOS = [
  'Fantasia',
  'Romance',
  'Thriller',
  'Terror',
  'Drama',
  'Mistério',
  'Ficção científica',
  'Não ficção',
  'Comédia',
  'Ação',
  'Aventura',
  'Slice of life',
] as const;

export type GeneroSugerido = (typeof GENEROS_SUGERIDOS)[number];
