import {Check, Clapperboard, ExternalLink, Zap} from 'lucide-react';
import {Text} from '../../../../components/ui/Text';
import type {Content} from '../../../../lib/database';
import {useAppContext} from '../../../../context/AppContext';
import {EMPTY} from '../../../../lib/uiCopy';
import {cn} from '../../../../lib/utils';
import {ContentEntityTags} from '../../../contents/components/ContentEntityTags';
import {
  getDisplayTitle,
  getScriptWordCount,
  getUsefulExcerpt,
  resolveContentEntities,
} from '../../../contents/lib/contentCardMeta';
import {normalizeRecordingTags} from '../../lib/recordingWorkflow';

interface RecordingQueueGridProps {
  contents: Content[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onOpen: (id: string) => void;
}

export function RecordingQueueGrid({
  contents,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onOpen,
}: RecordingQueueGridProps) {
  const {state} = useAppContext();
  const allSelected = contents.length > 0 && contents.every(content => selectedIds.has(content.id));
  const someSelected = contents.some(content => selectedIds.has(content.id));

  if (contents.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-16 text-center">
        <Clapperboard className="mx-auto mb-4 h-10 w-10 text-[var(--text-tertiary)] opacity-40" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">{EMPTY.roteirosSemBloco.title}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
          {EMPTY.roteirosSemBloco.description}
        </p>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onSelectAll}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <span
            className={cn(
              'inline-flex h-4 w-4 items-center justify-center rounded border transition-colors',
              allSelected
                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : someSelected
                  ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/15'
                  : 'border-[var(--border-color)]'
            )}
          >
            {allSelected ? <Check className="h-2.5 w-2.5 stroke-[3px]" /> : null}
            {someSelected && !allSelected ? (
              <span className="h-0.5 w-2 rounded-full bg-[var(--text-primary)]" />
            ) : null}
          </span>
          {allSelected ? 'Desmarcar pagina' : 'Selecionar pagina'}
        </button>

        {someSelected ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="text-xs font-semibold text-[var(--text-tertiary)] underline-offset-2 hover:text-[var(--text-secondary)] hover:underline"
          >
            Limpar selecao ({selectedIds.size})
          </button>
        ) : (
          <span className="text-xs text-[var(--text-tertiary)]">{contents.length} roteiros na grade</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {contents.map(content => {
          const isSelected = selectedIds.has(content.id);
          const {pillar, series} = resolveContentEntities(content, state.pilares, state.series);
          const excerpt = getUsefulExcerpt(content);
          const wordCount = getScriptWordCount(content);
          const recordingTags = normalizeRecordingTags(content.tags || []);

          return (
            <article
              key={content.id}
              className={cn(
                'group relative flex min-h-[11.5rem] flex-col rounded-[var(--radius-card)] border bg-[var(--bg-primary)] p-4 text-left transition-all',
                isSelected
                  ? 'border-[var(--text-primary)] bg-[var(--bg-hover)] shadow-[0_0_0_1px_var(--text-primary)]'
                  : 'border-[var(--border-color)] hover:border-[var(--border-strong)] hover:shadow-sm'
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSelect(content.id)}
                  className={cn(
                    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-input)] border transition-colors',
                    isSelected
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
                  )}
                  aria-label={isSelected ? 'Remover da selecao' : 'Selecionar para bloco'}
                >
                  {isSelected ? <Check className="h-3.5 w-3.5 stroke-[3px]" /> : null}
                </button>

                <button
                  type="button"
                  onClick={() => onOpen(content.id)}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] text-[var(--text-secondary)] opacity-70 transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] group-hover:opacity-100"
                  aria-label="Abrir detalhe do conteudo"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => onToggleSelect(content.id)}
                className="flex min-h-0 flex-1 flex-col text-left"
              >
                <Text variant="itemTitle" className="line-clamp-2 leading-snug">
                  {getDisplayTitle(content.title)}
                </Text>

                <ContentEntityTags
                  pillar={pillar}
                  series={series}
                  pillarId={content.pilarId}
                  seriesId={content.seriesId}
                  className="mt-2"
                  size="sm"
                />

                {excerpt ? (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">{excerpt}</p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                    {wordCount > 0 ? `${wordCount} palavras no roteiro` : 'Sem roteiro escrito'}
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                  {content.energiaNecessaria ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-semibold capitalize text-[var(--text-secondary)]">
                      <Zap className="h-3 w-3" />
                      {content.energiaNecessaria}
                    </span>
                  ) : null}
                  {recordingTags.slice(0, 2).map(tag => (
                    <span
                      key={`${content.id}-${tag}`}
                      className="rounded-full bg-[var(--accent-orange)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--accent-orange)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
