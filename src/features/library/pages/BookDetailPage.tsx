import { useEffect, useState, type ReactNode } from 'react';
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
} from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { Anotacao, BibliotecaItem, BibliotecaItemMeta, Content, fetchBibliotecaItemById, Idea, Projeto } from '../../../lib/database';
import { generateUUID as _uuid } from '../../../utils/uuid';
type BookAnnotation = Anotacao;
type TipoAnotacao = Anotacao['tipo'];
type StatusLeitura = BibliotecaItem['status'];
type GeneroLivro = string;
type Campaign = Projeto;
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { createContentDraft } from '../../contents/lib/createContentDraft';
import { buildIdeaFields, getIdeaNotes, getIdeaTitle, parseLegacyIdeaText } from '../../ideas/lib/ideaText';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { CONTENT_STATUS, getDisplayStatus } from '../../contents/lib/contentPipeline';
import { BookAnnotationComposerSheet } from '../components/modals/BookAnnotationComposerSheet';
import { generateUUID } from '../../../utils/uuid';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { PipelineActionBar } from '../../../components/pipeline/PipelineActionBar';
import { AnnotationNoteCard } from '../components/AnnotationNoteCard';
import { TagSelect } from '../../../components/ui/TagSelect';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { BookDetailMobileScreen } from '../../../mobile/screens/library/BookDetailMobileScreen';
import { Text } from '../../../components/ui/Text';
import { Surface } from '../../../components/ui/Surface';
import { AppButton } from '../../../components/ui/AppButton';
import { cn } from '../../../lib/utils';

const FOCUS_INTERACTIVE = 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

const STATUS_CORES: Record<string, string> = {
  'Ideia': 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
  'Roteiro': 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  'Produção': 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
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

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text variant="label" uppercase className={cn('mb-4 block opacity-30', className)}>
      {children}
    </Text>
  );
}

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
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const livro = state.bibliotecaItems.find(b => b.id === id);

  useEffect(() => {
    if (!id || !user || livro) return;
    void fetchBibliotecaItemById(user.id, id).then(item => {
      if (item) dispatch({ type: 'ADD_BIBLIOTECA_ITEM', payload: item });
    });
  }, [dispatch, id, livro, user]);
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
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

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
          <Text variant="bodyStrong" className="mb-4 text-[var(--text-tertiary)]">Item não encontrado</Text>
          <button
            type="button"
            onClick={() => navigate('/biblioteca')}
            className={cn('text-xs font-bold text-[var(--accent-blue)] hover:underline', FOCUS_INTERACTIVE)}
          >
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

  // Handlers
  const handleTransformarEmIdeia = (anotacao: BookAnnotation) => {
    const parsed = parseLegacyIdeaText(anotacao.texto);
    const fields = buildIdeaFields({
      title: parsed.title || anotacao.texto.slice(0, 60),
      notes: parsed.notes,
    });
    const ideia: Idea = {
      id: generateUUID(),
      userId: '',
      ...fields,
      pilarId: null,
      seriesId: null,
      origemId: livro.id,
      promotedToContentId: null,
      demotedFromContentId: null,
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
      driveUrl: null,
      shareToken: null,
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
                ...CONFIRM.excluirBiblioteca(livro.titulo),
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop-strong)] p-4"
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
          confirmLabel={confirm?.confirmLabel}
          cancelLabel={confirm?.cancelLabel}
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
      contentStack="dense"
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
            const fields = buildIdeaFields({
              title: `Conteúdo sobre "${livro.titulo}"`,
              notes:
                livro.notasGerais?.trim()
                || (livro.autorDiretor ? livro.autorDiretor : ''),
            });
            const ideia: Idea = {
              id: generateUUID(),
              userId: '',
              ...fields,
              pilarId: null,
              seriesId: null,
              origemId: livro.id,
              promotedToContentId: null,
      demotedFromContentId: null,
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
              type="button"
              onClick={() => setTab(t)}
              className={cn('relative px-3 pb-3 pt-2 transition-all md:px-4', FOCUS_INTERACTIVE)}
            >
              <Text
                variant="label"
                uppercase
                className={cn(
                  'font-semibold',
                  tab === t
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-primary)] opacity-30 hover:opacity-60'
                )}
              >
                {t === 'info' ? 'Info' : t === 'anotacoes' ? `Notas${tabCounts.anotacoes !== null ? ` (${tabCounts.anotacoes})` : ''}` : `Conteúdos${tabCounts.conteudos !== null ? ` (${tabCounts.conteudos})` : ''}`}
              </Text>
              {tab === t && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-primary)] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* ════ ABA: INFO ════ */}
        {tab === 'info' && (
          <div className="grid-book-hero pb-10">
            {/* Capa + Avaliação */}
            <div className="stack-lg">
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
                <Text variant="label" className="mb-2 block font-bold">Avaliação</Text>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setInfoLocal(prev => ({ ...prev, avaliacao: n as 1 | 2 | 3 | 4 | 5 }))}
                      className={FOCUS_INTERACTIVE}
                    >
                      <Star className={cn('w-5 h-5 transition-colors', n <= (infoLocal.avaliacao || 0) ? 'fill-[var(--warning)] text-[var(--warning)]' : 'text-[var(--border-strong)] hover:text-[var(--warning)]/70')} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Campos direita */}
            <div className="stack-2xl">

              {/* Seção 1 — Identificação */}
              <section>
                <SectionLabel>Identificação</SectionLabel>
                <div className="grid-form">
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
                <SectionLabel>Consumo</SectionLabel>
                <div className="grid-form">
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
                  type="button"
                  onClick={() => setShowTechnical(v => !v)}
                  className={cn('mb-3 flex w-full items-center gap-2 text-left', FOCUS_INTERACTIVE)}
                >
                  <SectionLabel className="mb-0">Detalhes Técnicos</SectionLabel>
                  {showTechnical ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
                </button>
                {showTechnical && (
                  <div className="grid-form">
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
                  type="button"
                  onClick={() => setShowParaVoce(v => !v)}
                  className={cn('mb-3 flex w-full items-center gap-2 text-left', FOCUS_INTERACTIVE)}
                >
                  <SectionLabel className="mb-0">Para você</SectionLabel>
                  {showParaVoce ? <ChevronUp className="w-3.5 h-3.5 text-[var(--text-tertiary)]" /> : <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />}
                </button>
                {showParaVoce && (
                  <div className="stack-lg">
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
                            type="button"
                            onClick={() => setInfoLocal(prev => ({ ...prev, potencialConteudo: prev.potencialConteudo === v ? undefined : v }))}
                            className={cn(
                              'rounded-xl border px-3 py-1.5 text-base transition-all',
                              FOCUS_INTERACTIVE,
                              infoLocal.potencialConteudo === v
                                ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
                                : 'border-[var(--border-strong)] opacity-50 hover:opacity-80',
                            )}
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
                <SectionLabel>Notas Gerais</SectionLabel>
                <textarea
                  value={infoLocal.notasGerais}
                  onChange={e => setInfoLocal(prev => ({ ...prev, notasGerais: e.target.value }))}
                  rows={5}
                  placeholder="Impressões gerais, contexto..."
                  className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-4 py-3 text-[var(--text-primary)] resize-none placeholder:opacity-30"
                />
              </section>

              {/* Salvar / Remover */}
              <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-4">
                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirm({
                    ...CONFIRM.excluirBiblioteca(livro.titulo),
                    onConfirm: () => { dispatch({ type: 'DELETE_BOOK', payload: livro.id }); navigate('/biblioteca'); },
                  })}
                  className="font-bold text-[var(--accent-pink)] opacity-50 hover:opacity-100"
                >
                  Remover item
                </AppButton>
                <AppButton
                  variant="primary"
                  size="sm"
                  leftIcon={<Check className="h-3.5 w-3.5" />}
                  onClick={handleSalvarInfo}
                >
                  {infoSalvo ? 'Salvo!' : 'Salvar'}
                </AppButton>
              </div>
            </div>
          </div>
        )}

        {/* ════ ABA: ANOTAÇÕES ════ */}
        {tab === 'anotacoes' && (
          <div className="stack-xl pb-10">
            <div className="rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Text variant="label" uppercase className="font-semibold">Nova nota</Text>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-primary)] opacity-65">
                    Abra um composer rapido para registrar uma anotação sem misturar com a lista existente.
                  </p>
                </div>
                <AppButton
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => setMobileNoteComposerOpen(true)}
                  className="shrink-0"
                >
                  Nova anotação
                </AppButton>
              </div>
            </div>

            {/* Filtros por tipo + Destaques */}
            <div className="flex gap-2 flex-wrap">
              {(['Todos', 'Destaques', ...TIPOS] as (TipoAnotacao | 'Todos' | 'Destaques')[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFiltroTipo(t)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-bold transition-all',
                    FOCUS_INTERACTIVE,
                    filtroTipo === t
                      ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-secondary)]'
                      : 'border-[var(--border-strong)] bg-transparent text-[var(--text-primary)] opacity-40 hover:opacity-70',
                  )}
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
          <div className="stack-xl pb-10">
            {/* Ponto de contexto */}
            {alertaEcossistema && (
              <div className="flex items-center gap-3 rounded-[var(--radius-card-mobile)] border border-[var(--accent-orange)]/25 bg-[var(--accent-orange)]/10 px-6 py-4 md:rounded-[var(--radius-card)]">
                <AlertCircle className="w-5 h-5 shrink-0 text-[var(--accent-orange)]" />
                <p className="text-sm font-medium text-[var(--accent-orange)]">Esse {itemTypeLabel.toLowerCase()} ja foi concluido e ainda pode render conteudo quando fizer sentido.</p>
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
            <AppButton
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleCriarConteudo}
            >
              Novo Conteúdo
            </AppButton>

            {/* Brainstorm CTA */}
            {anotacoesDestaque.length > 0 && (
              <div className="rounded-[var(--radius-card-mobile)] border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-6 py-4 md:rounded-[var(--radius-card)]">
                <p className="mb-2 text-sm font-bold text-[var(--warning)]">
                  ⭐ Você tem {anotacoesDestaque.length} destaque{anotacoesDestaque.length > 1 ? 's' : ''} prontos para virar conteúdo.
                </p>
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={() => { setBrainstormIdx(0); setBrainstormMode(true); }}
                  className="text-[var(--warning)]"
                >
                  Brainstormar →
                </AppButton>
              </div>
            )}

            {/* ── Campanhas ── */}
            <section className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionLabel className="mb-0">Produção Editorial</SectionLabel>
                <AppButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setNovaCampanhaAberta(v => !v)}
                  className="text-[var(--accent-blue)]"
                >
                  + Nova Produção
                </AppButton>
              </div>

              {novaCampanhaAberta && (
                <div className="mb-4 p-4 bg-[var(--bg-hover)] rounded-xl stack-md">
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
                    <AppButton variant="primary" size="sm" fullWidth onClick={handleSalvarCampanha}>
                      Salvar
                    </AppButton>
                    <AppButton variant="secondary" size="sm" onClick={() => setNovaCampanhaAberta(false)}>
                      Cancelar
                    </AppButton>
                  </div>
                </div>
              )}

              {campanhasDoLivro.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-4">Nenhuma produção editorial ainda</p>
              ) : (
                <div className="stack-md">
                  {campanhasDoLivro.map(camp => {
                    const criados = conteudosDoLivro.length;
                    const progresso = Math.min(100, Math.round((criados / camp.metaConteudos) * 100));
                    return (
                      <div key={camp.id} className="stack-sm">
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
              <div className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-6">
                <Text variant="itemTitle" className="mb-3 text-[var(--text-tertiary)]">
                  Ideias deste {itemTypeLabel.toLowerCase()} ({ideiasDeLivro.length})
                </Text>
                <div className="stack-sm">
                  {ideiasDeLivro.map(ideia => (
                    <div key={ideia.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-color)] last:border-0">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 text-[var(--warning)]" />
                      <p className="text-sm text-[var(--text-primary)] opacity-70 flex-1">{ideia.text}</p>
                      <AppButton
                        variant="ghost"
                        size="xs"
                        onClick={() => handlePromoteIdeia(ideia.id, ideia.text)}
                        className="shrink-0 text-[var(--accent-blue)]"
                      >
                        → Conteúdo
                      </AppButton>
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
                      type="button"
                      onClick={() => setEcossistemaAgrupamento(ag)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all',
                        FOCUS_INTERACTIVE,
                        ecossistemaAgrupamento === ag
                          ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)]'
                          : 'bg-[var(--bg-hover)] text-[var(--text-primary)] opacity-50 hover:opacity-80',
                      )}
                    >
                      Por {ag}
                    </button>
                  ))}
                </div>

                <div className="stack-xl">
                  {(Object.entries(
                    ecossistemaAgrupamento === 'slot' ? conteudosPorSlot : conteudosPorPlataforma
                  ) as [string, typeof conteudosDoLivro][]).map(([grupo, conteudos]) => (
                    <div key={grupo}>
                      <Text variant="itemTitle" className="mb-3 text-[var(--text-tertiary)]">{grupo}</Text>
                      <div className="stack-sm">
                        {conteudos.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => navigate(buildContentDetailRoute(c.id))}
                            className={cn(
                              'group flex w-full items-center gap-4 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-left transition-all hover:border-[var(--text-primary)]/30 md:rounded-[var(--radius-card)]',
                              FOCUS_INTERACTIVE,
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">{c.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <p className="text-xs text-[var(--text-secondary)] opacity-50">{c.pilarId}</p>
                                {c.publishDate && <p className="text-xs text-[var(--text-secondary)] opacity-40">📅 {c.publishDate}</p>}
                                {c.recordingDate && <p className="text-xs text-[var(--text-secondary)] opacity-40">🎙️ {c.recordingDate}</p>}
                              </div>
                            </div>
                            <span className={`text-xs font-semibold  px-2.5 py-1 rounded-full shrink-0 ${STATUS_CORES[getDisplayStatus(c)] || 'bg-[var(--bg-hover)] text-[var(--text-primary)]'}`}>
                              {getDisplayStatus(c)}
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
            <section className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-6">
              <SectionLabel>{coverageLabels.section}</SectionLabel>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={novoCapituloCoberto}
                  onChange={e => setNovoCapituloCoberto(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdicionarCapitulo(); }}
                  placeholder={coverageLabels.placeholder}
                  className="flex-1 text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-40"
                />
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={handleAdicionarCapitulo}
                  disabled={!novoCapituloCoberto.trim()}
                >
                  Adicionar
                </AppButton>
              </div>
              {capitulosCobertos.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">{coverageLabels.empty}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {capitulosCobertos.map((cap: string) => (
                    <div key={cap} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)]">
                      <span>{cap}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoverCapitulo(cap)}
                        className={cn('ml-1 opacity-40 transition-opacity hover:opacity-100', FOCUS_INTERACTIVE)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Hashtag Manager ── */}
            <section className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-6">
              <button
                type="button"
                onClick={() => setHashtagsAberto(v => !v)}
                className={cn('flex w-full items-center gap-2 text-left', FOCUS_INTERACTIVE)}
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
                        type="button"
                        onClick={() => setHashtagTab(plat)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
                          FOCUS_INTERACTIVE,
                          hashtagTab === plat
                            ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)]'
                            : 'bg-[var(--bg-hover)] text-[var(--text-primary)] opacity-50 hover:opacity-80',
                        )}
                      >
                        {plat}
                      </button>
                    ))}
                  </div>
                  {hashtagsUnicas[hashtagTab] ? (
                    <div className="bg-[var(--bg-hover)] rounded-xl p-3 relative">
                      <p className="text-xs text-[var(--text-primary)] opacity-70 pr-10">{hashtagsUnicas[hashtagTab]}</p>
                      <button
                        type="button"
                        onClick={() => handleCopiarHashtags(hashtagsUnicas[hashtagTab])}
                        className={cn('absolute right-2 top-2 rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-secondary)]', FOCUS_INTERACTIVE)}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop-strong)] p-4"
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
                <button
                  type="button"
                  onClick={() => setBrainstormMode(false)}
                  className={cn('rounded-full p-2 transition-colors hover:bg-[var(--bg-hover)]', FOCUS_INTERACTIVE)}
                >
                  <X className="w-5 h-5 text-[var(--text-tertiary)]" />
                </button>
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)] leading-relaxed mb-8">
                "{anotacoesDestaque[brainstormIdx]?.texto}"
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <AppButton
                  variant="primary"
                  fullWidth
                  onClick={() => handleBrainstormConteudo(anotacoesDestaque[brainstormIdx])}
                >
                  → Virar Conteúdo
                </AppButton>
                <AppButton
                  variant="secondary"
                  fullWidth
                  onClick={() => handleBrainstormIdeia(anotacoesDestaque[brainstormIdx])}
                >
                  → Virar Ideia
                </AppButton>
                <AppButton
                  variant="ghost"
                  onClick={handleBrainstormPular}
                  className="opacity-60"
                >
                  Pular →
                </AppButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de conteúdo */}
      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
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
