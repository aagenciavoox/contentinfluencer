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
  Film,
  ChevronDown,
  ChevronUp,
  Copy,
  Hash,
  Target,
  TrendingUp,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { BookAnnotation, TipoAnotacao, GeneroLivro, StatusLeitura, Content, Campaign } from '../types';
import { ContentDetailModal } from '../components/ContentDetailModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { generateUUID } from '../utils/uuid';

const TIPO_CORES: Record<TipoAnotacao, string> = {
  Trecho: 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  Reação: 'bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]',
  Análise: 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
  'Ideia de conteúdo': 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
  Pergunta: 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
};

const STATUS_CORES: Record<string, string> = {
  'Ideia': 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
  'Pronto para Gravar': 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
  'Gravado': 'bg-amber-500/10 text-amber-600',
  'A Editar': 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  'Editado': 'bg-[var(--accent-blue)]/20 text-[var(--accent-blue)]',
  'Programado': 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]',
  'Postado': 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
};

const TIPOS: TipoAnotacao[] = ['Trecho', 'Reação', 'Análise', 'Ideia de conteúdo', 'Pergunta'];
const STATUS_LEITURA: StatusLeitura[] = ['Quero ler', 'Lendo', 'Pausado', 'Lido'];
const GENEROS: GeneroLivro[] = [
  'Fantasy', 'Dark Romance', 'Ficção Científica', 'Clássico',
  'Não-ficção', 'Romance', 'Thriller', 'Horror', 'Outro',
];

type Tab = 'info' | 'anotacoes' | 'conteudos';

const SECTION_LABEL = 'text-[9px] font-black uppercase tracking-widest opacity-30 mb-4 block text-[var(--text-primary)]';

export function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();

  const livro = state.books.find(b => b.id === id);
  const [tab, setTab] = useState<Tab>('anotacoes');

  // Anotações state
  const [filtroTipo, setFiltroTipo] = useState<TipoAnotacao | 'Todos' | 'Destaques'>('Todos');
  const [novaAnotacao, setNovaAnotacao] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoAnotacao>('Reação');
  const [novoCapitulo, setNovoCapitulo] = useState('');

  // Conteúdos state
  const [contentModalId, setContentModalId] = useState<string | null>(null);
  const [ecossistemaAgrupamento, setEcossistemaAgrupamento] = useState<'slot' | 'plataforma'>('slot');

  // Campanhas state
  const [novaCampanhaAberta, setNovaCampanhaAberta] = useState(false);
  const [campForm, setCampForm] = useState({ nome: '', dataInicio: '', dataFim: '', metaConteudos: '5' });

  // Capítulos cobertos state
  const [novoCapituloCoberto, setNovoCapituloCoberto] = useState('');

  // Hashtags state
  const [hashtagsAberto, setHashtagsAberto] = useState(false);
  const [hashtagTab, setHashtagTab] = useState<'Instagram' | 'TikTok' | 'YouTube'>('Instagram');
  const [hashtagCopiado, setHashtagCopiado] = useState(false);

  // Brainstorm state
  const [brainstormMode, setBrainstormMode] = useState(false);
  const [brainstormIdx, setBrainstormIdx] = useState(0);

  // Info state
  const [showTechnical, setShowTechnical] = useState(false);
  const [showParaVoce, setShowParaVoce] = useState(false);
  const [infoSalvo, setInfoSalvo] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

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
    paginasLidas: livro?.paginasLidas ?? ('' as number | ''),
    totalPaginas: livro?.totalPaginas ?? ('' as number | ''),
    editora: livro?.editora ?? '',
    anoPublicacao: livro?.anoPublicacao ? String(livro.anoPublicacao) : '',
    isbn: livro?.isbn ?? '',
    idioma: livro?.idioma ?? '',
    traducao: livro?.traducao ?? '',
    serieColecao: livro?.serieColecao ?? '',
    quemIndicou: livro?.quemIndicou ?? '',
    motivoEscolha: livro?.motivoEscolha ?? '',
    potencialConteudo: livro?.potencialConteudo as 1 | 2 | 3 | undefined,
  }));

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
    .filter(a => {
      if (filtroTipo === 'Todos') return true;
      if (filtroTipo === 'Destaques') return a.contentPotential === true;
      return a.tipo === filtroTipo;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const conteudosDoLivro = state.contents.filter(c => c.livroOrigemId === livro.id);
  const ideiasDeLivro = state.ideas.filter(i => i.livroOrigemId === livro.id && !i.archived);
  const campanhasDoLivro = (state.campaigns || []).filter(c => c.livroId === livro.id);

  const alertaEcossistema =
    livro.statusLeitura === 'Lido' &&
    conteudosDoLivro.filter(c => c.status === 'Postado').length === 0;

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

  // Brainstorm data
  const anotacoesDestaque = livro.anotacoes.filter(a => a.contentPotential);

  // Hashtags aggregation
  const hashtagsAgregadas: Record<'Instagram' | 'TikTok' | 'YouTube', string[]> = {
    Instagram: [], TikTok: [], YouTube: [],
  };
  conteudosDoLivro.forEach(c => {
    const pilar = state.pilares.find(p => p.nome === c.pillar);
    if (pilar) {
      if (pilar.hashtagsInstagram) hashtagsAgregadas.Instagram.push(...pilar.hashtagsInstagram.split(' ').filter(Boolean));
      if (pilar.hashtagsTikTok) hashtagsAgregadas.TikTok.push(...pilar.hashtagsTikTok.split(' ').filter(Boolean));
      if (pilar.hashtagsYouTube) hashtagsAgregadas.YouTube.push(...pilar.hashtagsYouTube.split(' ').filter(Boolean));
    }
  });
  const hashtagsUnicas: Record<'Instagram' | 'TikTok' | 'YouTube', string> = {
    Instagram: [...new Set(hashtagsAgregadas.Instagram)].join(' '),
    TikTok: [...new Set(hashtagsAgregadas.TikTok)].join(' '),
    YouTube: [...new Set(hashtagsAgregadas.YouTube)].join(' '),
  };

  // Performance data
  const conteudosPostados = conteudosDoLivro.filter(c => c.status === 'Postado');
  const resultadosDoLivro = state.results.filter(r =>
    r.contentId && conteudosDoLivro.some(c => c.id === r.contentId) && r.detailedMetrics
  );
  const totalViews = resultadosDoLivro.reduce((sum, r) => sum + (r.detailedMetrics?.views || 0), 0);
  const melhorPorViews = resultadosDoLivro.reduce((best, r) =>
    (r.detailedMetrics?.views || 0) > (best?.detailedMetrics?.views || 0) ? r : best,
    resultadosDoLivro[0]
  );
  const melhorPorSaves = resultadosDoLivro.reduce((best, r) =>
    (r.detailedMetrics?.saves || 0) > (best?.detailedMetrics?.saves || 0) ? r : best,
    resultadosDoLivro[0]
  );

  // Handlers
  const handleAddAnotacao = () => {
    if (!novaAnotacao.trim()) return;
    const anotacao: BookAnnotation = {
      id: generateUUID(),
      livroId: livro.id,
      texto: novaAnotacao.trim(),
      tipo: novoTipo,
      capituloRef: novoCapitulo.trim() || undefined,
      destilada: false,
      contentPotential: false,
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

  const handleTransformarEmConteudo = (anotacao: BookAnnotation) => {
    const novoConteudo: Content = {
      id: generateUUID(),
      title: anotacao.texto.slice(0, 60),
      seriesId: '',
      pillar: '',
      format: 'Instagram',
      status: 'Ideia',
      plataformas: ['Instagram'],
      livroOrigemId: livro.id,
      notes: anotacao.texto,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CONTENT', payload: novoConteudo });
    setContentModalId(novoConteudo.id);
    dispatch({ type: 'DISTILL_ANNOTATION', payload: { livroId: livro.id, annotationId: anotacao.id } });
  };

  const handleToggleContentPotential = (anotacao: BookAnnotation) => {
    const updated: BookAnnotation = { ...anotacao, contentPotential: !anotacao.contentPotential };
    dispatch({ type: 'UPDATE_ANNOTATION', payload: updated });
  };

  const handleDeleteAnotacao = (anotacaoId: string) => {
    dispatch({ type: 'DELETE_ANNOTATION', payload: { livroId: livro.id, annotationId: anotacaoId } });
  };

  const handleSalvarInfo = () => {
    dispatch({
      type: 'UPDATE_BOOK',
      payload: {
        ...livro,
        ...infoLocal,
        paginasLidas: infoLocal.paginasLidas === '' ? undefined : Number(infoLocal.paginasLidas),
        totalPaginas: infoLocal.totalPaginas === '' ? undefined : Number(infoLocal.totalPaginas),
        anoPublicacao: infoLocal.anoPublicacao ? Number(infoLocal.anoPublicacao) : undefined,
      },
    });
    setInfoSalvo(true);
    setTimeout(() => setInfoSalvo(false), 2000);
  };

  const handleCriarConteudo = () => {
    const novoConteudo: Content = {
      id: generateUUID(),
      title: `Conteúdo de "${livro.titulo}"`,
      seriesId: '',
      pillar: '',
      format: 'Instagram',
      status: 'Ideia',
      plataformas: ['Instagram'],
      livroOrigemId: livro.id,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CONTENT', payload: novoConteudo });
    setContentModalId(novoConteudo.id);
  };

  const handlePromoteIdeia = (ideiaId: string, ideiaText: string) => {
    const novoConteudo: Content = {
      id: generateUUID(),
      title: ideiaText.slice(0, 60),
      seriesId: '',
      pillar: '',
      format: 'Instagram',
      status: 'Ideia',
      plataformas: ['Instagram'],
      livroOrigemId: livro.id,
      notes: ideiaText,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'PROMOTE_IDEA', payload: { ideaId: ideiaId, contentId: novoConteudo.id, content: novoConteudo } });
    setContentModalId(novoConteudo.id);
  };

  const handleAdicionarCapitulo = () => {
    if (!novoCapituloCoberto.trim()) return;
    const atual = livro.capitulosCobertos || [];
    dispatch({ type: 'UPDATE_BOOK', payload: { ...livro, capitulosCobertos: [...atual, novoCapituloCoberto.trim()] } });
    setNovoCapituloCoberto('');
  };

  const handleRemoverCapitulo = (cap: string) => {
    const atual = livro.capitulosCobertos || [];
    dispatch({ type: 'UPDATE_BOOK', payload: { ...livro, capitulosCobertos: atual.filter(c => c !== cap) } });
  };

  const handleSalvarCampanha = () => {
    if (!campForm.nome.trim()) return;
    const nova: Campaign = {
      id: generateUUID(),
      nome: campForm.nome.trim(),
      livroId: livro.id,
      dataInicio: campForm.dataInicio || undefined,
      dataFim: campForm.dataFim || undefined,
      metaConteudos: Number(campForm.metaConteudos) || 5,
      status: 'Planejando',
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_CAMPAIGN', payload: nova });
    setCampForm({ nome: '', dataInicio: '', dataFim: '', metaConteudos: '5' });
    setNovaCampanhaAberta(false);
  };

  const handleCopiarHashtags = (texto: string) => {
    navigator.clipboard.writeText(texto).then(() => {
      setHashtagCopiado(true);
      setTimeout(() => setHashtagCopiado(false), 2000);
    });
  };

  const handleBrainstormConteudo = (anotacao: BookAnnotation) => {
    handleTransformarEmConteudo(anotacao);
    if (brainstormIdx < anotacoesDestaque.length - 1) {
      setBrainstormIdx(i => i + 1);
    } else {
      setBrainstormMode(false);
    }
  };

  const handleBrainstormIdeia = (anotacao: BookAnnotation) => {
    handleTransformarEmIdeia(anotacao);
    if (brainstormIdx < anotacoesDestaque.length - 1) {
      setBrainstormIdx(i => i + 1);
    } else {
      setBrainstormMode(false);
    }
  };

  const handleBrainstormPular = () => {
    if (brainstormIdx < anotacoesDestaque.length - 1) {
      setBrainstormIdx(i => i + 1);
    } else {
      setBrainstormMode(false);
    }
  };

  const contentModal = contentModalId ? state.contents.find(c => c.id === contentModalId) : null;

  const tabCounts: Record<Tab, number | null> = {
    info: null,
    anotacoes: livro.anotacoes.length,
    conteudos: conteudosDoLivro.length,
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      {/* Header sticky (sem tabs) */}
      <div className="sticky top-0 z-10 bg-[var(--bg-secondary)]/90 backdrop-blur-sm border-b border-[var(--border-color)]">
        <div className="max-w-5xl mx-auto px-6 md:px-12 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/biblioteca')}
            className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-[var(--text-primary)] line-clamp-1 leading-tight">{livro.titulo}</h1>
            <p className="text-xs text-[var(--text-secondary)] opacity-60">{livro.autor}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-12">
        {/* Barra de tabs separada */}
        <div className="flex border-b border-[var(--border-color)] mb-8 mt-2">
          {(['info', 'anotacoes', 'conteudos'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative pb-3 pt-2 px-4 text-[11px] font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-primary)] opacity-30 hover:opacity-60'
              }`}
            >
              {t === 'info' ? 'Info' : t === 'anotacoes' ? `Notas${tabCounts.anotacoes !== null ? ` (${tabCounts.anotacoes})` : ''}` : `Conteúdos${tabCounts.conteudos !== null ? ` (${tabCounts.conteudos})` : ''}`}
              {tab === t && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-primary)] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ════ ABA: INFO ════ */}
        {tab === 'info' && (
          <div className="grid md:grid-cols-[200px_1fr] gap-10 pb-10">
            {/* Capa + Avaliação */}
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

            {/* Campos direita */}
            <div className="space-y-8">

              {/* Seção 1 — Identificação */}
              <section>
                <span className={SECTION_LABEL}>Identificação</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Título</label>
                    <input type="text" value={infoLocal.titulo} onChange={e => setInfoLocal(prev => ({ ...prev, titulo: e.target.value }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Autor</label>
                    <input type="text" value={infoLocal.autor} onChange={e => setInfoLocal(prev => ({ ...prev, autor: e.target.value }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                  </div>
                </div>
                <div className="mt-4">
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
              </section>

              {/* Seção 2 — Leitura */}
              <section className="border-t border-[var(--border-color)] pt-6">
                <span className={SECTION_LABEL}>Leitura</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Status</label>
                    <select value={infoLocal.statusLeitura} onChange={e => setInfoLocal(prev => ({ ...prev, statusLeitura: e.target.value as StatusLeitura }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]">
                      {STATUS_LEITURA.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">URL da Capa</label>
                    <input type="url" value={infoLocal.capaUrl} onChange={e => setInfoLocal(prev => ({ ...prev, capaUrl: e.target.value }))} placeholder="https://..." className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Início da Leitura</label>
                    <input type="date" value={infoLocal.dataInicio} onChange={e => setInfoLocal(prev => ({ ...prev, dataInicio: e.target.value }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Fim da Leitura</label>
                    <input type="date" value={infoLocal.dataFim} onChange={e => setInfoLocal(prev => ({ ...prev, dataFim: e.target.value }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Páginas Lidas</label>
                    <input type="number" min={0} value={infoLocal.paginasLidas} onChange={e => setInfoLocal(prev => ({ ...prev, paginasLidas: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="Ex: 120" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Total de Páginas</label>
                    <input type="number" min={1} value={infoLocal.totalPaginas} onChange={e => setInfoLocal(prev => ({ ...prev, totalPaginas: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder="Ex: 380" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                  </div>
                </div>
                {(infoLocal.totalPaginas as number) > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30">Progresso</label>
                      <span className="text-[10px] font-black text-[var(--accent-purple)]">
                        {Math.min(100, Math.round(((infoLocal.paginasLidas as number || 0) / (infoLocal.totalPaginas as number)) * 100))}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden border border-[var(--border-color)]">
                      <div className="h-full bg-[var(--accent-purple)] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round(((infoLocal.paginasLidas as number || 0) / (infoLocal.totalPaginas as number)) * 100))}%` }} />
                    </div>
                  </div>
                )}
              </section>

              {/* Seção 3 — Detalhes Técnicos (colapsável) */}
              <section className="border-t border-[var(--border-color)] pt-6">
                <button
                  onClick={() => setShowTechnical(v => !v)}
                  className="flex items-center gap-2 w-full text-left mb-3"
                >
                  <span className={SECTION_LABEL + ' mb-0'}>Detalhes Técnicos</span>
                  {showTechnical ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-30" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-30" />}
                </button>
                {showTechnical && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Editora</label>
                      <input type="text" value={infoLocal.editora} onChange={e => setInfoLocal(prev => ({ ...prev, editora: e.target.value }))} placeholder="Ex: Rocco" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Ano de Publicação</label>
                      <input type="number" value={infoLocal.anoPublicacao} onChange={e => setInfoLocal(prev => ({ ...prev, anoPublicacao: e.target.value }))} placeholder="2024" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">ISBN</label>
                      <input type="text" value={infoLocal.isbn} onChange={e => setInfoLocal(prev => ({ ...prev, isbn: e.target.value }))} placeholder="978-..." className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Idioma</label>
                      <input type="text" value={infoLocal.idioma} onChange={e => setInfoLocal(prev => ({ ...prev, idioma: e.target.value }))} placeholder="Português" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Tradução</label>
                      <input type="text" value={infoLocal.traducao} onChange={e => setInfoLocal(prev => ({ ...prev, traducao: e.target.value }))} placeholder="Tradutor" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Série / Coleção</label>
                      <input type="text" value={infoLocal.serieColecao} onChange={e => setInfoLocal(prev => ({ ...prev, serieColecao: e.target.value }))} placeholder="Ex: Trono de Vidro" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                  </div>
                )}
              </section>

              {/* Seção 4 — Para você (colapsável) */}
              <section className="border-t border-[var(--border-color)] pt-6">
                <button
                  onClick={() => setShowParaVoce(v => !v)}
                  className="flex items-center gap-2 w-full text-left mb-3"
                >
                  <span className={SECTION_LABEL + ' mb-0'}>Para você</span>
                  {showParaVoce ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-30" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-30" />}
                </button>
                {showParaVoce && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Quem Indicou</label>
                      <input type="text" value={infoLocal.quemIndicou} onChange={e => setInfoLocal(prev => ({ ...prev, quemIndicou: e.target.value }))} placeholder="Ex: Podcast X, amiga Y..." className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1.5">Por que Escolheu</label>
                      <textarea value={infoLocal.motivoEscolha} onChange={e => setInfoLocal(prev => ({ ...prev, motivoEscolha: e.target.value }))} rows={3} placeholder="Motivação, contexto..." className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] resize-none placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-2">Potencial de Conteúdo</label>
                      <div className="flex gap-2">
                        {([1, 2, 3] as const).map(v => (
                          <button
                            key={v}
                            onClick={() => setInfoLocal(prev => ({ ...prev, potencialConteudo: prev.potencialConteudo === v ? undefined : v }))}
                            className={`text-base px-3 py-1.5 rounded-xl border transition-all ${infoLocal.potencialConteudo === v ? 'bg-[var(--text-primary)] border-[var(--text-primary)]' : 'border-[var(--border-strong)] opacity-50 hover:opacity-80'}`}
                          >
                            {'🔥'.repeat(v)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Seção 5 — Notas Gerais */}
              <section className="border-t border-[var(--border-color)] pt-6">
                <span className={SECTION_LABEL}>Notas Gerais</span>
                <textarea
                  value={infoLocal.notasGerais}
                  onChange={e => setInfoLocal(prev => ({ ...prev, notasGerais: e.target.value }))}
                  rows={5}
                  placeholder="Impressões gerais, contexto..."
                  className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] resize-none placeholder:opacity-30"
                />
              </section>

              {/* Salvar / Deletar */}
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                <button
                  onClick={() => setConfirm({ message: `Excluir "${livro.titulo}"? Esta ação é irreversível.`, onConfirm: () => { dispatch({ type: 'DELETE_BOOK', payload: livro.id }); navigate('/biblioteca'); } })}
                  className="text-xs font-bold text-[var(--accent-pink)] opacity-50 hover:opacity-100 transition-opacity"
                >
                  Excluir livro
                </button>
                <button
                  onClick={handleSalvarInfo}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  {infoSalvo ? 'Salvo!' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════ ABA: ANOTAÇÕES ════ */}
        {tab === 'anotacoes' && (
          <div className="space-y-6 pb-10">
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
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddAnotacao(); }}
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

            {/* Filtros por tipo + Destaques */}
            <div className="flex gap-2 flex-wrap">
              {(['Todos', 'Destaques', ...TIPOS] as (TipoAnotacao | 'Todos' | 'Destaques')[]).map(t => (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                    filtroTipo === t
                      ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)] border-[var(--text-primary)]'
                      : 'bg-transparent text-[var(--text-primary)] border-[var(--border-strong)] opacity-40 hover:opacity-70'
                  }`}
                >
                  {t === 'Destaques' ? '⭐ Destaques' : t}
                </button>
              ))}
            </div>

            {/* Lista de anotações */}
            {anotacoesFiltradas.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[var(--text-primary)] opacity-20 font-bold text-sm uppercase tracking-widest">Nenhuma anotação ainda</p>
              </div>
            ) : (
              <div className="space-y-3">
                {anotacoesFiltradas.map(a => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-[var(--bg-primary)] rounded-2xl p-5 border group ${
                      a.contentPotential ? 'border-yellow-400/30' : a.destilada ? 'border-[var(--accent-green)]/30' : 'border-[var(--border-color)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${TIPO_CORES[a.tipo]}`}>
                            {a.tipo}
                          </span>
                          {a.capituloRef && (
                            <span className="text-[9px] text-[var(--text-secondary)] opacity-50 font-bold">{a.capituloRef}</span>
                          )}
                          {a.contentPotential && (
                            <span className="text-[9px] text-yellow-500 font-bold flex items-center gap-1">⭐ Destaque</span>
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
                        {/* ⭐ Toggle destaque */}
                        <button
                          onClick={() => handleToggleContentPotential(a)}
                          title={a.contentPotential ? 'Remover destaque' : 'Destacar'}
                          className={`p-1.5 rounded-lg transition-colors ${a.contentPotential ? 'bg-yellow-100 text-yellow-500' : 'hover:bg-yellow-50 text-[var(--text-primary)] opacity-40 hover:opacity-80'}`}
                        >
                          <span className="text-xs">⭐</span>
                        </button>
                        {/* 💡 Virar Ideia */}
                        {!a.destilada && (
                          <button
                            onClick={() => handleTransformarEmIdeia(a)}
                            title="Transformar em Ideia"
                            className="p-1.5 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Lightbulb className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                        {/* 🎬 Virar Conteúdo direto */}
                        <button
                          onClick={() => handleTransformarEmConteudo(a)}
                          title="Criar Conteúdo"
                          className="p-1.5 hover:bg-[var(--accent-blue)]/10 rounded-lg transition-colors"
                        >
                          <Film className="w-4 h-4 text-[var(--accent-blue)] opacity-60" />
                        </button>
                        {/* 🗑️ Excluir */}
                        <button
                          onClick={() => handleDeleteAnotacao(a.id)}
                          className="p-1.5 hover:bg-[var(--accent-pink)]/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-[var(--accent-pink)] opacity-60" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ ABA: CONTEÚDOS ════ */}
        {tab === 'conteudos' && (
          <div className="space-y-6 pb-10">
            {/* Alerta */}
            {alertaEcossistema && (
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700 font-medium">Você já terminou esse livro mas ainda não postou nenhum conteúdo sobre ele.</p>
              </div>
            )}

            {/* Mini resumo */}
            <div className="flex gap-4 flex-wrap">
              {[
                { label: 'conteúdos', value: conteudosDoLivro.length },
                { label: 'postados', value: conteudosDoLivro.filter(c => c.status === 'Postado').length },
                { label: 'em produção', value: conteudosDoLivro.filter(c => c.status !== 'Postado' && c.status !== 'Ideia').length },
              ].map(stat => (
                <div key={stat.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                  <span className="text-sm font-black text-[var(--text-primary)]">{stat.value}</span>
                  <span className="text-[10px] text-[var(--text-secondary)] opacity-50">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Botão Novo Conteúdo hero */}
            <button
              onClick={handleCriarConteudo}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-black uppercase tracking-widest rounded-2xl hover:scale-[1.01] transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Novo Conteúdo
            </button>

            {/* Brainstorm CTA */}
            {anotacoesDestaque.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl px-5 py-4">
                <p className="text-sm font-bold text-amber-800 mb-2">
                  ⭐ Você tem {anotacoesDestaque.length} destaque{anotacoesDestaque.length > 1 ? 's' : ''} prontos para virar conteúdo.
                </p>
                <button
                  onClick={() => { setBrainstormIdx(0); setBrainstormMode(true); }}
                  className="text-[10px] font-black uppercase tracking-widest text-amber-700 hover:text-amber-900 transition-colors"
                >
                  Brainstormar →
                </button>
              </div>
            )}

            {/* ── Campanhas ── */}
            <section className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className={SECTION_LABEL + ' mb-0'}>Campanhas</span>
                <button
                  onClick={() => setNovaCampanhaAberta(v => !v)}
                  className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-blue)] hover:underline"
                >
                  + Nova Campanha
                </button>
              </div>

              {novaCampanhaAberta && (
                <div className="mb-4 p-4 bg-[var(--bg-hover)] rounded-xl space-y-3">
                  <input
                    type="text"
                    value={campForm.nome}
                    onChange={e => setCampForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome da campanha"
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1">Início</label>
                      <input type="date" value={campForm.dataInicio} onChange={e => setCampForm(p => ({ ...p, dataInicio: e.target.value }))} className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1">Fim</label>
                      <input type="date" value={campForm.dataFim} onChange={e => setCampForm(p => ({ ...p, dataFim: e.target.value }))} className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 block mb-1">Meta de peças</label>
                    <input type="number" min={1} value={campForm.metaConteudos} onChange={e => setCampForm(p => ({ ...p, metaConteudos: e.target.value }))} className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSalvarCampanha} className="flex-1 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all">Salvar</button>
                    <button onClick={() => setNovaCampanhaAberta(false)} className="px-4 py-2 border border-[var(--border-strong)] text-[var(--text-primary)] opacity-50 text-xs font-bold rounded-xl hover:opacity-80 transition-opacity">Cancelar</button>
                  </div>
                </div>
              )}

              {campanhasDoLivro.length === 0 ? (
                <p className="text-xs text-[var(--text-primary)] opacity-30 text-center py-4">Nenhuma campanha ainda</p>
              ) : (
                <div className="space-y-3">
                  {campanhasDoLivro.map(camp => {
                    const criados = conteudosDoLivro.length;
                    const progresso = Math.min(100, Math.round((criados / camp.metaConteudos) * 100));
                    return (
                      <div key={camp.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[var(--text-primary)]">{camp.nome}</span>
                          <span className="text-[10px] font-black text-[var(--text-primary)] opacity-40">{criados}/{camp.metaConteudos} peças</span>
                        </div>
                        <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--accent-blue)] rounded-full transition-all" style={{ width: `${progresso}%` }} />
                        </div>
                        <p className="text-[9px] text-[var(--text-primary)] opacity-30">{camp.status}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Ideias deste livro ── */}
            {ideiasDeLivro.length > 0 && (
              <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-40 mb-3">
                  Ideias deste livro ({ideiasDeLivro.length})
                </h3>
                <div className="space-y-2">
                  {ideiasDeLivro.map(ideia => (
                    <div key={ideia.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-color)] last:border-0">
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      <p className="text-sm text-[var(--text-primary)] opacity-70 flex-1">{ideia.text}</p>
                      <button
                        onClick={() => handlePromoteIdeia(ideia.id, ideia.text)}
                        className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-blue)] hover:underline shrink-0"
                      >
                        → Conteúdo
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Controles agrupamento + Conteúdos ── */}
            {conteudosDoLivro.length > 0 && (
              <>
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

                <div className="space-y-6">
                  {(Object.entries(
                    ecossistemaAgrupamento === 'slot' ? conteudosPorSlot : conteudosPorPlataforma
                  ) as [string, typeof conteudosDoLivro][]).map(([grupo, conteudos]) => (
                    <div key={grupo}>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-30 mb-3">{grupo}</h3>
                      <div className="space-y-2">
                        {conteudos.map(c => (
                          <button
                            key={c.id}
                            onClick={() => setContentModalId(c.id)}
                            className="w-full flex items-center gap-4 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl hover:border-[var(--text-primary)]/30 transition-all text-left group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{c.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className="text-[10px] text-[var(--text-secondary)] opacity-50">{c.pillar}</p>
                                {c.publishDate && <p className="text-[9px] text-[var(--text-secondary)] opacity-40">📅 {c.publishDate}</p>}
                                {c.recordingDate && <p className="text-[9px] text-[var(--text-secondary)] opacity-40">🎙️ {c.recordingDate}</p>}
                              </div>
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${STATUS_CORES[c.status] || 'bg-[var(--bg-hover)] text-[var(--text-primary)]'}`}>
                              {c.status}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {conteudosDoLivro.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-10 h-10 text-[var(--text-primary)] opacity-10 mx-auto mb-3" />
                <p className="text-[var(--text-primary)] opacity-20 font-bold text-sm uppercase tracking-widest">
                  Nenhum conteúdo criado a partir deste livro ainda
                </p>
              </div>
            )}

            {/* ── Capítulos/Partes cobertos ── */}
            <section className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5">
              <span className={SECTION_LABEL}>Capítulos / Partes cobertos</span>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={novoCapituloCoberto}
                  onChange={e => setNovoCapituloCoberto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdicionarCapitulo(); }}
                  placeholder="Ex: Cap. 3 — O Vilão"
                  className="flex-1 text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40"
                />
                <button
                  onClick={handleAdicionarCapitulo}
                  disabled={!novoCapituloCoberto.trim()}
                  className="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black rounded-xl disabled:opacity-30 hover:scale-[1.02] transition-all"
                >
                  Adicionar
                </button>
              </div>
              {(livro.capitulosCobertos || []).length === 0 ? (
                <p className="text-xs text-[var(--text-primary)] opacity-30">Nenhum capítulo marcado ainda</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(livro.capitulosCobertos || []).map(cap => (
                    <div key={cap} className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)]">
                      <span>{cap}</span>
                      <button onClick={() => handleRemoverCapitulo(cap)} className="opacity-40 hover:opacity-100 transition-opacity ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Hashtag Manager ── */}
            <section className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5">
              <button
                onClick={() => setHashtagsAberto(v => !v)}
                className="flex items-center gap-2 w-full text-left"
              >
                <Hash className="w-4 h-4 text-[var(--text-primary)] opacity-40" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 hover:opacity-80 transition-opacity flex-1">
                  {hashtagsAberto ? 'Ocultar hashtags sugeridas ▴' : 'Ver hashtags sugeridas ▾'}
                </span>
              </button>
              {hashtagsAberto && (
                <div className="mt-4">
                  <div className="flex gap-1 mb-3">
                    {(['Instagram', 'TikTok', 'YouTube'] as const).map(plat => (
                      <button
                        key={plat}
                        onClick={() => setHashtagTab(plat)}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                          hashtagTab === plat
                            ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)]'
                            : 'bg-[var(--bg-hover)] text-[var(--text-primary)] opacity-50 hover:opacity-80'
                        }`}
                      >
                        {plat}
                      </button>
                    ))}
                  </div>
                  {hashtagsUnicas[hashtagTab] ? (
                    <div className="bg-[var(--bg-hover)] rounded-xl p-3 relative">
                      <p className="text-xs text-[var(--text-primary)] opacity-70 pr-10">{hashtagsUnicas[hashtagTab]}</p>
                      <button
                        onClick={() => handleCopiarHashtags(hashtagsUnicas[hashtagTab])}
                        className="absolute top-2 right-2 p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                        title="Copiar hashtags"
                      >
                        {hashtagCopiado ? <Check className="w-4 h-4 text-[var(--accent-green)]" /> : <Copy className="w-4 h-4 text-[var(--text-primary)] opacity-40" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-primary)] opacity-30">Nenhuma hashtag configurada nos pilares dos conteúdos deste livro.</p>
                  )}
                </div>
              )}
            </section>

            {/* ── Performance ── */}
            {resultadosDoLivro.length > 0 && (
              <section className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-[var(--accent-green)]" />
                  <span className={SECTION_LABEL + ' mb-0'}>Performance</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 mb-1">Total Views</p>
                    <p className="text-xl font-black text-[var(--text-primary)]">{totalViews.toLocaleString()}</p>
                  </div>
                  {melhorPorViews && (
                    <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 mb-1">Melhor Views</p>
                      <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2">
                        {state.contents.find(c => c.id === melhorPorViews.contentId)?.title || '—'}
                      </p>
                      <p className="text-xs text-[var(--accent-green)] font-bold">{melhorPorViews.detailedMetrics?.views?.toLocaleString()} views</p>
                    </div>
                  )}
                  {melhorPorSaves && (
                    <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-30 mb-1">Mais Saves</p>
                      <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2">
                        {state.contents.find(c => c.id === melhorPorSaves.contentId)?.title || '—'}
                      </p>
                      <p className="text-xs text-[var(--accent-blue)] font-bold">{melhorPorSaves.detailedMetrics?.saves?.toLocaleString()} saves</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* ── Modal Brainstorm ── */}
      <AnimatePresence>
        {brainstormMode && anotacoesDestaque.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--bg-primary)] rounded-3xl p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-30">
                  Brainstorm — {brainstormIdx + 1}/{anotacoesDestaque.length}
                </span>
                <button onClick={() => setBrainstormMode(false)} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
                  <X className="w-5 h-5 text-[var(--text-primary)] opacity-40" />
                </button>
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)] leading-relaxed mb-8">
                "{anotacoesDestaque[brainstormIdx]?.texto}"
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleBrainstormConteudo(anotacoesDestaque[brainstormIdx])}
                  className="flex-1 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all"
                >
                  → Virar Conteúdo
                </button>
                <button
                  onClick={() => handleBrainstormIdeia(anotacoesDestaque[brainstormIdx])}
                  className="flex-1 py-3 border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-[var(--bg-hover)] transition-all"
                >
                  → Virar Ideia
                </button>
                <button
                  onClick={handleBrainstormPular}
                  className="py-3 px-4 text-[var(--text-primary)] opacity-40 text-xs font-black uppercase tracking-widest hover:opacity-80 transition-opacity"
                >
                  Pular →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de conteúdo */}
      {contentModal && (
        <ContentDetailModal
          content={contentModal}
          onClose={() => setContentModalId(null)}
          initialLivroOrigemId={livro.id}
        />
      )}
      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
