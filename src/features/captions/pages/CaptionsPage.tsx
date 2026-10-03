import { Captions } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FilterBar } from '../../../components/ui/FilterBar';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { useAppContext } from '../../../context/AppContext';
import { DEFAULT_PLATFORMS } from '../../../constants';
import { useHydrateContentBodies } from '../../../hooks/useHydrateContentBodies';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { Content } from '../../../lib/database';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { MobileSearchBar } from '../../../mobile/components/MobileSearchBar';
import { MobileSegmentTabs } from '../../../mobile/components/MobileSegmentTabs';
import { CaptionGrid } from '../components/CaptionQuickCard';
import {
  filterCaptionQueue,
  paginateCaptionQueue,
  CAPTION_PAGE_SIZE,
  type CaptionListFilter,
} from '../lib/captionQueue';

const FILTERS: { id: CaptionListFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'sem-legenda', label: 'Sem legenda' },
  { id: 'com-legenda', label: 'Com legenda' },
];

export function CaptionsPage() {
  const { state, updateContent } = useAppContext();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<CaptionListFilter>('todos');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const platforms = useMemo(() => {
    const active = state.platforms.filter(platform => platform.ativo).map(platform => platform.nome);
    return active.length > 0 ? active : DEFAULT_PLATFORMS;
  }, [state.platforms]);

  const items = useMemo(
    () => filterCaptionQueue(state.contents, filter, search),
    [filter, search, state.contents],
  );
  const pageData = useMemo(
    () => paginateCaptionQueue(items, page),
    [items, page],
  );
  const pageIds = useMemo(() => pageData.items.map(item => item.id), [pageData.items]);
  const { hasHydrationError, retryHydration } = useHydrateContentBodies(pageIds);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  useEffect(() => {
    if (pageData.page !== page) setPage(pageData.page);
  }, [page, pageData.page]);

  const saveCaption = useCallback(async (content: Content) => {
    await updateContent(content, { silent: true, skipBroadcast: true });
  }, [updateContent]);

  const hasQuery = search.trim().length > 0 || filter !== 'todos';

  const filters = isMobile ? (
    <div className="stack-sm">
      <MobileSegmentTabs<CaptionListFilter>
        tabs={FILTERS.map(item => ({ value: item.id, label: item.label }))}
        value={filter}
        onChange={setFilter}
      />
      <MobileSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar roteiro"
      />
    </div>
  ) : (
    <div className="stack-md">
      <SegmentTabs<CaptionListFilter> options={FILTERS} value={filter} onChange={setFilter} />
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar roteiro..."
      />
    </div>
  );

  return (
    <PageLayout
      contentWidth="wide"
      contentStack="dense"
      header={(
        <DesktopPageHeader
          section="Criação"
          title="Legendas"
          backLabel="Criação"
          backTo="/criacao"
          meta={items.length === 1 ? '1 vídeo' : `${items.length} vídeos`}
        />
      )}
      toolbar={isMobile ? undefined : filters}
      mobileHeader={filters}
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<Captions className="h-6 w-6" />}
          title={hasQuery ? 'Nenhum roteiro encontrado' : 'Nenhum vídeo para legendar'}
          description={
            hasQuery
              ? 'Tente outro termo ou mostre todos os roteiros.'
              : 'Quando um roteiro sair da ideia, ele aparece aqui para você escrever as legendas.'
          }
        />
      ) : (
        <div className="stack-md">
          <CaptionGrid
            contents={pageData.items}
            platforms={platforms}
            series={state.series}
            pilares={state.pilares}
            onSave={saveCaption}
            hasHydrationError={hasHydrationError}
            onRetryHydration={retryHydration}
          />
          <PaginationBar
            variant={isMobile ? 'simple' : 'full'}
            itemLabel="vídeos"
            totalItems={pageData.totalItems}
            currentPage={pageData.page}
            totalPages={pageData.totalPages}
            pageSize={CAPTION_PAGE_SIZE}
            onPageChange={nextPage => {
              setPage(nextPage);
              document.querySelector('main')?.scrollTo({ top: 0 });
            }}
          />
        </div>
      )}
    </PageLayout>
  );
}
