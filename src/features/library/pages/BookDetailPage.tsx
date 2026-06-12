import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
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
import { useAppContext } from '../../../context/AppContext';
import { Anotacao, BibliotecaItem, BibliotecaItemMeta, Content, Idea, Projeto } from '../../../lib/database';
import { generateUUID as _uuid } from '../../../utils/uuid';
type BookAnnotation = Anotacao;
type TipoAnotacao = Anotacao['tipo'];
type StatusLeitura = BibliotecaItem['status'];
type GeneroLivro = string;
type Campaign = Projeto;
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { createContentDraft } from '../../contents/lib/createContentDraft';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline';
import { BookAnnotationComposerSheet } from '../components/modals/BookAnnotationComposerSheet';
import { generateUUID } from '../../../utils/uuid';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { PipelineActionBar } from '../../../components/pipeline/PipelineActionBar';
import { AnnotationNoteCard } from '../components/AnnotationNoteCard';
import { TagSelect } from '../../../components/ui/TagSelect';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { BookDetailMobileScreen } from '../../../mobile/screens/library/BookDetailMobileScreen';

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
const STATUS_LEITURA: Record<BibliotecaItem['tipo'], StatusLeitura[]> = {
  livro: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  manga: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  filme: ['Quero ver', 'Assistido', 'Abandonado'],
  'série': ['Quero ver', 'Assistindo', 'Assistido', 'Abandonado'],
  anime: ['Quero ver', 'Assistindo', 'Assistido', 'Abandonado'],
  outro: ['Quero consumir', 'Consumindo', 'Concluído', 'Abandonado'],
};
const GENEROS: GeneroLivro[] = [
  'Fantasy', 'Dark Romance', 'Ficção Científica', 'Clássico',
  'Não-ficção', 'Romance', 'Thriller', 'Horror', 'Outro',
];

type Tab = 'info' | 'anotacoes' | 'conteudos';

const SECTION_LABEL = 'text-xs font-semibold  opacity-30 mb-4 block text-[var(--text-primary)]';

function getItemTypeLabel(tipo: BibliotecaItem['tipo']) {
  if (tipo === 'filme') return 'Filme';
  if (tipo === 'série') return 'Série';
  if (tipo === 'anime') return 'Anime';
  if (tipo === 'manga') return 'Mangá';
  return 'Livro';
}

function getCreatorLabel(tipo: BibliotecaItem['tipo']) {
  if (tipo === 'filme') return 'Diretor';
  if (tipo === 'série') return 'Diretor';
  if (tipo === 'anime') return 'Direção / estúdio';
  if (tipo === 'manga') return 'Mangaká';
  return 'Autor';
}

function getProgressLabels(tipo: BibliotecaItem['tipo']) {
  if (tipo === 'filme') return { current: 'Minutos vistos', total: 'Duração total', unit: 'min' };
  if (tipo === 'série' || tipo === 'anime') return { current: 'Episódios vistos', total: 'Total de episódios', unit: 'eps' };
  return { current: 'Páginas lidas', total: 'Total de páginas', unit: 'páginas' };
}

function getTechnicalLabels(tipo: BibliotecaItem['tipo']) {
  if (tipo === 'filme') {
    return {
      publisher: 'Estúdio / Distribuidora',
      publisherPlaceholder: 'Ex: Warner Bros.',
      translation: 'Dublagem / Localização',
      translationPlaceholder: 'Ex: PT-BR / versão legendada',
      collection: 'Franquia / Universo',
      collectionPlaceholder: 'Ex: Duna',
    };
  }

  if (tipo === 'série' || tipo === 'anime') {
    return {
      publisher: 'Plataforma / Estúdio',
      publisherPlaceholder: 'Ex: Netflix',
      translation: 'Dublagem / Localização',
      translationPlaceholder: 'Ex: PT-BR / versão legendada',
      collection: 'Saga / Universo',
      collectionPlaceholder: 'Ex: Bridgerton',
    };
  }

  return {
    publisher: 'Editora',
    publisherPlaceholder: 'Ex: Rocco',
    translation: 'Tradução',
    translationPlaceholder: 'Tradutor',
    collection: 'Série / Coleção',
    collectionPlaceholder: 'Ex: Trono de Vidro',
  };
}

function getCoverageLabels(tipo: BibliotecaItem['tipo']) {
  if (tipo === 'filme') {
    return {
      section: 'Cenas / Partes cobertas',
      placeholder: 'Ex: Abertura no deserto',
      empty: 'Nenhuma cena marcada ainda',
    };
  }

  if (tipo === 'série' || tipo === 'anime') {
    return {
      section: 'Episódios / Arcos cobertos',
      placeholder: 'Ex: T1E03 - Baile',
      empty: 'Nenhum episódio marcado ainda',
    };
  }

  return {
    section: 'Capítulos / Partes cobertos',
    placeholder: 'Ex: Cap. 3 - O Vilão',
    empty: 'Nenhum capítulo marcado ainda',
  };
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useAppContext();
  const isMobile = useIsMobile();

  const livro = state.books.find(b => b.id === id);
  const initialTab = (searchParams.get('tab') as Tab | null);
  const [tab, setTab] = useState<Tab>(initialTab === 'info' || initialTab === 'conteudos' ? initialTab : 'anotacoes');

  // Anotações state
  const [filtroTipo, setFiltroTipo] = useState<TipoAnotacao | 'Todos' | 'Destaques'>('Todos');
  const [mobileNoteComposerOpen, setMobileNoteComposerOpen] = useState(false);

  // Conteúdos state
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

  const _livro = livro as any;
  const itemType = livro?.tipo ?? 'livro';
  const metadata = ((livro && (state.preferences[`item_meta:${livro.id}`] || state.preferences[`book_meta:${livro.id}`])) || {}) as BibliotecaItemMeta;
  const itemTypeLabel = getItemTypeLabel(itemType);
  const creatorLabel = getCreatorLabel(itemType);
  const progressLabels = getProgressLabels(itemType);
  const technicalLabels = getTechnicalLabels(itemType);
  const coverageLabels = getCoverageLabels(itemType);
  const ItemIcon = itemType === 'livro' || itemType === 'manga' ? BookOpen : Film;
  const [infoLocal, setInfoLocal] = useState(() => ({
    titulo: livro?.titulo ?? '',
    autor: livro?.autorDiretor ?? '',
    statusLeitura: livro?.status ?? (STATUS_LEITURA[itemType][0] as StatusLeitura),
    capaUrl: livro?.capaUrl ?? '',
    dataInicio: livro?.dataInicio ?? '',
    dataFim: livro?.dataFim ?? '',
    avaliacao: livro?.avaliacao as 1 | 2 | 3 | 4 | 5 | undefined,
    notasGerais: livro?.notasGerais ?? '',
    generos: livro?.generoIds ? [...livro.generoIds] : [] as GeneroLivro[],
    paginasLidas: livro?.paginasLidas ?? ('' as number | ''),
    totalPaginas: livro?.totalPaginas ?? ('' as number | ''),
    editora: metadata.editora ?? '',
    anoPublicacao: metadata.anoPublicacao ?? '',
    isbn: metadata.isbn ?? '',
    idioma: metadata.idioma ?? '',
    traducao: metadata.traducao ?? '',
    serieColecao: metadata.serieColecao ?? '',
    colecaoStatus: metadata.colecaoStatus ?? 'nao',
    colecaoNome: metadata.colecaoNome ?? '',
    generoAutor: metadata.generoAutor ?? '',
    paisAutor: metadata.paisAutor ?? '',
    racaAutor: metadata.racaAutor ?? '',
    quemIndicou: metadata.quemIndicou ?? '',
    motivoEscolha: metadata.motivoEscolha ?? '',
    potencialConteudo: livro?.potencialConteudo as 1 | 2 | 3 | undefined,
  }));

  if (!livro) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--text-tertiary)] font-bold mb-4">Item não encontrado</p>
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

  const conteudosDoLivro = state.contents.filter(c => c.bibliotecaItemId === livro.id);
  const ideiasDeLivro = state.ideas.filter(i => i.origemId === livro.id && !i.archived);
  const campanhasDoLivro = state.projetos.filter(
    projeto =>
      projeto.bibliotecaItemId === livro.id &&
      (projeto.tipo === 'producao' || projeto.tipo === 'campanha')
  );
  const capitulosCobertos = metadata.capitulosCobertos || [];

  const alertaEcossistema =
    livro.status === 'Concluído' &&
    conteudosDoLivro.filter(c => c.status === 'Postado').length === 0;

  const conteudosPorSlot = conteudosDoLivro.reduce<Record<string, typeof conteudosDoLivro>>((acc, c) => {
    const key = c.slotType || 'Sem Slot';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const conteudosPorPlataforma = conteudosDoLivro.reduce<Record<string, typeof conteudosDoLivro>>((acc, c) => {
    const plats = c.plataformas?.length ? c.plataformas.map(pp => pp.platformId) : ['Geral'];
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
    const pilar = state.pilares.find(p => p.id === c.pilarId);
    if (pilar) {
      pilar.plataformas.forEach(pp => {
        const key = pp.platformId as 'Instagram' | 'TikTok' | 'YouTube';
        if (hashtagsAgregadas[key] && pp.hashtags) {
          hashtagsAgregadas[key].push(...pp.hashtags.split(' ').filter(Boolean));
        }
      });
    }
  });
  const hashtagsUnicas: Record<'Instagram' | 'TikTok' | 'YouTube', string> = {
    Instagram: [...new Set(hashtagsAgregadas.Instagram)].join(' '),
    TikTok: [...new Set(hashtagsAgregadas.TikTok)].join(' '),
    YouTube: [...new Set(hashtagsAgregadas.YouTube)].join(' '),
  };

  // Public response metrics
  const conteudosPostados = conteudosDoLivro.filter(c => c.status === 'Postado');
  const resultadosDoLivro = state.results.filter(r =>
    r.contentId && conteudosDoLivro.some(c => c.id === r.contentId)
  );
  const totalViews = resultadosDoLivro.reduce((sum, r) => sum + (r.views || 0), 0);
  const melhorPorViews = resultadosDoLivro.reduce((best, r) =>
    (r.views || 0) > (best?.views || 0) ? r : best,
    resultadosDoLivro[0]
  );
  const melhorPorSaves = resultadosDoLivro.reduce((best, r) =>
    (r.saves || 0) > (best?.saves || 0) ? r : best,
    resultadosDoLivro[0]
  );

  // Handlers
  const handleTransformarEmIdeia = (anotacao: BookAnnotation) => {
    const ideia: Idea = {
      id: generateUUID(),
      userId: '',
      text: anotacao.texto,
      pilarId: null,
      seriesId: null,
      origemId: livro.id,
      promotedToContentId: null,
      archived: false,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_IDEA', payload: ideia });
    dispatch({ type: 'DISTILL_ANNOTATION', payload: { livroId: livro.id, annotationId: anotacao.id } });
  };

  const handleTransformarEmConteudo = (anotacao: BookAnnotation) => {
    const novoConteudo = createContentDraft({
      title: anotacao.texto.slice(0, 60),
      status: CONTENT_STATUS.ROTEIRO,
      bibliotecaItemId: livro.id,
      notes: anotacao.texto,
    });
    dispatch({ type: 'ADD_CONTENT', payload: novoConteudo });
    navigate(buildContentDetailRoute(novoConteudo.id));
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
        titulo: infoLocal.titulo,
        autorDiretor: infoLocal.autor,
        status: infoLocal.statusLeitura,
        capaUrl: infoLocal.capaUrl || null,
        dataInicio: infoLocal.dataInicio || null,
        dataFim: infoLocal.dataFim || null,
        avaliacao: infoLocal.avaliacao ?? null,
        notasGerais: infoLocal.notasGerais || null,
        generoIds: infoLocal.generos,
        paginasLidas: infoLocal.paginasLidas === '' ? null : Number(infoLocal.paginasLidas),
        totalPaginas: infoLocal.totalPaginas === '' ? null : Number(infoLocal.totalPaginas),
        potencialConteudo: infoLocal.potencialConteudo ?? null,
        updatedAt: new Date().toISOString(),
      },
    });
    dispatch({
      type: 'SET_PREFERENCE',
      payload: {
        key: `item_meta:${livro.id}`,
        value: {
          ...metadata,
          editora: infoLocal.editora,
          anoPublicacao: infoLocal.anoPublicacao,
          isbn: infoLocal.isbn,
          idioma: infoLocal.idioma,
          traducao: infoLocal.traducao,
          serieColecao: infoLocal.serieColecao,
          colecaoStatus: infoLocal.colecaoStatus,
          colecaoNome: infoLocal.colecaoNome,
          generoAutor: infoLocal.generoAutor,
          paisAutor: infoLocal.paisAutor,
          racaAutor: infoLocal.racaAutor,
          quemIndicou: infoLocal.quemIndicou,
          motivoEscolha: infoLocal.motivoEscolha,
          capitulosCobertos,
        } satisfies BibliotecaItemMeta,
      },
    });
    setInfoSalvo(true);
    setTimeout(() => setInfoSalvo(false), 2000);
  };

  const handleCriarConteudo = () => {
    const novoConteudo = createContentDraft({
      id: generateUUID(),
      userId: '',
      title: `Conteúdo de "${livro.titulo}"`,
      status: CONTENT_STATUS.ROTEIRO,
      slotType: null,
      seriesId: null,
      pilarId: null,
      lookId: null,
      cenarioId: null,
      bibliotecaItemId: livro.id,
      formatoVisual: null,
      energiaNecessaria: null,
      publishDate: null,
      recordingDate: null,
      link: null,
      script: null,
      scriptNotes: [],
      tags: [],
      notes: null,
      referencias: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      plataformas: [],
    });
    dispatch({ type: 'ADD_CONTENT', payload: novoConteudo });
    navigate(buildContentDetailRoute(novoConteudo.id));
  };

  const handlePromoteIdeia = (ideiaId: string, ideiaText: string) => {
    const novoConteudo = createContentDraft({
      id: generateUUID(),
      userId: '',
      title: ideiaText.slice(0, 60),
      status: CONTENT_STATUS.ROTEIRO,
      slotType: null,
      seriesId: null,
      pilarId: null,
      lookId: null,
      cenarioId: null,
      bibliotecaItemId: livro.id,
      formatoVisual: null,
      energiaNecessaria: null,
      publishDate: null,
      recordingDate: null,
      link: null,
      script: null,
      scriptNotes: [],
      tags: [],
      notes: ideiaText,
      referencias: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      plataformas: [],
    });
    void dispatch({
      type: 'PROMOTE_IDEA',
      payload: {
        ideaId: ideiaId,
        contentId: novoConteudo.id,
        content: novoConteudo,
      },
    });
    navigate(buildContentDetailRoute(novoConteudo.id));
  };

  const handleAdicionarCapitulo = () => {
    if (!novoCapituloCoberto.trim()) return;
    dispatch({
      type: 'SET_PREFERENCE',
      payload: {
        key: `item_meta:${livro.id}`,
        value: {
          ...metadata,
          capitulosCobertos: [...capitulosCobertos, novoCapituloCoberto.trim()],
        } satisfies BibliotecaItemMeta,
      },
    });
    setNovoCapituloCoberto('');
  };

  const handleRemoverCapitulo = (cap: string) => {
    dispatch({
      type: 'SET_PREFERENCE',
      payload: {
        key: `item_meta:${livro.id}`,
        value: {
          ...metadata,
          capitulosCobertos: capitulosCobertos.filter(c => c !== cap),
        } satisfies BibliotecaItemMeta,
      },
    });
  };

  const handleSalvarCampanha = () => {
    if (!campForm.nome.trim()) return;
    const nova: Campaign = {
      id: generateUUID(),
      userId: '',
      nome: campForm.nome.trim(),
      tipo: 'producao',
      status: 'Planejando',
      dataInicio: campForm.dataInicio || null,
      dataFim: campForm.dataFim || null,
      metaConteudos: Number(campForm.metaConteudos) || 5,
      bibliotecaItemId: livro.id,
      brand: null,
      brandColor: null,
      color: null,
      value: null,
      currency: 'BRL',
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      etapas: [],
      contentIds: [],
    };
    dispatch({ type: 'ADD_PROJETO', payload: nova });
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

  const tabCounts: Record<Tab, number | null> = {
    info: null,
    anotacoes: livro.anotacoes.length,
    conteudos: conteudosDoLivro.length,
  };

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <BookDetailMobileScreen
            livro={livro}
            tab={tab}
            onTabChange={setTab}
            itemTypeLabel={itemTypeLabel}
            creatorLabel={creatorLabel}
            progressLabels={progressLabels}
            statusLeituraOptions={STATUS_LEITURA[livro.tipo]}
            generoOptions={GENEROS}
            infoLocal={infoLocal}
            onInfoLocalPatch={(patch) => setInfoLocal((prev) => ({ ...prev, ...patch }))}
            onSaveInfo={handleSalvarInfo}
            infoSalvo={infoSalvo}
            onRequestDelete={() =>
              setConfirm({
                message: `Remover "${livro.titulo}" da biblioteca?`,
                onConfirm: () => {
                  dispatch({ type: 'DELETE_BOOK', payload: livro.id });
                  navigate('/biblioteca');
                },
              })
            }
            filtroTipo={filtroTipo}
            onFiltroTipoChange={setFiltroTipo}
            tipoAnotacaoOptions={TIPOS}
            anotacoesFiltradas={anotacoesFiltradas}
            onOpenAnnotationComposer={() => setMobileNoteComposerOpen(true)}
            onToggleContentPotential={handleToggleContentPotential}
            onTransformIdea={handleTransformarEmIdeia}
            onTransformContent={handleTransformarEmConteudo}
            onDeleteAnotacao={handleDeleteAnotacao}
            conteudosDoLivro={conteudosDoLivro}
            ideiasDeLivro={ideiasDeLivro}
            statusCores={STATUS_CORES}
            alertaEcossistema={alertaEcossistema}
            anotacoesDestaqueCount={anotacoesDestaque.length}
            onCreateContent={handleCriarConteudo}
            onPromoteIdeia={handlePromoteIdeia}
            onOpenContent={(contentId) => navigate(buildContentDetailRoute(contentId))}
            onStartBrainstorm={() => {
              setBrainstormIdx(0);
              setBrainstormMode(true);
            }}
          />
        </div>

        <AnimatePresence>
          {brainstormMode && anotacoesDestaque.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-lg rounded-[var(--radius-overlay)] bg-[var(--bg-primary)] p-8 shadow-none"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-tertiary)]">
                    Brainstorm — {brainstormIdx + 1}/{anotacoesDestaque.length}
                  </span>
                  <button
                    onClick={() => setBrainstormMode(false)}
                    className="rounded-full p-2 transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    <X className="h-5 w-5 text-[var(--text-tertiary)]" />
                  </button>
                </div>
                <p className="mb-8 text-lg font-medium leading-relaxed text-[var(--text-primary)]">
                  &quot;{anotacoesDestaque[brainstormIdx]?.texto}&quot;
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => handleBrainstormConteudo(anotacoesDestaque[brainstormIdx])}
                    className="flex-1 rounded-[var(--radius-card-mobile)] bg-[var(--text-primary)] py-3 text-xs font-semibold text-[var(--bg-primary)] transition-all hover:scale-[1.02] md:rounded-[var(--radius-card)]"
                  >
                    → Virar Conteúdo
                  </button>
                  <button
                    onClick={() => handleBrainstormIdeia(anotacoesDestaque[brainstormIdx])}
                    className="flex-1 rounded-[var(--radius-card-mobile)] border border-[var(--border-strong)] py-3 text-xs font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-hover)] md:rounded-[var(--radius-card)]"
                  >
                    → Virar Ideia
                  </button>
                  <button
                    onClick={handleBrainstormPular}
                    className="px-4 py-3 text-xs font-semibold text-[var(--text-primary)] opacity-40 transition-opacity hover:opacity-80"
                  >
                    Pular →
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ConfirmModal
          open={!!confirm}
          message={confirm?.message || ''}
          onConfirm={() => {
            confirm?.onConfirm();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
        <BookAnnotationComposerSheet
          book={livro}
          open={mobileNoteComposerOpen}
          onClose={() => setMobileNoteComposerOpen(false)}
        />
      </>
    );
  }

  return (
    <>
    <PageLayout
      variant="settings"
      contentWidth="book"
      header={
        <DesktopPageHeader
          section="Biblioteca"
          title={livro.titulo}
          meta={[livro.autorDiretor, itemTypeLabel, livro.status].filter(Boolean).join(' · ')}
          icon={ItemIcon}
          backLabel="Biblioteca"
          backTo="/biblioteca"
          className="mb-0"
        />
      }
    >
      <div className="hidden md:block">
        <PipelineActionBar
          className="mb-4"
          title="Transformar leitura em conteúdo"
          description="Crie uma ideia editorial a partir deste item da biblioteca."
          primaryLabel="Transformar em ideia"
          onPrimary={() => {
            const ideia: Idea = {
              id: generateUUID(),
              userId: '',
              text: livro.notasGerais?.trim()
                || `Conteúdo sobre "${livro.titulo}"${livro.autorDiretor ? ` — ${livro.autorDiretor}` : ''}`,
              pilarId: null,
              seriesId: null,
              origemId: livro.id,
              promotedToContentId: null,
              archived: false,
              createdAt: new Date().toISOString(),
            };
            dispatch({ type: 'ADD_IDEA', payload: ideia });
            navigate('/ideias');
          }}
        />
      </div>

      <div className="hidden md:block">
        {/* Barra de tabs separada */}
        <div className="mb-6 mt-2 flex border-b border-[var(--border-color)] md:mb-8">
          {(['info', 'anotacoes', 'conteudos'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-3 pb-3 pt-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all md:px-4 md:tracking-widest ${
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
              <div className="aspect-[2/3] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] overflow-hidden bg-[var(--bg-hover)] shadow-md">
                {livro.capaUrl ? (
                  <img src={livro.capaUrl} alt={livro.titulo} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ItemIcon className="w-10 h-10 text-[var(--text-tertiary)]" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-bold  text-[var(--text-tertiary)] mb-2">Avaliação</p>
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
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Título</label>
                    <input type="text" value={infoLocal.titulo} onChange={e => setInfoLocal(prev => ({ ...prev, titulo: e.target.value }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{creatorLabel}</label>
                    <input type="text" value={infoLocal.autor} onChange={e => setInfoLocal(prev => ({ ...prev, autor: e.target.value }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                  </div>
                </div>
                <div className="mt-4">
                  <TagSelect
                    label="Generos"
                    hint="Selecione um ou mais generos para categorizar este item."
                    values={infoLocal.generos}
                    onChange={generos => setInfoLocal(prev => ({ ...prev, generos: generos as GeneroLivro[] }))}
                    options={GENEROS.map(genero => ({ value: genero, label: genero }))}
                    placeholder="Selecione generos"
                  />
                </div>
              </section>

              {/* Seção 2 — Consumo */}
              <section className="border-t border-[var(--border-color)] pt-6">
                <span className={SECTION_LABEL}>Consumo</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Status</label>
                    <select value={infoLocal.statusLeitura} onChange={e => setInfoLocal(prev => ({ ...prev, statusLeitura: e.target.value as StatusLeitura }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]">
                      {STATUS_LEITURA[livro.tipo].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">URL da Capa</label>
                    <input type="url" value={infoLocal.capaUrl} onChange={e => setInfoLocal(prev => ({ ...prev, capaUrl: e.target.value }))} placeholder="https://..." className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Início</label>
                    <input type="date" value={infoLocal.dataInicio} onChange={e => setInfoLocal(prev => ({ ...prev, dataInicio: e.target.value }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Fim</label>
                    <input type="date" value={infoLocal.dataFim} onChange={e => setInfoLocal(prev => ({ ...prev, dataFim: e.target.value }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{progressLabels.current}</label>
                    <input type="number" min={0} value={infoLocal.paginasLidas} onChange={e => setInfoLocal(prev => ({ ...prev, paginasLidas: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder={livro.tipo === 'filme' ? 'Ex: 95' : livro.tipo === 'série' || livro.tipo === 'anime' ? 'Ex: 8' : 'Ex: 120'} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{progressLabels.total}</label>
                    <input type="number" min={1} value={infoLocal.totalPaginas} onChange={e => setInfoLocal(prev => ({ ...prev, totalPaginas: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder={livro.tipo === 'filme' ? 'Ex: 130' : livro.tipo === 'série' || livro.tipo === 'anime' ? 'Ex: 10' : 'Ex: 380'} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                  </div>
                </div>
                {(infoLocal.totalPaginas as number) > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold  text-[var(--text-tertiary)]">Progresso</label>
                      <span className="text-xs font-semibold text-[var(--accent-purple)]">
                        {(infoLocal.paginasLidas as number || 0)}/{infoLocal.totalPaginas} {progressLabels.unit} · {Math.min(100, Math.round(((infoLocal.paginasLidas as number || 0) / (infoLocal.totalPaginas as number)) * 100))}%
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
                  {showTechnical ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
                </button>
                {showTechnical && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{technicalLabels.publisher}</label>
                      <input type="text" value={infoLocal.editora} onChange={e => setInfoLocal(prev => ({ ...prev, editora: e.target.value }))} placeholder={technicalLabels.publisherPlaceholder} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Ano de Publicação</label>
                      <input type="number" value={infoLocal.anoPublicacao} onChange={e => setInfoLocal(prev => ({ ...prev, anoPublicacao: e.target.value }))} placeholder="2024" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    {(livro.tipo === 'livro' || livro.tipo === 'manga') && (
                      <div>
                        <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">ISBN</label>
                        <input type="text" value={infoLocal.isbn} onChange={e => setInfoLocal(prev => ({ ...prev, isbn: e.target.value }))} placeholder="978-..." className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Idioma</label>
                      <input type="text" value={infoLocal.idioma} onChange={e => setInfoLocal(prev => ({ ...prev, idioma: e.target.value }))} placeholder="Português" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{technicalLabels.translation}</label>
                      <input type="text" value={infoLocal.traducao} onChange={e => setInfoLocal(prev => ({ ...prev, traducao: e.target.value }))} placeholder={technicalLabels.translationPlaceholder} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{technicalLabels.collection}</label>
                      <input type="text" value={infoLocal.serieColecao} onChange={e => setInfoLocal(prev => ({ ...prev, serieColecao: e.target.value }))} placeholder={technicalLabels.collectionPlaceholder} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    {(livro.tipo === 'livro' || livro.tipo === 'manga') && (
                      <>
                        <div>
                          <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Série ou coleção?</label>
                          <select value={infoLocal.colecaoStatus} onChange={e => setInfoLocal(prev => ({ ...prev, colecaoStatus: e.target.value as 'sim' | 'nao', colecaoNome: e.target.value === 'nao' ? '' : prev.colecaoNome }))} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)]">
                            <option value="nao">Não</option>
                            <option value="sim">Sim</option>
                          </select>
                        </div>
                        {infoLocal.colecaoStatus === 'sim' && (
                          <div>
                            <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Qual coleção?</label>
                            <input type="text" value={infoLocal.colecaoNome} onChange={e => setInfoLocal(prev => ({ ...prev, colecaoNome: e.target.value, serieColecao: e.target.value }))} placeholder="Ex: Trono de Vidro" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                          </div>
                        )}
                        <div>
                          <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Gênero do autor</label>
                          <input type="text" value={infoLocal.generoAutor} onChange={e => setInfoLocal(prev => ({ ...prev, generoAutor: e.target.value }))} placeholder="Ex: mulher, homem, não binárie" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                        </div>
                        <div>
                          <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">País do autor</label>
                          <input type="text" value={infoLocal.paisAutor} onChange={e => setInfoLocal(prev => ({ ...prev, paisAutor: e.target.value }))} placeholder="Ex: Nigéria" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                        </div>
                        <div>
                          <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Raça do autor</label>
                          <input type="text" value={infoLocal.racaAutor} onChange={e => setInfoLocal(prev => ({ ...prev, racaAutor: e.target.value }))} placeholder="Como você prefere catalogar" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                        </div>
                      </>
                    )}
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
                  {showParaVoce ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
                </button>
                {showParaVoce && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Quem Indicou</label>
                      <input type="text" value={infoLocal.quemIndicou} onChange={e => setInfoLocal(prev => ({ ...prev, quemIndicou: e.target.value }))} placeholder="Ex: Podcast X, amiga Y..." className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Por que Escolheu</label>
                      <textarea value={infoLocal.motivoEscolha} onChange={e => setInfoLocal(prev => ({ ...prev, motivoEscolha: e.target.value }))} rows={3} placeholder="Motivação, contexto..." className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] resize-none placeholder:opacity-30" />
                    </div>
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-2">Potencial de Conteúdo</label>
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

              {/* Salvar / Remover */}
              <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                <button
                  onClick={() => setConfirm({ message: `Remover "${livro.titulo}" da biblioteca?`, onConfirm: () => { dispatch({ type: 'DELETE_BOOK', payload: livro.id }); navigate('/biblioteca'); } })}
                  className="text-xs font-bold text-[var(--accent-pink)] opacity-50 hover:opacity-100 transition-opacity"
                >
                  Remover item
                </button>
                <button
                  onClick={handleSalvarInfo}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold  rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
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
            <div className="rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">Nova nota</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-primary)] opacity-65">
                    Abra um composer rapido para registrar uma anotação sem misturar com a lista existente.
                  </p>
                </div>
                <button
                  onClick={() => setMobileNoteComposerOpen(true)}
                  className="flex shrink-0 items-center gap-2 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--text-primary)] px-4 py-3 text-xs font-semibold  text-[var(--bg-primary)] transition-all hover:scale-[1.02]"
                >
                  <Plus className="h-4 w-4" />
                  Nova anotação
                </button>
              </div>
            </div>

            {/* Filtros por tipo + Destaques */}
            <div className="flex gap-2 flex-wrap">
              {(['Todos', 'Destaques', ...TIPOS] as (TipoAnotacao | 'Todos' | 'Destaques')[]).map(t => (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
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
                <p className="text-[var(--text-tertiary)] font-bold text-sm ">Nenhuma anotação ainda</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {anotacoesFiltradas.map(a => (
                  <AnnotationNoteCard
                    key={a.id}
                    anotacao={a}
                    onToggleHighlight={() => handleToggleContentPotential(a)}
                    onTransformIdea={() => handleTransformarEmIdeia(a)}
                    onTransformContent={() => handleTransformarEmConteudo(a)}
                    onDelete={() => handleDeleteAnotacao(a.id)}
                    actionsClassName="opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity"
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ ABA: CONTEÚDOS ════ */}
        {tab === 'conteudos' && (
          <div className="space-y-6 pb-10">
            {/* Ponto de contexto */}
            {alertaEcossistema && (
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] px-5 py-4">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700 font-medium">Esse {itemTypeLabel.toLowerCase()} ja foi concluido e ainda pode render conteudo quando fizer sentido.</p>
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
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{stat.value}</span>
                  <span className="text-xs text-[var(--text-secondary)] opacity-50">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Botão Novo Conteúdo hero */}
            <button
              onClick={handleCriarConteudo}
              className="w-full flex items-center justify-center gap-2 py-4 bg-[var(--text-primary)] text-[var(--bg-primary)] text-sm font-semibold  rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] hover:scale-[1.01] transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Novo Conteúdo
            </button>

            {/* Brainstorm CTA */}
            {anotacoesDestaque.length > 0 && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] px-5 py-4">
                <p className="text-sm font-bold text-amber-800 mb-2">
                  ⭐ Você tem {anotacoesDestaque.length} destaque{anotacoesDestaque.length > 1 ? 's' : ''} prontos para virar conteúdo.
                </p>
                <button
                  onClick={() => { setBrainstormIdx(0); setBrainstormMode(true); }}
                  className="text-xs font-semibold  text-amber-700 hover:text-amber-900 transition-colors"
                >
                  Brainstormar →
                </button>
              </div>
            )}

            {/* ── Campanhas ── */}
            <section className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className={SECTION_LABEL + ' mb-0'}>Produção Editorial</span>
                <button
                  onClick={() => setNovaCampanhaAberta(v => !v)}
                  className="text-xs font-semibold  text-[var(--accent-blue)] hover:underline"
                >
                  + Nova Produção
                </button>
              </div>

              {novaCampanhaAberta && (
                <div className="mb-4 p-4 bg-[var(--bg-hover)] rounded-xl space-y-3">
                  <input
                    type="text"
                    value={campForm.nome}
                    onChange={e => setCampForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Nome da produção editorial"
                    className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1">Início</label>
                      <input type="date" value={campForm.dataInicio} onChange={e => setCampForm(p => ({ ...p, dataInicio: e.target.value }))} className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1">Fim</label>
                      <input type="date" value={campForm.dataFim} onChange={e => setCampForm(p => ({ ...p, dataFim: e.target.value }))} className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1">Meta de peças</label>
                    <input type="number" min={1} value={campForm.metaConteudos} onChange={e => setCampForm(p => ({ ...p, metaConteudos: e.target.value }))} className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)]" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSalvarCampanha} className="flex-1 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold  rounded-xl hover:scale-[1.02] transition-all">Salvar</button>
                    <button onClick={() => setNovaCampanhaAberta(false)} className="px-4 py-2 border border-[var(--border-strong)] text-[var(--text-primary)] opacity-50 text-xs font-bold rounded-xl hover:opacity-80 transition-opacity">Cancelar</button>
                  </div>
                </div>
              )}

              {campanhasDoLivro.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-4">Nenhuma produção editorial ainda</p>
              ) : (
                <div className="space-y-3">
                  {campanhasDoLivro.map(camp => {
                    const criados = conteudosDoLivro.length;
                    const progresso = Math.min(100, Math.round((criados / camp.metaConteudos) * 100));
                    return (
                      <div key={camp.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[var(--text-primary)]">{camp.nome}</span>
                          <span className="text-xs font-semibold text-[var(--text-tertiary)]">{criados}/{camp.metaConteudos} peças</span>
                        </div>
                        <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--accent-blue)] rounded-full transition-all" style={{ width: `${progresso}%` }} />
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)]">{camp.status}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Ideias deste livro ── */}
            {ideiasDeLivro.length > 0 && (
              <div className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-5">
                <h3 className="text-xs font-semibold  text-[var(--text-tertiary)] mb-3">
                  Ideias deste {itemTypeLabel.toLowerCase()} ({ideiasDeLivro.length})
                </h3>
                <div className="space-y-2">
                  {ideiasDeLivro.map(ideia => (
                    <div key={ideia.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-color)] last:border-0">
                      <Lightbulb className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
                      <p className="text-sm text-[var(--text-primary)] opacity-70 flex-1">{ideia.text}</p>
                      <button
                        onClick={() => handlePromoteIdeia(ideia.id, ideia.text)}
                        className="text-xs font-semibold  text-[var(--accent-blue)] hover:underline shrink-0"
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
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all capitalize ${
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
                      <h3 className="text-xs font-semibold  text-[var(--text-tertiary)] mb-3">{grupo}</h3>
                      <div className="space-y-2">
                        {conteudos.map(c => (
                          <button
                            key={c.id}
                            onClick={() => navigate(buildContentDetailRoute(c.id))}
                            className="w-full flex items-center gap-4 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] hover:border-[var(--text-primary)]/30 transition-all text-left group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{c.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className="text-xs text-[var(--text-secondary)] opacity-50">{c.pilarId}</p>
                                {c.publishDate && <p className="text-xs text-[var(--text-secondary)] opacity-40">📅 {c.publishDate}</p>}
                                {c.recordingDate && <p className="text-xs text-[var(--text-secondary)] opacity-40">🎙️ {c.recordingDate}</p>}
                              </div>
                            </div>
                            <span className={`text-xs font-semibold  px-2.5 py-1 rounded-full shrink-0 ${STATUS_CORES[c.status] || 'bg-[var(--bg-hover)] text-[var(--text-primary)]'}`}>
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
                <ItemIcon className="w-10 h-10 text-[var(--text-primary)] opacity-10 mx-auto mb-3" />
                <p className="text-[var(--text-tertiary)] font-bold text-sm ">
                  Nenhum conteúdo criado a partir deste {itemTypeLabel.toLowerCase()} ainda
                </p>
              </div>
            )}

            {/* ── Capítulos/Partes cobertos ── */}
            <section className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-5">
              <span className={SECTION_LABEL}>{coverageLabels.section}</span>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={novoCapituloCoberto}
                  onChange={e => setNovoCapituloCoberto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdicionarCapitulo(); }}
                  placeholder={coverageLabels.placeholder}
                  className="flex-1 text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40"
                />
                <button
                  onClick={handleAdicionarCapitulo}
                  disabled={!novoCapituloCoberto.trim()}
                  className="px-4 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold rounded-xl disabled:opacity-30 hover:scale-[1.02] transition-all"
                >
                  Adicionar
                </button>
              </div>
              {capitulosCobertos.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">{coverageLabels.empty}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {capitulosCobertos.map((cap: string) => (
                    <div key={cap} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)]">
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
            <section className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-5">
              <button
                onClick={() => setHashtagsAberto(v => !v)}
                className="flex items-center gap-2 w-full text-left"
              >
                <Hash className="w-4 h-4 text-[var(--text-tertiary)]" />
                <span className="text-xs font-semibold  text-[var(--text-primary)] opacity-50 hover:opacity-80 transition-opacity flex-1">
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
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
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
                        {hashtagCopiado ? <Check className="w-4 h-4 text-[var(--accent-green)]" /> : <Copy className="w-4 h-4 text-[var(--text-tertiary)]" />}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-tertiary)]">Nenhuma hashtag configurada nos pilares dos conteúdos deste item.</p>
                  )}
                </div>
              )}
            </section>

            {/* ── Resposta do publico ── */}
            {resultadosDoLivro.length > 0 && (
              <section className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-[var(--accent-green)]" />
                  <span className={SECTION_LABEL + ' mb-0'}>Resposta do publico</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                    <p className="text-xs font-bold  text-[var(--text-tertiary)] mb-1">Visualizacoes</p>
                    <p className="text-xl font-semibold text-[var(--text-primary)]">{totalViews.toLocaleString()}</p>
                  </div>
                  {melhorPorViews && (
                    <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                      <p className="text-xs font-bold  text-[var(--text-tertiary)] mb-1">Mais visto</p>
                      <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2">
                        {state.contents.find(c => c.id === melhorPorViews.contentId)?.title || '—'}
                      </p>
                      <p className="text-xs text-[var(--accent-green)] font-bold">{melhorPorViews.views?.toLocaleString()} views</p>
                    </div>
                  )}
                  {melhorPorSaves && (
                    <div className="bg-[var(--bg-hover)] rounded-xl p-3">
                      <p className="text-xs font-bold  text-[var(--text-tertiary)] mb-1">Mais Saves</p>
                      <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2">
                        {state.contents.find(c => c.id === melhorPorSaves.contentId)?.title || '—'}
                      </p>
                      <p className="text-xs text-[var(--accent-blue)] font-bold">{melhorPorSaves.saves?.toLocaleString()} saves</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageLayout>

      {/* ── Modal Brainstorm ── */}
      <AnimatePresence>
        {brainstormMode && anotacoesDestaque.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50  p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[var(--bg-primary)] rounded-[var(--radius-overlay)] p-8 max-w-lg w-full shadow-none"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-semibold  text-[var(--text-tertiary)]">
                  Brainstorm — {brainstormIdx + 1}/{anotacoesDestaque.length}
                </span>
                <button onClick={() => setBrainstormMode(false)} className="p-2 hover:bg-[var(--bg-hover)] rounded-full transition-colors">
                  <X className="w-5 h-5 text-[var(--text-tertiary)]" />
                </button>
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)] leading-relaxed mb-8">
                "{anotacoesDestaque[brainstormIdx]?.texto}"
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => handleBrainstormConteudo(anotacoesDestaque[brainstormIdx])}
                  className="flex-1 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs font-semibold  rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] hover:scale-[1.02] transition-all"
                >
                  → Virar Conteúdo
                </button>
                <button
                  onClick={() => handleBrainstormIdeia(anotacoesDestaque[brainstormIdx])}
                  className="flex-1 py-3 border border-[var(--border-strong)] text-[var(--text-primary)] text-xs font-semibold  rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] hover:bg-[var(--bg-hover)] transition-all"
                >
                  → Virar Ideia
                </button>
                <button
                  onClick={handleBrainstormPular}
                  className="py-3 px-4 text-[var(--text-primary)] opacity-40 text-xs font-semibold  hover:opacity-80 transition-opacity"
                >
                  Pular →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de conteúdo */}
      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
      <BookAnnotationComposerSheet
        book={livro}
        open={mobileNoteComposerOpen}
        onClose={() => setMobileNoteComposerOpen(false)}
      />
    </>
  );
}
