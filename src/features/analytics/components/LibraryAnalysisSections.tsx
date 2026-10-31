import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Check,
  Clapperboard,
  Clock3,
  LayoutGrid,
  Library,
  NotebookPen,
  Sparkles,
  Star,
  Tv,
  type LucideIcon,
} from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { LibraryGenreIcon } from '../../library/components/LibraryGenreIcon';
import type { BibliotecaItem } from '../../../lib/database';
import {
  LIBRARY_FORMATS,
  formatConsumption,
  formatInfo,
  formatProgress,
  type LibraryFormatFilter,
  type LibraryPeriodAnalysis,
} from '../lib/libraryPeriodAnalysis';

/** Card branco sobre o fundo da página: borda sutil e sombra leve. */
export const CARD_CLASS = 'shadow-[var(--shadow-input)]!';

const FORMAT_ICONS: Record<string, LucideIcon> = {
  todos: LayoutGrid,
  livro: BookOpen,
  manga: BookOpenText,
  quadrinho: Library,
  filme: Clapperboard,
  'série': Tv,
  anime: Star,
  outro: Sparkles,
};

export function FormatIcon({ tipo, className }: { tipo: string; className?: string }) {
  const Icon = FORMAT_ICONS[tipo] ?? Sparkles;
  return <Icon className={cn('h-4 w-4', className)} aria-hidden />;
}

export function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-[var(--surface-subtle)] text-[var(--text-primary)]">
      {children}
    </span>
  );
}

export function FormatTag({ tipo }: { tipo: BibliotecaItem['tipo'] }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
      {formatInfo(tipo).singular}
    </span>
  );
}

function CardHeader({ title, subtitle, aside }: { title: string; subtitle?: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <Text variant="sectionTitle">{title}</Text>
        {subtitle ? <Text variant="meta" className="mt-1 block">{subtitle}</Text> : null}
      </div>
      {aside}
    </div>
  );
}

function AccentLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-accent-text)] hover:opacity-80 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

const FORMAT_OPTIONS: Array<{ id: LibraryFormatFilter; label: string }> = [
  { id: 'todos', label: 'Todos' },
  ...LIBRARY_FORMATS.map(format => ({ id: format.id, label: format.label })),
];

export function LibraryFormatChips({ value, onChange }: { value: LibraryFormatFilter; onChange: (value: LibraryFormatFilter) => void }) {
  return (
    <div className="flex items-center gap-3">
      <Text variant="bodyStrong" as="span" className="hidden shrink-0 md:inline">Formato</Text>
      <div role="group" aria-label="Formato" className="mobile-h-scroll flex gap-2 md:flex-wrap">
        {FORMAT_OPTIONS.map(option => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className="filter-chip min-h-9 shrink-0 pointer-coarse:min-h-11"
              // .filter-chip é CSS fora das camadas do Tailwind: utilitário não sobrescreve, estilo inline sim.
              style={active ? { background: 'var(--brand-accent-soft)', borderColor: 'var(--brand-accent-soft)', color: 'var(--brand-accent-text)' } : undefined}
            >
              <FormatIcon tipo={option.id} />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, caption, loading }: { icon: LucideIcon; label: string; value: number; caption?: string; loading: boolean }) {
  return (
    <Surface variant="outlined" padding="md" className={cn(CARD_CLASS, 'flex items-start gap-3')}>
      <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-[var(--brand-accent-soft)] text-[var(--brand-accent-text)] sm:inline-flex">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <Text variant="meta" className="block">{label}</Text>
        {loading
          ? <Skeleton className="mt-1 h-8 w-14" />
          : <p className="mt-1 text-3xl font-bold leading-none tabular-nums text-[var(--text-primary)]">{value.toLocaleString('pt-BR')}</p>}
        {caption ? <Text variant="meta" className="mt-1.5 block text-[var(--text-tertiary)]">{caption}</Text> : null}
      </div>
    </Surface>
  );
}

export function LibraryKpis({ analysis, formatLabel, rangeText, loading }: { analysis: LibraryPeriodAnalysis; formatLabel: string; rangeText: string; loading: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard icon={Library} label="Itens no acervo" value={analysis.inCollection} caption={formatLabel} loading={loading} />
      <KpiCard icon={Check} label="Concluídos no período" value={analysis.completed} caption={analysis.completedUndated > 0 ? `${rangeText} · ${analysis.completedUndated} sem data de conclusão` : rangeText} loading={loading} />
      <KpiCard icon={Clock3} label="Em andamento" value={analysis.active} loading={loading} />
      <KpiCard icon={NotebookPen} label="Anotações" value={analysis.notes} loading={loading} />
    </div>
  );
}

export function LibraryConsumptionTable({ analysis, loading, showAllFormats }: { analysis: LibraryPeriodAnalysis; loading: boolean; showAllFormats: boolean }) {
  const [showEmpty, setShowEmpty] = useState(false);
  const emptyRows = analysis.formats.filter(row => row.inCollection === 0);
  // Em "Todos", formatos sem itens ficam recolhidos; com um formato escolhido, a linha sempre aparece.
  const collapsible = showAllFormats && emptyRows.length > 0 && emptyRows.length < analysis.formats.length;
  const rows = collapsible && !showEmpty ? analysis.formats.filter(row => row.inCollection > 0) : analysis.formats;
  const numCell = 'px-4 py-3 text-right tabular-nums';
  return (
    <Surface variant="outlined" padding="lg" className={CARD_CLASS}>
      <CardHeader
        title="Consumo por formato"
      />
      <div className="mt-5 overflow-x-auto">
        {loading ? (
          <div className="stack-md" aria-busy="true">
            {['a', 'b', 'c'].map(key => <Skeleton key={key} className="h-9 w-full" />)}
          </div>
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="bg-[var(--surface-subtle)] text-xs text-[var(--text-secondary)]">
                <th className="rounded-l-[var(--radius-input)] px-4 py-2.5 text-left font-medium">Formato</th>
                <th className="px-4 py-2.5 text-right font-medium">No acervo</th>
                <th className="px-4 py-2.5 text-right font-medium">Concluídos</th>
                <th className="px-4 py-2.5 text-right font-medium">Em andamento</th>
                <th className="rounded-r-[var(--radius-input)] px-4 py-2.5 text-right font-medium">Consumo registrado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const empty = row.inCollection === 0;
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-[var(--border-subtle)] last:border-b-0',
                      empty ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]',
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className={cn(empty && 'opacity-60')}><IconTile><FormatIcon tipo={row.id} /></IconTile></span>
                        <span className={cn(!empty && 'font-medium')}>{row.label}</span>
                      </span>
                    </td>
                    <td className={cn(numCell, !empty && 'font-semibold')}>{row.inCollection}</td>
                    <td className={numCell}>{row.completed}</td>
                    <td className={numCell}>{row.active}</td>
                    <td className={numCell}>{formatConsumption(row)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {!loading && collapsible ? (
        <button
          type="button"
          onClick={() => setShowEmpty(value => !value)}
          aria-expanded={showEmpty}
          className="mt-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          {showEmpty ? 'Ocultar formatos sem itens' : `Mostrar formatos sem itens (${emptyRows.length})`}
        </button>
      ) : null}
    </Surface>
  );
}

const ACTIVE_LIMIT = 4;

function ProgressLine({ current, total, unit }: { current: number; total: number; unit: LibraryPeriodAnalysis['activeItems'][number]['unit'] }) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <span className="flex w-36 shrink-0 flex-col items-end gap-1 sm:w-44">
      <span className="text-sm tabular-nums text-[var(--text-secondary)]">{formatProgress(current, total, unit)}</span>
      {total > 0 ? (
        <span className="h-1 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <span className="block h-full rounded-full bg-[var(--brand-accent)]" style={{ width: `${percent}%` }} />
        </span>
      ) : null}
    </span>
  );
}

export function LibraryActiveCard({ analysis, loading }: { analysis: LibraryPeriodAnalysis; loading: boolean }) {
  // Itens com progresso informado primeiro.
  const ordered = [...analysis.activeItems].sort((a, b) => Number(b.total > 0 || b.current > 0) - Number(a.total > 0 || a.current > 0));
  const visible = ordered.slice(0, ACTIVE_LIMIT);
  return (
    <Surface variant="outlined" padding="lg" className={cn(CARD_CLASS, 'flex flex-col')}>
      <CardHeader
        title="Em andamento"
        aside={analysis.activeItems.length > 0 ? <AccentLink to="/biblioteca?status=andamento">Ver todos</AccentLink> : undefined}
      />
      <div className="mt-4 flex-1">
        {loading ? (
          <div className="stack-md" aria-busy="true">
            {['a', 'b', 'c'].map(key => <Skeleton key={key} className="h-9 w-full" />)}
          </div>
        ) : visible.length === 0 ? (
          <Text variant="meta">Nada em andamento agora.</Text>
        ) : (
          <ul>
            {visible.map(entry => {
              const hasProgress = entry.total > 0 || entry.current > 0;
              return (
                <li key={entry.id} className="flex items-center gap-3 border-b border-[var(--border-subtle)] py-2.5 last:border-b-0">
                  <IconTile><FormatIcon tipo={entry.tipo} /></IconTile>
                  <Link
                    to={`/biblioteca/${entry.id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    {entry.title}
                  </Link>
                  <span className="hidden sm:inline-flex"><FormatTag tipo={entry.tipo} /></span>
                  {hasProgress ? (
                    <ProgressLine current={entry.current} total={entry.total} unit={entry.unit} />
                  ) : (
                    <span className="flex shrink-0 items-center gap-2 text-sm">
                      <span className="text-[var(--text-tertiary)]">Sem progresso</span>
                      <Link
                        to={`/biblioteca/${entry.id}`}
                        className="font-medium text-[var(--brand-accent-text)] hover:opacity-80 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        Atualizar
                      </Link>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Surface>
  );
}

function plural(count: number, one: string, many: string) {
  return `${count.toLocaleString('pt-BR')} ${count === 1 ? one : many}`;
}

export function LibraryNotesCard({ analysis, loading }: { analysis: LibraryPeriodAnalysis; loading: boolean }) {
  return (
    <Surface variant="outlined" padding="lg" className={cn(CARD_CLASS, 'flex flex-col')}>
      <CardHeader
        title="Anotações"
        aside={(
          <div className="flex items-center gap-4 text-center">
            <div>
              <p className="text-xl font-semibold tabular-nums text-[var(--text-primary)]">{analysis.notes}</p>
              <Text variant="meta">{analysis.notes === 1 ? 'anotação' : 'anotações'}</Text>
            </div>
            <span className="h-8 w-px bg-[var(--border-color)]" aria-hidden />
            <div>
              <p className="text-xl font-semibold tabular-nums text-[var(--text-primary)]">{analysis.itemsAnnotated}</p>
              <Text variant="meta">{analysis.itemsAnnotated === 1 ? 'item anotado' : 'itens anotados'}</Text>
            </div>
          </div>
        )}
      />
      <div className="mt-4 flex-1 border-t border-[var(--border-color)] pt-4">
        <Text variant="bodyStrong" className="text-sm">Itens com mais anotações</Text>
        {loading ? (
          <Skeleton className="mt-3 h-9 w-full" />
        ) : analysis.topAnnotated.length === 0 ? (
          <Text variant="meta" className="mt-2 block">Nenhuma anotação registrada neste período.</Text>
        ) : (
          <ul className="mt-2">
            {analysis.topAnnotated.map(entry => (
              <li key={entry.id} className="border-b border-[var(--border-color)] last:border-b-0">
                <Link to={`/biblioteca/${entry.id}`} className="flex items-center gap-3 py-2 hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
                  <IconTile><FormatIcon tipo={entry.tipo} /></IconTile>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)]">{entry.title}</span>
                  <span className="hidden sm:inline-flex"><FormatTag tipo={entry.tipo} /></span>
                  <span className="shrink-0 text-sm tabular-nums text-[var(--text-secondary)]">{plural(entry.notes, 'anotação', 'anotações')}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-3">
        <AccentLink to="/biblioteca/anotacoes">Ver todas as anotações</AccentLink>
      </div>
    </Surface>
  );
}

export function LibraryGenresCard({ analysis, loading }: { analysis: LibraryPeriodAnalysis; loading: boolean }) {
  return (
    <Surface variant="outlined" padding="lg" className={CARD_CLASS}>
      <CardHeader title="Gêneros no acervo" />
      <div className="mt-4">
        {loading ? (
          <Skeleton className="h-9 w-full" />
        ) : analysis.genres.length === 0 ? (
          <Text variant="meta">Nenhum gênero marcado nos itens ainda.</Text>
        ) : (
          <ul>
            {analysis.genres.map(genre => (
              <li key={genre.id} className="flex items-center gap-3 border-b border-[var(--border-color)] py-2 last:border-b-0">
                <LibraryGenreIcon name={genre.label} className="text-[var(--text-secondary)]" />
                <span className="min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]">{genre.label}</span>
                <span className="shrink-0 text-sm tabular-nums text-[var(--text-secondary)]">{plural(genre.count, 'item', 'itens')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Surface>
  );
}

export function LibraryRatingsCard({ analysis, loading, onRate }: { analysis: LibraryPeriodAnalysis; loading: boolean; onRate: () => void }) {
  const { ratings } = analysis;
  const max = Math.max(1, ...ratings.distribution.map(entry => entry.count));
  return (
    <Surface variant="outlined" padding="lg" className={cn(CARD_CLASS, 'flex flex-col')}>
      <CardHeader title="Avaliações" />
      {loading ? (
        <Skeleton className="mt-4 h-24 w-full" />
      ) : ratings.count === 0 || ratings.average === null ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-4 text-center">
          <Star className="h-6 w-6 text-[var(--text-secondary)]" aria-hidden />
          <Text variant="bodyStrong" className="mt-2 text-sm">Nenhum item avaliado neste período.</Text>
          <AppButton variant="secondary" size="sm" className="mt-3 border-[var(--brand-accent-text)] text-[var(--brand-accent-text)]" onClick={onRate}>
            Avaliar itens concluídos
          </AppButton>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="shrink-0 text-center sm:w-28">
            <p className="text-3xl font-semibold tabular-nums text-[var(--text-primary)]">
              {ratings.average.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
            </p>
            <Text variant="meta">média de {plural(ratings.count, 'item', 'itens')}</Text>
          </div>
          <ul className="flex-1 space-y-1.5">
            {ratings.distribution.map(entry => (
              <li key={entry.stars} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="flex w-8 items-center gap-0.5 tabular-nums">{entry.stars}<Star className="h-3 w-3" aria-hidden /></span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-hover)]">
                  <span className="block h-full rounded-full bg-[var(--brand-accent)]" style={{ width: `${(entry.count / max) * 100}%` }} />
                </span>
                <span className="w-6 text-right tabular-nums">{entry.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Surface>
  );
}


