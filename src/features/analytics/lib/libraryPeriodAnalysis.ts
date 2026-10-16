import type { BibliotecaGenero, BibliotecaItem, BibliotecaItemMeta, BibliotecaUnidadeProgresso } from '../../../lib/database';
import { periodKeyForDate, type LibraryPeriodGrouping } from './libraryPeriods.ts';

/**
 * Análise da Biblioteca por período e formato.
 * "Consumo registrado" no período: soma dos eventos de progresso (`progressoEventos`)
 * dentro do período. Item sem histórico usa a estimativa: total se concluído no período,
 * ou progresso atual se em andamento e atualizado no período.
 */

export type LibraryFormatFilter = 'todos' | 'livro' | 'manga' | 'quadrinho' | 'filme' | 'série' | 'anime';
export type LibraryConsumptionUnit = BibliotecaUnidadeProgresso;

const COMPLETED_STATUSES = new Set<BibliotecaItem['status']>(['Lido', 'Assistido', 'Concluído']);
const ACTIVE_STATUSES = new Set<BibliotecaItem['status']>(['Lendo', 'Assistindo', 'Consumindo']);

export const LIBRARY_FORMATS: ReadonlyArray<{ id: Exclude<LibraryFormatFilter, 'todos'>; label: string; singular: string; unit: LibraryConsumptionUnit }> = [
  { id: 'livro', label: 'Livros', singular: 'Livro', unit: 'paginas' },
  { id: 'manga', label: 'Mangás', singular: 'Mangá', unit: 'capitulos' },
  { id: 'quadrinho', label: 'Quadrinhos', singular: 'Quadrinho', unit: 'paginas' },
  { id: 'filme', label: 'Filmes', singular: 'Filme', unit: 'minutos' },
  { id: 'série', label: 'Séries', singular: 'Série', unit: 'episodios' },
  { id: 'anime', label: 'Animes', singular: 'Anime', unit: 'episodios' },
];

const OUTRO_FORMAT = { id: 'outro' as const, label: 'Outros', singular: 'Outro', unit: 'paginas' as LibraryConsumptionUnit };

export function formatInfo(tipo: BibliotecaItem['tipo']) {
  return LIBRARY_FORMATS.find(format => format.id === tipo) ?? OUTRO_FORMAT;
}

export interface LibraryPeriodRange {
  id: string;
  grouping: LibraryPeriodGrouping;
  label: string;
  start: Date;
  /** Fim exclusivo. */
  end: Date;
  current: boolean;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function rangeFor(date: Date, grouping: LibraryPeriodGrouping, now: Date): LibraryPeriodRange {
  const year = date.getFullYear();
  const month = date.getMonth();
  const span = grouping === 'trimestre' ? 3 : grouping === 'semestre' ? 6 : 12;
  const startMonth = Math.floor(month / span) * span;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + span, 1);
  const key = periodKeyForDate(date, grouping);
  const current = now >= start && now < end;
  return { id: `${grouping}:${key.id}`, grouping, label: key.label, start, end, current };
}

export function currentPeriodLabel(range: LibraryPeriodRange) {
  const prefix = range.grouping === 'trimestre' ? 'Este trimestre' : range.grouping === 'semestre' ? 'Este semestre' : 'Este ano';
  return range.current ? `${prefix} · ${range.label}` : range.label;
}

/** Opções do seletor: período atual e anteriores, por granularidade. Anos com dados entram na lista. */
export function libraryPeriodOptions(items: BibliotecaItem[], now = new Date()): LibraryPeriodRange[] {
  const options: LibraryPeriodRange[] = [];
  const year = now.getFullYear();
  options.push(rangeFor(now, 'ano', now));
  options.push(rangeFor(now, 'semestre', now));
  options.push(rangeFor(now, 'trimestre', now));
  for (let back = 1; back <= 3; back += 1) options.push(rangeFor(new Date(year, now.getMonth() - back * 3, 1), 'trimestre', now));
  for (let back = 1; back <= 2; back += 1) options.push(rangeFor(new Date(year, now.getMonth() - back * 6, 1), 'semestre', now));
  const years = new Set<number>([year - 1]);
  items.forEach(item => {
    [item.dataFim, item.createdAt].forEach(value => {
      if (!value) return;
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() < year) years.add(parsed.getFullYear());
    });
  });
  [...years].sort((a, b) => b - a).forEach(y => options.push(rangeFor(new Date(y, 0, 1), 'ano', now)));
  return options;
}

export function findPeriod(options: LibraryPeriodRange[], id: string) {
  return options.find(option => option.id === id) ?? options[0];
}

/** "Entre janeiro e outubro" (período atual vai até o mês corrente). */
export function periodRangeText(range: LibraryPeriodRange, now = new Date()) {
  const startMonth = range.start.getMonth();
  const lastDay = range.current ? now : new Date(range.end.getTime() - 1);
  const endMonth = lastDay.getMonth();
  if (startMonth === endMonth) return `Em ${MONTHS[startMonth]}`;
  return `Entre ${MONTHS[startMonth]} e ${MONTHS[endMonth]}`;
}

function inRange(value: string | null | undefined, range: { start: Date; end: Date }) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time >= range.start.getTime() && time < range.end.getTime();
}

function numberFrom(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const match = value.replace(',', '.').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function minutesFrom(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (!value) return null;
  const normalized = value.toLowerCase().replace(',', '.');
  const hours = normalized.match(/(\d+(?:\.\d+)?)\s*h/);
  const minutes = normalized.match(/(\d+(?:\.\d+)?)\s*(?:min|m\b)/);
  if (hours) return Math.round(Number(hours[1]) * 60 + (minutes ? Number(minutes[1]) : 0));
  return numberFrom(normalized);
}

/** Progresso atual e total na unidade do formato (filme em minutos). */
export function itemProgress(item: BibliotecaItem, meta: BibliotecaItemMeta = item.ficha ?? {}) {
  const unit: LibraryConsumptionUnit = item.unidadeProgresso ?? formatInfo(item.tipo).unit;
  let total = item.totalPaginas || 0;
  if (!total && unit === 'minutos') total = minutesFrom(meta.duracao) || 0;
  if (!total && unit === 'episodios') total = numberFrom(meta.episodios) || 0;
  const done = COMPLETED_STATUSES.has(item.status);
  const current = done && total > 0 ? total : (item.paginasLidas || 0);
  return { current, total, unit };
}

export interface LibraryFormatRow {
  id: string;
  label: string;
  unit: LibraryConsumptionUnit;
  inCollection: number;
  completed: number;
  active: number;
  /** Páginas, minutos (filmes) ou episódios. */
  amount: number;
  /** Minutos de séries/animes quando a ficha traz a duração por episódio; null se nenhum. */
  minutes: number | null;
}

export interface LibraryPeriodAnalysis {
  inCollection: number;
  completed: number;
  /** Concluídos sem data de conclusão: não entram em nenhum período. */
  completedUndated: number;
  active: number;
  notes: number;
  itemsAnnotated: number;
  formats: LibraryFormatRow[];
  activeItems: Array<{ id: string; title: string; tipo: BibliotecaItem['tipo']; current: number; total: number; unit: LibraryConsumptionUnit }>;
  topAnnotated: Array<{ id: string; title: string; tipo: BibliotecaItem['tipo']; notes: number }>;
  genres: Array<{ id: string; label: string; count: number }>;
  ratings: { count: number; average: number | null; distribution: Array<{ stars: number; count: number }> };
}

export function buildLibraryPeriodAnalysis(
  allItems: BibliotecaItem[],
  range: { start: Date; end: Date },
  format: LibraryFormatFilter,
  generos: BibliotecaGenero[] = [],
): LibraryPeriodAnalysis {
  const items = allItems.filter(item => !item.deletedAt && (format === 'todos' || item.tipo === format));
  const rows = new Map<string, LibraryFormatRow>();
  const visibleFormats = format === 'todos' ? LIBRARY_FORMATS : LIBRARY_FORMATS.filter(entry => entry.id === format);
  visibleFormats.forEach(entry => rows.set(entry.id, {
    id: entry.id, label: entry.label, unit: entry.unit, inCollection: 0, completed: 0, active: 0, amount: 0, minutes: null,
  }));

  let completed = 0;
  let completedUndated = 0;
  let active = 0;
  let notes = 0;
  const annotated: LibraryPeriodAnalysis['topAnnotated'] = [];
  const activeItems: LibraryPeriodAnalysis['activeItems'] = [];
  const genreCounts = new Map<string, number>();
  const ratingValues: number[] = [];

  items.forEach(item => {
    const info = formatInfo(item.tipo);
    let row = rows.get(item.tipo);
    if (!row) {
      row = { id: info.id, label: info.label, unit: info.unit, inCollection: 0, completed: 0, active: 0, amount: 0, minutes: null };
      rows.set(item.tipo, row);
    }
    row.inCollection += 1;
    const meta = item.ficha ?? {};
    const progress = itemProgress(item, meta);
    const isCompleted = COMPLETED_STATUSES.has(item.status) && inRange(item.dataFim, range);
    const isActive = ACTIVE_STATUSES.has(item.status);

    if (COMPLETED_STATUSES.has(item.status) && !item.dataFim) completedUndated += 1;
    const history = item.progressoEventos ?? [];
    let consumed = 0;
    if (isCompleted) {
      completed += 1;
      row.completed += 1;
      if (history.length === 0) consumed = progress.current;
      if (typeof item.avaliacao === 'number' && item.avaliacao > 0) ratingValues.push(item.avaliacao);
    }
    if (isActive) {
      active += 1;
      row.active += 1;
      activeItems.push({ id: item.id, title: item.titulo, tipo: item.tipo, current: progress.current, total: progress.total, unit: progress.unit });
      if (history.length === 0 && inRange(item.updatedAt, range)) consumed = progress.current;
    }
    if (history.length > 0) consumed = consumedFromHistory(history, range);
    if (consumed > 0) {
      row.amount += consumed;
      if (row.unit === 'episodios') {
        const perEpisode = minutesFrom(meta.duracaoPorEpisodio);
        if (perEpisode) row.minutes = (row.minutes ?? 0) + consumed * perEpisode;
      }
    }

    const noteCount = item.anotacoes.filter(note => !note.deletedAt && inRange(note.createdAt, range)).length;
    if (noteCount > 0) {
      notes += noteCount;
      annotated.push({ id: item.id, title: item.titulo, tipo: item.tipo, notes: noteCount });
    }
    item.generoIds.forEach(id => genreCounts.set(id, (genreCounts.get(id) ?? 0) + 1));
  });

  const genreNames = new Map(generos.map(genero => [genero.id, genero.nome]));
  const genres = [...genreCounts.entries()]
    .map(([id, count]) => ({ id, label: genreNames.get(id) ?? id, count }))
    .filter(entry => entry.label)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))
    .slice(0, 6);

  const distribution = [5, 4, 3, 2, 1].map(stars => ({
    stars,
    count: ratingValues.filter(value => Math.round(value) === stars).length,
  }));

  return {
    inCollection: items.length,
    completed,
    completedUndated,
    active,
    notes,
    itemsAnnotated: annotated.length,
    formats: [...rows.values()].filter(row => format !== 'todos' || row.id !== 'outro' || row.inCollection > 0),
    activeItems,
    topAnnotated: annotated.sort((a, b) => b.notes - a.notes).slice(0, 3),
    genres,
    ratings: {
      count: ratingValues.length,
      average: ratingValues.length ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length : null,
      distribution,
    },
  };
}

/** Soma dos avanços registrados no período (retrocessos não descontam consumo). */
export function consumedFromHistory(events: NonNullable<BibliotecaItem['progressoEventos']>, range: { start: Date; end: Date }) {
  return events
    .filter(event => event.delta > 0 && inRange(event.occurredAt, range))
    .reduce((sum, event) => sum + event.delta, 0);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  if (hours === 0) return `${rest}min`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}

/** Texto da coluna "Consumo registrado", na medida de cada formato. */
export function formatConsumption(row: Pick<LibraryFormatRow, 'unit' | 'amount' | 'minutes'>) {
  if (row.amount <= 0) return '—';
  const amount = row.amount.toLocaleString('pt-BR');
  if (row.unit === 'paginas') return `${amount} ${row.amount === 1 ? 'página' : 'páginas'}`;
  if (row.unit === 'capitulos') return `${amount} ${row.amount === 1 ? 'capítulo' : 'capítulos'}`;
  if (row.unit === 'minutos') return formatDuration(row.amount);
  const episodes = `${amount} ${row.amount === 1 ? 'episódio' : 'episódios'}`;
  return row.minutes ? `${episodes} · ${formatDuration(row.minutes)}` : episodes;
}

export function formatProgress(current: number, total: number, unit: LibraryConsumptionUnit) {
  const label = unit === 'paginas' ? 'páginas' : unit === 'capitulos' ? 'capítulos' : unit === 'minutos' ? 'min' : 'episódios';
  if (total > 0) return `${current.toLocaleString('pt-BR')} / ${total.toLocaleString('pt-BR')} ${label}`;
  if (current > 0) return `${current.toLocaleString('pt-BR')} ${label}`;
  return '—';
}
