import { useMemo, useState } from 'react';
import { BookOpen, Film, Pin, Plus, SearchCheck, Star, Tv } from 'lucide-react';
import type { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileFilterSheet } from '../../components/MobileFilterSheet';
import { MobileGridCard } from '../../components/MobileGridCard';
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
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-orange)]/12 p-3 text-[var(--accent-orange)]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Acervo em fluxo leve</p>
            <p className="t-secondary">Consumo atual, fila futura e itens concluídos sem carregar a grade densa.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Agora</p>
            <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{tabCounts.current}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Fila</p>
            <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{tabCounts.wishlist}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Feitos</p>
            <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{tabCounts.done}</p>
          </div>
        </div>

        <button type="button" onClick={onOpenCreate} className="button-primary mt-4 w-full">
          <Plus className="h-4 w-4" />
          Adicionar item
        </button>
      </section>

      <section className="space-y-4">
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar por titulo, autoria, genero ou tag"
          onFilterClick={() => setIsFilterSheetOpen(true)}
        />

        <MobileSegmentTabs
          tabs={[
            { value: 'current', label: 'Agora', count: tabCounts.current },
            { value: 'wishlist', label: 'Fila', count: tabCounts.wishlist },
            { value: 'done', label: 'Feitos', count: tabCounts.done },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {filteredItems.length === 0 ? (
          <MobileEmptyState
            title="Nada nessa visão do acervo"
            description="Ajuste os filtros ou adicione um novo item para alimentar essa camada mobile."
            action={focusAction}
            icon={<SearchCheck className="h-8 w-8" />}
          />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredItems.map((item) => {
              const ItemIcon = TYPE_ICONS[item.tipo] || BookOpen;
              const metadata = getItemMeta(item.id);
              const relatedContents = countContents(item.id);
              const isPrimary = mobilePrimaryBookId === item.id;

              return (
                <div key={item.id} className="space-y-2">
                  {item.capaUrl ? (
                    <button
                      type="button"
                      onClick={() => onOpenItem(item.id)}
                      className="block w-full overflow-hidden rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm active:scale-[0.99]"
                    >
                      <img src={item.capaUrl} alt={item.titulo} className="aspect-[0.76] w-full object-cover" />
                    </button>
                  ) : null}

                  <MobileGridCard
                    onClick={() => onOpenItem(item.id)}
                    icon={!item.capaUrl ? <ItemIcon className="h-5 w-5" /> : undefined}
                    title={item.titulo}
                    subtitle={item.autorDiretor || TYPE_LABELS[item.tipo]}
                    className="min-h-[7.5rem] rounded-[1.2rem] p-3"
                    titleClassName="line-clamp-2 text-[11px] leading-[1.15rem]"
                    subtitleClassName="line-clamp-1 text-[10px]"
                    footerClassName="mt-3"
                    footer={
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          <span className="rounded-full bg-[var(--bg-hover)] px-2 py-1 text-[9px] font-semibold text-[var(--text-secondary)]">
                            {TYPE_LABELS[item.tipo]}
                          </span>
                          <span className="rounded-full bg-[var(--accent-blue)]/10 px-2 py-1 text-[9px] font-semibold text-[var(--accent-blue)]">
                            {item.status}
                          </span>
                        </div>

                        {item.avaliacao ? (
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={`h-2.5 w-2.5 ${index < item.avaliacao ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--border-strong)]'}`}
                              />
                            ))}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap gap-1">
                          {relatedContents > 0 ? (
                            <span className="rounded-full bg-[var(--accent-green)]/10 px-2 py-1 text-[9px] font-semibold text-[var(--accent-green)]">
                              {relatedContents} cont.
                            </span>
                          ) : null}
                          {metadata.tagsPersonalizadas?.slice(0, 1).map((tag) => (
                            <span
                              key={tag}
                              className="max-w-full truncate rounded-full bg-[var(--bg-hover)] px-2 py-1 text-[9px] font-semibold text-[var(--text-secondary)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    }
                  />

                  <button
                    type="button"
                    onClick={() => onTogglePrimary(item.id)}
                    className={`inline-flex w-full items-center justify-center gap-1.5 rounded-[1rem] border px-2 py-2 text-[9px] font-black uppercase tracking-[0.1em] ${
                      isPrimary
                        ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Pin className="h-3 w-3" />
                    {isPrimary ? 'Principal' : 'Fixar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <MobileFilterSheet
        open={isFilterSheetOpen}
        title="Filtrar acervo"
        onClose={() => setIsFilterSheetOpen(false)}
      >
        <label className="block space-y-2">
          <span className="t-label text-[var(--text-tertiary)]">Tipo</span>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | BibliotecaTipo)}>
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
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | StatusLeitura)}>
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
