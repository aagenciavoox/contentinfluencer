/**
 * Ícone de cada gênero da Biblioteca, por nome (sem acento e sem caixa).
 * A tela mapeia a chave para o ícone lucide; gênero desconhecido usa `tag`.
 */
export type LibraryGenreIconKey =
  | 'fantasia' | 'romance' | 'terror' | 'suspense' | 'ficcao' | 'misterio' | 'historico'
  | 'drama' | 'comedia' | 'aventura' | 'acao' | 'biografia' | 'poesia' | 'autoajuda'
  | 'negocios' | 'filosofia' | 'infantil' | 'esporte' | 'musica' | 'religiao' | 'ciencia'
  | 'tag';

const RULES: Array<[LibraryGenreIconKey, RegExp]> = [
  ['ficcao', /ficcao cientifica|sci-?fi|distopi|cyberpunk/],
  ['fantasia', /fantasia|magia|fantasy/],
  ['romance', /romance|romant|amor/],
  ['terror', /terror|horror/],
  ['suspense', /suspense|thriller/],
  ['misterio', /misterio|policial|crime|detetive/],
  ['historico', /histori|guerra|epoca/],
  ['drama', /drama/],
  ['comedia', /comedia|humor/],
  ['aventura', /aventura/],
  ['acao', /acao|shonen|luta/],
  ['biografia', /biografi|memori/],
  ['poesia', /poesia|poema/],
  ['autoajuda', /autoajuda|auto-ajuda|desenvolvimento pessoal/],
  ['negocios', /negocio|economia|financ/],
  ['filosofia', /filosofi/],
  ['infantil', /infantil|juvenil|young adult|\bya\b/],
  ['esporte', /esporte/],
  ['musica', /musica|musical/],
  ['religiao', /religi|espiritual/],
  ['ciencia', /ciencia|divulgacao/],
];

export function normalizeGenreName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function genreIconKey(name: string): LibraryGenreIconKey {
  const normalized = normalizeGenreName(name);
  return RULES.find(([, pattern]) => pattern.test(normalized))?.[0] ?? 'tag';
}
