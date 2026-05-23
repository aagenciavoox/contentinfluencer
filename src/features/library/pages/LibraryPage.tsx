import { KeyboardEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Clapperboard, Film, LucideIcon, Plus, Tags, Tv, X } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { BibliotecaItem, BibliotecaItemMeta, Idea } from '../../../lib/database';
import { generateUUID } from '../../../utils/uuid';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { PageScaffold } from '../../../layouts/page/PageScaffold';
import { PipelineActionBar } from '../../../components/pipeline/PipelineActionBar';
import { LibraryMobileScreen } from '../../../mobile/screens/library/LibraryMobileScreen';
import { LibraryAnalyticsTab } from '../components/LibraryAnalyticsTab';
import { LibraryItemCard } from '../components/LibraryItemCard';
import { LibraryToolbar } from '../components/LibraryToolbar';
import { COMPLETED_STATUS_BY_TYPE } from '../lib/libraryStatus';

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
  const isMobile = useIsMobile();

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

  const contarConteudos = (livroId: string) =>
    state.contents.filter(content => content.bibliotecaItemId === livroId).length;

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
    const ideia: Idea = {
      id: generateUUID(),
      userId: '',
      text: item.notasGerais?.trim()
        || `Conteúdo sobre "${item.titulo}"${item.autorDiretor ? ` — ${item.autorDiretor}` : ''}`,
      pilarId: null,
      seriesId: null,
      origemId: item.id,
      promotedToContentId: null,
      archived: false,
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_IDEA', payload: ideia });
  };

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

  const getItemMeta = (itemId: string) =>
    ((state.preferences[`item_meta:${itemId}`] || {}) as BibliotecaItemMeta);

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <LibraryMobileScreen
            items={state.books}
            mobilePrimaryBookId={mobilePrimaryBookId}
            getItemMeta={getItemMeta}
            countContents={contarConteudos}
            onOpenItem={(itemId) => navigate(`/biblioteca/${itemId}`)}
            onOpenCreate={handleOpenModal}
            onTogglePrimary={handleSetPrimaryMobileBook}
          />
        </div>

        <BottomSheetModal
          open={modalAberto}
          onClose={() => setModalAberto(false)}
          desktopMaxW="max-w-xl"
          zIndex="z-[110]"
        >
          <div className="flex h-full flex-col bg-[var(--bg-primary)]">
            <div className="border-b border-[var(--border-color)] px-5 py-4">
              <p className="t-section-title text-[var(--text-primary)]">Novo item do acervo</p>
              <p className="t-secondary mt-1">Cadastro rapido para consulta e captura no mobile.</p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
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
                        className={`flex items-center justify-center gap-2 rounded-[1.1rem] border px-3 py-3 text-[11px] font-black uppercase tracking-[0.14em] ${
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

              <label className="block space-y-2">
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

              <input
                type="text"
                value={form.generoInput}
                onChange={event => setForm(prev => ({ ...prev, generoInput: event.target.value }))}
                onBlur={() => {
                  if (!form.generoInput.trim()) return;
                  updateGenreList(form.generoInput);
                  setForm(prev => ({ ...prev, generoInput: '' }));
                }}
                placeholder="Genero principal"
                className="w-full"
              />

              <input
                type="text"
                value={form.tagInput}
                onChange={event => setForm(prev => ({ ...prev, tagInput: event.target.value }))}
                onBlur={() => {
                  if (!form.tagInput.trim()) return;
                  updateTagList(form.tagInput);
                  setForm(prev => ({ ...prev, tagInput: '' }));
                }}
                placeholder="Tag pessoal"
                className="w-full"
              />

              {form.generos.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {form.generos.map(genero => (
                    <span
                      key={genero}
                      className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]"
                    >
                      {genero}
                    </span>
                  ))}
                </div>
              ) : null}

              {form.tagsPersonalizadas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {form.tagsPersonalizadas.map(tag => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--accent-orange)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--accent-orange)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-[var(--border-color)] px-5 py-4 pb-safe">
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                className="flex-1 rounded-[1.25rem] border border-[var(--border-color)] py-3 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCriarLivro}
                disabled={!form.titulo.trim()}
                className="button-primary flex-1 disabled:opacity-40"
              >
                Criar item
              </button>
            </div>
          </div>
        </BottomSheetModal>
      </>
    );
  }

  return (
    <PageScaffold
      contentWidth="wide"
      contentClassName="pb-10 pt-2"
      toolbar={
        <LibraryToolbar
          activeTab={activeTab}
          onTabChange={setActiveTab}
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

      {activeTab !== 'analises' ? (
        <PipelineActionBar
          className="mb-4"
          title="Proximo passo do pipeline"
          description="Transforme um item da biblioteca em ideia editorial."
          primaryLabel="Transformar em ideia"
          onPrimary={() => {
            const first = livrosFiltrados[0];
            if (first) handleTurnIntoIdea(first);
          }}
          disabled={livrosFiltrados.length === 0}
        />
      ) : null}

      {activeTab === 'analises' ? (
        <LibraryAnalyticsTab items={state.books} contents={state.contents} />
      ) : livrosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <BookOpen className="h-10 w-10 text-[var(--text-primary)] opacity-10" />
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
            {state.books.length === 0
              ? 'Nenhum item ainda. Adicione o primeiro.'
              : 'Nenhum item com esses filtros'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
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
                onOpen={() => navigate(`/biblioteca/${livro.id}`)}
                onEdit={() => navigate(`/biblioteca/${livro.id}?tab=info`)}
                onMarkComplete={() => handleMarkComplete(livro)}
                onTurnIntoIdea={() => handleTurnIntoIdea(livro)}
                onTogglePrimary={() => handleSetPrimaryMobileBook(livro.id)}
              />
            );
          })}
        </div>
      )}

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
    </PageScaffold>
  );
}
