import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronDown, Clapperboard, Film, LucideIcon, Tags, Tv } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { BibliotecaItem, BibliotecaItemMeta, fetchBibliotecaContentCounts, fetchBibliotecaPage } from '../../../lib/database';
import { usePaginatedQuery } from '../../../hooks/usePaginatedQuery';
import { generateUUID } from '../../../utils/uuid';
import { buildIdeaFields, parseLegacyIdeaText } from '../../ideas/lib/ideaText';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { Text } from '../../../components/ui/Text';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { GLOSSARY, EMPTY } from '../../../lib/uiCopy';
import { PipelineActionBar } from '../../../components/pipeline/PipelineActionBar';
import { LibraryMobileScreen } from '../../../mobile/screens/library/LibraryMobileScreen';
import { LibraryItemCard } from '../components/LibraryItemCard';
import { LibraryToolbar } from '../components/LibraryToolbar';
import { COMPLETED_STATUS_BY_TYPE } from '../lib/libraryStatus';
import { TagSelect } from '../../../components/ui/TagSelect';
import { createIdeaContent } from '../../contents/lib/creationContent';
import { LibrarySectionTabs } from '../components/LibrarySectionTabs';

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

const STATUS_CORES: Record<string, string> = {
  'Quero consumir': 'bg-[var(--text-primary)]/5 text-[var(--text-primary)]/50',
  'Quero ler': 'bg-[var(--text-primary)]/5 text-[var(--text-primary)]/50',
  'Quero ver': 'bg-[var(--text-primary)]/5 text-[var(--text-primary)]/50',
  Consumindo: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  Lendo: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  Assistindo: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  Pausado: 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
  Abandonado: 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
  Concluído: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
  Lido: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
  Assistido: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
};

const GENEROS_SUGERIDOS: GeneroLivro[] = [
  'Fantasia',
  'Romance',
  'Thriller',
  'Terror',
  'Drama',
  'Mistério',
  'Ficção científica',
  'Não ficção',
  'Comédia',
  'Ação',
  'Aventura',
  'Slice of life',
];

const STATUS_BY_TYPE: Record<BibliotecaTipo, StatusLeitura[]> = {
  livro: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  manga: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
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
    showCover: false,
  },
  'série': {
    label: 'Série',
    icon: Tv,
    creatorLabel: 'Diretor',
    titlePlaceholder: 'Nome da série',
    creatorPlaceholder: 'Direção principal',
    isBookish: false,
    showCover: false,
  },
  anime: {
    label: 'Anime',
    icon: Clapperboard,
    creatorLabel: 'Direção / estúdio',
    titlePlaceholder: 'Nome do anime',
    creatorPlaceholder: 'Ex: MAPPA, direção principal',
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
  const isMobile = useIsMobile();
  const [libraryPage, setLibraryPage] = useState(1);
  const [contentCounts, setContentCounts] = useState<Map<string, number>>(new Map());
  const [filtroTipo, setFiltroTipo] = useState<BibliotecaTipo | 'Todos'>('Todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusLeitura | 'Todos'>('Todos');
  const [filtroGenero, setFiltroGenero] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('recentes');
  const [modalAberto, setModalAberto] = useState(false);
  const [showParaVoce, setShowParaVoce] = useState(false);
  const [showClassificacao, setShowClassificacao] = useState(false);
  const [showDetalhesTipo, setShowDetalhesTipo] = useState(false);
  const [form, setForm] = useState<NovoLivroForm>(INITIAL_FORM);

  const libraryQuery = useMemo(() => ({
    page: libraryPage,
    pageSize: LIBRARY_PAGE_SIZE,
    tipo: filtroTipo,
    status: filtroStatus,
    genero: filtroGenero,
    search: searchTerm,
    sortValue,
  }), [filtroGenero, filtroStatus, filtroTipo, libraryPage, searchTerm, sortValue]);

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
  } = usePaginatedQuery({
    namespace: 'library',
    query: libraryQuery,
    enabled: !!user,
    fetchPage: fetchLibraryPageForUser,
  });

  useEffect(() => {
    setLibraryPage(1);
  }, [filtroGenero, filtroStatus, filtroTipo, searchTerm, sortValue]);

  useEffect(() => {
    void ensureDataDomains(['library-generos']);
  }, [ensureDataDomains]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void fetchBibliotecaContentCounts(user.id).then(counts => {
      if (active) setContentCounts(counts);
    });
    return () => {
      active = false;
    };
  }, [user, state.contents.length, state.bibliotecaItems.length]);

  const isLibraryLoading = authLoading || libraryLoading;
  const totalLibraryPages = Math.max(1, Math.ceil(libraryTotal / LIBRARY_PAGE_SIZE));
  const livrosFiltrados = libraryItems;

  const selectedTypeConfig = TYPE_CONFIG[form.tipo];
  const selectedStatusOptions = STATUS_BY_TYPE[form.tipo];
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

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setShowParaVoce(false);
    setShowClassificacao(false);
    setShowDetalhesTipo(false);
  };

  const handleOpenModal = () => {
    resetForm();
    setModalAberto(true);
  };

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
    };

    dispatch({ type: 'ADD_BOOK', payload: novoLivro });

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

    if (Object.values(metadata).some(value => Array.isArray(value) ? value.length > 0 : Boolean(value))) {
      dispatch({
        type: 'SET_PREFERENCE',
        payload: { key: `item_meta:${novoLivro.id}`, value: metadata },
      });
    }

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
    ((state.preferences[`item_meta:${itemId}`] || {}) as BibliotecaItemMeta);

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <LibraryMobileScreen
            items={libraryItems}
            mobilePrimaryBookId={mobilePrimaryBookId}
            getItemMeta={getItemMeta}
            countContents={contarConteudos}
            isLoading={isLibraryLoading}
            onOpenItem={(itemId) => navigate(`/biblioteca/${itemId}?tab=anotacoes`)}
            onOpenCreate={handleOpenModal}
            onTogglePrimary={handleSetPrimaryMobileBook}
          />
        </div>

        <BottomSheetModal
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          desktopMaxW="max-w-xl"
          zIndex="z-[110]"
          ariaLabel="Novo item do acervo"
        >
          <OverlayHeader
            title="Novo item do acervo"
            subtitle="Cadastro rapido para consulta e captura no mobile."
          />

          <OverlayBody className="stack-lg py-6">
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(TYPE_CONFIG) as [BibliotecaTipo, BibliotecaTypeConfig][])
                .filter(([tipo]) => tipo !== 'outro')
                .map(([tipo, config]) => {
                  const Icon = config.icon;
                  const active = form.tipo === tipo;

                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => updateTipo(tipo)}
                      className={`flex items-center justify-center gap-2 rounded-[var(--radius-md)] border px-3 py-3 t-label t-label-uppercase font-semibold ${
                        active
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                          : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {config.label}
                    </button>
                  );
                })}
            </div>

            <input
              type="text"
              value={form.titulo}
              onChange={event => setForm(prev => ({ ...prev, titulo: event.target.value }))}
              placeholder={selectedTypeConfig.titlePlaceholder}
              autoFocus
              className="w-full"
            />

            <input
              type="text"
              value={form.autor}
              onChange={event => setForm(prev => ({ ...prev, autor: event.target.value }))}
              placeholder={selectedTypeConfig.creatorPlaceholder}
              className="w-full"
            />

            {selectedTypeConfig.showCover ? (
              <input
                type="url"
                value={form.capaUrl}
                onChange={event => setForm(prev => ({ ...prev, capaUrl: event.target.value }))}
                placeholder="URL da capa"
                className="w-full"
              />
            ) : null}

            <label className="block stack-sm">
              <span className="t-label text-[var(--text-tertiary)]">Status</span>
              <select
                value={form.statusLeitura}
                onChange={event => setForm(prev => ({ ...prev, statusLeitura: event.target.value as StatusLeitura }))}
              >
                {selectedStatusOptions.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>

            <TagSelect
              label="Generos"
              hint="Selecione um ou mais generos para categorizar este item."
              values={form.generos}
              onChange={generos => setForm(prev => ({ ...prev, generos }))}
              options={GENEROS_SUGERIDOS.map(genero => ({ value: genero, label: genero }))}
              creatable
              placeholder="Selecione ou digite generos"
            />

            <TagSelect
              label="Tags personalizadas"
              hint="Organize o acervo com tags proprias."
              values={form.tagsPersonalizadas}
              onChange={tagsPersonalizadas => setForm(prev => ({ ...prev, tagsPersonalizadas }))}
              creatable
              placeholder="Ex: comfort read, favorito de infancia"
            />
          </OverlayBody>

          <OverlayFooter className="pb-safe">
            <button
              type="button"
              onClick={() => setModalAberto(false)}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <AppButton
              variant="primary"
              onClick={handleCriarLivro}
              disabled={!form.titulo.trim()}
              className="flex-1"
            >
              Criar item
            </AppButton>
          </OverlayFooter>
        </BottomSheetModal>
      </>
    );
  }

  return (
    <PageLayout
      contentWidth="wide"
      header={(
        <DesktopPageHeader section="Criação" title="Biblioteca">
          <LibrarySectionTabs />
        </DesktopPageHeader>
      )}
      toolbar={
        <LibraryToolbar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          filtroTipo={filtroTipo}
          onFiltroTipoChange={setFiltroTipo}
          filtroStatus={filtroStatus}
          onFiltroStatusChange={setFiltroStatus}
          filtroGenero={filtroGenero}
          onFiltroGeneroChange={setFiltroGenero}
          sortValue={sortValue}
          onSortChange={setSortValue}
          statusOptions={STATUS_OPTIONS}
          genreOptions={availableGenreFilters}
          onAddClick={handleOpenModal}
        />
      }
    >

      <PipelineActionBar
        className="mb-4"
        title="Próximo passo editorial"
        description="Transforme um item da biblioteca em ideia editorial."
        primaryLabel="Transformar em ideia"
        onPrimary={() => {
          const first = livrosFiltrados[0];
          if (first) handleTurnIntoIdea(first);
        }}
        disabled={livrosFiltrados.length === 0}
      />

      {isLibraryLoading ? (
        <SkeletonList count={12} variant="card" />
      ) : livrosFiltrados.length === 0 ? (
        <EmptyState
          compact
          icon={<BookOpen className="h-8 w-8" />}
          title={libraryTotal === 0 ? EMPTY.biblioteca.title : EMPTY.bibliotecaSemResultado.title}
          description={libraryTotal === 0 ? EMPTY.biblioteca.description : EMPTY.bibliotecaSemResultado.description}
        />
      ) : (
        <>
        <div className="mb-3 flex items-center justify-between px-0.5">
          <Text variant="eyebrow">{GLOSSARY.biblioteca}</Text>
          <Text variant="meta">
            {libraryTotal} {libraryTotal === 1 ? 'item' : 'itens'}
          </Text>
        </div>
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
                statusClassName={STATUS_CORES[livro.status] || ''}
                onOpen={() => navigate(`/biblioteca/${livro.id}?tab=anotacoes`)}
                onEdit={() => navigate(`/biblioteca/${livro.id}?tab=info`)}
                onMarkComplete={() => handleMarkComplete(livro)}
                onTurnIntoIdea={() => handleTurnIntoIdea(livro)}
                onTogglePrimary={() => handleSetPrimaryMobileBook(livro.id)}
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
      )}

      <BottomSheetModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        desktopMaxW="max-w-[720px]"
      >
        <OverlayHeader
          title="Novo item da biblioteca"
          subtitle="O formulário muda conforme o tipo escolhido."
          onClose={() => setModalAberto(false)}
        />

        <OverlayBody className="stack-xl py-6">
          <div>
            <p className="mb-3 text-xs font-semibold  text-[var(--text-tertiary)]">
              Tipo de conteúdo
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {(Object.entries(TYPE_CONFIG).filter(([key]) => key !== 'outro') as [BibliotecaTipo, BibliotecaTypeConfig][])
                .map(([tipo, config]) => {
                  const Icon = config.icon;
                  const active = form.tipo === tipo;

                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => updateTipo(tipo)}
                      className={`flex flex-col items-center gap-2 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border px-4 py-4 text-center transition-all ${
                        active
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-none'
                          : 'border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-primary)] hover:border-[var(--text-primary)]/40'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="t-label t-label-uppercase font-semibold">
                        {config.label}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                Título *
              </label>
              <input
                type="text"
                value={form.titulo}
                onChange={event => setForm(prev => ({ ...prev, titulo: event.target.value }))}
                placeholder={selectedTypeConfig.titlePlaceholder}
                autoFocus
                className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:opacity-40 focus:ring-2 focus:ring-[var(--text-primary)]/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                {selectedTypeConfig.creatorLabel}
              </label>
              <input
                type="text"
                value={form.autor}
                onChange={event => setForm(prev => ({ ...prev, autor: event.target.value }))}
                placeholder={selectedTypeConfig.creatorPlaceholder}
                className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:opacity-40 focus:ring-2 focus:ring-[var(--text-primary)]/20"
              />
            </div>
          </div>

          {selectedTypeConfig.showCover ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                URL da capa
              </label>
              <input
                type="url"
                value={form.capaUrl}
                onChange={event => setForm(prev => ({ ...prev, capaUrl: event.target.value }))}
                placeholder="https://..."
                className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:opacity-40 focus:ring-2 focus:ring-[var(--text-primary)]/20"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--text-tertiary)]">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedStatusOptions.map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, statusLeitura: status }))}
                  className={`rounded-full border px-3 py-1.5 t-label t-label-uppercase font-semibold transition-all ${
                    form.statusLeitura === status
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-primary)] opacity-70 hover:opacity-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border-color)] pt-2">
            <button
              type="button"
              onClick={() => setShowClassificacao(value => !value)}
              className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] opacity-50 transition-opacity hover:opacity-80"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showClassificacao ? 'rotate-180' : ''}`} />
              Classificação
            </button>
            {showClassificacao ? (
              <div className="stack-lg">
                <TagSelect
                  label="Generos"
                  hint="Selecione um ou mais generos para categorizar este item."
                  values={form.generos}
                  onChange={generos => setForm(prev => ({ ...prev, generos }))}
                  options={GENEROS_SUGERIDOS.map(genero => ({ value: genero, label: genero }))}
                  creatable
                  placeholder="Digite e selecione generos"
                />
                <TagSelect
                  label="Tags personalizadas"
                  hint="Organize o acervo com tags proprias."
                  values={form.tagsPersonalizadas}
                  onChange={tagsPersonalizadas => setForm(prev => ({ ...prev, tagsPersonalizadas }))}
                  creatable
                  placeholder="Ex: comfort read, favorito de infancia..."
                />
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--border-color)] pt-2">
            <button
              type="button"
              onClick={() => setShowDetalhesTipo(value => !value)}
              className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] opacity-50 transition-opacity hover:opacity-80"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showDetalhesTipo ? 'rotate-180' : ''}`} />
              Detalhes por tipo
            </button>
            {showDetalhesTipo ? (
              <div className="stack-lg">
          {selectedTypeConfig.isBookish ? (
            <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <p className="t-label t-label-uppercase font-semibold text-[var(--text-primary)]">
                Detalhes técnicos
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Para livros e mangás, os detalhes técnicos ficam no painel <strong>Info</strong> dentro do item.
              </p>
            </div>
          ) : null}

          {form.tipo === 'filme' ? (
            <div className="stack-lg rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <p className="t-label t-label-uppercase font-semibold text-[var(--text-primary)]">
                Dados do filme
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.duracao}
                    onChange={event => setForm(prev => ({ ...prev, duracao: event.target.value }))}
                    placeholder="120"
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    Avaliação
                  </label>
                  <select
                    value={form.avaliacao}
                    onChange={event => setForm(prev => ({ ...prev, avaliacao: event.target.value as NovoLivroForm['avaliacao'] }))}
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  >
                    <option value="">Sem nota</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    Roteirista
                  </label>
                  <input
                    type="text"
                    value={form.roteirista}
                    onChange={event => setForm(prev => ({ ...prev, roteirista: event.target.value }))}
                    placeholder="Nome do roteirista"
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    Distribuidora
                  </label>
                  <input
                    type="text"
                    value={form.distribuidora}
                    onChange={event => setForm(prev => ({ ...prev, distribuidora: event.target.value }))}
                    placeholder="Ex: Warner Bros."
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    Plataforma
                  </label>
                  <input
                    type="text"
                    value={form.plataforma}
                    onChange={event => setForm(prev => ({ ...prev, plataforma: event.target.value }))}
                    placeholder="Ex: MUBI, Netflix"
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    Ano de lançamento
                  </label>
                  <input
                    type="number"
                    min={1888}
                    value={form.dataLancamento}
                    onChange={event => setForm(prev => ({ ...prev, dataLancamento: event.target.value }))}
                    placeholder="2024"
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    País de origem
                  </label>
                  <input
                    type="text"
                    value={form.paisOrigem}
                    onChange={event => setForm(prev => ({ ...prev, paisOrigem: event.target.value }))}
                    placeholder="Ex: Coreia do Sul"
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-medium text-[var(--text-tertiary)]">
                    Faz parte de uma série?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['nao', 'sim'] as const).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, fazParteDeSerie: value, nomeDaSerie: value === 'nao' ? '' : prev.nomeDaSerie }))}
                        className={`rounded-full border px-3 py-1.5 t-label t-label-uppercase font-semibold transition-all ${
                          form.fazParteDeSerie === value
                            ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                            : 'border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-primary)] opacity-70'
                        }`}
                      >
                        {value === 'sim' ? 'Sim' : 'Não'}
                      </button>
                    ))}
                  </div>
                </div>

                {form.fazParteDeSerie === 'sim' ? (
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                      Qual série / franquia?
                    </label>
                    <input
                      type="text"
                      value={form.nomeDaSerie}
                      onChange={event => setForm(prev => ({ ...prev, nomeDaSerie: event.target.value }))}
                      placeholder="Ex: Duna"
                      className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {(form.tipo === 'série' || form.tipo === 'anime') ? (
            <div className="stack-lg rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <p className="t-label t-label-uppercase font-semibold text-[var(--text-primary)]">
                Dados {form.tipo === 'anime' ? 'do anime' : 'da série'}
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    Episódios
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.episodios}
                    onChange={event => setForm(prev => ({ ...prev, episodios: event.target.value }))}
                    placeholder="12"
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    Duração por ep. (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.duracaoPorEpisodio}
                    onChange={event => setForm(prev => ({ ...prev, duracaoPorEpisodio: event.target.value }))}
                    placeholder="45"
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    Plataforma
                  </label>
                  <input
                    type="text"
                    value={form.plataforma}
                    onChange={event => setForm(prev => ({ ...prev, plataforma: event.target.value }))}
                    placeholder="Ex: Crunchyroll, Max"
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    Ano de lançamento
                  </label>
                  <input
                    type="number"
                    min={1900}
                    value={form.dataLancamento}
                    onChange={event => setForm(prev => ({ ...prev, dataLancamento: event.target.value }))}
                    placeholder="2024"
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    País de origem
                  </label>
                  <input
                    type="text"
                    value={form.paisOrigem}
                    onChange={event => setForm(prev => ({ ...prev, paisOrigem: event.target.value }))}
                    placeholder="Ex: Japão"
                    className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-xs font-medium text-[var(--text-tertiary)]">
                    Faz parte de uma franquia?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['nao', 'sim'] as const).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, fazParteDeSerie: value, nomeDaSerie: value === 'nao' ? '' : prev.nomeDaSerie }))}
                        className={`rounded-full border px-3 py-1.5 t-label t-label-uppercase font-semibold transition-all ${
                          form.fazParteDeSerie === value
                            ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                            : 'border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-primary)] opacity-70'
                        }`}
                      >
                        {value === 'sim' ? 'Sim' : 'Não'}
                      </button>
                    ))}
                  </div>
                </div>

                {form.fazParteDeSerie === 'sim' ? (
                  <div className="md:col-span-2">
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                      Qual série / universo?
                    </label>
                    <input
                      type="text"
                      value={form.nomeDaSerie}
                      onChange={event => setForm(prev => ({ ...prev, nomeDaSerie: event.target.value }))}
                      placeholder="Ex: Fate, Monogatari"
                      className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                    />
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--border-color)] pt-2">
            <button
              type="button"
              onClick={() => setShowParaVoce(value => !value)}
              className="mb-3 flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] opacity-50 transition-opacity hover:opacity-80"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showParaVoce ? 'rotate-180' : ''}`} />
              <Tags className="h-3.5 w-3.5" />
              Para você
            </button>

            {showParaVoce ? (
              <div className="stack-lg">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                      Quem indicou
                    </label>
                    <input
                      type="text"
                      value={form.quemIndicou}
                      onChange={event => setForm(prev => ({ ...prev, quemIndicou: event.target.value }))}
                      placeholder="Ex: podcast X, amiga Y..."
                      className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                    />
                  </div>

                  {selectedTypeConfig.isBookish ? (
                    <div>
                      <label className="mb-2 block text-xs font-medium text-[var(--text-tertiary)]">
                        Potencial de conteúdo
                      </label>
                      <div className="flex gap-2">
                        {(['1', '2', '3'] as const).map(value => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setForm(prev => ({
                              ...prev,
                              potencialConteudo: prev.potencialConteudo === value ? '' : value,
                            }))}
                            className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${
                              form.potencialConteudo === value
                                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                                : 'border-[var(--border-strong)] opacity-50 hover:opacity-80'
                            }`}
                          >
                            {value}/3
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--text-tertiary)]">
                    {selectedTypeConfig.isBookish ? 'Por que quer consumir' : 'Observação pessoal'}
                  </label>
                  <textarea
                    value={form.motivoEscolha}
                    onChange={event => setForm(prev => ({ ...prev, motivoEscolha: event.target.value }))}
                    placeholder={selectedTypeConfig.isBookish ? 'Motivação, contexto...' : 'Contexto, motivo da escolha...'}
                    rows={selectedTypeConfig.isBookish ? 3 : 2}
                    className="w-full resize-none rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </OverlayBody>

        <OverlayFooter className="pb-safe">
          <button
            type="button"
            onClick={() => setModalAberto(false)}
            className="flex-1 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-hover)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCriarLivro}
            disabled={!form.titulo.trim()}
            className="hover-action flex-1 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--text-primary)] py-3 text-xs font-semibold  text-[var(--bg-primary)] shadow-none transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            Criar item
          </button>
        </OverlayFooter>
      </BottomSheetModal>
    </PageLayout>
  );
}
