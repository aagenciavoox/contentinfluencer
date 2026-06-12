import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronDown, Clapperboard, Plus, SearchCheck, Sparkles } from 'lucide-react';
import type { Content, Pilar, Serie } from '../../../lib/database';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { AppButton } from '../../../components/ui/AppButton';
import { cn, htmlToReadableText } from '../../../lib/utils';
import { ContentEntityTags } from '../../../features/contents/components/ContentEntityTags';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import { scriptExcerpt } from '../../components/MobileScriptReader';
import type { ContentsListView } from '../../../features/contents/types';

interface ContentsMobileScreenProps {
  mode: ContentsListView;
  contents: Content[];
  pageSize: number;
  allContents: Content[];
  series: Serie[];
  pilares: Pilar[];
  onSelect: (content: Content) => void;
  onPreview?: (content: Content) => void;
  onCreate: () => void;
  onListViewChange?: (view: ContentsListView) => void;
}

export function ContentsMobileScreen({
  mode,
  contents,
  pageSize,
  series,
  pilares,
  onSelect,
  onCreate,
  onListViewChange,
}: ContentsMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const filteredContents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return contents
      .filter(content => {
        if (!normalizedSearch) return true;
        const seriesName = series.find(item => item.id === content.seriesId)?.name || '';
        const pillarName = pilares.find(item => item.id === content.pilarId)?.nome || '';
        const scriptText = htmlToReadableText(content.script);
        const dateLabel = content.publishDate
          ? new Date(content.publishDate).toLocaleDateString('pt-BR').toLowerCase()
          : '';
        return [content.title, scriptText, content.notes || '', seriesName, pillarName, dateLabel]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [contents, pilares, search, series]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [mode, pageSize, search, contents]);

  const visibleContents = useMemo(() => filteredContents.slice(0, visibleCount), [filteredContents, visibleCount]);
  const hasMore = visibleContents.length < filteredContents.length;
  const isPipeline = mode === 'pipeline';

  const focusAction = (
    <button type="button" onClick={onCreate} className="button-primary w-full">
      <Sparkles className="h-4 w-4" />
      Novo conteudo
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {isPipeline ? 'Pipeline' : 'Publicados'}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">{filteredContents.length} itens</p>
        </div>
        {isPipeline ? (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-xs font-semibold uppercase tracking-[0.12em]"
          >
            <Plus className="h-4 w-4" />
            Novo
          </button>
        ) : null}
      </div>

      {onListViewChange ? (
        <MobileSegmentTabs
          rounded="tight"
          tabs={[
            { value: 'pipeline', label: 'Pipeline' },
            { value: 'publicados', label: 'Publicados' },
          ]}
          value={mode}
          onChange={onListViewChange}
        />
      ) : null}

      <MobileSearchBar
        value={search}
        onChange={setSearch}
        placeholder={isPipeline ? 'Buscar titulo ou trecho do roteiro' : 'Buscar titulo ou data'}
        rounded="tight"
      />

      {filteredContents.length === 0 ? (
        <MobileEmptyState
          title="Nenhum conteúdo nessa visão"
          description={isPipeline ? 'Crie um roteiro ou ajuste a busca.' : 'Nenhum conteudo publicado ainda.'}
          action={isPipeline ? focusAction : undefined}
          icon={<SearchCheck className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-2.5">
          {visibleContents.map(content => {
            const seriesItem = series.find(item => item.id === content.seriesId) || null;
            const pillarItem = pilares.find(item => item.id === content.pilarId) || null;
            const excerpt = scriptExcerpt(content.script, 160);
            const words = htmlToReadableText(content.script).trim().split(/\s+/).filter(Boolean).length;

            return (
              <button
                key={content.id}
                type="button"
                onClick={() => onSelect(content)}
                className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 text-left shadow-sm "
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                      {content.status}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">
                      {content.title || 'Conteudo sem titulo'}
                    </p>
                  </div>
                  {words > 0 && isPipeline ? (
                    <span className="shrink-0 rounded-md bg-[var(--bg-hover)] px-2 py-1 text-xs font-semibold text-[var(--text-tertiary)]">
                      {words} pal.
                    </span>
                  ) : null}
                </div>

                {isPipeline ? (
                  <p
                    className={cn(
                      'mt-2 line-clamp-3 text-[13px] leading-relaxed',
                      excerpt ? 'text-[var(--text-secondary)]' : 'italic text-[var(--text-tertiary)]'
                    )}
                  >
                    {excerpt || 'Sem roteiro escrito ainda.'}
                  </p>
                ) : null}

                <ContentEntityTags
                  pillar={pillarItem}
                  series={seriesItem}
                  pillarId={content.pilarId}
                  seriesId={content.seriesId}
                  className="mt-3"
                  size="sm"
                />

                {(content.recordingDate || content.publishDate) ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {content.recordingDate ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-orange)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--accent-orange)]">
                        <Clapperboard className="h-3 w-3" />
                        {new Date(content.recordingDate).toLocaleDateString('pt-BR')}
                      </span>
                    ) : null}
                    {content.publishDate ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-green)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--accent-green)]">
                        <Calendar className="h-3 w-3" />
                        {new Date(content.publishDate).toLocaleDateString('pt-BR')}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </button>
            );
          })}

          {hasMore ? (
            <AppButton
              variant="secondary"
              fullWidth
              leftIcon={<ChevronDown className="h-4 w-4" />}
              onClick={() => setVisibleCount(current => current + pageSize)}
              className="mt-1"
            >
              Carregar mais
            </AppButton>
          ) : null}
        </div>
      )}
    </div>
  );
}
