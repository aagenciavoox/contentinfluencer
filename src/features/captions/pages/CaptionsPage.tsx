import { Captions } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FilterBar } from '../../../components/ui/FilterBar';
import { PageToolbar } from '../../../components/ui/PageToolbar';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { FilterChips } from '../../../components/ui/FilterChips';
import { useAppContext } from '../../../context/AppContext';
import type { Content } from '../../../lib/database';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { CaptionFilaCard } from '../components/CaptionFilaCard';
import {
  filtrarFilaLegendas,
  paginateCaptionQueue,
  stableCaptionOrder,
  CAPTION_PAGE_SIZE,
  type CaptionListFilter,
  type ItemFilaLegenda,
} from '../lib/captionQueue';

function agruparPagina(items: readonly ItemFilaLegenda[]) {
  const grupos: Array<{ content: ItemFilaLegenda['content']; publicacoes: ItemFilaLegenda['publicacao'][] }> = [];
  for (const item of items) {
    const grupo = grupos.find(atual => atual.content.id === item.content.id);
    if (grupo) grupo.publicacoes.push(item.publicacao);
    else grupos.push({ content: item.content, publicacoes: [item.publicacao] });
  }
  return grupos;
}

const FILTERS: { id: CaptionListFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'sem-legenda', label: 'Sem legenda' },
  { id: 'com-legenda', label: 'Com legenda' },
];

export function CaptionsPage() {
  const { state, updateContent } = useAppContext();
  const [filter, setFilter] = useState<CaptionListFilter>('sem-legenda');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // Um card aberto por vez: só ele mostra as abas de conta. `undefined` abre o primeiro.
  const [abertoId, setAbertoId] = useState<string | null | undefined>(undefined);

  const orderRef = useRef<{ key: string; ids: string[] }>({ key: '', ids: [] });
  const items = useMemo(() => {
    const key = `${filter}|${search}`;
    const matched = filtrarFilaLegendas(state.contents, filter, search, state.platforms);
    const pool = filtrarFilaLegendas(state.contents, 'todos', search, state.platforms);
    const next = orderRef.current.key === key
      ? stableCaptionOrder(orderRef.current.ids, matched, pool)
      : matched;
    orderRef.current = { key, ids: next.map(item => item.id) };
    return next;
  }, [filter, search, state.contents, state.platforms]);
  const pageData = useMemo(
    () => paginateCaptionQueue(items, page),
    [items, page],
  );

  useEffect(() => {
    setPage(1);
    setAbertoId(undefined);
  }, [filter, search]);

  useEffect(() => {
    if (pageData.page !== page) setPage(pageData.page);
  }, [page, pageData.page]);

  const saveCaption = async (content: Content) => {
    await updateContent(content, { silent: true, skipBroadcast: true });
  };

  const hasQuery = search.trim().length > 0 || filter !== 'sem-legenda';
  const filtros = (
    <PageToolbar
      filters={
        <FilterBar
          size="compact"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar roteiro, conta ou legenda"
          leading={(
            <FilterChips<CaptionListFilter>
              ariaLabel="Filtrar legendas"
              className="max-w-full"
              options={FILTERS}
              value={filter}
              onChange={setFilter}
            />
          )}
        />
      }
    />
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
          meta={items.length === 1 ? '1 publicação' : `${items.length} publicações`}
        />
      )}
      toolbar={filtros}
      mobileHeader={filtros}
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<Captions className="h-6 w-6" />}
          title={hasQuery
            ? 'Nenhuma publicação encontrada'
            : 'Tudo legendado'}
          description={
            hasQuery
              ? 'A busca vale junto com o filtro. Tente outro termo ou mostre todas as publicações pendentes.'
              : 'Nenhuma publicação pendente está sem legenda. As já postadas saem desta fila; outra conta do mesmo roteiro continua aqui se ainda faltar texto.'
          }
        />
      ) : (
        <div className="stack-md min-w-0">
          {agruparPagina(pageData.items).map((grupo, index) => {
            const aberto = abertoId === undefined ? index === 0 : abertoId === grupo.content.id;
            return (
              <CaptionFilaCard
                key={grupo.content.id}
                content={grupo.content}
                publicacoes={grupo.publicacoes}
                series={state.series}
                pilares={state.pilares}
                open={aberto}
                onToggle={() => setAbertoId(aberto ? null : grupo.content.id)}
                onSave={saveCaption}
              />
            );
          })}
          <PaginationBar
            variant="full"
            itemLabel="publicações"
            totalItems={pageData.totalItems}
            currentPage={pageData.page}
            totalPages={pageData.totalPages}
            pageSize={CAPTION_PAGE_SIZE}
            onPageChange={nextPage => {
              setPage(nextPage);
              setAbertoId(undefined);
              document.querySelector('main')?.scrollTo({ top: 0 });
            }}
          />
        </div>
      )}
    </PageLayout>
  );
}
