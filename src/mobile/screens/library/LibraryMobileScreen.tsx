import { useMemo, useState } from 'react';
import { BookOpen, Film, Pin, Plus, SearchCheck, Star, Tv } from 'lucide-react';
import type { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileFilterSheet } from '../../components/MobileFilterSheet';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';

type BibliotecaTipo = BibliotecaItem['tipo'];
type StatusLeitura = BibliotecaItem['status'];
type LibraryMobileTab = 'current' | 'wishlist' | 'done';

interface LibraryMobileScreenProps {
  items: BibliotecaItem[];
  mobilePrimaryBookId: string | null;
  getItemMeta: (itemId: string) => BibliotecaItemMeta;
  countContents: (itemId: string) => number;
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

function LibraryBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'blue' | 'green' }) {
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
  mobilePrimaryBookId,
  getItemMeta,
  countContents,
  onOpenItem,
  onOpenCreate,
  onTogglePrimary,
}: LibraryMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<LibraryMobileTab>('current');
  const [typeFilter, setTypeFilter] = useState<'all' | BibliotecaTipo>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusLeitura>('all');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

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
    <button type="button" onClick={onOpenCreate} className="button-primary w-full">
      <Plus className="h-4 w-4" />
      Novo item
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Biblioteca</p>
          <p className="text-xs text-[var(--text-secondary)]">{items.length} itens no acervo</p>
        </div>
        <button
          type="button"
          onClick={onOpenCreate}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]"
        >
          <Plus className="h-4 w-4" />
          Novo
        </button>
      </div>

      <MobileSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar título, autoria ou tag"
        onFilterClick={() => setIsFilterSheetOpen(true)}
        rounded="tight"
      />

      <MobileSegmentTabs
        rounded="tight"
        tabs={[
          { value: 'current', label: 'Agora', count: tabCounts.current },
          { value: 'wishlist', label: 'Fila', count: tabCounts.wishlist },
          { value: 'done', label: 'Feitos', count: tabCounts.done },
        ]}
        value={activeTab}
        onChange={(value) => setActiveTab(value)}
      />

      {filteredItems.length === 0 ? (
        <MobileEmptyState
          title="Nada nessa visao do acervo"
          description="Ajuste os filtros ou adicione um novo item."
          action={focusAction}
          icon={<SearchCheck className="h-8 w-8" />}
        />
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {filteredItems.map((item) => {
            const ItemIcon = TYPE_ICONS[item.tipo] || BookOpen;
            const metadata = getItemMeta(item.id);
            const relatedContents = countContents(item.id);
            const isPrimary = mobilePrimaryBookId === item.id;

            return (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm"
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
                      className="aspect-[0.76] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[0.76] w-full items-center justify-center bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
                      <ItemIcon className="h-6 w-6" />
                    </div>
                  )}

                  <div className="space-y-2 p-2.5">
                    <div>
                      <p className="line-clamp-2 text-xs font-semibold leading-snug text-[var(--text-primary)]">
                        {item.titulo}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
                        {item.autorDiretor || TYPE_LABELS[item.tipo]}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      <LibraryBadge>{TYPE_LABELS[item.tipo]}</LibraryBadge>
                      <LibraryBadge tone="blue">{item.status}</LibraryBadge>
                      {relatedContents > 0 ? (
                        <LibraryBadge tone="green">{relatedContents} cont.</LibraryBadge>
                      ) : null}
                    </div>

                    {item.avaliacao ? (
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={cn(
                              'h-2.5 w-2.5',
                              index < item.avaliacao!
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-[var(--border-strong)]'
                            )}
                          />
                        ))}
                      </div>
                    ) : null}

                    {metadata.tagsPersonalizadas?.[0] ? (
                      <LibraryBadge>{metadata.tagsPersonalizadas[0]}</LibraryBadge>
                    ) : null}
                  </div>
                </button>

                <div className="border-t border-[var(--border-color)] p-2">
                  <button
                    type="button"
                    onClick={() => onTogglePrimary(item.id)}
                    className={cn(
                      'inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-md border text-xs font-semibold uppercase tracking-[0.1em] transition-colors',
                      isPrimary
                        ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'
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
      )}

      <MobileFilterSheet
        open={isFilterSheetOpen}
        title="Filtrar acervo"
        onClose={() => setIsFilterSheetOpen(false)}
      >
        <label className="block space-y-2">
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

        <label className="block space-y-2">
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

        <button
          type="button"
          onClick={() => {
            setTypeFilter('all');
            setStatusFilter('all');
            setIsFilterSheetOpen(false);
          }}
          className="button-primary w-full"
        >
          Limpar filtros
        </button>
      </MobileFilterSheet>
    </div>
  );
}
