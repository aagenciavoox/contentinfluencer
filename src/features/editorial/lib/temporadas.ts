import type { SerieNo } from './serieArvore.ts';
import { idsDaSubarvore } from './serieArvore.ts';

export type Temporada = {
  id: string;
  userId: string;
  serieId: string;
  nome: string;
  createdAt: string;
};

export type SerieTemporada = SerieNo & {
  usaTemporadas?: boolean;
};

/** Normaliza o nome para reutilizar a mesma linha no escopo. */
export function chaveNomeTemporada(nome: string): string {
  return nome.trim().toLowerCase();
}

/** Escopo ativo para uma série: ela mesma se usa temporadas; senão o ancestral mais próximo que usa. */
export function escopoTemporadas(
  serieId: string,
  series: readonly SerieTemporada[],
): SerieTemporada | null {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  let cursor: string | null | undefined = serieId;
  const vistos = new Set<string>();
  while (cursor && !vistos.has(cursor)) {
    vistos.add(cursor);
    const no = porId.get(cursor);
    if (!no) return null;
    if (no.usaTemporadas) return no;
    cursor = no.parentId?.trim() || null;
  }
  return null;
}

/** Temporadas do escopo, ordenadas por nome. */
export function temporadasDoEscopo(
  escopoId: string,
  temporadas: readonly Temporada[],
): Temporada[] {
  return temporadas
    .filter(item => item.serieId === escopoId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.createdAt.localeCompare(b.createdAt));
}

/** Achados existentes pela grafia (trim + lower). */
export function acharTemporadaPorNome(
  escopoId: string,
  nome: string,
  temporadas: readonly Temporada[],
): Temporada | null {
  const chave = chaveNomeTemporada(nome);
  if (!chave) return null;
  return temporadas.find(
    item => item.serieId === escopoId && chaveNomeTemporada(item.nome) === chave,
  ) ?? null;
}

/**
 * True se a temporada do episódio pertence ao escopo atual da série dele.
 * Fora do escopo: continua visível, pede Reorganizar.
 */
export function temporadaNoEscopo(
  temporadaId: string | null | undefined,
  serieId: string | null | undefined,
  series: readonly SerieTemporada[],
  temporadas: readonly Temporada[],
): boolean {
  if (!temporadaId || !serieId) return true;
  const escopo = escopoTemporadas(serieId, series);
  if (!escopo) return false;
  const temporada = temporadas.find(item => item.id === temporadaId);
  return temporada?.serieId === escopo.id;
}

/**
 * Séries cujos episódios entram no escopo: a série do escopo e descendentes
 * que ainda não ativaram temporadas próprias.
 */
export function serieIdsNoEscopoTemporadas(
  escopoId: string,
  series: readonly SerieTemporada[],
): Set<string> {
  const sub = idsDaSubarvore(escopoId, series);
  const fora = new Set<string>();
  for (const serie of series) {
    if (serie.id === escopoId) continue;
    if (!sub.has(serie.id)) continue;
    if (!serie.usaTemporadas) continue;
    // Subárvore que ativou o próprio escopo sai deste.
    for (const id of idsDaSubarvore(serie.id, series)) fora.add(id);
  }
  const out = new Set<string>();
  for (const id of sub) {
    if (!fora.has(id)) out.add(id);
  }
  return out;
}
