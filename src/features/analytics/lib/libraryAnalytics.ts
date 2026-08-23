import type { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';

const COMPLETED_STATUSES = new Set<BibliotecaItem['status']>(['Lido', 'Assistido', 'Concluído']);
const ACTIVE_STATUSES = new Set<BibliotecaItem['status']>(['Lendo', 'Assistindo', 'Consumindo']);
const WISHLIST_STATUSES = new Set<BibliotecaItem['status']>(['Quero ler', 'Quero ver', 'Quero consumir']);
const PAUSED_STATUSES = new Set<BibliotecaItem['status']>(['Pausado', 'Abandonado']);
const BOOKISH_TYPES = new Set<BibliotecaItem['tipo']>(['livro', 'manga']);
const EPISODIC_TYPES = new Set<BibliotecaItem['tipo']>(['série', 'anime']);

const TYPE_LABELS: Record<BibliotecaItem['tipo'], string> = {
  livro: 'Livros',
  manga: 'Mangás',
  filme: 'Filmes',
  série: 'Séries',
  anime: 'Animes',
  outro: 'Outros',
};

export interface LibraryAnalyticsSnapshot {
  totals: {
    items: number;
    books: number;
    pagesRead: number;
    pagesCatalogued: number;
    minutesWatched: number;
    episodesWatched: number;
    averageRating: number | null;
    ratedItems: number;
    completed: number;
    active: number;
    averageProgress: number;
    averageCompletionDays: number | null;
  };
  annotations: {
    total: number;
    highlights: number;
    itemsWithNotes: number;
    averagePerAnnotatedItem: number;
  };
  typeData: Array<{ id: string; label: string; value: number; percent: number }>;
  statusData: Array<{ id: string; label: string; value: number; percent: number }>;
  genreData: Array<{ id: string; label: string; value: number; percent: number }>;
  ratingData: Array<{ id: string; label: string; value: number; percent: number }>;
  mostAnnotated: Array<{ id: string; label: string; value: number; percent: number }>;
  completedThisMonth: number;
  completedThisYear: number;
}

function numericValue(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const normalized = value.replace(',', '.');
  const match = normalized.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function durationInMinutes(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (!value) return null;

  const normalized = value.toLowerCase().replace(',', '.');
  const hours = normalized.match(/(\d+(?:\.\d+)?)\s*h/);
  const minutes = normalized.match(/(\d+(?:\.\d+)?)\s*(?:min|m\b)/);

  if (hours) {
    return Math.round(Number(hours[1]) * 60 + (minutes ? Number(minutes[1]) : 0));
  }

  return numericValue(normalized);
}

function progressForItem(item: BibliotecaItem, metadata: BibliotecaItemMeta) {
  const completed = COMPLETED_STATUSES.has(item.status);

  if (BOOKISH_TYPES.has(item.tipo)) {
    const total = item.totalPaginas || 0;
    const current = completed && total > 0 ? total : (item.paginasLidas || 0);
    return { current, total };
  }

  if (item.tipo === 'filme') {
    const total = item.totalPaginas || durationInMinutes(metadata.duracao) || 0;
    const current = completed && total > 0 ? total : (item.paginasLidas || 0);
    return { current, total };
  }

  if (EPISODIC_TYPES.has(item.tipo)) {
    const total = item.totalPaginas || numericValue(metadata.episodios) || 0;
    const current = completed && total > 0 ? total : (item.paginasLidas || 0);
    return { current, total };
  }

  return { current: item.paginasLidas || 0, total: item.totalPaginas || 0 };
}

function percentageData(entries: Array<{ id: string; label: string; value: number }>) {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);
  return entries.map(entry => ({
    ...entry,
    percent: total > 0 ? Math.round((entry.value / total) * 100) : 0,
  }));
}

export function buildLibraryAnalytics(
  items: BibliotecaItem[],
  getMetadata: (itemId: string) => BibliotecaItemMeta,
  now = new Date(),
): LibraryAnalyticsSnapshot {
  const completedItems = items.filter(item => COMPLETED_STATUSES.has(item.status));
  const activeItems = items.filter(item => ACTIVE_STATUSES.has(item.status));
  const bookishItems = items.filter(item => BOOKISH_TYPES.has(item.tipo));
  const ratedItems = items.filter(item => typeof item.avaliacao === 'number' && item.avaliacao > 0);

  let pagesRead = 0;
  let pagesCatalogued = 0;
  let minutesWatched = 0;
  let episodesWatched = 0;
  const trackedProgress: number[] = [];

  items.forEach(item => {
    const metadata = getMetadata(item.id);
    const progress = progressForItem(item, metadata);
    const completed = COMPLETED_STATUSES.has(item.status);

    if (BOOKISH_TYPES.has(item.tipo)) {
      pagesRead += progress.current;
      pagesCatalogued += progress.total;
    } else if (item.tipo === 'filme') {
      minutesWatched += progress.current;
    } else if (EPISODIC_TYPES.has(item.tipo)) {
      episodesWatched += progress.current;
      const episodeMinutes = durationInMinutes(metadata.duracaoPorEpisodio);
      if (episodeMinutes) minutesWatched += progress.current * episodeMinutes;
    }

    if (progress.total > 0 && (completed || ACTIVE_STATUSES.has(item.status))) {
      trackedProgress.push(Math.min(100, Math.round((progress.current / progress.total) * 100)));
    }
  });

  const completionDurations = completedItems
    .filter(item => item.dataInicio && item.dataFim)
    .map(item => {
      const start = new Date(item.dataInicio!).getTime();
      const end = new Date(item.dataFim!).getTime();
      return Math.max(1, Math.round((end - start) / 86_400_000));
    })
    .filter(days => Number.isFinite(days) && days >= 0);

  const annotationsTotal = items.reduce((sum, item) => sum + item.anotacoes.length, 0);
  const itemsWithNotes = items.filter(item => item.anotacoes.length > 0);
  const annotationsHighlights = items.reduce(
    (sum, item) => sum + item.anotacoes.filter(note => note.contentPotential || note.destilada).length,
    0,
  );

  const typeCounts = Object.entries(TYPE_LABELS).map(([type, label]) => ({
    id: type,
    label,
    value: items.filter(item => item.tipo === type).length,
  })).filter(entry => entry.value > 0);

  const statusCounts = [
    { id: 'active', label: 'Em andamento', value: activeItems.length },
    { id: 'completed', label: 'Concluídos', value: completedItems.length },
    { id: 'wishlist', label: 'Na fila', value: items.filter(item => WISHLIST_STATUSES.has(item.status)).length },
    { id: 'paused', label: 'Pausados ou abandonados', value: items.filter(item => PAUSED_STATUSES.has(item.status)).length },
  ].filter(entry => entry.value > 0);

  const genreCounts = new Map<string, number>();
  items.forEach(item => item.generoIds.forEach(genre => {
    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  }));
  const genreEntries = [...genreCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([label, value], index) => ({ id: `${label}-${index}`, label, value }));

  const ratingEntries = [5, 4, 3, 2, 1].map(rating => ({
    id: String(rating),
    label: `${rating} estrelas`,
    value: ratedItems.filter(item => Math.round(item.avaliacao || 0) === rating).length,
  }));

  const mostAnnotatedEntries = [...items]
    .filter(item => item.anotacoes.length > 0)
    .sort((left, right) => right.anotacoes.length - left.anotacoes.length)
    .slice(0, 5)
    .map(item => ({ id: item.id, label: item.titulo, value: item.anotacoes.length }));

  const completedThisMonth = completedItems.filter(item => {
    if (!item.dataFim) return false;
    const date = new Date(item.dataFim);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).length;

  const completedThisYear = completedItems.filter(item => {
    if (!item.dataFim) return false;
    return new Date(item.dataFim).getFullYear() === now.getFullYear();
  }).length;

  return {
    totals: {
      items: items.length,
      books: bookishItems.length,
      pagesRead: Math.round(pagesRead),
      pagesCatalogued: Math.round(pagesCatalogued),
      minutesWatched: Math.round(minutesWatched),
      episodesWatched: Math.round(episodesWatched),
      averageRating: ratedItems.length > 0
        ? ratedItems.reduce((sum, item) => sum + (item.avaliacao || 0), 0) / ratedItems.length
        : null,
      ratedItems: ratedItems.length,
      completed: completedItems.length,
      active: activeItems.length,
      averageProgress: trackedProgress.length > 0
        ? Math.round(trackedProgress.reduce((sum, value) => sum + value, 0) / trackedProgress.length)
        : 0,
      averageCompletionDays: completionDurations.length > 0
        ? Math.round(completionDurations.reduce((sum, days) => sum + days, 0) / completionDurations.length)
        : null,
    },
    annotations: {
      total: annotationsTotal,
      highlights: annotationsHighlights,
      itemsWithNotes: itemsWithNotes.length,
      averagePerAnnotatedItem: itemsWithNotes.length > 0
        ? annotationsTotal / itemsWithNotes.length
        : 0,
    },
    typeData: percentageData(typeCounts),
    statusData: percentageData(statusCounts),
    genreData: percentageData(genreEntries),
    ratingData: percentageData(ratingEntries),
    mostAnnotated: percentageData(mostAnnotatedEntries),
    completedThisMonth,
    completedThisYear,
  };
}

export function formatWatchTime(minutes: number) {
  if (minutes <= 0) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}
