import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { FilterChips, type FilterChipOption } from '../../../components/ui/FilterChips';
import { PageToolbar } from '../../../components/ui/PageToolbar';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { QueryViewState, resolveQueryViewStatus } from '../../../components/ui/QueryViewState';
import { Text } from '../../../components/ui/Text';
import { EMPTY } from '../../../lib/uiCopy';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import { LibraryMobileScreen } from '../../../mobile/screens/library/LibraryMobileScreen';
import { LibraryItemCard } from '../components/LibraryItemCard';
import { LIBRARY_SORT_VALUES, LibraryToolbar } from '../components/LibraryToolbar';
import type { BibliotecaCapaFilter } from '../components/LibraryToolbar';
import {
  COMPLETED_STATUS_BY_TYPE,
  STATUS_BY_TYPE,
  STATUS_FASES,
  datasAoMudarStatus,
  faseDaUrl,
  faseDoStatus,
  faseParaUrl,
  rotuloDaFase,
  statusesDaFase,
  type StatusFase,
} from '../lib/libraryStatus';
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
}


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
    titlePlaceholder: 'Nome da obra',
    creatorPlaceholder: 'Responsável principal',
    isBookish: false,
    showCover: true,
  },
};

const TIPOS_VALIDOS = Object.keys(TYPE_CONFIG) as BibliotecaTipo[];

function tipoDaUrl(value: string | null): BibliotecaTipo | 'Todos' {
  return TIPOS_VALIDOS.includes(value as BibliotecaTipo) ? (value as BibliotecaTipo) : 'Todos';
}

function capaDaUrl(value: string | null): BibliotecaCapaFilter {
  return value === 'sem' || value === 'com' ? value : 'Todos';
}

function ordemDaUrl(value: string | null): string {
  return value && (LIBRARY_SORT_VALUES as readonly string[]).includes(value) ? value : 'recentes';
}

function paginaDaUrl(value: string | null): number {
  const pagina = Number(value);
  return Number.isInteger(pagina) && pagina > 1 ? pagina : 1;
}

function contarObras(total: number) {
  return `${total.toLocaleString('pt-BR')} ${total === 1 ? 'obra' : 'obras'}`;
}

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
};

export function LibraryPage() {
  const { state, dispatch, ensureDataDomains } = useAppContext();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<NovoLivroForm>(INITIAL_FORM);

  // Filtros, busca, ordem e página moram no endereço: voltar de uma obra devolve a mesma grade.
  const filtroTipo = tipoDaUrl(searchParams.get('tipo'));
  const filtroFase: StatusFase | 'Todos' = faseDaUrl(searchParams.get('status')) ?? 'Todos';
  const filtroGenero = searchParams.get('genero') || 'Todos';
  const filtroCapa = capaDaUrl(searchParams.get('capa'));
  const searchTerm = searchParams.get('q') ?? '';
  const sortValue = ordemDaUrl(searchParams.get('ordem'));
  const libraryPage = paginaDaUrl(searchParams.get('pagina'));

  // O setSearchParams não enfileira: "Limpar filtros" troca vários de uma vez no mesmo clique.
  const paramsRef = useRef(searchParams);
  paramsRef.current = searchParams;
  const updateParams = useCallback((patch: Record<string, string | null>, keepPage = false) => {
    const next = new URLSearchParams(paramsRef.current);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // Mudou o filtro: volta para a primeira página.
    if (!keepPage) next.delete('pagina');
    paramsRef.current = next;
    setSearchParams(next, { replace: true });
  }, [setSearchParams]);

  const setFiltroTipo = (value: BibliotecaTipo | 'Todos') => updateParams({ tipo: value === 'Todos' ? null : value });
  const setFiltroFase = (value: StatusFase | 'Todos') => updateParams({ status: value === 'Todos' ? null : faseParaUrl(value) });
  const setFiltroGenero = (value: string) => updateParams({ genero: value === 'Todos' ? null : value });
  const setFiltroCapa = (value: BibliotecaCapaFilter) => updateParams({ capa: value === 'Todos' ? null : value });
  const setSearchTerm = (value: string) => updateParams({ q: value || null });
  const setSortValue = (value: string) => updateParams({ ordem: value === 'recentes' ? null : value });
  const setLibraryPage = (page: number) => updateParams({ pagina: page > 1 ? String(page) : null }, true);

  const libraryQuery = useMemo(() => ({
    page: libraryPage,
    pageSize: LIBRARY_PAGE_SIZE,
    tipo: filtroTipo,
    statusIn: filtroFase === 'Todos' ? undefined : statusesDaFase(filtroFase),
    genero: filtroGenero,
    capa: filtroCapa,
    search: searchTerm,
    sortValue,
  }), [filtroCapa, filtroFase, filtroGenero, filtroTipo, libraryPage, searchTerm, sortValue]);

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
    void ensureDataDomains(['library', 'library-generos', 'content']);
  }, [ensureDataDomains]);

  // A lista completa (já carregada para Hoje e Anotações) dá as contagens sem outra consulta ao banco.
  const libraryReady = useDomainsReady(['library']);
  const acervo = useMemo(
    () => state.bibliotecaItems.filter(item => !item.deletedAt),
    [state.bibliotecaItems],
  );
  const contagem = useMemo(() => {
    if (!libraryReady) return null;
    const porFase: Record<StatusFase | 'Todos', number> = { Todos: 0, andamento: 0, quero: 0, concluido: 0, abandonado: 0 };
    let obras = 0;
    for (const item of state.bibliotecaItems) {
      if (item.deletedAt) continue;
      obras += 1;
      if (filtroTipo !== 'Todos' && item.tipo !== filtroTipo) continue;
      porFase.Todos += 1;
      const fase = faseDoStatus(item.status);
      if (fase) porFase[fase] += 1;
    }
    return { porFase, obras };
  }, [filtroTipo, libraryReady, state.bibliotecaItems]);

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
    totalCount: libraryTotal,
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

  // A grade chega sem as anotações; gravar a partir dela apagaria as do estado (o UPDATE_BOOK mescla).
  const itemCompleto = (item: BibliotecaItem) => state.bibliotecaItems.find(b => b.id === item.id) ?? item;

  // Ações de um clique no card: o aviso traz "Desfazer" no lugar do "Alterações salvas" de sempre.
  const handleMarkComplete = async (itemDaGrade: BibliotecaItem) => {
    const item = itemCompleto(itemDaGrade);
    const status = COMPLETED_STATUS_BY_TYPE[item.tipo];
    try {
      await dispatch({
        type: 'UPDATE_BOOK',
        payload: {
          ...item,
          status,
          ...datasAoMudarStatus(status, { dataInicio: item.dataInicio, dataFim: item.dataFim }),
          updatedAt: new Date().toISOString(),
        },
      }, { silent: true });
    } catch {
      return; // O erro já foi avisado.
    }
    void reloadLibrary();
    notifySaveFeedback({
      status: 'success',
      message: `"${item.titulo}" marcado como ${status.toLowerCase()}`,
      onUndo: () => {
        void dispatch({ type: 'UPDATE_BOOK', payload: { ...item, updatedAt: new Date().toISOString() } })
          .then(() => reloadLibrary());
      },
    });
  };

  const handleTurnIntoIdea = async (item: BibliotecaItem) => {
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

    try {
      await dispatch({ type: 'ADD_CONTENT', payload: ideia }, { silent: true });
    } catch {
      return;
    }
    notifySaveFeedback({
      status: 'success',
      message: `Ideia criada a partir de "${item.titulo}"`,
      onUndo: () => void dispatch({ type: 'DELETE_CONTENT', payload: ideia.id }, { silent: true }),
    });
  };

  const handleCoverChange = async (item: BibliotecaItem, capaUrl: string) => {
    try {
      await dispatch({
        type: 'UPDATE_BOOK',
        payload: {
          ...itemCompleto(item),
          capaUrl: capaUrl || null,
          updatedAt: new Date().toISOString(),
        },
      });
      await reloadLibrary();
    } catch {
      // O aviso de erro já saiu do dispatch. A capa antiga continua na grade.
    }
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

  const updateTipo = (tipo: BibliotecaTipo) => {
    setForm(prev => ({
      ...prev,
      tipo,
      statusLeitura: STATUS_BY_TYPE[tipo][0],
    }));
  };

  const [criando, setCriando] = useState(false);
  const handleCriarLivro = async () => {
    if (!form.titulo.trim() || criando) return;

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
      potencialConteudo: null,
      totalPaginas,
      paginasLidas: null,
      anotacoes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      ficha: metadata,
    };

    setCriando(true);
    try {
      await dispatch({ type: 'ADD_BOOK', payload: novoLivro });
      setModalAberto(false);
      resetForm();
      navigate(`/biblioteca/${novoLivro.id}`);
    } catch {
      // O aviso de erro já saiu. O formulário continua com o que foi digitado.
    } finally {
      setCriando(false);
    }
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

  // A obra guarda de onde veio: o "Biblioteca" do cabeçalho dela volta com os mesmos filtros.
  const openItem = (itemId: string, tab: 'anotacoes' | 'info') => {
    const query = paramsRef.current.toString();
    navigate(`/biblioteca/${itemId}?tab=${tab}`, buildDetailBackState(`/biblioteca${query ? `?${query}` : ''}`));
  };

  const faseOptions: FilterChipOption<StatusFase | 'Todos'>[] = [
    { id: 'Todos', label: 'Todas', count: contagem?.porFase.Todos },
    ...STATUS_FASES.map(fase => ({
      id: fase,
      label: rotuloDaFase(fase, filtroTipo),
      count: contagem?.porFase[fase],
    })),
  ];

  const filtrosAtivos = filtroTipo !== 'Todos' || filtroFase !== 'Todos' || filtroGenero !== 'Todos'
    || filtroCapa !== 'Todos' || searchTerm.trim() !== '';
  const contagemTexto = libraryQueryStatus !== 'ready'
    ? null
    : filtrosAtivos && contagem
      ? `${libraryTotal.toLocaleString('pt-BR')} de ${contarObras(contagem.obras)}`
      : contarObras(libraryTotal);

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
        onClick={() => void handleCriarLivro()}
        disabled={!form.titulo.trim() || criando}
        className="flex-1 md:ml-auto md:max-w-[240px]"
      >
        {criando ? 'Salvando…' : 'Criar obra'}
      </AppButton>
    </OverlayFooter>
  );

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <LibraryMobileScreen
            items={acervo}
            libraryTotal={acervo.length}
            mobilePrimaryBookId={mobilePrimaryBookId}
            getItemMeta={getItemMeta}
            countContents={contarConteudos}
            queryStatus={
              libraryQueryStatus === 'error' ? 'error'
              : !libraryReady ? 'loading'
              : acervo.length === 0 ? 'empty'
              : 'ready'
            }
            errorMessage={libraryError}
            onRetry={() => void reloadLibrary()}
            onOpenItem={(itemId) => openItem(itemId, 'anotacoes')}
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
          ariaLabel="Nova obra"
        >
          <OverlayHeader
            title="Nova obra"
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
          section="Biblioteca"
          title="Biblioteca"
          actions={(
            <AppButton
              onClick={handleOpenModal}
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nova obra
            </AppButton>
          )}
        />
      )}
      navigation={<LibrarySectionTabs />}
      toolbar={
        <div className="stack-sm">
          <PageToolbar
            filters={
              <LibraryToolbar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                filtroTipo={filtroTipo}
                onFiltroTipoChange={setFiltroTipo}
                filtroGenero={filtroGenero}
                onFiltroGeneroChange={setFiltroGenero}
                filtroCapa={filtroCapa}
                onFiltroCapaChange={setFiltroCapa}
                sortValue={sortValue}
                onSortChange={setSortValue}
                genreOptions={availableGenreFilters}
              />
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <FilterChips
              ariaLabel="Status"
              value={filtroFase}
              onChange={setFiltroFase}
              options={faseOptions}
            />
            {contagemTexto ? (
              <Text variant="meta" as="p" role="status" className="tabular-nums">{contagemTexto}</Text>
            ) : null}
          </div>
        </div>
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
                onOpen={() => openItem(livro.id, 'anotacoes')}
                onEdit={() => openItem(livro.id, 'info')}
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
          itemLabel="obras"
          showSummary={false}
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
          title="Nova obra"
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
