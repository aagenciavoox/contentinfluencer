/** Árvore opcional de séries via parentId. Sem tipo nem profundidade fixa. */

export type SerieNo = {
  id: string;
  parentId?: string | null;
  name?: string | null;
};

/** Filhos diretos, estáveis por nome quando houver. */
export function filhosDaSerie(
  serieId: string,
  series: readonly SerieNo[],
): SerieNo[] {
  return series
    .filter(serie => serie.parentId === serieId)
    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id, 'pt-BR'));
}

/** Id da série e de todos os descendentes. */
export function idsDaSubarvore(
  serieId: string,
  series: readonly SerieNo[],
): Set<string> {
  const porPai = new Map<string, string[]>();
  for (const serie of series) {
    const pai = serie.parentId?.trim();
    if (!pai) continue;
    const lista = porPai.get(pai) ?? [];
    lista.push(serie.id);
    porPai.set(pai, lista);
  }

  const out = new Set<string>([serieId]);
  const fila = [serieId];
  while (fila.length > 0) {
    const atual = fila.pop()!;
    for (const filho of porPai.get(atual) ?? []) {
      if (out.has(filho)) continue;
      out.add(filho);
      fila.push(filho);
    }
  }
  return out;
}

/** True se o conteúdo pertence à série ou a um descendente. */
export function conteudoNaSubarvore(
  seriesId: string | null | undefined,
  raizId: string,
  series: readonly SerieNo[],
): boolean {
  if (!seriesId) return false;
  return idsDaSubarvore(raizId, series).has(seriesId);
}

/** Caminho da raiz até a série (inclusive). */
export function caminhoDaSerie(
  serieId: string,
  series: readonly SerieNo[],
): SerieNo[] {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const caminho: SerieNo[] = [];
  const vistos = new Set<string>();
  let cursor: string | null | undefined = serieId;
  while (cursor) {
    if (vistos.has(cursor)) break;
    vistos.add(cursor);
    const no = porId.get(cursor);
    if (!no) break;
    caminho.unshift(no);
    cursor = no.parentId?.trim() || null;
  }
  return caminho;
}

/** Ancestrais do mais próximo ao mais distante (sem a própria série). */
export function ancestraisDaSerie(
  serieId: string,
  series: readonly SerieNo[],
): SerieNo[] {
  const caminho = caminhoDaSerie(serieId, series);
  return caminho.slice(0, -1).reverse();
}

/**
 * Detecta se gravar `parentId` em `serieId` formaria ciclo.
 * Espelha a regra do gatilho: auto-vínculo e caminhada pelo pai.
 */
export function formariaCicloParent(
  serieId: string,
  parentId: string | null | undefined,
  series: readonly SerieNo[],
): boolean {
  if (!parentId) return false;
  if (parentId === serieId) return true;
  const porId = new Map(series.map(serie => [serie.id, serie]));
  if (!porId.has(parentId)) return false;

  const vistos = new Set<string>([serieId]);
  let cursor: string | null | undefined = parentId;
  while (cursor) {
    if (vistos.has(cursor)) return true;
    vistos.add(cursor);
    cursor = porId.get(cursor)?.parentId?.trim() || null;
  }
  return false;
}

/**
 * Detecta ciclo em origem_conteudo_id.
 * `links` mapeia id → origem atual (já no estado ou proposto).
 */
export function formariaCicloOrigem(
  contentId: string,
  origemId: string | null | undefined,
  links: ReadonlyMap<string, string | null | undefined>,
): boolean {
  if (!origemId) return false;
  if (origemId === contentId) return true;
  const vistos = new Set<string>([contentId]);
  let cursor: string | null | undefined = origemId;
  while (cursor) {
    if (vistos.has(cursor)) return true;
    vistos.add(cursor);
    cursor = links.get(cursor)?.trim() || null;
  }
  return false;
}

/**
 * Ordem de travamento usada pelo gatilho: ids da cadeia ordenados.
 * Dois escritores que formariam ciclo precisam travar o mesmo conjunto.
 */
export function idsParaTravarParent(
  serieId: string,
  parentId: string,
  series: readonly SerieNo[],
): string[] {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const ids = new Set<string>([serieId, parentId]);
  let cursor: string | null | undefined = parentId;
  const vistos = new Set<string>();
  while (cursor && !vistos.has(cursor)) {
    vistos.add(cursor);
    ids.add(cursor);
    cursor = porId.get(cursor)?.parentId?.trim() || null;
  }
  return [...ids].sort();
}

export function idsParaTravarOrigem(
  contentId: string,
  origemId: string,
  links: ReadonlyMap<string, string | null | undefined>,
): string[] {
  const ids = new Set<string>([contentId, origemId]);
  let cursor: string | null | undefined = origemId;
  const vistos = new Set<string>();
  while (cursor && !vistos.has(cursor)) {
    vistos.add(cursor);
    ids.add(cursor);
    cursor = links.get(cursor)?.trim() || null;
  }
  return [...ids].sort();
}

/** Séries raiz (sem pai) na ordem de nome. */
export function seriesRaiz(series: readonly SerieNo[]): SerieNo[] {
  return series
    .filter(serie => !serie.parentId?.trim())
    .sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id, 'pt-BR'));
}
