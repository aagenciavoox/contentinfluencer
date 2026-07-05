import { useMemo, useState } from 'react';
import { Calendar, Clapperboard, Plus, SearchCheck, Sparkles } from 'lucide-react';
import type { Content, Pilar, Serie } from '../../../lib/database';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { cn, htmlToReadableText } from '../../../lib/utils';
import { ContentEntityTags } from '../../../features/contents/components/ContentEntityTags';
import { ContentsPageSizeSelector } from '../../../features/contents/components/ContentsPageSizeSelector';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import { scriptExcerpt } from '../../components/MobileScriptReader';
import { GLOSSARY, EMPTY } from '../../../lib/uiCopy';
import type { ContentsListView } from '../../../features/contents/types';

interface ContentsMobileScreenProps {
  mode: ContentsListView;
  contents: Content[];
  pageSize: number;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  series: Serie[];
  pilares: Pilar[];
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelect: (content: Content) => void;
  onPreview?: (content: Content) => void;
  onCreate: () => void;
  onListViewChange?: (view: ContentsListView) => void;
}

export function ContentsMobileScreen({
  mode,
  contents,
  pageSize,
  totalItems,
  currentPage,
  totalPages,
  series,
  pilares,
  onSelect,
  onCreate,
  onListViewChange,
  isLoading = false,
  onPageChange,
  onPageSizeChange,
}: ContentsMobileScreenProps) {
  const [search, setSearch] = useState('');

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

  const showPagination = totalItems > pageSize;
  const isPipeline = mode === 'pipeline';

  const focusAction = (
    <AppButton variant="primary" fullWidth onClick={onCreate} leftIcon={<Sparkles className="h-4 w-4" />}>
      Novo roteiro
    </AppButton>
  );

  return (
    <div className="stack-xl">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <MobileSectionHeader
          icon={Sparkles}
          tone="blue"
          title={isPipeline ? GLOSSARY.roteiros : GLOSSARY.publicados}
          description={`${totalItems} itens`}
          action={
            isPipeline ? (
              <button
                type="button"
                onClick={onCreate}
                className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 t-label t-label-uppercase font-semibold"
              >
                <Plus className="h-4 w-4" />
                Novo
              </button>
            ) : undefined
          }
        />
      </section>

      {onListViewChange ? (
        <MobileSegmentTabs
          rounded="tight"
          tabs={[
            { value: 'pipeline', label: GLOSSARY.roteiros },
            { value: 'publicados', label: GLOSSARY.publicados },
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

      {isLoading ? (
        <SkeletonList count={6} variant="row" />
      ) : filteredContents.length === 0 ? (
        <EmptyState compact
          title={EMPTY.roteiros.title}
          description={isPipeline ? EMPTY.roteiros.description : EMPTY.roteirosPublicados.description}
          action={isPipeline ? focusAction : undefined}
          icon={<SearchCheck className="h-8 w-8" />}
        />
      ) : (
        <div className="stack-sm">
          {filteredContents.map(content => {
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
                    <p className="t-label t-label-uppercase font-semibold text-[var(--text-secondary)]">
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
                      'mt-2 line-clamp-3 t-secondary leading-relaxed',
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
        </div>
      )}

      {!isLoading && totalItems > 0 ? (
        showPagination ? (
          <PaginationBar
            variant="simple"
            itemLabel="conteúdos"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={onPageChange}
            accessory={<ContentsPageSizeSelector value={pageSize} onChange={onPageSizeChange} />}
          />
        ) : (
          <div className="pagination-bar rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] stack-md p-3">
            <ContentsPageSizeSelector value={pageSize} onChange={onPageSizeChange} />
          </div>
        )
      ) : null}
    </div>
  );
}
