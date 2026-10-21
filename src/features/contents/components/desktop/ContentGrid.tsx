import { Check } from 'lucide-react';
import type { Content } from '../../../../lib/database';
import { EMPTY } from '../../../../lib/uiCopy';
import { useAppContext } from '../../../../context/AppContext';
import { cn } from '../../../../lib/utils';
import { ContentEntityTags } from '../ContentEntityTags';
import {
  buildContentMetaLine,
  getDisplayTitle,
  getStatusChipClass,
  getUsefulExcerpt,
  isDraftTitle,
  isRecentlyCreated,
  resolveContentEntities,
} from '../../lib/contentCardMeta';
import { PipelineContentCard } from './PipelineContentCard';

interface ContentGridProps {
  contents: Content[];
  lookAlerts: Record<string, string>;
  onSelect: (content: Content) => void;
  onPreview: (content: Content) => void;
  onToggleSelect: (id: string) => void;
  selectedIds: Set<string>;
  selectionMode?: boolean;
  onSelectionModeChange?: (active: boolean) => void;
  mode?: 'pipeline' | 'publicados';
  isCompact?: boolean;
  filterStatus?: string;
  onSelectAll?: () => void;
  /** Se omitido, o estado é calculado a partir de contents e selectedIds. */
  allPageSelected?: boolean;
  /** Se omitido, o estado é calculado a partir de contents e selectedIds. */
  somePageSelected?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
});
const calendarDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
});

/** Datas de calendário não representam instantes e não devem mudar com o fuso. */
function formatPublishDate(value: Content['publishDate']) {
  if (!value) return 'Sem data';
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (!normalized) return 'Sem data';

  if (typeof normalized === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const [year, month, day] = normalized.split('-').map(Number);
    const date = new Date(`${normalized}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() !== year
      || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return 'Data indisponível';
    }
    return calendarDateFormatter.format(date);
  }

  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? dateFormatter.format(date) : 'Data indisponível';
}

export function ContentGrid({
  contents,
  lookAlerts,
  onSelect,
  onPreview,
  onToggleSelect,
  selectedIds,
  selectionMode = false,
  onSelectionModeChange,
  mode = 'pipeline',
  isCompact = true,
  filterStatus = 'Todos',
  onSelectAll,
  allPageSelected,
  somePageSelected,
}: ContentGridProps) {
  const { state } = useAppContext();
  const enableSelection = mode === 'pipeline';
  const selectionActive = enableSelection && selectionMode;
  const selectedOnPage = contents.reduce((count, content) =>
    count + (selectedIds.has(content.id) ? 1 : 0), 0);
  const allSelected = contents.length > 0
    && (allPageSelected ?? selectedOnPage === contents.length);
  const partlySelected = !allSelected
    && (somePageSelected ?? selectedOnPage > 0);
  const normalizedStatus = filterStatus.trim().toLocaleLowerCase('pt-BR');
  const allStatuses = normalizedStatus === '' || normalizedStatus === 'todos' || normalizedStatus === 'todas';

  const selectionToolbar = enableSelection && onSelectionModeChange ? (
    <div className="flex flex-wrap items-center gap-2 px-0.5">
      <button type="button" onClick={() => onSelectionModeChange(!selectionMode)}
        aria-pressed={selectionActive}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-[var(--radius-input)] border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11',
          selectionActive
            ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
            : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
        )}>
        Modo seleção
      </button>
      {selectionActive && onSelectAll && contents.length > 0 ? (
        <>
          <button type="button" role="checkbox"
            aria-checked={allSelected ? true : partlySelected ? 'mixed' : false}
            onClick={onSelectAll} aria-label="Selecionar todos desta página"
            className={cn(
              'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-input)] border transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:min-h-11 pointer-coarse:min-w-11',
              allSelected
                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : partlySelected
                  ? 'border-[var(--text-primary)]/60 bg-[var(--text-primary)]/15'
                  : 'border-[var(--border-color)] hover:border-[var(--border-strong)]',
            )}>
            {allSelected ? <Check className="h-3.5 w-3.5 stroke-[3px]" aria-hidden="true" /> : null}
            {partlySelected ? <span className="h-0.5 w-2.5 rounded-full bg-[var(--text-primary)]" aria-hidden="true" /> : null}
          </button>
          <span className="text-xs text-[var(--text-secondary)]">
            Selecionar todos desta página ({contents.length})
          </span>
        </>
      ) : null}
    </div>
  ) : null;

  if (contents.length === 0) {
    const emptyMessage = allStatuses
      ? EMPTY.roteiros.description
      : `Nenhum roteiro em "${filterStatus}". Ajuste os filtros para ver outros itens.`;
    return (
      <div className="stack-md">
        {selectionToolbar}
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] px-4 py-16 text-center">
          <p role="status" className="text-sm font-medium text-[var(--text-secondary)]">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  if (mode === 'pipeline') {
    return (
      <div className="stack-md">
        {selectionToolbar}
        <div className="grid-content">
          {contents.map(content => {
            const { pillar, series } = resolveContentEntities(content, state.pilares, state.series);
            return (
              <PipelineContentCard key={content.id} content={content} pillar={pillar} series={series}
                platforms={state.platforms}
                isSelected={selectionActive && selectedIds.has(content.id)}
                selectionMode={selectionActive}
                onSelect={() => onSelect(content)} onPreview={() => onPreview(content)}
                onToggleSelect={() => onToggleSelect(content.id)} />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="stack-md">
      <div className="grid-content">
        {contents.map(content => {
          const { pillar, series } = resolveContentEntities(content, state.pilares, state.series);
          const excerpt = !isCompact ? getUsefulExcerpt(content) : null;
          const title = getDisplayTitle(content.title);
          const isDraft = isDraftTitle(content.title);
          const isNew = isRecentlyCreated(content);
          const metaLine = buildContentMetaLine(content, {
            pillarName: pillar?.nome,
            seriesName: series?.name,
          });

          return (
            <article key={content.id}
              className="ds-card group relative flex min-w-0 flex-col overflow-hidden bg-[var(--bg-primary)] p-3 text-left transition-colors hover:shadow-[var(--shadow-card-hover)] focus-within:shadow-[var(--focus-ring)]">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <span className="inline-flex rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                    {formatPublishDate(content.publishDate)}
                  </span>
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', getStatusChipClass(content.status))}>
                    {content.status}
                  </span>
                  {isNew ? (
                    <span className="inline-flex rounded-full bg-[var(--accent-blue)]/10 px-1.5 py-0.5 text-xs font-medium text-[var(--accent-blue)]">Novo</span>
                  ) : null}
                </div>
              </div>

              <button type="button" onClick={() => onSelect(content)} aria-label={`Abrir roteiro: ${title}`}
                className="flex min-h-0 w-full min-w-0 flex-1 flex-col text-left focus-visible:outline-none">
                <p className={cn('w-full text-sm font-semibold leading-snug text-[var(--text-primary)] [overflow-wrap:anywhere]', isDraft && 'italic text-[var(--text-secondary)]')}>
                  {title}
                </p>
                <ContentEntityTags pillar={pillar} series={series} pillarId={content.pilarId} seriesId={content.seriesId} className="mt-2" size="sm" />
                {excerpt ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">{excerpt}</p> : null}
                <p className="mt-auto pt-2 text-2xs text-[var(--text-secondary)]">{metaLine}</p>
              </button>

              {lookAlerts[content.id] ? (
                <div className="mt-2 text-xs font-medium text-[var(--accent-orange)]">{lookAlerts[content.id]}</div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
