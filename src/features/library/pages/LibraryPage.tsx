import { KeyboardEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Clapperboard, Film, LucideIcon, Pin, Plus, Star, Tags, Tv, X } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { BibliotecaItem, BibliotecaItemMeta } from '../../../lib/database';
import { generateUUID } from '../../../utils/uuid';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { FilterBar } from '../../../components/ui/FilterBar';
import { LibraryAnalyticsTab } from '../components/LibraryAnalyticsTab';

type StatusLeitura = BibliotecaItem['status'];
type GeneroLivro = string;
type BibliotecaTipo = BibliotecaItem['tipo'];
type LibraryTab = 'acervo' | 'analises';

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
  generoInput: string;
  capaUrl: string;
  statusLeitura: StatusLeitura;
  tagsPersonalizadas: string[];
  tagInput: string;
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
  generoInput: '',
  capaUrl: '',
  statusLeitura: STATUS_BY_TYPE.livro[0],
  tagsPersonalizadas: [],
  tagInput: '',
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

function normalizeToken(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function appendUniqueToken(list: string[], rawValue: string) {
  const value = normalizeToken(rawValue);
  if (!value) return list;
  if (list.some(item => item.toLowerCase() === value.toLowerCase())) return list;
  return [...list, value];
}

function removeToken(list: string[], value: string) {
  return list.filter(item => item !== value);
}

function isWishlistStatus(status: StatusLeitura) {
  return status === 'Quero consumir' || status === 'Quero ler' || status === 'Quero ver';
}

function ChipField({
  label,
  values,
  inputValue,
  placeholder,
  suggestions,
  onInputChange,
  onAddValue,
  onRemoveValue,
}: {
  label: string;
  values: string[];
  inputValue: string;
  placeholder: string;
  suggestions?: string[];
  onInputChange: (value: string) => void;
  onAddValue: (value: string) => void;
  onRemoveValue: (value: string) => void;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (!inputValue.trim()) return;
      onAddValue(inputValue);
      onInputChange('');
    }
  };

  const handleBlur = () => {
    if (!inputValue.trim()) return;
    onAddValue(inputValue);
    onInputChange('');
  };

  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
        {label}
      </label>
      <div className="rounded-2xl bg-[var(--bg-hover)] p-3">
        <div className="flex flex-wrap gap-2">
          {values.map(value => (
            <span
              key={value}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-primary)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-primary)]"
            >
              {value}
              <button
                type="button"
                onClick={() => onRemoveValue(value)}
                className="rounded-full p-0.5 text-[var(--text-tertiary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                aria-label={`Remover ${value}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={inputValue}
            onChange={event => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            className="min-w-[180px] flex-1 border-none bg-transparent px-1 py-1 text-sm text-[var(--text-primary)] placeholder:opacity-40 focus:ring-0"
          />
        </div>

        {suggestions && suggestions.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestions.map(suggestion => {
              const selected = values.some(value => value.toLowerCase() === suggestion.toLowerCase());

              return (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onAddValue(suggestion)}
                  disabled={selected}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-all ${
                    selected
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : 'border-[var(--border-strong)] text-[var(--text-primary)] opacity-60 hover:opacity-100'
                  }`}
                >
                  {suggestion}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LibraryPage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<LibraryTab>('acervo');
  const [filtroTipo, setFiltroTipo] = useState<BibliotecaTipo | 'Todos'>('Todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusLeitura | 'Todos'>('Todos');
  const [filtroGenero, setFiltroGenero] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('recentes');
  const [modalAberto, setModalAberto] = useState(false);
  const [showParaVoce, setShowParaVoce] = useState(false);
  const [form, setForm] = useState<NovoLivroForm>(INITIAL_FORM);

  const selectedTypeConfig = TYPE_CONFIG[form.tipo];
  const selectedStatusOptions = STATUS_BY_TYPE[form.tipo];
  const mobilePrimaryBookId = typeof state.preferences.mobile_notes_primary_book_id === 'string'
    ? state.preferences.mobile_notes_primary_book_id
    : null;

  const availableGenreFilters = useMemo(() => {
    return Array.from(
      new Set([
        ...GENEROS_SUGERIDOS,
        ...state.books.flatMap(item => item.generoIds),
      ])
    ).sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }, [state.books]);

  const livrosFiltrados = useMemo(() => {
    return [...state.books]
      .filter(item => {
        if (filtroTipo !== 'Todos' && item.tipo !== filtroTipo) return false;
        if (filtroStatus !== 'Todos' && item.status !== filtroStatus) return false;
        if (filtroGenero !== 'Todos' && !item.generoIds.includes(filtroGenero)) return false;

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const metadata = (state.preferences[`item_meta:${item.id}`] || {}) as BibliotecaItemMeta;
          const haystacks = [
            item.titulo,
            item.autorDiretor,
            ...item.generoIds,
            ...(metadata.tagsPersonalizadas || []),
          ].filter(Boolean);

          if (!haystacks.some(value => value.toLowerCase().includes(term))) return false;
        }

        return true;
      })
      .sort((left, right) => {
        switch (sortValue) {
          case 'titulo:asc':
            return left.titulo.localeCompare(right.titulo, 'pt-BR');
          case 'autor:asc':
            return left.autorDiretor.localeCompare(right.autorDiretor, 'pt-BR');
          case 'status:asc':
            return left.status.localeCompare(right.status, 'pt-BR');
          case 'recentes':
          default:
            return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        }
      });
  }, [filtroGenero, filtroStatus, filtroTipo, searchTerm, sortValue, state.books, state.preferences]);

  const totalsByType = useMemo(() => {
    return state.books.reduce<Record<string, number>>((acc, item) => {
      const label = TYPE_CONFIG[item.tipo]?.label ?? TYPE_CONFIG.outro.label;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {});
  }, [state.books]);

  const totalItensLabel = `${state.books.length} item${state.books.length === 1 ? '' : 's'} catalogado${state.books.length === 1 ? '' : 's'}`;

  const contarConteudos = (livroId: string) =>
    state.contents.filter(content => content.bibliotecaItemId === livroId).length;

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setShowParaVoce(false);
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

  const updateGenreList = (value: string) => {
    setForm(prev => ({
      ...prev,
      generos: appendUniqueToken(prev.generos, value),
    }));
  };

  const updateTagList = (value: string) => {
    setForm(prev => ({
      ...prev,
      tagsPersonalizadas: appendUniqueToken(prev.tagsPersonalizadas, value),
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

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <header className="desktop-header-sticky transition-colors duration-300">
        <div className="desktop-header-frame">
          <DesktopPageHeader
            section="Biblioteca"
            title="Biblioteca"
            subtitle={`Organize livros, filmes, séries, animes e mangás em um único acervo de referência. ${totalItensLabel}`}
            icon={BookOpen}
            className="mb-0"
            actions={(
              <AppButton
                onClick={handleOpenModal}
                variant="primary"
                size="md"
                leftIcon={<Plus className="h-4 w-4" />}
                className="shrink-0 text-xs uppercase tracking-widest"
              >
                Adicionar item
              </AppButton>
            )}
          />
        </div>
      </header>

      <div className="desktop-content-frame-wide">
        <div className="mb-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                Superfícies
              </p>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                O acervo fica focado em navegação e cadastro. As leituras agregadas agora vivem em uma aba separada.
              </p>
            </div>

            <div className="flex gap-2 rounded-full bg-[var(--bg-secondary)] p-1">
              {([
                { key: 'acervo', label: 'Acervo' },
                { key: 'analises', label: 'Análises' },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.2em] transition-all ${
                    activeTab === tab.key
                      ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(totalsByType).map(([label, total]) => (
              <span
                key={label}
                className="rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]"
              >
                {label}: {total}
              </span>
            ))}
          </div>
        </div>

        {activeTab === 'analises' ? (
          <LibraryAnalyticsTab items={state.books} contents={state.contents} />
        ) : (
          <>
            <FilterBar
              className="mb-6"
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por título, autoria, direção, gênero ou tag"
              filters={[
                {
                  id: 'tipo',
                  label: 'Tipo',
                  value: filtroTipo,
                  onChange: value => setFiltroTipo(value as BibliotecaTipo | 'Todos'),
                  options: [
                    { label: 'Tipo', value: 'Todos' },
                    { label: 'Livro', value: 'livro' },
                    { label: 'Filme', value: 'filme' },
                    { label: 'Série', value: 'série' },
                    { label: 'Anime', value: 'anime' },
                    { label: 'Mangá', value: 'manga' },
                  ],
                },
                {
                  id: 'status',
                  label: 'Status',
                  value: filtroStatus,
                  onChange: value => setFiltroStatus(value as StatusLeitura | 'Todos'),
                  options: [
                    { label: 'Status', value: 'Todos' },
                    ...STATUS_OPTIONS.map(status => ({ label: status, value: status })),
                  ],
                },
                {
                  id: 'genero',
                  label: 'Gênero',
                  value: filtroGenero,
                  onChange: setFiltroGenero,
                  options: [
                    { label: 'Gênero', value: 'Todos' },
                    ...availableGenreFilters.map(genero => ({ label: genero, value: genero })),
                  ],
                },
              ]}
              sortValue={sortValue}
              onSortChange={setSortValue}
              sortOptions={[
                { label: 'Recentes', value: 'recentes' },
                { label: 'Título A-Z', value: 'titulo:asc' },
                { label: 'Autor A-Z', value: 'autor:asc' },
                { label: 'Status A-Z', value: 'status:asc' },
              ]}
            />

            {livrosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
                <BookOpen className="h-12 w-12 text-[var(--text-primary)] opacity-10" />
                <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                  {state.books.length === 0
                    ? 'Nenhum item ainda. Adicione o primeiro.'
                    : 'Nenhum item com esses filtros'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
                {livrosFiltrados.map(livro => {
                  const conteudosCount = contarConteudos(livro.id);
                  const TypeIcon = TYPE_CONFIG[livro.tipo]?.icon ?? BookOpen;
                  const typeLabel = TYPE_CONFIG[livro.tipo]?.label ?? TYPE_CONFIG.outro.label;
                  const metadata = (state.preferences[`item_meta:${livro.id}`] || {}) as BibliotecaItemMeta;
                  const isPrimaryMobileBook = mobilePrimaryBookId === livro.id;

                  return (
                    <motion.div
                      key={livro.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => navigate(`/biblioteca/${livro.id}`)}
                      className="group flex cursor-pointer flex-col"
                    >
                      <div className="relative mb-2.5 aspect-[0.74] overflow-hidden rounded-xl bg-[var(--bg-hover)] transition-all hover-card elevation-1 group-hover:elevation-2">
                        {livro.capaUrl ? (
                          <img
                            src={livro.capaUrl}
                            alt={livro.titulo}
                            className="h-full w-full object-cover"
                            onError={event => {
                              (event.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
                            <TypeIcon className="h-8 w-8 text-[var(--text-tertiary)]" />
                            <span className="text-center text-[9px] font-bold leading-tight text-[var(--text-tertiary)]">
                              {livro.titulo}
                            </span>
                          </div>
                        )}

                        <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                          <span className="rounded-full bg-black/60 px-2 py-0.5 text-[7px] font-black text-white backdrop-blur-sm">
                            {typeLabel}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${STATUS_CORES[livro.status] || ''}`}>
                            {livro.status}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={event => {
                            event.stopPropagation();
                            handleSetPrimaryMobileBook(livro.id);
                          }}
                          className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[0.15em] backdrop-blur-sm transition-all ${
                            isPrimaryMobileBook
                              ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                              : 'bg-black/60 text-white hover:bg-black/80'
                          }`}
                          aria-label={isPrimaryMobileBook ? 'Remover como principal no mobile' : 'Definir como principal no mobile'}
                        >
                          <Pin className="h-3 w-3" />
                          {isPrimaryMobileBook ? 'Principal' : 'No + mobile'}
                        </button>

                        {conteudosCount > 0 ? (
                          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--text-primary)] text-[9px] font-black text-[var(--bg-primary)]">
                            {conteudosCount}
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <p className="mb-0.5 line-clamp-2 text-[11px] font-bold leading-tight text-[var(--text-primary)]">
                          {livro.titulo}
                        </p>
                        <p className="truncate text-[9px] text-[var(--text-secondary)]">
                          {livro.autorDiretor}
                        </p>
                        {livro.avaliacao ? (
                          <div className="mt-1 flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star
                                key={index}
                                className={`h-2.5 w-2.5 ${index < livro.avaliacao! ? 'fill-yellow-400 text-yellow-400' : 'text-[var(--border-strong)]'}`}
                              />
                            ))}
                          </div>
                        ) : null}
                        {isWishlistStatus(livro.status) && livro.potencialConteudo ? (
                          <div className="mt-1 text-[10px] text-[var(--text-secondary)]">
                            Potencial {livro.potencialConteudo}/3
                          </div>
                        ) : null}
                        {metadata.tagsPersonalizadas?.length ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {metadata.tagsPersonalizadas.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[8px] font-bold text-[var(--text-secondary)]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <BottomSheetModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        desktopMaxW="max-w-[720px]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-color)] px-6 py-5">
          <div>
            <h2 className="text-lg font-black text-[var(--text-primary)]">Novo item da biblioteca</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              O formulário muda conforme o tipo escolhido.
            </p>
          </div>
          <button type="button" onClick={() => setModalAberto(false)} className="rounded-full p-2 hover:bg-[var(--bg-hover)]">
            <X className="h-5 w-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div>
            <p className="mb-3 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
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
                      className={`flex flex-col items-center gap-2 rounded-2xl border px-4 py-4 text-center transition-all ${
                        active
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg'
                          : 'border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-primary)] hover:border-[var(--text-primary)]/40'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                        {config.label}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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

          <ChipField
            label="Gêneros"
            values={form.generos}
            inputValue={form.generoInput}
            placeholder="Digite e aperte Enter"
            suggestions={GENEROS_SUGERIDOS}
            onInputChange={value => setForm(prev => ({ ...prev, generoInput: value }))}
            onAddValue={updateGenreList}
            onRemoveValue={value => setForm(prev => ({ ...prev, generos: removeToken(prev.generos, value) }))}
          />

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
              Status
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedStatusOptions.map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, statusLeitura: status }))}
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
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

          <ChipField
            label="Tags personalizadas"
            values={form.tagsPersonalizadas}
            inputValue={form.tagInput}
            placeholder="Ex: comfort read, favorito de infância..."
            onInputChange={value => setForm(prev => ({ ...prev, tagInput: value }))}
            onAddValue={updateTagList}
            onRemoveValue={value => setForm(prev => ({ ...prev, tagsPersonalizadas: removeToken(prev.tagsPersonalizadas, value) }))}
          />

          {selectedTypeConfig.isBookish ? (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">
                Detalhes técnicos
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Para livros e mangás, os detalhes técnicos ficam no painel <strong>Info</strong> dentro do item.
              </p>
            </div>
          ) : null}

          {form.tipo === 'filme' ? (
            <div className="space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">
                Dados do filme
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                    Faz parte de uma série?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['nao', 'sim'] as const).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, fazParteDeSerie: value, nomeDaSerie: value === 'nao' ? '' : prev.nomeDaSerie }))}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
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
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
            <div className="space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">
                Dados {form.tipo === 'anime' ? 'do anime' : 'da série'}
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                    Faz parte de uma franquia?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['nao', 'sim'] as const).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, fazParteDeSerie: value, nomeDaSerie: value === 'nao' ? '' : prev.nomeDaSerie }))}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${
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
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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

          {selectedTypeConfig.isBookish ? (
            <div className="space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">
                Para você
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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

                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
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
                        className={`rounded-xl border px-3 py-2 text-sm font-black transition-all ${
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
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                  Por que quer consumir
                </label>
                <textarea
                  value={form.motivoEscolha}
                  onChange={event => setForm(prev => ({ ...prev, motivoEscolha: event.target.value }))}
                  placeholder="Motivação, contexto..."
                  rows={3}
                  className="w-full resize-none rounded-xl border-none bg-[var(--bg-hover)] px-4 py-3 text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>
          ) : (
            <div className="border-t border-[var(--border-color)] pt-2">
              <button
                type="button"
                onClick={() => setShowParaVoce(value => !value)}
                className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 transition-opacity hover:opacity-80"
              >
                <Tags className="h-3.5 w-3.5" />
                Para você
              </button>

              {showParaVoce ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                      Quem indicou
                    </label>
                    <input
                      type="text"
                      value={form.quemIndicou}
                      onChange={event => setForm(prev => ({ ...prev, quemIndicou: event.target.value }))}
                      placeholder="Ex: newsletter, crítica, amiga..."
                      className="w-full rounded-xl border-none bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                      Observação pessoal
                    </label>
                    <textarea
                      value={form.motivoEscolha}
                      onChange={event => setForm(prev => ({ ...prev, motivoEscolha: event.target.value }))}
                      rows={2}
                      placeholder="Contexto, motivo da escolha..."
                      className="w-full resize-none rounded-xl border-none bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-[var(--border-color)] px-6 py-4 pb-safe">
          <button
            type="button"
            onClick={() => setModalAberto(false)}
            className="flex-1 rounded-2xl border border-[var(--border-color)] py-3 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-hover)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCriarLivro}
            disabled={!form.titulo.trim()}
            className="hover-action flex-1 rounded-2xl bg-[var(--text-primary)] py-3 text-xs font-black uppercase tracking-widest text-[var(--bg-primary)] shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-40"
          >
            Criar item
          </button>
        </div>
      </BottomSheetModal>
    </div>
  );
}
