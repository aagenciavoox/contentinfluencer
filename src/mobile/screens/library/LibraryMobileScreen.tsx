import { useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, Film, Pin, Plus, SearchCheck, Tv } from 'lucide-react';
import type { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { EmptyState } from '../../../components/ui/EmptyState';
import { QueryViewState, type QueryViewStatus } from '../../../components/ui/QueryViewState';
import { MobileFilterSheet } from '../../components/MobileFilterSheet';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { AppButton } from '../../../components/ui/AppButton';
import { EMPTY } from '../../../lib/uiCopy';
import { Text } from '../../../components/ui/Text';

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
}

const TYPE_LABELS: Record<BibliotecaTipo, string> = {
  livro: 'Livro',
  filme: 'Filme',
  'série': 'Série',
  anime: 'Anime',
  manga: 'Mangá',
  outro: 'Outro',
};

const TYPE_ICONS: Record<BibliotecaTipo, typeof BookOpen> = {
  livro: BookOpen,
  filme: Film,
  'série': Tv,
  anime: Tv,
  manga: BookOpen,
  outro: BookOpen,
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

function LibraryBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'blue' | 'green' }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full truncate rounded-md px-1.5 py-0.5 text-xs font-semibold leading-tight',
        tone === 'blue' && 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
        tone === 'green' && 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
        tone === 'neutral' && 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
      )}
    >
      {children}
    </span>
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

  const focusAction = (
    <AppButton variant="primary" fullWidth onClick={onOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>
      Novo item
    </AppButton>
  );

  const chipClass = (active: boolean) =>
    cn(
      'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 t-button whitespace-nowrap transition-colors',
      active
        ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
        : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
    );

  return (
    <div className="stack-md">
      <div className="mobile-h-scroll" role="tablist" aria-label="Seções da biblioteca">
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'collection'}
          className={chipClass(activeSection === 'collection')}
          onClick={() => {
            if (activeSection !== 'collection') navigate('/biblioteca');
          }}
        >
          Acervo
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'analysis'}
          className={chipClass(activeSection === 'analysis')}
          onClick={() => {
            if (activeSection !== 'analysis') navigate('/biblioteca/analise');
          }}
        >
          Análise
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'current'}
          className={chipClass(activeTab === 'current')}
          onClick={() => setActiveTab('current')}
        >
          Agora
          <span className="t-meta tabular-nums opacity-80">{tabCounts.current}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'wishlist'}
          className={chipClass(activeTab === 'wishlist')}
          onClick={() => setActiveTab('wishlist')}
        >
          Fila
          <span className="t-meta tabular-nums opacity-80">{tabCounts.wishlist}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'done'}
          className={chipClass(activeTab === 'done')}
          onClick={() => setActiveTab('done')}
        >
          Feitos
          <span className="t-meta tabular-nums opacity-80">{tabCounts.done}</span>
        </button>
      </div>

      <MobileSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar título, autoria ou tag"
        onFilterClick={() => setIsFilterSheetOpen(true)}
        rounded="tight"
      />

      <QueryViewState
        status={queryStatus}
        skeletonCount={6}
        skeletonVariant="card"
        emptyIcon={<BookOpen className="h-8 w-8" />}
        emptyTitle={libraryTotal === 0 ? EMPTY.biblioteca.title : EMPTY.bibliotecaSemResultado.title}
        emptyDescription={
          libraryTotal === 0
            ? 'Use o botão + da barra inferior para adicionar um item.'
            : EMPTY.bibliotecaSemResultado.description
        }
        emptyAction={libraryTotal === 0 ? undefined : focusAction}
        errorMessage={errorMessage}
        onRetry={onRetry}
      >
        {filteredItems.length === 0 ? (
          <EmptyState compact
            title="Nada nessa visão da biblioteca"
            description="Ajuste os filtros ou adicione um novo item."
            action={focusAction}
            icon={<SearchCheck className="h-8 w-8" />}
          />
        ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const ItemIcon = TYPE_ICONS[item.tipo] || BookOpen;
              const metadata = getItemMeta(item.id);
              const relatedContents = countContents(item.id);
              const isPrimary = mobilePrimaryBookId === item.id;

              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)]"
                >
                  <button
                    type="button"
                    onClick={() => onOpenItem(item.id)}
                    className="block w-full text-left active:opacity-90"
                  >
                    {item.capaUrl ? (
                      <img
                        src={item.capaUrl}
                        alt=""
                        className="aspect-[3/4] max-h-28 w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] max-h-28 w-full items-center justify-center bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
                        <ItemIcon className="h-5 w-5" />
                      </div>
                    )}

                    <div className="stack-xs p-3">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)]">
                        {item.titulo}
                      </p>
                      <p className="line-clamp-1 text-xs text-[var(--text-secondary)]">
                        {item.autorDiretor || TYPE_LABELS[item.tipo]}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        <LibraryBadge>{TYPE_LABELS[item.tipo]}</LibraryBadge>
                        {relatedContents > 0 ? (
                          <LibraryBadge tone="green">{relatedContents}</LibraryBadge>
                        ) : null}
                        {metadata.tagsPersonalizadas?.[0] ? (
                          <LibraryBadge>{metadata.tagsPersonalizadas[0]}</LibraryBadge>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  <div className="border-t border-[var(--border-color)] p-1.5">
                    <button
                      type="button"
                      onClick={() => onTogglePrimary(item.id)}
                      className={cn(
                        'inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border text-[length:var(--font-size-nav-mobile)] font-semibold t-label-uppercase transition-colors',
                        isPrimary
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                          : 'border-[var(--border-color)] bg-transparent text-[var(--text-secondary)]'
                      )}
                    >
                      <Pin className="h-3 w-3" />
                      {isPrimary ? 'Principal' : 'Fixar'}
                    </button>
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
      >
        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Tipo</span>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as 'all' | BibliotecaTipo)}
            className="min-h-11 w-full rounded-lg"
          >
            <option value="all">Todos</option>
            <option value="livro">Livro</option>
            <option value="filme">Filme</option>
            <option value="série">Série</option>
            <option value="anime">Anime</option>
            <option value="manga">Mangá</option>
            <option value="outro">Outro</option>
          </select>
        </label>

        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as 'all' | StatusLeitura)}
            className="min-h-11 w-full rounded-lg"
          >
            <option value="all">Todos</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <AppButton
          variant="primary"
          fullWidth
          onClick={() => {
            setTypeFilter('all');
            setStatusFilter('all');
            setIsFilterSheetOpen(false);
          }}
        >
          Limpar filtros
        </AppButton>
      </MobileFilterSheet>
    </div>
  );
}
