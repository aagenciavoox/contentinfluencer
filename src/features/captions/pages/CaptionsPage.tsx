import { Captions } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FilterBar } from '../../../components/ui/FilterBar';
import { PageToolbar } from '../../../components/ui/PageToolbar';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { SelectField } from '../../../components/ui/SelectField';
import { Badge } from '../../../components/ui/Badge';
import { useAppContext } from '../../../context/AppContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { Content } from '../../../lib/database';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { rotuloConta } from '../../contas/lib/contas';
import { CaptionQueueItemCard } from '../components/CaptionQueueItemCard';
import { CaptionEditorPanel } from '../components/CaptionEditorPanel';
import {
  filtrarFilaRoteiros,
  paginateCaptionQueue,
  stableCaptionOrder,
  CAPTION_PAGE_SIZE,
  type CaptionListFilter,
} from '../lib/captionQueue';

const STATUS_OPTIONS: { id: CaptionListFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'preenchidas', label: 'Preenchidas' },
  { id: 'em-branco', label: 'Em branco / Pendentes' },
];

export function CaptionsPage() {
  const { state, updateContent } = useAppContext();
  const isMobile = useIsMobile();

  const [filter, setFilter] = useState<CaptionListFilter>('todas');
  const [selectedAccount, setSelectedAccount] = useState<string>('todas');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Selected Content (Roteiro) and publication within that Content
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [selectedPublicacaoId, setSelectedPublicacaoId] = useState<string | null>(null);
  const [mobileViewingEditor, setMobileViewingEditor] = useState(false);

  const orderRef = useRef<{ key: string; ids: string[] }>({ key: '', ids: [] });
  const editorScrollRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const key = `${filter}|${search}|${selectedAccount}`;
    const matched = filtrarFilaRoteiros(
      state.contents,
      filter,
      search,
      state.platforms,
      selectedAccount,
    );
    const pool = filtrarFilaRoteiros(
      state.contents,
      'todas',
      search,
      state.platforms,
      selectedAccount,
    );
    const next =
      orderRef.current.key === key
        ? stableCaptionOrder(orderRef.current.ids, matched, pool)
        : matched;
    orderRef.current = { key, ids: next.map(item => item.id) };
    return next;
  }, [filter, search, selectedAccount, state.contents, state.platforms]);

  const pageData = useMemo(() => paginateCaptionQueue(items, page, CAPTION_PAGE_SIZE), [items, page]);

  // Ensure a roteiro is selected by default
  useEffect(() => {
    if (items.length > 0) {
      if (!selectedContentId || !items.some(item => item.content.id === selectedContentId)) {
        setSelectedContentId(items[0].content.id);
        setSelectedPublicacaoId(items[0].activePublicacoes[0]?.id ?? null);
      }
    } else {
      setSelectedContentId(null);
      setSelectedPublicacaoId(null);
    }
  }, [items, selectedContentId]);

  useEffect(() => {
    setPage(1);
  }, [filter, search, selectedAccount]);

  useEffect(() => {
    if (pageData.page !== page) setPage(pageData.page);
  }, [page, pageData.page]);

  // Scroll editor to top smoothly when selecting a different roteiro
  useEffect(() => {
    if (editorScrollRef.current) {
      editorScrollRef.current.scrollTop = 0;
    }
  }, [selectedContentId]);

  // Keyboard navigation between scripts with ArrowUp / ArrowDown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          (active as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentIndex = items.findIndex(item => item.content.id === selectedContentId);
        if (currentIndex < items.length - 1) {
          const next = items[currentIndex + 1];
          setSelectedContentId(next.content.id);
          setSelectedPublicacaoId(next.activePublicacoes[0]?.id ?? null);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentIndex = items.findIndex(item => item.content.id === selectedContentId);
        if (currentIndex > 0) {
          const prev = items[currentIndex - 1];
          setSelectedContentId(prev.content.id);
          setSelectedPublicacaoId(prev.activePublicacoes[0]?.id ?? null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedContentId]);

  const saveCaption = async (content: Content) => {
    await updateContent(content, { silent: true, skipBroadcast: true });
  };

  const selectedItem = useMemo(() => {
    const fromItems = items.find(item => item.content.id === selectedContentId);
    if (fromItems) return fromItems;
    // Fallback to fresh content from state if available
    const fromState = state.contents.find(c => c.id === selectedContentId);
    if (fromState) {
      return {
        id: fromState.id,
        content: fromState,
        activePublicacoes: fromState.plataformas.filter(p => p.status !== 'publicada'),
      };
    }
    return items[0] || null;
  }, [items, selectedContentId, state.contents]);

  const accountOptions = useMemo(() => {
    const base = [{ value: 'todas', label: 'Todas as contas' }];
    const configured = state.platforms.map(p => ({
      value: p.id,
      label: rotuloConta(p),
    }));
    return [...base, ...configured];
  }, [state.platforms]);

  const hasQuery = search.trim().length > 0 || filter !== 'todas' || selectedAccount !== 'todas';

  const toolbar = (
    <PageToolbar
      search={
        <FilterBar
          size="default"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por pauta, copy ou tag..."
        />
      }
      chips={
        <SegmentTabs<CaptionListFilter>
          ariaLabel="Filtrar por preenchimento"
          options={STATUS_OPTIONS}
          value={filter}
          onChange={setFilter}
        />
      }
      filters={
        <div className="flex items-center">
          <SelectField
            value={selectedAccount}
            onChange={setSelectedAccount}
            options={accountOptions}
            ariaLabel="Filtrar por conta"
          />
        </div>
      }
    />
  );

  return (
    <PageLayout
      contentWidth="wide"
      contentStack="dense"
      header={
        <DesktopPageHeader
          section="Criação"
          title="Visão de Trabalho de Legendas"
          titleAside={
            <Badge variant="neutral">
              {`${items.length} roteiro(s)`}
            </Badge>
          }
          subtitle="Redija, aplique padrões de série, insira hashtags sem duplicação e copie copys para postagem."
          backLabel="Criação"
          backTo="/criacao"
        />
      }
      toolbar={toolbar}
      mobileHeader={toolbar}
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<Captions className="h-6 w-6" />}
          title={hasQuery ? 'Nenhuma publicação encontrada' : 'Tudo legendado'}
          description={
            hasQuery
              ? 'A busca vale junto com os filtros. Tente outro termo ou exiba todas as publicações.'
              : 'Todas as publicações têm legenda. As já publicadas saem desta lista.'
          }
        />
      ) : (
        /* Viewport-locked 2-pane workbench layout on desktop */
        <div className="flex flex-col lg:flex-row items-start gap-6 min-w-0 lg:h-[calc(100vh-190px)] lg:overflow-hidden">
          {/* Left Column: Scripts / Roteiros Queue with Independent Scrolling */}
          <div
            className={`w-full lg:w-[380px] xl:w-[410px] shrink-0 min-w-0 lg:h-full lg:flex lg:flex-col ${
              isMobile && mobileViewingEditor ? 'hidden' : 'block'
            }`}
          >
            <div
              ref={listContainerRef}
              className="stack-sm lg:flex-1 lg:overflow-y-auto lg:pr-1"
            >
              {pageData.items.map(item => {
                const isSelected = selectedContentId === item.content.id;
                return (
                  <CaptionQueueItemCard
                    key={item.content.id}
                    content={item.content}
                    activePublicacoes={item.activePublicacoes}
                    selected={isSelected}
                    onSelect={() => {
                      setSelectedContentId(item.content.id);
                      setSelectedPublicacaoId(item.activePublicacoes[0]?.id ?? null);
                      if (isMobile) setMobileViewingEditor(true);
                    }}
                    contas={state.platforms}
                  />
                );
              })}
            </div>

            {pageData.totalPages > 1 && (
              <div className="pt-2 shrink-0 border-t border-[var(--border-color)]">
                <PaginationBar
                  variant="simple"
                  itemLabel="roteiros"
                  totalItems={pageData.totalItems}
                  currentPage={pageData.page}
                  totalPages={pageData.totalPages}
                  pageSize={CAPTION_PAGE_SIZE}
                  onPageChange={nextPage => {
                    setPage(nextPage);
                    if (listContainerRef.current) {
                      listContainerRef.current.scrollTop = 0;
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Right Column: Workbench Editor Panel with Independent Scrolling & Reading Max-Width */}
          {selectedItem && (
            <div
              ref={editorScrollRef}
              className={`flex-1 min-w-0 w-full lg:h-full lg:overflow-y-auto lg:pr-1 ${
                isMobile && !mobileViewingEditor ? 'hidden' : 'block'
              }`}
            >
              <div className="max-w-4xl">
                <CaptionEditorPanel
                  key={selectedItem.content.id}
                  content={selectedItem.content}
                  selectedPublicacaoId={selectedPublicacaoId}
                  onSelectPublicacaoId={setSelectedPublicacaoId}
                  onSaveContent={saveCaption}
                  series={state.series}
                  pilares={state.pilares}
                  contas={state.platforms}
                  onBackToList={isMobile ? () => setMobileViewingEditor(false) : undefined}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
