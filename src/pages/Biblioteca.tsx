import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Plus, BookOpen, Film, Tv, X, Star } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BibliotecaItem, BibliotecaItemMeta } from '../lib/database';
import { generateUUID } from '../utils/uuid';
import { BottomSheetModal } from '../components/modals/BottomSheetModal';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { AppButton } from '../components/common/AppButton';
import { FilterBar } from '../components/common/FilterBar';

type StatusLeitura = BibliotecaItem['status'];
type GeneroLivro = string;
type BibliotecaTipo = BibliotecaItem['tipo'];

const STATUS_CORES: Record<string, string> = {
  'Quero consumir': 'bg-[var(--text-primary)]/5 text-[var(--text-primary)]/50',
  'Consumindo': 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  'Pausado': 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
  'Concluído': 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
};

const GENEROS: GeneroLivro[] = [
  'Fantasy', 'Dark Romance', 'Ficção Científica', 'Clássico',
  'Não-ficção', 'Romance', 'Thriller', 'Horror', 'Outro',
];

const STATUS_LEITURA: StatusLeitura[] = ['Quero consumir', 'Consumindo', 'Pausado', 'Concluído'];

interface NovoLivroForm {
  tipo: BibliotecaTipo;
  titulo: string;
  autor: string;
  generos: GeneroLivro[];
  capaUrl: string;
  statusLeitura: StatusLeitura;
  editora: string;
  anoPublicacao: string;
  isbn: string;
  idioma: string;
  traducao: string;
  serieColecao: string;
  quemIndicou: string;
  motivoEscolha: string;
  potencialConteudo: '' | '1' | '2' | '3';
}

export function Biblioteca() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const [filtroTipo, setFiltroTipo] = useState<BibliotecaTipo | 'Todos'>('Todos');
  const [filtroStatus, setFiltroStatus] = useState<StatusLeitura | 'Todos'>('Todos');
  const [filtroGenero, setFiltroGenero] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('recentes');
  const [modalAberto, setModalAberto] = useState(false);
  const [showTechnical, setShowTechnical] = useState(false);
  const [showParaVoce, setShowParaVoce] = useState(false);

  const [form, setForm] = useState<NovoLivroForm>({
    tipo: 'livro',
    titulo: '',
    autor: '',
    generos: [],
    capaUrl: '',
    statusLeitura: 'Quero consumir',
    editora: '',
    anoPublicacao: '',
    isbn: '',
    idioma: '',
    traducao: '',
    serieColecao: '',
    quemIndicou: '',
    motivoEscolha: '',
    potencialConteudo: '',
  });

  const livrosFiltrados = [...state.books]
    .filter(b => {
      if (filtroTipo !== 'Todos' && b.tipo !== filtroTipo) return false;
      if (filtroStatus !== 'Todos' && b.status !== filtroStatus) return false;
      if (filtroGenero !== 'Todos' && !b.generoIds.includes(filtroGenero)) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const haystacks = [b.titulo, b.autorDiretor, ...b.generoIds].filter(Boolean);
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

  const contarConteudos = (livroId: string) =>
    state.contents.filter(c => c.bibliotecaItemId === livroId).length;

  const getTipoLabel = (tipo: BibliotecaTipo) => {
    if (tipo === 'filme') return 'Filme';
    if (tipo === 'série') return 'Série';
    return 'Livro';
  };

  const getPrimaryCreatorLabel = (tipo: BibliotecaTipo) => {
    if (tipo === 'filme') return 'Diretor';
    if (tipo === 'série') return 'Criador(a)';
    return 'Autor';
  };

  const getTipoIcon = (tipo: BibliotecaTipo) => {
    if (tipo === 'filme') return Film;
    if (tipo === 'série') return Tv;
    return BookOpen;
  };

  const getItemCountLabel = (tipo: BibliotecaTipo, total: number) => {
    const singular = getTipoLabel(tipo).toLowerCase();
    if (total === 1) return `1 ${singular}`;
    if (tipo === 'série') return `${total} séries`;
    if (tipo === 'filme') return `${total} filmes`;
    return `${total} livros`;
  };

  const totalItensLabel = `${state.books.length} item${state.books.length === 1 ? '' : 's'} catalogado${state.books.length === 1 ? '' : 's'}`;

  const handleCriarLivro = () => {
    if (!form.titulo.trim()) return;

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
      avaliacao: null,
      notasGerais: null,
      potencialConteudo: form.potencialConteudo ? Number(form.potencialConteudo) : null,
      totalPaginas: null,
      paginasLidas: null,
      anotacoes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    };

    dispatch({ type: 'ADD_BOOK', payload: novoLivro });
    const metadata: BibliotecaItemMeta = {
      editora: form.editora,
      anoPublicacao: form.anoPublicacao,
      isbn: form.isbn,
      idioma: form.idioma,
      traducao: form.traducao,
      serieColecao: form.serieColecao,
      quemIndicou: form.quemIndicou,
      motivoEscolha: form.motivoEscolha,
    };
    if (Object.values(metadata).some(value => value)) {
      dispatch({
        type: 'SET_PREFERENCE',
        payload: { key: `item_meta:${novoLivro.id}`, value: metadata },
      });
    }
    setModalAberto(false);
    setForm({ tipo: 'livro', titulo: '', autor: '', generos: [], capaUrl: '', statusLeitura: 'Quero consumir', editora: '', anoPublicacao: '', isbn: '', idioma: '', traducao: '', serieColecao: '', quemIndicou: '', motivoEscolha: '', potencialConteudo: '' });
    setShowTechnical(false);
    setShowParaVoce(false);
    navigate(`/biblioteca/${novoLivro.id}`);
  };

  const toggleGeneroForm = (g: GeneroLivro) => {
    setForm(prev => ({
      ...prev,
      generos: prev.generos.includes(g)
        ? prev.generos.filter(x => x !== g)
        : [...prev.generos, g],
    }));
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <header className="desktop-header-sticky transition-colors duration-300">
        <div className="desktop-header-frame">
          <DesktopPageHeader
            section="Biblioteca"
            title="Biblioteca"
            subtitle={`Organize livros, filmes e séries em um único acervo de referência. ${totalItensLabel}`}
            icon={BookOpen}
            className="mb-0"
            actions={(
              <AppButton
                onClick={() => setModalAberto(true)}
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                className="text-xs uppercase tracking-widest shrink-0"
              >
                Adicionar item
              </AppButton>
            )}
          />
        </div>
      </header>

      <div className="desktop-content-frame-wide">
        <FilterBar
          className="mb-6"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Buscar por título, autor, diretor ou criador"
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
              ],
            },
            {
              id: 'status',
              label: 'Status',
              value: filtroStatus,
              onChange: value => setFiltroStatus(value as StatusLeitura | 'Todos'),
              options: [
                { label: 'Status', value: 'Todos' },
                ...STATUS_LEITURA.map(status => ({ label: status, value: status })),
              ],
            },
            {
              id: 'genero',
              label: 'Gênero',
              value: filtroGenero,
              onChange: setFiltroGenero,
              options: [
                { label: 'Gênero', value: 'Todos' },
                ...GENEROS.map(genero => ({ label: genero, value: genero })),
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


        {/* KPIs rápidos */}
        {state.books.length > 0 && (
          <div className="flex gap-6 flex-wrap mb-6">
            {[
              { emoji: '📚', label: 'concluídos', value: state.books.filter(b => b.status === 'Concluído').length },
              { emoji: '📖', label: 'consumindo', value: state.books.filter(b => b.status === 'Consumindo').length },
              { emoji: '🎬', label: 'conteúdos gerados', value: state.contents.filter(c => c.bibliotecaItemId).length },
              { emoji: '💡', label: 'anotações', value: state.books.reduce((acc, b) => acc + b.anotacoes.length, 0) },
            ].map(stat => (
              <div key={stat.label} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                <span className="text-base">{stat.emoji}</span>
                <span className="text-xs font-black text-[var(--text-primary)]">{stat.value}</span>
                <span className="text-[10px] text-[var(--text-secondary)]">{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Grid de Itens */}
        {livrosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <BookOpen className="w-12 h-12 text-[var(--text-primary)] opacity-10" />
            <p className="text-[var(--text-tertiary)] font-bold text-sm uppercase tracking-widest">
              {state.books.length === 0
                ? 'Nenhum item ainda. Adicione o primeiro!'
                : 'Nenhum item com esses filtros'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {livrosFiltrados.map((livro) => {
              const nConteudos = contarConteudos(livro.id);
              const TipoIcon = getTipoIcon(livro.tipo);
              return (
                <motion.div
                  key={livro.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/biblioteca/${livro.id}`)}
                  className="cursor-pointer group flex flex-col"
                >
                  {/* Capa */}
                  <div className="relative aspect-[0.74] rounded-xl overflow-hidden bg-[var(--bg-hover)] mb-2.5 elevation-1 group-hover:elevation-2 hover-card transition-all">
                    {livro.capaUrl ? (
                      <img
                        src={livro.capaUrl}
                        alt={livro.titulo}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-2">
                        <TipoIcon className="w-8 h-8 text-[var(--text-tertiary)]" />
                        <span className="text-[9px] font-bold text-[var(--text-tertiary)] text-center leading-tight">
                          {livro.titulo}
                        </span>
                      </div>
                    )}

                    {/* Badge de status */}
                    <div className="absolute bottom-2 left-2 flex flex-col gap-1">
                      <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-sm">
                        {getTipoLabel(livro.tipo)}
                      </span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${STATUS_CORES[livro.status] || ''}`}>
                        {livro.status}
                      </span>
                    </div>

                    {/* Contador de conteúdos */}
                    {nConteudos > 0 && (
                      <div className="absolute top-2 right-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                        {nConteudos}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div>
                    <p className="text-[11px] font-bold text-[var(--text-primary)] leading-tight line-clamp-2 mb-0.5">
                      {livro.titulo}
                    </p>
                    <p className="text-[9px] text-[var(--text-secondary)] truncate">
                      {livro.autorDiretor}
                    </p>
                    {livro.avaliacao && (
                      <div className="flex gap-0.5 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-2.5 h-2.5 ${i < livro.avaliacao! ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--border-strong)]'}`}
                          />
                        ))}
                      </div>
                    )}
                    {livro.status === 'Quero consumir' && livro.potencialConteudo && (
                      <div className="mt-1 text-[10px]">
                        {'🔥'.repeat(livro.potencialConteudo)}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Novo Item */}
      <BottomSheetModal open={modalAberto} onClose={() => setModalAberto(false)} desktopMaxW="max-w-[520px]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-color)] shrink-0">
          <h2 className="text-lg font-black text-[var(--text-primary)]">Adicionar Item</h2>
          <button onClick={() => setModalAberto(false)} className="p-2 hover:bg-[var(--bg-hover)] rounded-full">
            <X className="w-5 h-5 text-[var(--text-tertiary)]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* ── Essencial ── */}
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Essencial</p>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1.5">
              Tipo
            </label>
            <select
              value={form.tipo}
              onChange={e => setForm(p => ({ ...p, tipo: e.target.value as BibliotecaTipo }))}
              className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--text-primary)]/20 text-[var(--text-primary)]"
            >
              <option value="livro">Livro</option>
              <option value="filme">Filme</option>
              <option value="série">Série</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1.5">
              Título *
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
              placeholder={form.tipo === 'filme' ? 'Nome do filme' : form.tipo === 'série' ? 'Nome da série' : 'Nome do livro'}
              autoFocus
              className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--text-primary)]/20 text-[var(--text-primary)] placeholder:opacity-40"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1.5">
              {getPrimaryCreatorLabel(form.tipo)}
            </label>
            <input
              type="text"
              value={form.autor}
              onChange={e => setForm(p => ({ ...p, autor: e.target.value }))}
              placeholder={form.tipo === 'filme' ? 'Nome do diretor' : form.tipo === 'série' ? 'Nome do criador(a)' : 'Nome do autor'}
              className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--text-primary)]/20 text-[var(--text-primary)] placeholder:opacity-40"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1.5">
              URL da Capa (opcional)
            </label>
            <input
              type="url"
              value={form.capaUrl}
              onChange={e => setForm(p => ({ ...p, capaUrl: e.target.value }))}
              placeholder="https://..."
              className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--text-primary)]/20 text-[var(--text-primary)] placeholder:opacity-40"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-2">
              Gêneros
            </label>
            <div className="flex flex-wrap gap-2">
              {GENEROS.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGeneroForm(g)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                    form.generos.includes(g)
                      ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)] border-[var(--text-primary)]'
                      : 'bg-transparent text-[var(--text-primary)] border-[var(--border-strong)] opacity-50 hover:opacity-80'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1.5">
              Status de Consumo
            </label>
            <select
              value={form.statusLeitura}
              onChange={e => setForm(p => ({ ...p, statusLeitura: e.target.value as StatusLeitura }))}
              className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--text-primary)]/20 text-[var(--text-primary)]"
            >
              {STATUS_LEITURA.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* ── Detalhes Técnicos (colapsável) ── */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setShowTechnical(v => !v)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 hover:opacity-80 transition-opacity mb-3"
            >
              <span>{showTechnical ? '▴' : '▾'}</span>
              Detalhes Técnicos
            </button>
            {showTechnical && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">{form.tipo === 'livro' ? 'Editora' : form.tipo === 'filme' ? 'Estúdio / Distribuidora' : 'Plataforma / Estúdio'}</label>
                    <input type="text" value={form.editora} onChange={e => setForm(p => ({ ...p, editora: e.target.value }))} placeholder={form.tipo === 'livro' ? 'Ex: Rocco' : form.tipo === 'filme' ? 'Ex: Warner Bros.' : 'Ex: Netflix'} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">Ano</label>
                    <input type="number" value={form.anoPublicacao} onChange={e => setForm(p => ({ ...p, anoPublicacao: e.target.value }))} placeholder="2024" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40" />
                  </div>
                </div>
                {form.tipo === 'livro' && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">ISBN</label>
                    <input type="text" value={form.isbn} onChange={e => setForm(p => ({ ...p, isbn: e.target.value }))} placeholder="978-..." className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">Idioma</label>
                    <input type="text" value={form.idioma} onChange={e => setForm(p => ({ ...p, idioma: e.target.value }))} placeholder="Português" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">Tradução</label>
                    <input type="text" value={form.traducao} onChange={e => setForm(p => ({ ...p, traducao: e.target.value }))} placeholder="Tradutor" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">{form.tipo === 'livro' ? 'Série / Coleção' : form.tipo === 'filme' ? 'Franquia / Universo' : 'Saga / Universo'}</label>
                  <input type="text" value={form.serieColecao} onChange={e => setForm(p => ({ ...p, serieColecao: e.target.value }))} placeholder={form.tipo === 'livro' ? 'Ex: Série Trono de Vidro' : form.tipo === 'filme' ? 'Ex: Duna' : 'Ex: Bridgerton'} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40" />
                </div>
              </div>
            )}
          </div>

          {/* ── Para você (colapsável) ── */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setShowParaVoce(v => !v)}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 hover:opacity-80 transition-opacity mb-3"
            >
              <span>{showParaVoce ? '▴' : '▾'}</span>
              Para você
            </button>
            {showParaVoce && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">Quem Indicou</label>
                  <input type="text" value={form.quemIndicou} onChange={e => setForm(p => ({ ...p, quemIndicou: e.target.value }))} placeholder="Ex: Podcast X, amiga Y..." className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">Por que Quer Ler</label>
                  <textarea value={form.motivoEscolha} onChange={e => setForm(p => ({ ...p, motivoEscolha: e.target.value }))} placeholder="Motivação, contexto..." rows={2} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] resize-none placeholder:opacity-40" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-2">Potencial de Conteúdo</label>
                  <div className="flex gap-2">
                    {(['1', '2', '3'] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, potencialConteudo: p.potencialConteudo === v ? '' : v }))}
                        className={`text-base px-3 py-1.5 rounded-xl border transition-all ${form.potencialConteudo === v ? 'bg-[var(--text-primary)] border-[var(--text-primary)]' : 'border-[var(--border-strong)] opacity-50 hover:opacity-80'}`}
                      >
                        {'🔥'.repeat(Number(v))}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-[var(--border-color)] shrink-0 pb-safe">
          <button
            onClick={() => setModalAberto(false)}
            className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--bg-hover)] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleCriarLivro}
            disabled={!form.titulo.trim()}
            className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-[var(--text-primary)] text-[var(--bg-primary)] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed hover-action"
          >
            Criar Item
          </button>
        </div>
      </BottomSheetModal>
    </div>
  );
}
