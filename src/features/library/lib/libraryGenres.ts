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

/**
 * Gêneros sugeridos por tipo. Quadrinho usa a mesma lista dos livros (sem duplicar).
 * Hoje todos os tipos compartilham a lista canônica.
 */
export const GENEROS_POR_TIPO = {
  livro: GENEROS_SUGERIDOS,
  quadrinho: GENEROS_SUGERIDOS,
} as const;

export type GeneroSugerido = (typeof GENEROS_SUGERIDOS)[number];
