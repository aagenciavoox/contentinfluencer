import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  Star,
  Plus,
  Trash2,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BookAnnotation, TipoAnotacao, GeneroLivro, StatusLeitura, VisualFormat } from '../types';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { generateUUID } from '../utils/uuid';

const TIPO_CORES: Record<TipoAnotacao, string> = {
  Trecho: 'bg-blue-100 text-blue-700',
  Reação: 'bg-pink-100 text-pink-700',
  Análise: 'bg-purple-100 text-purple-700',
  'Ideia de conteúdo': 'bg-green-100 text-green-700',
  Pergunta: 'bg-orange-100 text-orange-700',
};

const TIPOS: TipoAnotacao[] = ['Trecho', 'Reação', 'Análise', 'Ideia de conteúdo', 'Pergunta'];

const STATUS_LEITURA: StatusLeitura[] = ['Quero ler', 'Lendo', 'Pausado', 'Lido'];
const GENEROS: GeneroLivro[] = [
  'Fantasy', 'Dark Romance', 'Ficção Científica', 'Clássico',
  'Não-ficção', 'Romance', 'Thriller', 'Horror', 'Outro',
];

type Tab = 'info' | 'anotacoes' | 'ecossistema';

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();

  const livro = state.books.find(b => b.id === id);
  const [tab, setTab] = useState<Tab>('anotacoes');
  const [filtroTipo, setFiltroTipo] = useState<TipoAnotacao | 'Todos'>('Todos');
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoAnotacao>('Reação');
  const [novoCapitulo, setNovoCapitulo] = useState('');
  const [contentModalId, setContentModalId] = useState<string | null>(null);
  const [criandoConteudo, setCriandoConteudo] = useState(false);
  const [ecossistemaAgrupamento, setEcossistemaAgrupamento] = useState<'slot' | 'plataforma'>('slot');

  // Estado local para a aba Info (salvo explicitamente)
  const [infoLocal, setInfoLocal] = useState(() => ({
    titulo: livro?.titulo ?? '',
    autor: livro?.autor ?? '',
    statusLeitura: livro?.statusLeitura ?? ('Quero ler' as StatusLeitura),
    capaUrl: livro?.capaUrl ?? '',
    dataInicio: livro?.dataInicio ?? '',
    dataFim: livro?.dataFim ?? '',
    avaliacao: livro?.avaliacao as 1 | 2 | 3 | 4 | 5 | undefined,
    notasGerais: livro?.notasGerais ?? '',
    generos: livro?.generos ? [...livro.generos] : [] as GeneroLivro[],
  }));
  const [infoSalvo, setInfoSalvo] = useState(false);

  if (!livro) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-primary)] opacity-30 font-bold mb-4">Livro não encontrado</p>
          <button onClick={() => navigate('/biblioteca')} className="text-xs font-bold text-[var(--accent-blue)] hover:underline">
            Voltar à Biblioteca
          </button>
        </div>
      </div>
    );
  }

  const anotacoesFiltradas = livro.anotacoes
    .filter(a => filtroTipo === 'Todos' || a.tipo === filtroTipo)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const conteudosDoLivro = state.contents.filter(c => c.livroOrigemId === livro.id);
  const ideiasDeLivro = state.ideas.filter(i => i.livroOrigemId === livro.id && !i.archived);

  const handleAddAnotacao = () => {
    if (!novaAnotacao.trim()) return;
    const anotacao: BookAnnotation = {
      id: generateUUID(),
      livroId: livro.id,
      texto: novaAnotacao.trim(),
      tipo: novoTipo,
      capituloRef: novoCapitulo.trim() || undefined,
      destilada: false,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_ANNOTATION', payload: anotacao });
    setNovaAnotacao('');
    setNovoCapitulo('');
  };

  const handleTransformarEmIdeia = (anotacao: BookAnnotation) => {
    const ideia = {
      id: generateUUID(),
      text: anotacao.texto,
      createdAt: new Date().toISOString(),
      livroOrigemId: livro.id,
      archived: false,
    };
    dispatch({ type: 'ADD_IDEA', payload: ideia });
    dispatch({ type: 'DISTILL_ANNOTATION', payload: { livroId: livro.id, annotationId: anotacao.id } });
  };

  const handleDeleteAnotacao = (anotacaoId: string) => {
    dispatch({ type: 'DELETE_ANNOTATION', payload: { livroId: livro.id, annotationId: anotacaoId } });
  };

  const updateLivro = (updates: Partial<typeof livro>) => {
    dispatch({ type: 'UPDATE_BOOK', payload: { ...livro, ...updates } });
  };

  const handleSalvarInfo = () => {
    dispatch({ type: 'UPDATE_BOOK', payload: { ...livro, ...infoLocal } });
    setInfoSalvo(true);
    setTimeout(() => setInfoSalvo(false), 2000);
  };

  const handleCriarConteudo = () => {
    const novoConteudo = {
      id: generateUUID(),
      title: `Conteúdo de "${livro.titulo}"`,
      seriesId: '',
      pillar: '',
      format: 'Instagram',
      status: 'Ideia' as const,
      plataformas: ['Instagram' as const],
      livroOrigemId: livro.id,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CONTENT', payload: novoConteudo });
    setContentModalId(novoConteudo.id);
    setCriandoConteudo(true);
  };

  const contentModal = contentModalId
    ? state.contents.find(c => c.id === contentModalId)
    : null;

  const conteudosPorSlot = conteudosDoLivro.reduce<Record<string, typeof conteudosDoLivro>>((acc, c) => {
    const key = c.slotType || 'Sem Slot';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const conteudosPorPlataforma = conteudosDoLivro.reduce<Record<string, typeof conteudosDoLivro>>((acc, c) => {
    const plats = c.plataformas?.length ? c.plataformas : ['Geral'];
    plats.forEach(p => {
      if (!acc[p]) acc[p] = [];
      if (!acc[p].find(x => x.id === c.id)) acc[p].push(c);
    });
    return acc;
  }, {});

  const alertaEcossistema =
    livro.statusLeitura === 'Lido' &&
    conteudosDoLivro.filter(c => c.status === 'Postado').length === 0;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/biblioteca')}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-[var(--text-primary)] line-clamp-2 leading-tight">{livro.titulo}</h1>
            <p className="text-xs text-[var(--text-secondary)] opacity-60">{livro.autor}</p>
          </div>
          {/* Abas */}
          <div className="flex gap-1">
            {(['info', 'anotacoes', 'ecossistema'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                  tab === t
                    ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)]'
                    : 'text-[var(--text-primary)] opacity-40 hover:opacity-70 hover:bg-[var(--bg-hover)]'
                }`}
              >
                {t === 'info' ? 'Info' : t === 'anotacoes' ? `Anotações (${livro.anotacoes.length})` : `Ecossistema (${conteudosDoLivro.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-10">
        {/* ABA: INFO */}
        {tab === 'info' && (
          <div className="grid md:grid-cols-[200px_1fr] gap-10">
            {/* Capa */}
            <div className="space-y-4">
              <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-[var(--bg-hover)] shadow-md">
                {livro.capaUrl ? (
                  <img src={livro.capaUrl} alt={livro.titulo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-10 h-10 text-[var(--text-primary)] opacity-20" />
                  </div>
                )}
              </div>
              {/* Avaliação */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 mb-2">Avaliação</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setInfoLocal(prev => ({ ...prev, avaliacao: n as 1 | 2 | 3 | 4 | 5 }))}>
                      <Star className={`w-5 h-5 transition-colors ${n <= (infoLocal.avaliacao || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--border-strong)] hover:text-yellow-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Campos */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Título</label>
                  <input
                    type="text"
                    value={infoLocal.titulo}
                    onChange={e => setInfoLocal(prev => ({ ...prev, titulo: e.target.value }))}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Autor</label>
                  <input
                    type="text"
                    value={infoLocal.autor}
                    onChange={e => setInfoLocal(prev => ({ ...prev, autor: e.target.value }))}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Status</label>
                  <select
                    value={infoLocal.statusLeitura}
                    onChange={e => setInfoLocal(prev => ({ ...prev, statusLeitura: e.target.value as StatusLeitura }))}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]"
                  >
                    {STATUS_LEITURA.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">URL da Capa</label>
                  <input
                    type="url"
                    value={infoLocal.capaUrl}
                    onChange={e => setInfoLocal(prev => ({ ...prev, capaUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Início da Leitura</label>
                  <input
                    type="date"
                    value={infoLocal.dataInicio}
                    onChange={e => setInfoLocal(prev => ({ ...prev, dataInicio: e.target.value }))}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Fim da Leitura</label>
                  <input
                    type="date"
                    value={infoLocal.dataFim}
                    onChange={e => setInfoLocal(prev => ({ ...prev, dataFim: e.target.value }))}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]"
                  />
                </div>
              </div>

              {/* Gêneros */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-2">Gêneros</label>
                <div className="flex flex-wrap gap-2">
                  {GENEROS.map(g => (
                    <button
                      key={g}
                      onClick={() => {
                        const atual = infoLocal.generos;
                        setInfoLocal(prev => ({ ...prev, generos: atual.includes(g) ? atual.filter(x => x !== g) : [...atual, g] }));
                      }}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        infoLocal.generos.includes(g)
                          ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)] border-[var(--text-primary)]'
                          : 'bg-transparent text-[var(--text-primary)] border-[var(--border-strong)] opacity-40 hover:opacity-70'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas Gerais */}
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-2">Notas Gerais</label>
                <textarea
                  value={infoLocal.notasGerais}
                  onChange={e => setInfoLocal(prev => ({ ...prev, notasGerais: e.target.value }))}
                  rows={5}
                  placeholder="Impressões gerais, contexto, por que escolheu esse livro..."
                  className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] resize-none placeholder:opacity-30"
                />
              </div>

              {/* Salvar / Deletar */}
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                <button
                  onClick={() => {
                    if (window.confirm(`Excluir "${livro.titulo}"? Esta ação é irreversível.`)) {
                      dispatch({ type: 'DELETE_BOOK', payload: livro.id });
                      navigate('/biblioteca');
                    }
                  }}
                  className="text-xs font-bold text-red-500 opacity-50 hover:opacity-100 transition-opacity"
                >
                  Excluir livro
                </button>
                <button
                  onClick={handleSalvarInfo}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
                >
                  {infoSalvo ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Salvo!
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ABA: ANOTAÇÕES */}
        {tab === 'anotacoes' && (
          <div className="space-y-6">
            {/* Form nova anotação */}
            <div className="bg-[var(--bg-primary)] rounded-2xl p-5 border border-[var(--border-color)] space-y-3">
              <div className="flex gap-3">
                <select
                  value={novoTipo}
                  onChange={e => setNovoTipo(e.target.value as TipoAnotacao)}
                  className="text-[10px] font-bold bg-[var(--bg-hover)] border-none rounded-lg px-3 py-2 text-[var(--text-primary)] shrink-0"
                >
                  {TIPOS.map(t => <option key={t}>{t}</option>)}
                </select>
                <input
                  type="text"
                  value={novoCapitulo}
                  onChange={e => setNovoCapitulo(e.target.value)}
                  placeholder="Cap. / Página (opcional)"
                  className="text-xs bg-[var(--bg-hover)] border-none rounded-lg px-3 py-2 text-[var(--text-primary)] w-36 placeholder:opacity-40"
                />
              </div>
              <textarea
                value={novaAnotacao}
                onChange={e => setNovaAnotacao(e.target.value)}
                placeholder="Escreva uma anotação, trecho ou ideia..."
                rows={3}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddAnotacao();
                }}
                className="w-full text-sm bg-transparent border-none focus:ring-0 p-0 resize-none text-[var(--text-primary)] placeholder:opacity-30"
              />
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-[var(--text-primary)] opacity-25">⌘↩ para adicionar</span>
                <button
                  onClick={handleAddAnotacao}
                  disabled={!novaAnotacao.trim()}
                  className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] transition-all"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* Filtros por tipo */}
            <div className="flex gap-2 flex-wrap">
              {(['Todos', ...TIPOS] as (TipoAnotacao | 'Todos')[]).map(t => (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                    filtroTipo === t
                      ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)] border-[var(--text-primary)]'
                      : 'bg-transparent text-[var(--text-primary)] border-[var(--border-strong)] opacity-40 hover:opacity-70'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Lista de anotações */}
            {anotacoesFiltradas.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[var(--text-primary)] opacity-20 font-bold text-sm uppercase tracking-widest">
                  Nenhuma anotação ainda
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {anotacoesFiltradas.map(a => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-[var(--bg-primary)] rounded-2xl p-5 border group ${
                      a.destilada ? 'border-[var(--accent-green)]/30' : 'border-[var(--border-color)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${TIPO_CORES[a.tipo]}`}>
                            {a.tipo}
                          </span>
                          {a.capituloRef && (
                            <span className="text-[9px] text-[var(--text-secondary)] opacity-50 font-bold">
                              {a.capituloRef}
                            </span>
                          )}
                          {a.destilada && (
                            <span className="text-[9px] text-[var(--accent-green)] font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Destilada
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--text-primary)] leading-relaxed">{a.texto}</p>
                      </div>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!a.destilada && (
                          <button
                            onClick={() => handleTransformarEmIdeia(a)}
                            title="Transformar em Ideia"
                            className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Lightbulb className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAnotacao(a.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 opacity-60" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: ECOSSISTEMA */}
        {tab === 'ecossistema' && (
          <div className="space-y-6">
            {/* Alerta */}
            {alertaEcossistema && (
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700 font-medium">
                  Você já terminou esse livro mas ainda não postou nenhum conteúdo sobre ele.
                </p>
              </div>
            )}

            {/* Ideias vinculadas */}
            {ideiasDeLivro.length > 0 && (
              <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-40 mb-3">
                  Ideias deste livro ({ideiasDeLivro.length})
                </h3>
                <div className="space-y-2">
                  {ideiasDeLivro.map(ideia => (
                    <div key={ideia.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-color)] last:border-0">
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      <p className="text-sm text-[var(--text-primary)] opacity-70">{ideia.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controles do ecossistema */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {(['slot', 'plataforma'] as const).map(ag => (
                  <button
                    key={ag}
                    onClick={() => setEcossistemaAgrupamento(ag)}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all capitalize ${
                      ecossistemaAgrupamento === ag
                        ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)]'
                        : 'bg-[var(--bg-hover)] text-[var(--text-primary)] opacity-50 hover:opacity-80'
                    }`}
                  >
                    Por {ag}
                  </button>
                ))}
              </div>
              <button
                onClick={handleCriarConteudo}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl hover:scale-[1.03] transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Conteúdo
              </button>
            </div>

            {/* Conteúdos */}
            {conteudosDoLivro.length === 0 ? (
              <div className="text-center py-16">
                <BookOpen className="w-10 h-10 text-[var(--text-primary)] opacity-10 mx-auto mb-3" />
                <p className="text-[var(--text-primary)] opacity-20 font-bold text-sm uppercase tracking-widest">
                  Nenhum conteúdo criado a partir deste livro ainda
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {(Object.entries(
                  ecossistemaAgrupamento === 'slot' ? conteudosPorSlot : conteudosPorPlataforma
                ) as [string, typeof conteudosDoLivro][]).map(([grupo, conteudos]) => (
                  <div key={grupo}>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-30 mb-3">
                      {grupo}
                    </h3>
                    <div className="space-y-2">
                      {conteudos.map(c => (
                        <button
                          key={c.id}
                          onClick={() => setContentModalId(c.id)}
                          className="w-full flex items-center gap-4 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl hover:border-[var(--text-primary)]/30 transition-all text-left group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{c.title}</p>
                            <p className="text-[10px] text-[var(--text-secondary)] opacity-50">{c.pillar}</p>
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-widest bg-[var(--bg-hover)] text-[var(--text-primary)] px-2.5 py-1 rounded-full shrink-0">
                            {c.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de conteúdo */}
      {contentModal && (
        <ContentDetailModal
          content={contentModal}
          onClose={() => { setContentModalId(null); setCriandoConteudo(false); }}
          initialLivroOrigemId={livro.id}
        />
      )}
    </div>
  );
}
