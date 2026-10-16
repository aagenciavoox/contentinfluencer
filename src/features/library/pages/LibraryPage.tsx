import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Clapperboard, Film, LucideIcon, Plus, Tv } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { BibliotecaItem, BibliotecaItemMeta, fetchBibliotecaPage } from '../../../lib/database';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { countContentsByBibliotecaItem } from '../lib/libraryContentCounts';
import { usePaginatedQuery } from '../../../hooks/usePaginatedQuery';
import { generateUUID } from '../../../utils/uuid';
import { buildIdeaFields, parseLegacyIdeaText } from '../../ideas/lib/ideaText';
import { Dialog } from '../../../components/overlays/Dialog';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { QueryViewState, resolveQueryViewStatus } from '../../../components/ui/QueryViewState';
import { EMPTY } from '../../../lib/uiCopy';
import { LibraryMobileScreen } from '../../../mobile/screens/library/LibraryMobileScreen';
import { LibraryItemCard } from '../components/LibraryItemCard';
import { LibraryToolbar } from '../components/LibraryToolbar';
import type { BibliotecaCapaFilter } from '../components/LibraryToolbar';
import { COMPLETED_STATUS_BY_TYPE } from '../lib/libraryStatus';
import { GENEROS_SUGERIDOS, GENEROS_POR_TIPO } from '../lib/libraryGenres';
import { createIdeaContent } from '../../contents/lib/creationContent';
import { LibrarySectionTabs } from '../components/LibrarySectionTabs';
import { LibraryCreateForm, type LibraryCreateFormValue } from '../components/LibraryCreateForm';

type StatusLeitura = BibliotecaItem['status'];
type GeneroLivro = string;
type BibliotecaTipo = BibliotecaItem['tipo'];

const LIBRARY_PAGE_SIZE = 24;

interface BibliotecaTypeConfig {
  label: string;
  icon: LucideIcon;
  creatorLabel: string;
  titlePlaceholder: string;
  creatorPlaceholder: string;
  isBookish: boolean;
  showCover: boolean;
}

interface NovoLivroForm {
  tipo: BibliotecaTipo;
  titulo: string;
  autor: string;
  generos: GeneroLivro[];
  capaUrl: string;
  statusLeitura: StatusLeitura;
  tagsPersonalizadas: string[];
  editora: string;
  anoPublicacao: string;
  isbn: string;
  idioma: string;
  traducao: string;
  serieColecao: string;
  colecaoStatus: 'sim' | 'nao';
  colecaoNome: string;
  generoAutor: string;
  paisAutor: string;
  racaAutor: string;
  duracao: string;
  episodios: string;
  duracaoPorEpisodio: string;
  roteirista: string;
  distribuidora: string;
  plataforma: string;
  dataLancamento: string;
  paisOrigem: string;
  fazParteDeSerie: 'sim' | 'nao';
  nomeDaSerie: string;
  avaliacao: '' | '1' | '2' | '3' | '4' | '5';
  quemIndicou: string;
  motivoEscolha: string;
  potencialConteudo: '' | '1' | '2' | '3';
}


const STATUS_BY_TYPE: Record<BibliotecaTipo, StatusLeitura[]> = {
  livro: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  manga: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  quadrinho: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  filme: ['Quero ver', 'Assistido', 'Abandonado'],
  'série': ['Quero ver', 'Assistindo', 'Assistido', 'Abandonado'],
  anime: ['Quero ver', 'Assistindo', 'Assistido', 'Abandonado'],
  outro: ['Quero consumir', 'Consumindo', 'Concluído', 'Abandonado'],
};

const TYPE_CONFIG: Record<BibliotecaTipo, BibliotecaTypeConfig> = {
  livro: {
    label: 'Livro',
    icon: BookOpen,
    creatorLabel: 'Autor',
    titlePlaceholder: 'Nome do livro',
    creatorPlaceholder: 'Nome do autor',
    isBookish: true,
    showCover: true,
  },
  filme: {
    label: 'Filme',
    icon: Film,
    creatorLabel: 'Diretor',
    titlePlaceholder: 'Nome do filme',
    creatorPlaceholder: 'Nome do diretor',
    isBookish: false,
    showCover: true,
  },
  'série': {
    label: 'Série',
    icon: Tv,
    creatorLabel: 'Diretor',
    titlePlaceholder: 'Nome da série',
    creatorPlaceholder: 'Direção principal',
    isBookish: false,
    showCover: true,
  },
  anime: {
    label: 'Anime',
    icon: Clapperboard,
    creatorLabel: 'Direção / estúdio',
    titlePlaceholder: 'Nome do anime',
    creatorPlaceholder: 'Ex.: MAPPA, direção principal',
    isBookish: false,
    showCover: true,
  },
  manga: {
    label: 'Mangá',
    icon: BookOpen,
    creatorLabel: 'Mangaká',
    titlePlaceholder: 'Nome do mangá',
    creatorPlaceholder: 'Nome do mangaká',
    isBookish: true,
    showCover: true,
  },
  quadrinho: {
    label: 'Quadrinho',
    icon: BookOpen,
    creatorLabel: 'Roteiro / arte',
    titlePlaceholder: 'Nome do quadrinho',
    creatorPlaceholder: 'Quem escreveu ou desenhou',
    isBookish: true,
    showCover: true,
  },
  outro: {
    label: 'Outro',
    icon: BookOpen,
    creatorLabel: 'Responsável',
    titlePlaceholder: 'Nome do item',
    creatorPlaceholder: 'Responsável principal',
    isBookish: false,
    showCover: true,
  },
};

const STATUS_OPTIONS = Array.from(new Set(Object.values(STATUS_BY_TYPE).flat()));

const INITIAL_FORM: NovoLivroForm = {
  tipo: 'livro',
  titulo: '',
  autor: '',
  generos: [],
  capaUrl: '',
  statusLeitura: STATUS_BY_TYPE.livro[0],
  tagsPersonalizadas: [],
  editora: '',
  anoPublicacao: '',
  isbn: '',
  idioma: '',
  traducao: '',
  serieColecao: '',
  colecaoStatus: 'nao',
  colecaoNome: '',
  generoAutor: '',
  paisAutor: '',
  racaAutor: '',
  duracao: '',
  episodios: '',
  duracaoPorEpisodio: '',
  roteirista: '',
  distribuidora: '',
  plataforma: '',
  dataLancamento: '',
  paisOrigem: '',
  fazParteDeSerie: 'nao',
  nomeDaSerie: '',
  avaliacao: '',
  quemIndicou: '',
  motivoEscolha: '',
  potencialConteudo: '',
};

export function LibraryPage() {
  const { state, dispatch, ensureDataDomains } = useAppContext();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [libraryPage, setLibraryPage] = useState(1);
  const [filtroTipo, setFiltroTipo] = useState<BibliotecaTipo | 'Todos'>('Todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusLeitura | 'Todos'>('Todos');
  const [filtroGenero, setFiltroGenero] = useState<string>('Todos');
  const [filtroCapa, setFiltroCapa] = useState<BibliotecaCapaFilter>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('recentes');
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<NovoLivroForm>(INITIAL_FORM);

  const libraryQuery = useMemo(() => ({
    page: libraryPage,
    pageSize: LIBRARY_PAGE_SIZE,
    tipo: filtroTipo,
    status: filtroStatus,
    genero: filtroGenero,
    capa: filtroCapa,
    search: searchTerm,
    sortValue,
  }), [filtroCapa, filtroGenero, filtroStatus, filtroTipo, libraryPage, searchTerm, sortValue]);

  const fetchLibraryPageForUser = useCallback(
    (query: typeof libraryQuery) => {
      if (!user) return Promise.resolve({ items: [], total: 0 });
      return fetchBibliotecaPage(user.id, query);
    },
    [user],
  );

  const {
    items: libraryItems,
    total: libraryTotal,
    loading: libraryLoading,
    refreshing: libraryRefreshing,
    error: libraryError,
    fetchAttempted: libraryFetchAttempted,
    reload: reloadLibrary,
  } = usePaginatedQuery({
    namespace: 'library',
    query: libraryQuery,
    enabled: !!user,
    fetchPage: fetchLibraryPageForUser,
    persistKey: user ? `${user.id}:library` : undefined,
  });

  useEffect(() => {
    setLibraryPage(1);
  }, [filtroCapa, filtroGenero, filtroStatus, filtroTipo, searchTerm, sortValue]);

  useEffect(() => {
    void ensureDataDomains(['library-generos', 'content']);
  }, [ensureDataDomains]);

  const contentReady = useDomainsReady(['content']);
  const contentCounts = useMemo(
    () => (contentReady ? countContentsByBibliotecaItem(state.contents) : new Map<string, number>()),
    [contentReady, state.contents],
  );

  const libraryQueryStatus = resolveQueryViewStatus({
    authLoading,
    loading: libraryLoading,
    refreshing: libraryRefreshing,
    error: libraryError,
    fetchAttempted: libraryFetchAttempted,
    enabled: !!user,
    itemCount: libraryItems.length,
  });
  const totalLibraryPages = Math.max(1, Math.ceil(libraryTotal / LIBRARY_PAGE_SIZE));
  const livrosFiltrados = libraryItems;
  const tiposNaGrade = new Set(livrosFiltrados.map(livro => livro.tipo)).size;

  const selectedTypeConfig = TYPE_CONFIG[form.tipo];
  const selectedStatusOptions = STATUS_BY_TYPE[form.tipo];
  const selectedGenreOptions = (form.tipo === 'quadrinho' ? GENEROS_POR_TIPO.quadrinho : GENEROS_SUGERIDOS)
    .map(genero => ({ value: genero, label: genero }));
  const mobilePrimaryBookId = typeof state.preferences.mobile_notes_primary_book_id === 'string'
    ? state.preferences.mobile_notes_primary_book_id
    : null;

  const availableGenreFilters = useMemo(() => {
    return Array.from(
      new Set([
        ...GENEROS_SUGERIDOS,
        ...state.bibliotecaGeneros.map(genero => genero.nome),
      ])
    ).sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }, [state.bibliotecaGeneros]);

  const contarConteudos = (livroId: string) => contentCounts.get(livroId) || 0;

  const handleMarkComplete = (item: BibliotecaItem) => {
    dispatch({
      type: 'UPDATE_BOOK',
      payload: {
        ...item,
        status: COMPLETED_STATUS_BY_TYPE[item.tipo],
        dataFim: item.dataFim || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const handleTurnIntoIdea = (item: BibliotecaItem) => {
    const fields = buildIdeaFields({
      title: `Conteúdo sobre "${item.titulo}"`,
      notes:
        item.notasGerais?.trim()
        || (item.autorDiretor ? item.autorDiretor : ''),
    });

    const ideia = createIdeaContent({
      title: fields.title || 'Ideia sem título',
      notes: fields.notes || null,
      pilarId: null,
      seriesId: null,
      bibliotecaItemId: item.id,
    });

    dispatch({ type: 'ADD_CONTENT', payload: ideia });
  };

  const handleCoverChange = (item: BibliotecaItem, capaUrl: string) => {
    dispatch({
      type: 'UPDATE_BOOK',
      payload: {
        ...item,
        capaUrl: capaUrl || null,
        updatedAt: new Date().toISOString(),
      },
    });
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
  };

  const handleOpenModal = () => {
    resetForm();
    setModalAberto(true);
  };

  useEffect(() => {
    if (searchParams.get('compose') !== 'novo') return;
    resetForm();
    setModalAberto(true);
    const next = new URLSearchParams(searchParams);
    next.delete('compose');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Links da Análise: "Ver todos" (em andamento) e "Avaliar itens concluídos".
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (!statusParam) return;
    if (statusParam === 'andamento') setFiltroStatus('Lendo');
    else if (statusParam === 'concluidos') setFiltroStatus('Lido');
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const updateTipo = (tipo: BibliotecaTipo) => {
    setForm(prev => ({
      ...prev,
      tipo,
      statusLeitura: STATUS_BY_TYPE[tipo][0],
    }));
  };

  const handleCriarLivro = () => {
    if (!form.titulo.trim()) return;

    const totalPaginas =
      form.tipo === 'filme'
        ? (form.duracao ? Number(form.duracao) : null)
        : form.tipo === 'série' || form.tipo === 'anime'
          ? (form.episodios ? Number(form.episodios) : null)
          : null;

    const metadata: BibliotecaItemMeta = {
      editora: form.editora,
      anoPublicacao: form.anoPublicacao || form.dataLancamento,
      isbn: form.isbn,
      idioma: form.idioma,
      traducao: form.traducao,
      serieColecao: form.serieColecao || form.nomeDaSerie,
      colecaoStatus: form.colecaoStatus,
      colecaoNome: form.colecaoNome,
      generoAutor: form.generoAutor,
      paisAutor: form.paisAutor,
      racaAutor: form.racaAutor,
      duracao: form.duracao,
      episodios: form.episodios,
      duracaoPorEpisodio: form.duracaoPorEpisodio,
      roteirista: form.roteirista,
      distribuidora: form.distribuidora,
      plataforma: form.plataforma,
      dataLancamento: form.dataLancamento,
      paisOrigem: form.paisOrigem,
      fazParteDeSerie: form.fazParteDeSerie,
      nomeDaSerie: form.nomeDaSerie,
      tagsPersonalizadas: form.tagsPersonalizadas,
      quemIndicou: form.quemIndicou,
      motivoEscolha: form.motivoEscolha,
    };

    const novoLivro: BibliotecaItem = {
      id: generateUUID(),
      userId: '',
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      autorDiretor: form.autor.trim(),
      generoIds: form.generos,
      capaUrl: form.capaUrl.trim() || null,
      status: form.statusLeitura,
      dataInicio: null,
      dataFim: null,
      avaliacao: form.avaliacao ? Number(form.avaliacao) : null,
      notasGerais: null,
      potencialConteudo: form.potencialConteudo ? Number(form.potencialConteudo) : null,
      totalPaginas,
      paginasLidas: null,
      anotacoes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      ficha: metadata,
    };

    dispatch({ type: 'ADD_BOOK', payload: novoLivro });

    setModalAberto(false);
    resetForm();
    navigate(`/biblioteca/${novoLivro.id}`);
  };

  const handleSetPrimaryMobileBook = (bookId: string) => {
    const nextValue = mobilePrimaryBookId === bookId ? null : bookId;

    dispatch({
      type: 'SET_PREFERENCE',
      payload: {
        key: 'mobile_notes_primary_book_id',
        value: nextValue,
      },
    });
  };

  const getItemMeta = (itemId: string) =>
    state.bibliotecaItems.find(item => item.id === itemId)?.ficha ?? {};

  const createFormNode = (
    <LibraryCreateForm
      value={form}
      onTipoChange={updateTipo}
      onPatch={(patch: Partial<LibraryCreateFormValue>) => setForm(prev => ({ ...prev, ...patch }))}
      statusOptions={selectedStatusOptions}
      genreOptions={selectedGenreOptions}
      titlePlaceholder={selectedTypeConfig.titlePlaceholder}
      creatorLabel={selectedTypeConfig.creatorLabel}
      creatorPlaceholder={selectedTypeConfig.creatorPlaceholder}
      typeLabel={selectedTypeConfig.label}
    />
  );

  const createFooterNode = (
    <OverlayFooter className="pb-safe">
      <AppButton variant="secondary" onClick={() => setModalAberto(false)} className="flex-1 md:max-w-[240px]">
        Cancelar
      </AppButton>
      <AppButton
        variant="primary"
        onClick={handleCriarLivro}
        disabled={!form.titulo.trim()}
        className="flex-1 md:ml-auto md:max-w-[240px]"
      >
        Criar item
      </AppButton>
    </OverlayFooter>
  );

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <LibraryMobileScreen
            items={libraryItems}
            libraryTotal={libraryTotal}
            mobilePrimaryBookId={mobilePrimaryBookId}
            getItemMeta={getItemMeta}
            countContents={contarConteudos}
            queryStatus={libraryQueryStatus}
            errorMessage={libraryError}
            onRetry={() => void reloadLibrary()}
            page={libraryPage}
            totalPages={totalLibraryPages}
            onPageChange={setLibraryPage}
            onOpenItem={(itemId) => navigate(`/biblioteca/${itemId}?tab=anotacoes`)}
            onOpenCreate={handleOpenModal}
            onTogglePrimary={handleSetPrimaryMobileBook}
            onCoverChange={handleCoverChange}
            filtroCapa={filtroCapa}
            onFiltroCapaChange={setFiltroCapa}
          />
        </div>

        <Dialog
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          desktopMaxW="max-w-[760px]"
          zIndex="z-[110]"
          ariaLabel="Novo item da biblioteca"
        >
          <OverlayHeader
            title="Novo item da biblioteca"
            subtitle="Só o essencial. Os detalhes podem vir depois."
            onClose={() => setModalAberto(false)}
          />

          <OverlayBody className="py-6">
            {createFormNode}
          </OverlayBody>

          {createFooterNode}
        </Dialog>
      </>
    );
  }

  return (
    <PageLayout
      contentWidth="wide"
      header={(
        <DesktopPageHeader
          section="Criação"
          title="Biblioteca"
          meta={libraryLoading && libraryItems.length === 0
            ? undefined
            : `${libraryTotal} ${libraryTotal === 1 ? 'item' : 'itens'}`}
          actions={(
            <AppButton
              onClick={handleOpenModal}
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Novo item
            </AppButton>
          )}
        />
      )}
      toolbar={
        <LibraryToolbar
          tabs={<LibrarySectionTabs />}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filtroTipo={filtroTipo}
          onFiltroTipoChange={setFiltroTipo}
          filtroStatus={filtroStatus}
          onFiltroStatusChange={setFiltroStatus}
          filtroGenero={filtroGenero}
          onFiltroGeneroChange={setFiltroGenero}
          filtroCapa={filtroCapa}
          onFiltroCapaChange={setFiltroCapa}
          sortValue={sortValue}
          onSortChange={setSortValue}
          statusOptions={STATUS_OPTIONS}
          genreOptions={availableGenreFilters}
        />
      }
    >

      <QueryViewState
        status={libraryQueryStatus}
        skeletonCount={12}
        skeletonVariant="card"
        emptyIcon={<BookOpen className="h-8 w-8" />}
        emptyTitle={libraryTotal === 0 ? EMPTY.biblioteca.title : EMPTY.bibliotecaSemResultado.title}
        emptyDescription={
          libraryTotal === 0 ? EMPTY.biblioteca.description : EMPTY.bibliotecaSemResultado.description
        }
        errorMessage={libraryError}
        onRetry={() => void reloadLibrary()}
      >
        <>
        <div className="grid-catalog">
          {livrosFiltrados.map(livro => {
            const typeConfig = TYPE_CONFIG[livro.tipo] ?? TYPE_CONFIG.outro;

            return (
              <LibraryItemCard
                key={livro.id}
                item={livro}
                typeConfig={typeConfig}
                metadata={getItemMeta(livro.id)}
                contentsCount={contarConteudos(livro.id)}
                isPrimaryMobileBook={mobilePrimaryBookId === livro.id}
                showTypeLabel={tiposNaGrade > 1}
                onOpen={() => navigate(`/biblioteca/${livro.id}?tab=anotacoes`)}
                onEdit={() => navigate(`/biblioteca/${livro.id}?tab=info`)}
                onMarkComplete={() => handleMarkComplete(livro)}
                onTurnIntoIdea={() => handleTurnIntoIdea(livro)}
                onTogglePrimary={() => handleSetPrimaryMobileBook(livro.id)}
                onCoverChange={capaUrl => handleCoverChange(livro, capaUrl)}
              />
            );
          })}
        </div>
        <PaginationBar
          variant="simple"
          itemLabel="itens"
          currentPage={libraryPage}
          totalPages={totalLibraryPages}
          totalItems={libraryTotal}
          pageSize={LIBRARY_PAGE_SIZE}
          onPageChange={setLibraryPage}
          className="mt-6"
        />
        </>
      </QueryViewState>

      <Dialog
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        desktopMaxW="max-w-[760px]"
      >
        <OverlayHeader
          title="Novo item da biblioteca"
          subtitle="Só o essencial. Os detalhes podem vir depois."
          onClose={() => setModalAberto(false)}
        />

        <OverlayBody className="py-6">
          {createFormNode}
        </OverlayBody>

        {createFooterNode}
      </Dialog>
    </PageLayout>
  );
}
