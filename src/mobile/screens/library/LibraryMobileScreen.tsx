import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, ImagePlus, Loader2, Pin, Plus, SearchCheck } from 'lucide-react';
import type { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { EmptyState } from '../../../components/ui/EmptyState';
import { QueryViewState, type QueryViewStatus } from '../../../components/ui/QueryViewState';
import { MobileFilterSelect, MobileFilterSheet } from '../../components/MobileFilterSheet';
import { Badge } from '../../../components/ui/Badge';
import { FilterChips } from '../../../components/ui/FilterChips';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { AppButton } from '../../../components/ui/AppButton';
import { EMPTY } from '../../../lib/uiCopy';
import { Text } from '../../../components/ui/Text';
import { ValorVazio } from '../../../components/ui/ValorVazio';
import { CoverFallback } from '../../../features/library/components/CoverFallback';
import type { BibliotecaCapaFilter } from '../../../features/library/components/LibraryToolbar';
import { useAuth } from '../../../context/AuthContext';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import {
  LIBRARY_COVER_UPLOAD_ERROR,
  uploadLibraryCover,
  validateLibraryCoverFile,
} from '../../../features/library/lib/uploadLibraryCover';

type BibliotecaTipo = BibliotecaItem['tipo'];
type StatusLeitura = BibliotecaItem['status'];
type LibraryMobileTab = 'current' | 'wishlist' | 'done';
type LibrarySection = 'collection' | 'analysis';

interface LibraryMobileScreenProps {
  items: BibliotecaItem[];
  libraryTotal?: number;
  mobilePrimaryBookId: string | null;
  getItemMeta: (itemId: string) => BibliotecaItemMeta;
  countContents: (itemId: string) => number;
  queryStatus?: QueryViewStatus;
  errorMessage?: string | null;
  onRetry?: () => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onOpenItem: (itemId: string) => void;
  onOpenCreate: () => void;
  onTogglePrimary: (itemId: string) => void;
  onCoverChange: (item: BibliotecaItem, capaUrl: string) => void;
  filtroCapa: BibliotecaCapaFilter;
  onFiltroCapaChange: (value: BibliotecaCapaFilter) => void;
}

const TYPE_LABELS: Record<BibliotecaTipo, string> = {
  livro: 'Livro',
  filme: 'Filme',
  'série': 'Série',
  anime: 'Anime',
  manga: 'Mangá',
  quadrinho: 'Quadrinho',
  outro: 'Outro',
};

function isWishlistStatus(status: StatusLeitura) {
  return status === 'Quero consumir' || status === 'Quero ler' || status === 'Quero ver';
}

function isCurrentStatus(status: StatusLeitura) {
  return status === 'Consumindo' || status === 'Lendo' || status === 'Assistindo' || status === 'Pausado';
}

function isDoneStatus(status: StatusLeitura) {
  return status === 'Concluído' || status === 'Lido' || status === 'Assistido' || status === 'Abandonado';
}

function MobileCoverThumb({
  item,
  onOpen,
  onCoverChange,
}: {
  item: BibliotecaItem;
  onOpen: () => void;
  onCoverChange: (capaUrl: string) => void;
}) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [broken, setBroken] = useState(false);
  const [uploading, setUploading] = useState(false);
  const typeLabel = TYPE_LABELS[item.tipo];

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    const validationError = validateLibraryCoverFile(file);
    if (validationError) {
      notifySaveFeedback({ status: 'error', message: validationError });
      return;
    }
    if (!user?.id) {
      notifySaveFeedback({ status: 'error', message: 'Entre na conta para enviar a capa.' });
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadLibraryCover({
        file,
        userId: user.id,
        itemId: item.id,
        previousUrl: item.capaUrl,
      });
      onCoverChange(publicUrl);
      setBroken(false);
      notifySaveFeedback({ status: 'success', message: 'Capa atualizada.' });
    } catch {
      notifySaveFeedback({ status: 'error', message: LIBRARY_COVER_UPLOAD_ERROR });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative">
      {/* Atalho de toque: o botão do título, logo abaixo, abre o mesmo item e já tem nome. */}
      <button type="button" onClick={onOpen} tabIndex={-1} aria-hidden="true" className="block w-full text-left active:opacity-90">
        {item.capaUrl && !broken ? (
          <img
            src={item.capaUrl}
            alt=""
            className="aspect-[3/4] max-h-28 w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="aspect-[3/4] max-h-28 w-full overflow-hidden">
            <CoverFallback title={item.titulo} typeLabel={typeLabel} compact />
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-1 right-1 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--overlay-scrim)] text-white focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        aria-label={`Trocar capa de ${item.titulo}`}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={event => void handleUpload(event.target.files?.[0])}
      />
    </div>
  );
}

export function LibraryMobileScreen({
  items,
  libraryTotal = 0,
  mobilePrimaryBookId,
  getItemMeta,
  countContents,
  onOpenItem,
  onOpenCreate,
  onTogglePrimary,
  onCoverChange,
  filtroCapa,
  onFiltroCapaChange,
  queryStatus = 'ready',
  errorMessage = null,
  onRetry,
  page,
  totalPages,
  onPageChange,
}: LibraryMobileScreenProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<LibraryMobileTab>('current');
  const [typeFilter, setTypeFilter] = useState<'all' | BibliotecaTipo>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusLeitura>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const activeSection: LibrarySection = location.pathname === '/biblioteca/analise'
    ? 'analysis'
    : 'collection';

  const tabCounts = useMemo(
    () => ({
      current: items.filter((item) => isCurrentStatus(item.status)).length,
      wishlist: items.filter((item) => isWishlistStatus(item.status)).length,
      done: items.filter((item) => isDoneStatus(item.status)).length,
    }),
    [items]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items
      .filter((item) => {
        if (activeTab === 'current') return isCurrentStatus(item.status);
        if (activeTab === 'wishlist') return isWishlistStatus(item.status);
        return isDoneStatus(item.status);
      })
      .filter((item) => (typeFilter === 'all' ? true : item.tipo === typeFilter))
      .filter((item) => (statusFilter === 'all' ? true : item.status === statusFilter))
      .filter((item) => {
        if (!normalizedSearch) return true;
        const metadata = getItemMeta(item.id);
        return [
          item.titulo,
          item.autorDiretor,
          ...item.generoIds,
          ...(metadata.tagsPersonalizadas || []),
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [activeTab, getItemMeta, items, search, statusFilter, typeFilter]);

  const statusOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.status))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [items]
  );

  // O "+" ao lado da busca já é a ação principal; no estado vazio o mesmo atalho fica secundário.
  const focusAction = (
    <AppButton variant="secondary" fullWidth onClick={onOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>
      Nova obra
    </AppButton>
  );

  const hasActiveFilters =
    Boolean(search.trim()) || typeFilter !== 'all' || statusFilter !== 'all' || filtroCapa !== 'Todos';
  const clearSearchAndFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setStatusFilter('all');
    onFiltroCapaChange('Todos');
  };

  return (
    <div className="stack-md pt-2">
      {libraryTotal > 0 ? (
        <Text variant="meta">
          {libraryTotal === 1 ? '1 obra' : `${libraryTotal.toLocaleString('pt-BR')} obras`}
        </Text>
      ) : null}
      {/* Seção (Acervo / Panorama) é aba: trilho de largura toda, metades iguais, preenchido.
          Momento (Agora / Fila / Feitos) é filtro: chip baixo e contornado, abaixo da aba. */}
      <div className="stack-sm">
        <SegmentTabs<LibrarySection>
          ariaLabel="Seções da biblioteca"
          fullWidth
          options={[
            { id: 'collection', label: 'Acervo' },
            { id: 'analysis', label: 'Panorama' },
          ]}
          value={activeSection}
          onChange={section => {
            if (section === activeSection) return;
            navigate(section === 'analysis' ? '/biblioteca/analise' : '/biblioteca');
          }}
        />

        <FilterChips<LibraryMobileTab>
          ariaLabel="Filtrar por momento"
          size="sm"
          options={[
            { id: 'current', label: 'Agora', count: tabCounts.current },
            { id: 'wishlist', label: 'Fila', count: tabCounts.wishlist },
            { id: 'done', label: 'Feitos', count: tabCounts.done },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <MobileSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar título, autoria ou tag"
        onFilterClick={() => setIsFilterSheetOpen(true)}
        filterLabel="Abrir filtros da biblioteca"
        rounded="tight"
        trailing={
          <AppButton
            variant="primary"
            size="lg"
            iconOnly
            aria-label="Nova obra"
            onClick={onOpenCreate}
            leftIcon={<Plus className="h-4 w-4" />}
          />
        }
      />

      <QueryViewState
        status={queryStatus}
        skeletonCount={6}
        skeletonVariant="card"
        emptyIcon={<BookOpen className="h-8 w-8" />}
        emptyTitle={libraryTotal === 0 ? EMPTY.biblioteca.title : EMPTY.bibliotecaSemResultado.title}
        emptyDescription={
          libraryTotal === 0
            ? EMPTY.biblioteca.description
            : EMPTY.bibliotecaSemResultado.description
        }
        emptyAction={focusAction}
        errorMessage={errorMessage}
        onRetry={onRetry}
      >
        {filteredItems.length === 0 ? (
          <EmptyState compact
            title="Nada nessa visão da biblioteca"
            description={hasActiveFilters ? 'Nada com essa busca ou filtro.' : 'Troque o momento acima ou adicione uma nova obra.'}
            action={
              hasActiveFilters ? (
                <AppButton variant="secondary" onClick={clearSearchAndFilters}>
                  Limpar busca e filtros
                </AppButton>
              ) : focusAction
            }
            icon={<SearchCheck className="h-8 w-8" />}
          />
        ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const metadata = getItemMeta(item.id);
              const relatedContents = countContents(item.id);
              const isPrimary = mobilePrimaryBookId === item.id;

              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)]"
                >
                  <MobileCoverThumb
                    item={item}
                    onOpen={() => onOpenItem(item.id)}
                    onCoverChange={capaUrl => onCoverChange(item, capaUrl)}
                  />

                  <button
                    type="button"
                    onClick={() => onOpenItem(item.id)}
                    className="block w-full text-left active:opacity-90"
                  >
                    <div className="stack-xs p-3">
                      <Text variant="itemTitle" as="p" className="line-clamp-2 leading-snug text-[var(--text-primary)]">
                        {item.titulo}
                      </Text>
                      <Text variant="meta" as="p" className="line-clamp-1 text-[var(--text-secondary)]">
                        {item.autorDiretor?.trim() ? item.autorDiretor : <ValorVazio />}
                      </Text>

                      <div className="flex min-w-0 flex-wrap gap-1">
                        <Badge variant="neutral">{TYPE_LABELS[item.tipo]}</Badge>
                        {relatedContents > 0 ? (
                          <Badge variant="neutral">
                            {relatedContents} roteiro{relatedContents === 1 ? '' : 's'}
                          </Badge>
                        ) : null}
                        {metadata.tagsPersonalizadas?.[0] ? (
                          <Badge variant="neutral" className="max-w-full truncate">{metadata.tagsPersonalizadas[0]}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-[var(--border-color)] p-1.5">
                    <AppButton
                      variant="secondary"
                      size="xs"
                      fullWidth
                      aria-pressed={isPrimary}
                      aria-label={isPrimary ? `${item.titulo} é a obra principal` : `Fixar ${item.titulo} como principal`}
                      onClick={() => onTogglePrimary(item.id)}
                      leftIcon={<Pin className={cn('h-3.5 w-3.5', isPrimary && 'fill-current')} aria-hidden />}
                      className={cn(isPrimary && 'border-[var(--text-primary)]')}
                    >
                      {isPrimary ? 'Principal' : 'Fixar'}
                    </AppButton>
                  </div>
                </article>
              );
            })}
          </div>

          {onPageChange && typeof page === 'number' && typeof totalPages === 'number' && totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2">
              <AppButton
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                leftIcon={<ChevronLeft className="h-4 w-4" />}
                onClick={() => onPageChange(Math.max(1, page - 1))}
              >
                Anterior
              </AppButton>
              <Text variant="meta">
                Página {page} de {totalPages}
              </Text>
              <AppButton
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                rightIcon={<ChevronRight className="h-4 w-4" />}
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              >
                Próxima
              </AppButton>
            </div>
          ) : null}
        </>
        )}
      </QueryViewState>

      <MobileFilterSheet
        open={isFilterSheetOpen}
        title="Filtrar biblioteca"
        onClose={() => setIsFilterSheetOpen(false)}
        onClear={() => {
          setTypeFilter('all');
          setStatusFilter('all');
          onFiltroCapaChange('Todos');
          setIsFilterSheetOpen(false);
        }}
      >
        <MobileFilterSelect
          label="Tipo"
          value={typeFilter}
          onChange={value => setTypeFilter(value as 'all' | BibliotecaTipo)}
          options={[
            { value: 'all', label: 'Todos' },
            ...(Object.entries(TYPE_LABELS) as Array<[BibliotecaTipo, string]>).map(([value, label]) => ({ value, label })),
          ]}
        />
        <MobileFilterSelect
          label="Status"
          value={statusFilter}
          onChange={value => setStatusFilter(value as 'all' | StatusLeitura)}
          options={[{ value: 'all', label: 'Todos' }, ...statusOptions.map(status => ({ value: status, label: status }))]}
        />
        <MobileFilterSelect
          label="Capa"
          value={filtroCapa}
          onChange={value => onFiltroCapaChange(value as BibliotecaCapaFilter)}
          options={[
            { value: 'Todos', label: 'Todas' },
            { value: 'sem', label: 'Sem capa' },
            { value: 'com', label: 'Com capa' },
          ]}
        />
      </MobileFilterSheet>
    </div>
  );
}
