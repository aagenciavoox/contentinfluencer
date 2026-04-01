import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, BookOpen, X, Star } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Book, GeneroLivro, StatusLeitura } from '../types';

import { generateUUID } from '../utils/uuid';

const STATUS_CORES: Record<StatusLeitura, string> = {
  'Quero ler': 'bg-gray-100 text-gray-600',
  'Lendo': 'bg-blue-100 text-blue-700',
  'Pausado': 'bg-yellow-100 text-yellow-700',
  'Lido': 'bg-green-100 text-green-700',
};

const GENEROS: GeneroLivro[] = [
  'Fantasy', 'Dark Romance', 'Ficção Científica', 'Clássico',
  'Não-ficção', 'Romance', 'Thriller', 'Horror', 'Outro',
];

const STATUS_LEITURA: StatusLeitura[] = ['Quero ler', 'Lendo', 'Pausado', 'Lido'];

interface NovoLivroForm {
  titulo: string;
  autor: string;
  generos: GeneroLivro[];
  capaUrl: string;
  statusLeitura: StatusLeitura;
}

export function Biblioteca() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const [filtroStatus, setFiltroStatus] = useState<StatusLeitura | 'Todos'>('Todos');
  const [filtroGenero, setFiltroGenero] = useState<string>('Todos');
  const [modalAberto, setModalAberto] = useState(false);

  const [form, setForm] = useState<NovoLivroForm>({
    titulo: '',
    autor: '',
    generos: [],
    capaUrl: '',
    statusLeitura: 'Quero ler',
  });

  const livrosFiltrados = state.books.filter(b => {
    if (filtroStatus !== 'Todos' && b.statusLeitura !== filtroStatus) return false;
    if (filtroGenero !== 'Todos' && !b.generos.includes(filtroGenero as GeneroLivro)) return false;
    return true;
  });

  const contarConteudos = (livroId: string) =>
    state.contents.filter(c => c.livroOrigemId === livroId).length;

  const handleCriarLivro = () => {
    if (!form.titulo.trim()) return;

    const novoLivro: Book = {
      id: generateUUID(),
      titulo: form.titulo.trim(),
      autor: form.autor.trim(),
      generos: form.generos,
      capaUrl: form.capaUrl.trim() || undefined,
      statusLeitura: form.statusLeitura,
      anotacoes: [],
      createdAt: new Date().toISOString(),
    };

    dispatch({ type: 'ADD_BOOK', payload: novoLivro });
    setModalAberto(false);
    setForm({ titulo: '', autor: '', generos: [], capaUrl: '', statusLeitura: 'Quero ler' });
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
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-[9px] font-black text-[var(--text-primary)] opacity-30 uppercase tracking-[0.4em] mb-2 italic">
              Biblioteca
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] leading-none tracking-tight">
              Seus Livros
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 opacity-60">
              {state.books.length} livro{state.books.length !== 1 ? 's' : ''} catalogado{state.books.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 px-5 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.03] transition-all shadow-lg shrink-0"
          >
            <Plus className="w-4 h-4" />
            Adicionar Livro
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex gap-1.5 flex-wrap">
            {(['Todos', ...STATUS_LEITURA] as (StatusLeitura | 'Todos')[]).map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                  filtroStatus === s
                    ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)] border-[var(--text-primary)]'
                    : 'bg-transparent text-[var(--text-primary)] border-[var(--border-strong)] opacity-50 hover:opacity-80'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="w-px bg-[var(--border-color)]" />
          <div className="flex gap-1.5 flex-wrap">
            {(['Todos', ...GENEROS]).map(g => (
              <button
                key={g}
                onClick={() => setFiltroGenero(g)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                  filtroGenero === g
                    ? 'bg-[var(--accent-purple)] text-white border-[var(--accent-purple)]'
                    : 'bg-transparent text-[var(--text-primary)] border-[var(--border-strong)] opacity-40 hover:opacity-70'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Livros */}
        {livrosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <BookOpen className="w-12 h-12 text-[var(--text-primary)] opacity-10" />
            <p className="text-[var(--text-primary)] opacity-30 font-bold text-sm uppercase tracking-widest">
              {state.books.length === 0
                ? 'Nenhum livro ainda. Adicione o primeiro!'
                : 'Nenhum livro com esses filtros'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {livrosFiltrados.map((livro) => {
              const nConteudos = contarConteudos(livro.id);
              return (
                <motion.div
                  key={livro.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/biblioteca/${livro.id}`)}
                  className="cursor-pointer group"
                >
                  {/* Capa */}
                  <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[var(--bg-hover)] mb-3 shadow-md group-hover:shadow-xl transition-shadow">
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
                        <BookOpen className="w-8 h-8 text-[var(--text-primary)] opacity-20" />
                        <span className="text-[9px] font-bold text-[var(--text-primary)] opacity-30 text-center leading-tight">
                          {livro.titulo}
                        </span>
                      </div>
                    )}

                    {/* Badge de status */}
                    <div className="absolute bottom-2 left-2">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${STATUS_CORES[livro.statusLeitura]}`}>
                        {livro.statusLeitura}
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
                    <p className="text-xs font-bold text-[var(--text-primary)] leading-tight line-clamp-2 mb-0.5">
                      {livro.titulo}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] opacity-60 truncate">
                      {livro.autor}
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
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Novo Livro */}
      <AnimatePresence>
        {modalAberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalAberto(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-[95%] md:w-[520px] bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-color)] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-[var(--text-primary)]">Adicionar Livro</h2>
                <button onClick={() => setModalAberto(false)} className="p-2 hover:bg-[var(--bg-hover)] rounded-full">
                  <X className="w-5 h-5 text-[var(--text-primary)] opacity-40" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                    placeholder="Nome do livro"
                    autoFocus
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--text-primary)]/20 text-[var(--text-primary)] placeholder:opacity-40"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">
                    Autor
                  </label>
                  <input
                    type="text"
                    value={form.autor}
                    onChange={e => setForm(p => ({ ...p, autor: e.target.value }))}
                    placeholder="Nome do autor"
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--text-primary)]/20 text-[var(--text-primary)] placeholder:opacity-40"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-2">
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
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">
                    Status de Leitura
                  </label>
                  <select
                    value={form.statusLeitura}
                    onChange={e => setForm(p => ({ ...p, statusLeitura: e.target.value as StatusLeitura }))}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-[var(--text-primary)]/20 text-[var(--text-primary)]"
                  >
                    {STATUS_LEITURA.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">
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
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setModalAberto(false)}
                  className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-[var(--text-primary)] border border-[var(--border-strong)] hover:bg-[var(--bg-hover)] transition-all opacity-60 hover:opacity-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCriarLivro}
                  disabled={!form.titulo.trim()}
                  className="flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest bg-[var(--text-primary)] text-[var(--bg-primary)] hover:scale-[1.02] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
                >
                  Criar Livro
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
