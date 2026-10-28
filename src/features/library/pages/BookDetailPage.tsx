import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useUnsavedChangesRegistration } from '../../../hooks/useUnsavedChangesRegistration';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Dialog } from '../../../components/overlays/Dialog';
import {
  BookOpen,
  Star,
  Plus,
  Trash2,
  Lightbulb,
  CheckCircle2,
  X,
  Check,
  Film,
  Copy,
  Hash,
  Target,
  FileText,
  Play,
  Settings,
} from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { Anotacao, BibliotecaItem, Content, fetchBibliotecaItemById, Projeto } from '../../../lib/database';
import { generateUUID as _uuid } from '../../../utils/uuid';
import { GENEROS_SUGERIDOS } from '../lib/libraryGenres';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { createContentDraft } from '../../contents/lib/createContentDraft';
import { createIdeaContent, promoteContentToScript } from '../../contents/lib/creationContent';
import { buildIdeaFields, getIdeaNotes, getIdeaTitle, parseLegacyIdeaText } from '../../ideas/lib/ideaText';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { CONTENT_STATUS, getDisplayStatus, type ContentDetailTab } from '../../contents/lib/contentPipeline';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { BookAnnotationComposer, BookAnnotationComposerSheet } from '../components/modals/BookAnnotationComposerSheet';
import { generateUUID } from '../../../utils/uuid';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { BookAnnotationCard } from '../components/BookAnnotationCard';
import { BookDetailHeader } from '../components/BookDetailHeader';
import { BookScriptRow } from '../components/BookScriptRow';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { ToolbarSearchInput } from '../../../components/ui/ToolbarSearchInput';
import { TagSelect } from '../../../components/ui/TagSelect';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { livroIdsEfetivos } from '../../../lib/livroIds';
import { BookDetailMobileScreen } from '../../../mobile/screens/library/BookDetailMobileScreen';
import { Text } from '../../../components/ui/Text';
import { Surface } from '../../../components/ui/Surface';
import { AppButton } from '../../../components/ui/AppButton';
import { PropertyDatePicker } from '../../../components/ui/PropertyDatePicker';
import { DisclosureButton } from '../../../components/ui/DisclosureButton';
import { cn } from '../../../lib/utils';
import { CoverUploadField } from '../components/CoverUploadField';
import { CoverFallback } from '../components/CoverFallback';
import { REDE_ROTULO, redeDaRef, rotuloDaRef } from '../../contas/lib/contas';
import { SelectField } from '../../../components/ui/SelectField';

type BookAnnotation = Anotacao;
type TipoAnotacao = Anotacao['tipo'];
type StatusLeitura = BibliotecaItem['status'];
type GeneroLivro = string;
type Campaign = Projeto;

const FOCUS_INTERACTIVE = 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

const STATUS_CORES: Record<string, string> = {
  'Ideia': 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
  'Roteiro': 'bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]',
  'Produção': 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]',
  'Programado': 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]',
  'Postado': 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
};

const SLOT_ROTULO: Record<string, string> = {
  'ÚNICO': 'Único',
  'SÉRIE': 'Série',
  'JANELA': 'Janela',
};

const TIPOS: TipoAnotacao[] = ['Trecho', 'Reação', 'Análise', 'Ideia de conteúdo', 'Pergunta'];
const STATUS_LEITURA: Record<BibliotecaItem['tipo'], StatusLeitura[]> = {
  livro: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  manga: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  quadrinho: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  filme: ['Quero ver', 'Assistido', 'Abandonado'],
  'série': ['Quero ver', 'Assistindo', 'Assistido', 'Abandonado'],
  anime: ['Quero ver', 'Assistindo', 'Assistido', 'Abandonado'],
  outro: ['Quero consumir', 'Consumindo', 'Concluído', 'Abandonado'],
};
type Tab = 'info' | 'anotacoes' | 'conteudos';

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text variant="label" className={cn('mb-4 block font-semibold text-[var(--text-secondary)]', className)}>
      {children}
    </Text>
  );
}

function getItemTypeLabel(tipo: BibliotecaItem['tipo']) {
  if (tipo === 'filme') return 'Filme';
  if (tipo === 'série') return 'Série';
  if (tipo === 'anime') return 'Anime';
  if (tipo === 'manga') return 'Mangá';
  if (tipo === 'quadrinho') return 'Quadrinho';
  return 'Livro';
}

function getCreatorLabel(tipo: BibliotecaItem['tipo']) {
  if (tipo === 'filme') return 'Diretor';
  if (tipo === 'série') return 'Diretor';
  if (tipo === 'anime') return 'Direção / estúdio';
  if (tipo === 'manga') return 'Mangaká';
  if (tipo === 'quadrinho') return 'Roteiro / arte';
  return 'Autor';
}

function getProgressLabels(tipo: BibliotecaItem['tipo']) {
  if (tipo === 'filme') return { current: 'Minutos vistos', total: 'Duração total', unit: 'min' };
  if (tipo === 'série' || tipo === 'anime') return { current: 'Episódios vistos', total: 'Total de episódios', unit: 'eps' };
  if (tipo === 'manga') return { current: 'Capítulos lidos', total: 'Total de capítulos', unit: 'capítulos' };
  return { current: 'Páginas lidas', total: 'Total de páginas', unit: 'páginas' };
}

function getTechnicalLabels(tipo: BibliotecaItem['tipo']) {
  if (tipo === 'filme') {
    return {
      publisher: 'Estúdio / Distribuidora',
      publisherPlaceholder: 'Ex.: Warner Bros.',
      translation: 'Dublagem / Localização',
      translationPlaceholder: 'Ex.: PT-BR / versão legendada',
      collection: 'Franquia / Universo',
      collectionPlaceholder: 'Ex.: Duna',
    };
  }

  if (tipo === 'série' || tipo === 'anime') {
    return {
      publisher: 'Plataforma / Estúdio',
      publisherPlaceholder: 'Ex.: Netflix',
      translation: 'Dublagem / Localização',
      translationPlaceholder: 'Ex.: PT-BR / versão legendada',
      collection: 'Saga / Universo',
      collectionPlaceholder: 'Ex.: Bridgerton',
    };
  }

  return {
    publisher: 'Editora',
    publisherPlaceholder: 'Ex.: Rocco',
    translation: 'Tradução',
    translationPlaceholder: 'Tradutor',
    collection: 'Série / Coleção',
    collectionPlaceholder: 'Ex.: Trono de Vidro',
  };
}

function getCoverageLabels(tipo: BibliotecaItem['tipo']) {
  if (tipo === 'filme') {
    return {
      section: 'Cenas / Partes cobertas',
      placeholder: 'Ex.: Abertura no deserto',
      empty: 'Nenhuma cena marcada ainda',
    };
  }

  if (tipo === 'série' || tipo === 'anime') {
    return {
      section: 'Episódios / Arcos cobertos',
      placeholder: 'Ex.: T1E03 – Baile',
      empty: 'Nenhum episódio marcado ainda',
    };
  }

  return {
    section: 'Capítulos / Partes cobertos',
    placeholder: 'Ex.: Cap. 3 – O Vilão',
    empty: 'Nenhum capítulo marcado ainda',
  };
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const livro = state.bibliotecaItems.find(b => b.id === id);
  const bibliotecaItemsRef = useRef(state.bibliotecaItems);
  bibliotecaItemsRef.current = state.bibliotecaItems;

  useEffect(() => {
    if (!id || !user || livro) return;
    let cancelled = false;
    // O livro acabou de vir do servidor: entra só no estado, sem gravar de volta nem avisar "Alterações salvas".
    void fetchBibliotecaItemById(user.id, id).then(item => {
      if (cancelled || !item) return;
      const atuais = bibliotecaItemsRef.current;
      if (atuais.some(b => b.id === item.id)) return;
      dispatch({ type: 'SET_DATA', payload: { bibliotecaItems: [item, ...atuais] } });
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, id, livro, user]);
  const initialTab = (searchParams.get('tab') as Tab | null);
  const [tab, setTab] = useState<Tab>(initialTab === 'info' || initialTab === 'conteudos' ? initialTab : 'anotacoes');

  // Anotações state
  const [filtroTipo, setFiltroTipo] = useState<TipoAnotacao | 'Todos' | 'Destaques'>('Todos');
  const [buscaAnotacoes, setBuscaAnotacoes] = useState('');
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
  const [infoSalvo, setInfoSalvo] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const _livro = livro as any;
  const itemType = livro?.tipo ?? 'livro';
  const metadata = livro?.ficha ?? {};
  const itemTypeLabel = getItemTypeLabel(itemType);
  const creatorLabel = getCreatorLabel(itemType);
  const progressLabels = getProgressLabels(itemType);
  const technicalLabels = getTechnicalLabels(itemType);
  const coverageLabels = getCoverageLabels(itemType);
  const ItemIcon = itemType === 'livro' || itemType === 'manga' || itemType === 'quadrinho' ? BookOpen : Film;
  const [infoLocal, setInfoLocal] = useState(() => ({
    titulo: livro?.titulo ?? '',
    autor: livro?.autorDiretor ?? '',
    statusLeitura: livro?.status ?? (STATUS_LEITURA[itemType][0] as StatusLeitura),
    capaUrl: livro?.capaUrl ?? '',
    dataInicio: livro?.dataInicio ?? '',
    dataFim: livro?.dataFim ?? '',
    avaliacao: livro?.avaliacao as 1 | 2 | 3 | 4 | 5 | undefined,
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
    duracaoPorEpisodio: metadata.duracaoPorEpisodio ?? '',
  }));
  // Ficha editada e ainda não salva segura a troca de versão do app.
  const infoSavedSnapshotRef = useRef(JSON.stringify(infoLocal));
  const salvarInfoRef = useRef<() => void>(() => {});
  useUnsavedChangesRegistration(
    Boolean(livro) && JSON.stringify(infoLocal) !== infoSavedSnapshotRef.current,
    () => salvarInfoRef.current(),
  );
  // A ficha salva sozinha ~0,9s depois da ultima mudanca (antes so no botao Salvar)
  // e grava o que faltar ao sair da tela.
  const infoJson = JSON.stringify(infoLocal);
  const hasLivro = Boolean(livro);
  useEffect(() => {
    if (!hasLivro || infoJson === infoSavedSnapshotRef.current) return;
    const timer = window.setTimeout(() => salvarInfoRef.current(), 900);
    return () => window.clearTimeout(timer);
  }, [hasLivro, infoJson]);
  const infoJsonRef = useRef(infoJson);
  infoJsonRef.current = infoJson;
  useEffect(() => () => {
    if (infoJsonRef.current !== infoSavedSnapshotRef.current) salvarInfoRef.current();
  }, []);

  if (!livro) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-16">
        <div className="stack-lg text-center">
          <Text variant="bodyStrong">Item não encontrado</Text>
          <AppButton variant="secondary" onClick={() => navigate('/biblioteca')}>
            Voltar à biblioteca
          </AppButton>
        </div>
      </div>
    );
  }

  // Busca sem diferenciar acento nem maiúscula ("analise" acha "Análise").
  const dobrarTexto = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const termoBusca = dobrarTexto(buscaAnotacoes.trim());
  const anotacoesFiltradas = livro.anotacoes
    .filter(a => {
      if (filtroTipo === 'Todos') return true;
      if (filtroTipo === 'Destaques') return a.contentPotential === true;
      return a.tipo === filtroTipo;
    })
    .filter(a => !termoBusca || dobrarTexto(`${a.texto} ${a.capituloRef ?? ''}`).includes(termoBusca))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const conteudosDoLivro = state.contents.filter(c => livroIdsEfetivos(c).includes(livro.id));
  const ideiasDeLivro = conteudosDoLivro.filter(
    c =>
      !c.archivedAt &&
      !c.deletedAt &&
      (c.status === CONTENT_STATUS.IDEIA || getDisplayStatus(c) === CONTENT_STATUS.IDEIA),
  );
  const conteudosPostados = conteudosDoLivro.filter(c => getDisplayStatus(c) === CONTENT_STATUS.POSTADO);
  const conteudosEmProducao = conteudosDoLivro.filter(c => {
    const displayStatus = getDisplayStatus(c);
    return displayStatus !== CONTENT_STATUS.POSTADO && displayStatus !== CONTENT_STATUS.IDEIA;
  });
  const campanhasDoLivro = state.projetos.filter(
    projeto =>
      projeto.bibliotecaItemId === livro.id &&
      (projeto.tipo === 'producao' || projeto.tipo === 'campanha')
  );
  const capitulosCobertos = metadata.capitulosCobertos || [];

  const alertaEcossistema =
    livro.status === 'Concluído' &&
    conteudosPostados.length === 0;

  const conteudosPorSlot = conteudosDoLivro.reduce<Record<string, typeof conteudosDoLivro>>((acc, c) => {
    const key = c.slotType || 'Sem slot';
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  const conteudosPorPlataforma = conteudosDoLivro.reduce<Record<string, typeof conteudosDoLivro>>((acc, c) => {
    const plats = c.plataformas?.length ? c.plataformas.map(pp => rotuloDaRef(pp.platformId, state.platforms)) : ['Geral'];
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
        // Hashtags do pilar ficam por conta; aqui somam por plataforma.
        const rede = redeDaRef(pp.platformId, state.platforms);
        const key = (rede && rede !== 'outra' ? REDE_ROTULO[rede] : '') as 'Instagram' | 'TikTok' | 'YouTube';
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
  const openContentDetail = (contentId: string, detailTab?: ContentDetailTab) => {
    navigate(
      buildContentDetailRoute(contentId, detailTab),
      buildDetailBackState(`${location.pathname}${location.search}`),
    );
  };

  const handleTransformarEmIdeia = (anotacao: BookAnnotation) => {
    const parsed = parseLegacyIdeaText(anotacao.texto);
    const fields = buildIdeaFields({
      title: parsed.title || anotacao.texto.slice(0, 60),
      notes: parsed.notes,
    });
    const ideia = createIdeaContent({
      title: fields.title || 'Ideia sem título',
      notes: fields.notes || null,
      pilarId: null,
      seriesId: null,
      bibliotecaItemId: livro.id,
    });
    dispatch({ type: 'ADD_CONTENT', payload: ideia });
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
    openContentDetail(novoConteudo.id);
    dispatch({ type: 'DISTILL_ANNOTATION', payload: { livroId: livro.id, annotationId: anotacao.id } });
  };

  const handleToggleContentPotential = (anotacao: BookAnnotation) => {
    const updated: BookAnnotation = { ...anotacao, contentPotential: !anotacao.contentPotential };
    dispatch({ type: 'UPDATE_ANNOTATION', payload: updated });
  };

  const handleEditarAnotacao = (anotacao: BookAnnotation, texto: string) => {
    dispatch({ type: 'UPDATE_ANNOTATION', payload: { ...anotacao, texto } });
  };

  const handleDeleteAnotacao = (anotacaoId: string) => {
    dispatch({ type: 'DELETE_ANNOTATION', payload: { livroId: livro.id, annotationId: anotacaoId } });
  };

  // Notas gerais, quem indicou, por que escolheu e potencial saíram da tela;
  // o que já estava gravado segue no item pelo ...livro e pelo ...metadata.
  const handleSalvarInfo = (info = infoLocal) => {
    dispatch({
      type: 'UPDATE_BOOK',
      payload: {
        ...livro,
        titulo: info.titulo,
        autorDiretor: info.autor,
        status: info.statusLeitura,
        capaUrl: info.capaUrl || null,
        dataInicio: info.dataInicio || null,
        dataFim: info.dataFim || null,
        avaliacao: info.avaliacao ?? null,
        generoIds: info.generos,
        paginasLidas: info.paginasLidas === '' ? null : Number(info.paginasLidas),
        totalPaginas: info.totalPaginas === '' ? null : Number(info.totalPaginas),
        updatedAt: new Date().toISOString(),
        ficha: {
          ...metadata,
          editora: info.editora,
          anoPublicacao: info.anoPublicacao,
          isbn: info.isbn,
          idioma: info.idioma,
          traducao: info.traducao,
          serieColecao: info.serieColecao,
          colecaoStatus: info.colecaoStatus,
          colecaoNome: info.colecaoNome,
          generoAutor: info.generoAutor,
          paisAutor: info.paisAutor,
          racaAutor: info.racaAutor,
          duracaoPorEpisodio: info.duracaoPorEpisodio,
          capitulosCobertos,
        },
      },
    });
    infoSavedSnapshotRef.current = JSON.stringify(info);
    setInfoSalvo(true);
    setTimeout(() => setInfoSalvo(false), 2000);
  };
  salvarInfoRef.current = handleSalvarInfo;

  // Nos livros o status mora na aba Anotações e grava na hora, sem esperar o autosave da ficha.
  const statusNasAnotacoes = livro.tipo === 'livro';
  const handleMudarStatus = (statusLeitura: StatusLeitura) => {
    const proximo = { ...infoLocal, statusLeitura };
    setInfoLocal(proximo);
    handleSalvarInfo(proximo);
  };

  const handleTransformarLeituraEmIdeia = () => {
    const fields = buildIdeaFields({
      title: `Conteúdo sobre "${livro.titulo}"`,
      notes:
        livro.notasGerais?.trim()
        || (livro.autorDiretor ? livro.autorDiretor : ''),
    });
    const ideia = createIdeaContent({
      title: fields.title || 'Ideia sem título',
      notes: fields.notes || null,
      pilarId: null,
      seriesId: null,
      bibliotecaItemId: livro.id,
    });
    dispatch({ type: 'ADD_CONTENT', payload: ideia });
    navigate('/criacao?tab=ideias');
  };

  const handleCriarConteudo = () => {
    const novoConteudo = createContentDraft({
      id: generateUUID(),
      userId: '',
      title: `Roteiro sobre "${livro.titulo}"`,
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
    openContentDetail(novoConteudo.id);
  };

  const handlePromoteIdeia = (ideia: Content) => {
    const promovido = promoteContentToScript(ideia);
    dispatch({ type: 'UPDATE_CONTENT', payload: promovido });
    openContentDetail(promovido.id);
  };

  const handleAdicionarCapitulo = () => {
    if (!novoCapituloCoberto.trim()) return;
    dispatch({
      type: 'UPDATE_BOOK',
      payload: {
        ...livro,
        ficha: {
          ...metadata,
          capitulosCobertos: [...capitulosCobertos, novoCapituloCoberto.trim()],
        },
      },
    });
    setNovoCapituloCoberto('');
  };

  const handleRemoverCapitulo = (cap: string) => {
    dispatch({
      type: 'UPDATE_BOOK',
      payload: {
        ...livro,
        ficha: {
          ...metadata,
          capitulosCobertos: capitulosCobertos.filter(c => c !== cap),
        },
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
      avisoDias: null,
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

  // Aba Roteiros: o mesmo bloco no computador e no celular.
  const roteirosTab = (
    <div className="stack-xl pb-10">
      {/* Ponto de contexto */}
      {alertaEcossistema && (
        <div className="flex items-center gap-3 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-6 py-4 md:rounded-[var(--radius-card)]">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-[var(--text-secondary)]" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">Concluído. Ainda pode render conteúdo quando fizer sentido.</p>
        </div>
      )}

      {/* Mini resumo */}
      {/* No celular os três dividem a linha, com o ícone acima do número. */}
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        {[
          { label: 'roteiros', value: conteudosDoLivro.length, icon: FileText },
          { label: 'postados', value: conteudosPostados.length, icon: Play },
          { label: 'em produção', value: conteudosEmProducao.length, icon: Settings },
        ].map(({ label, value, icon: StatIcon }) => (
          <div
            key={label}
            className="flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-3 sm:min-w-[8.5rem] sm:flex-row sm:items-center sm:gap-3 sm:px-4"
          >
            <StatIcon className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" aria-hidden />
            <div>
              <p className="text-lg font-semibold leading-tight tabular-nums text-[var(--text-primary)]">{value}</p>
              <p className="t-meta">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Botão Criar roteiro hero */}
      <AppButton
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={<Plus className="h-4 w-4" />}
        onClick={handleCriarConteudo}
      >
        Criar roteiro
      </AppButton>

      {/* Brainstorm CTA */}
      {anotacoesDestaque.length > 0 && (
        <div className="rounded-[var(--radius-card-mobile)] border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-6 py-4 md:rounded-[var(--radius-card)]">
          <p className="mb-2 text-sm font-bold text-[var(--warning)]">
            {anotacoesDestaque.length === 1
              ? '1 destaque pode virar roteiro.'
              : `${anotacoesDestaque.length} destaques podem virar roteiro.`}
          </p>
          <AppButton
            variant="secondary"
            size="sm"
            onClick={() => { setBrainstormIdx(0); setBrainstormMode(true); }}
            className="text-[var(--warning)]"
          >
            Gerar ideias
          </AppButton>
        </div>
      )}

      {/* ── Agrupamento + Roteiros ── */}
      {conteudosDoLivro.length > 0 ? (
        <div className="stack-lg">
          <SegmentTabs<'slot' | 'plataforma'>
            options={[
              { id: 'slot', label: 'Por slot' },
              { id: 'plataforma', label: 'Por plataforma' },
            ]}
            value={ecossistemaAgrupamento}
            onChange={setEcossistemaAgrupamento}
            ariaLabel="Agrupar roteiros"
            className="self-start"
          />

          {(Object.entries(
            ecossistemaAgrupamento === 'slot' ? conteudosPorSlot : conteudosPorPlataforma
          ) as [string, typeof conteudosDoLivro][]).map(([grupo, conteudos]) => (
            <section key={grupo} className="stack-sm">
              <div className="flex items-center gap-2">
                <Text variant="sectionTitle" as="h3">{SLOT_ROTULO[grupo] ?? grupo}</Text>
                <span className="rounded-[var(--radius-pill)] bg-[var(--bg-hover)] px-2.5 py-0.5 text-xs font-semibold tabular-nums text-[var(--text-secondary)]">
                  {conteudos.length}
                </span>
              </div>
              <div className="stack-sm">
                {conteudos.map(c => {
                  const status = getDisplayStatus(c);
                  return (
                    <BookScriptRow
                      key={c.id}
                      title={c.title}
                      status={status}
                      statusClass={STATUS_CORES[status] || 'bg-[var(--bg-hover)] text-[var(--text-primary)]'}
                      pilarName={state.pilares.find(p => p.id === c.pilarId)?.nome}
                      publishDate={c.publishDate}
                      recordingDate={c.recordingDate}
                      onOpen={() => openContentDetail(c.id)}
                      menuItems={[
                        { id: 'gravacao', label: 'Abrir gravação', onClick: () => openContentDetail(c.id, 'gravacao') },
                        { id: 'publicacao', label: 'Abrir publicação', onClick: () => openContentDetail(c.id, 'publicacao') },
                      ]}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)]">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <p className="t-body-strong text-[var(--text-secondary)]">Nenhum roteiro criado a partir desta obra ainda</p>
        </div>
      )}

      {/* ── Ideias deste livro ── */}
      {ideiasDeLivro.length > 0 && (
        <div className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-6">
          <Text variant="itemTitle" className="mb-3 text-[var(--text-tertiary)]">
            {`Ideias a partir desta obra (${ideiasDeLivro.length})`}
          </Text>
          <div className="stack-sm">
            {ideiasDeLivro.map(ideia => (
              <div key={ideia.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-color)] last:border-0">
                <Lightbulb className="w-3.5 h-3.5 shrink-0 text-[var(--warning)]" />
                <p className="text-sm text-[var(--text-primary)] opacity-70 flex-1">{ideia.title || 'Ideia sem título'}</p>
                <AppButton
                  variant="ghost"
                  size="xs"
                  onClick={() => handlePromoteIdeia(ideia)}
                  className="shrink-0 text-[var(--accent-blue)]"
                >
                  Transformar em roteiro
                </AppButton>
              </div>
            ))}
          </div>
        </div>
      )}

      <hr className="border-[var(--border-color)]" />

      {/* ── Produção editorial ── */}
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Text variant="bodyStrong" as="h3" className="font-semibold">Produção editorial</Text>
          <AppButton
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => setNovaCampanhaAberta(v => !v)}
            className="text-[var(--accent-blue)]"
          >
            Nova produção editorial
          </AppButton>
        </div>

        {novaCampanhaAberta && (
          <div className="mb-4 p-4 bg-[var(--bg-hover)] rounded-xl stack-md">
            <input
              type="text"
              value={campForm.nome}
              onChange={e => setCampForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="Nome da produção editorial"
              className="w-full text-sm bg-[var(--bg-secondary)] border border-[var(--border-input)] rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
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
          !novaCampanhaAberta && (
            <div className="flex flex-col items-center py-2 text-center">
              <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-hover)] text-[var(--text-secondary)]">
                <ItemIcon className="h-5 w-5" aria-hidden />
              </span>
              <p className="t-body-strong text-[var(--text-secondary)]">Nenhuma produção editorial ainda</p>
              <p className="mt-1 max-w-md t-secondary text-[var(--text-tertiary)]">
                Crie uma produção editorial para planejar, com período e meta de peças, os roteiros desta obra.
              </p>
            </div>
          )
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

      {/* ── Capítulos/Partes cobertos ── */}
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 sm:p-6">
        <Text variant="bodyStrong" as="h3" className="mb-3 font-semibold">{coverageLabels.section}</Text>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={novoCapituloCoberto}
            onChange={e => setNovoCapituloCoberto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdicionarCapitulo(); }}
            placeholder={coverageLabels.placeholder}
            aria-label={coverageLabels.section}
            className="h-[var(--control-height)] min-w-0 flex-1 rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
          <p className="t-secondary text-[var(--text-tertiary)]">{coverageLabels.empty}</p>
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
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-6 sm:py-4">
        <DisclosureButton open={hashtagsAberto} onToggle={() => setHashtagsAberto(v => !v)} className="-mx-2 w-[calc(100%+1rem)]">
          <Hash className="h-4 w-4 text-[var(--text-tertiary)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Hashtags sugeridas</span>
        </DisclosureButton>
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
                      : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
                  )}
                >
                  {plat}
                </button>
              ))}
            </div>
            {hashtagsUnicas[hashtagTab] ? (
              <div className="bg-[var(--bg-hover)] rounded-xl p-3 relative">
                <p className="pr-10 text-xs text-[var(--text-secondary)]">{hashtagsUnicas[hashtagTab]}</p>
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
              <p className="text-xs text-[var(--text-tertiary)]">Nenhuma hashtag configurada nos pilares dos roteiros desta obra.</p>
            )}
          </div>
        )}
      </section>
    </div>
  );

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
            statusNasAnotacoes={statusNasAnotacoes}
            onStatusChange={handleMudarStatus}
            generoOptions={[...GENEROS_SUGERIDOS]}
            infoLocal={infoLocal}
            onInfoLocalPatch={(patch) => setInfoLocal((prev) => ({ ...prev, ...patch }))}
            onSaveInfo={() => handleSalvarInfo()}
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
            roteirosCount={conteudosDoLivro.length}
            roteirosContent={roteirosTab}
          />
        </div>

        <Dialog
          open={brainstormMode && anotacoesDestaque.length > 0}
          onClose={() => setBrainstormMode(false)}
          desktopMaxW="max-w-lg"
          ariaLabel="Gerar ideias"
        >
          <div className="w-full max-w-lg rounded-[var(--radius-overlay)] bg-[var(--bg-primary)] p-8 shadow-none">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-tertiary)]">
                Gerar ideias — {brainstormIdx + 1}/{anotacoesDestaque.length}
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
                Criar roteiro
              </button>
              <button
                onClick={() => handleBrainstormIdeia(anotacoesDestaque[brainstormIdx])}
                className="flex-1 rounded-[var(--radius-card-mobile)] border border-[var(--border-strong)] py-3 text-xs font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-hover)] md:rounded-[var(--radius-card)]"
              >
                Transformar em ideia
              </button>
              <button
                onClick={handleBrainstormPular}
                className="px-4 py-3 text-xs font-semibold text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Pular
              </button>
            </div>
          </div>
        </Dialog>

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
      stickyHeader={false}
      header={
        <BookDetailHeader<Tab>
          title={livro.titulo}
          creator={livro.autorDiretor}
          typeLabel={itemTypeLabel}
          status={livro.status}
          coverUrl={livro.capaUrl}
          icon={ItemIcon}
          backLabel="Biblioteca"
          backTo="/biblioteca"
          tabs={[
            { id: 'info', label: 'Info' },
            { id: 'anotacoes', label: 'Anotações', count: tabCounts.anotacoes ?? 0 },
            { id: 'conteudos', label: 'Roteiros', count: tabCounts.conteudos ?? 0 },
          ]}
          activeTab={tab}
          onTabChange={setTab}
          actions={
            <AppButton
              variant="primary"
              size="lg"
              leftIcon={<Lightbulb className="h-4 w-4" />}
              onClick={handleTransformarLeituraEmIdeia}
            >
              Transformar em ideia
            </AppButton>
          }
        />
      }
    >
      <div className="hidden pt-2 md:block">
        {/* ════ ABA: INFO ════ */}
        {tab === 'info' && (
          <div className="grid-book-hero pb-10">
            {/* Capa + Avaliação */}
            <div className="stack-lg">
              <div className="aspect-[2/3] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] overflow-hidden bg-[var(--bg-hover)] shadow-md">
                {infoLocal.capaUrl ? (
                  <img
                    src={infoLocal.capaUrl}
                    alt={livro.titulo}
                    className="w-full h-full object-cover"
                    onError={(event) => {
                      const target = event.currentTarget;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling;
                      if (fallback instanceof HTMLElement) fallback.hidden = false;
                    }}
                  />
                ) : null}
                <div hidden={Boolean(infoLocal.capaUrl)} className="h-full w-full">
                  <CoverFallback title={infoLocal.titulo || livro.titulo} typeLabel={itemTypeLabel} icon={ItemIcon} />
                </div>
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
                    label="Gêneros"
                    hint="Selecione um ou mais gêneros para categorizar este item."
                    values={infoLocal.generos}
                    onChange={generos => setInfoLocal(prev => ({ ...prev, generos: generos as GeneroLivro[] }))}
                    options={GENEROS_SUGERIDOS.map(genero => ({ value: genero, label: genero }))}
                    placeholder="Selecione gêneros"
                  />
                </div>
              </section>

              {/* Seção 2 — Consumo */}
              <section className="border-t border-[var(--border-color)] pt-6">
                <SectionLabel>Consumo</SectionLabel>
                <div className="grid-form">
                  {!statusNasAnotacoes && (
                    <TagSelect
                      label="Status"
                      values={[infoLocal.statusLeitura]}
                      onChange={values => {
                        const nextStatus = values.at(-1) as StatusLeitura | undefined;
                        if (nextStatus) setInfoLocal(prev => ({ ...prev, statusLeitura: nextStatus }));
                      }}
                      options={STATUS_LEITURA[livro.tipo].map(status => ({ value: status, label: status }))}
                      placeholder="Selecionar status"
                      maxSelections={1}
                    />
                  )}
                  <div className="md:col-span-2">
                    <CoverUploadField
                      value={infoLocal.capaUrl}
                      onChange={capaUrl => setInfoLocal(prev => ({ ...prev, capaUrl }))}
                      itemId={livro.id}
                      title={infoLocal.titulo || livro.titulo}
                      typeLabel={itemTypeLabel}
                      compact
                      hidePreview
                      plain
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Início</label>
                    <PropertyDatePicker
                      value={infoLocal.dataInicio || null}
                      onChange={dataInicio => setInfoLocal(prev => ({ ...prev, dataInicio: dataInicio ?? '' }))}
                      placeholder="Selecionar início"
                      variant="field"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Fim</label>
                    <PropertyDatePicker
                      value={infoLocal.dataFim || null}
                      onChange={dataFim => setInfoLocal(prev => ({ ...prev, dataFim: dataFim ?? '' }))}
                      placeholder="Selecionar fim"
                      variant="field"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{progressLabels.current}</label>
                    <input type="number" min={0} value={infoLocal.paginasLidas} onChange={e => setInfoLocal(prev => ({ ...prev, paginasLidas: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder={livro.tipo === 'filme' ? 'Ex.: 95' : livro.tipo === 'série' || livro.tipo === 'anime' ? 'Ex.: 8' : livro.tipo === 'manga' ? 'Ex.: 12' : 'Ex.: 120'} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{progressLabels.total}</label>
                    <input type="number" min={1} value={infoLocal.totalPaginas} onChange={e => setInfoLocal(prev => ({ ...prev, totalPaginas: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder={livro.tipo === 'filme' ? 'Ex.: 130' : livro.tipo === 'série' || livro.tipo === 'anime' ? 'Ex.: 10' : 'Ex.: 380'} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                  </div>
                  {(livro.tipo === 'série' || livro.tipo === 'anime') && (
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Duração por episódio</label>
                      <input type="text" value={infoLocal.duracaoPorEpisodio} onChange={e => setInfoLocal(prev => ({ ...prev, duracaoPorEpisodio: e.target.value }))} placeholder="Ex.: 45 min" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                    </div>
                  )}
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

              {/* Seção 3 — Detalhes técnicos (sempre aberta, como as outras) */}
              <section className="border-t border-[var(--border-color)] pt-6">
                <SectionLabel>Detalhes técnicos</SectionLabel>
                <div className="grid-form">
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{technicalLabels.publisher}</label>
                    <input type="text" value={infoLocal.editora} onChange={e => setInfoLocal(prev => ({ ...prev, editora: e.target.value }))} placeholder={technicalLabels.publisherPlaceholder} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Ano de publicação</label>
                    <input type="number" value={infoLocal.anoPublicacao} onChange={e => setInfoLocal(prev => ({ ...prev, anoPublicacao: e.target.value }))} placeholder="2024" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                  </div>
                  {(livro.tipo === 'livro' || livro.tipo === 'manga' || livro.tipo === 'quadrinho') && (
                    <div>
                      <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">ISBN</label>
                      <input type="text" value={infoLocal.isbn} onChange={e => setInfoLocal(prev => ({ ...prev, isbn: e.target.value }))} placeholder="978-…" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Idioma</label>
                    <input type="text" value={infoLocal.idioma} onChange={e => setInfoLocal(prev => ({ ...prev, idioma: e.target.value }))} placeholder="Português" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{technicalLabels.translation}</label>
                    <input type="text" value={infoLocal.traducao} onChange={e => setInfoLocal(prev => ({ ...prev, traducao: e.target.value }))} placeholder={technicalLabels.translationPlaceholder} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">{technicalLabels.collection}</label>
                    <input type="text" value={infoLocal.serieColecao} onChange={e => setInfoLocal(prev => ({ ...prev, serieColecao: e.target.value }))} placeholder={technicalLabels.collectionPlaceholder} className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                  </div>
                  {(livro.tipo === 'livro' || livro.tipo === 'manga' || livro.tipo === 'quadrinho') && (
                    <>
                      <div>
                        <label htmlFor="book-colecao-status" className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Série ou coleção?</label>
                        <SelectField
                          id="book-colecao-status"
                          block
                          value={infoLocal.colecaoStatus}
                          onChange={value => setInfoLocal(prev => ({ ...prev, colecaoStatus: value as 'sim' | 'nao', colecaoNome: value === 'nao' ? '' : prev.colecaoNome }))}
                          options={[
                            { value: 'nao', label: 'Não' },
                            { value: 'sim', label: 'Sim' },
                          ]}
                        />
                      </div>
                      {infoLocal.colecaoStatus === 'sim' && (
                        <div>
                          <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Qual coleção?</label>
                          <input type="text" value={infoLocal.colecaoNome} onChange={e => setInfoLocal(prev => ({ ...prev, colecaoNome: e.target.value, serieColecao: e.target.value }))} placeholder="Ex.: Trono de Vidro" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Gênero do autor</label>
                        <input type="text" value={infoLocal.generoAutor} onChange={e => setInfoLocal(prev => ({ ...prev, generoAutor: e.target.value }))} placeholder="Ex.: mulher, homem, não binárie" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                      </div>
                      <div>
                        <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">País do autor</label>
                        <input type="text" value={infoLocal.paisAutor} onChange={e => setInfoLocal(prev => ({ ...prev, paisAutor: e.target.value }))} placeholder="Ex.: Nigéria" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                      </div>
                      <div>
                        <label className="text-xs font-bold  text-[var(--text-tertiary)] block mb-1.5">Raça do autor</label>
                        <input type="text" value={infoLocal.racaAutor} onChange={e => setInfoLocal(prev => ({ ...prev, racaAutor: e.target.value }))} placeholder="Como você prefere catalogar" className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]" />
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Salvar / Remover — sempre disponível durante a edição do formulário longo.
                  Presa ao pé da área de conteúdo (sticky), e não da tela: assim a barra lateral não a cobre. */}
              <div className="sticky bottom-[var(--space-lg)] z-30 flex items-center justify-between gap-3 rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 shadow-[var(--shadow-dropdown)]">
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirm({
                    ...CONFIRM.excluirBiblioteca(livro.titulo),
                    onConfirm: () => { dispatch({ type: 'DELETE_BOOK', payload: livro.id }); navigate('/biblioteca'); },
                  })}
                  className="text-[var(--danger)]"
                >
                  Remover da biblioteca
                </AppButton>
                <AppButton
                  variant="primary"
                  size="sm"
                  leftIcon={<Check className="h-3.5 w-3.5" />}
                  onClick={() => handleSalvarInfo()}
                >
                  {infoSalvo ? 'Salvo!' : 'Salvar'}
                </AppButton>
              </div>
            </div>
          </div>
        )}

        {/* ════ ABA: ANOTAÇÕES ════ */}
        {tab === 'anotacoes' && (
          <div className="grid items-start gap-8 pb-10 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
            <div className="stack-lg min-w-0">
              <div className="flex flex-wrap gap-2">
                {(['Todos', 'Destaques', ...TIPOS] as (TipoAnotacao | 'Todos' | 'Destaques')[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={filtroTipo === t}
                    onClick={() => setFiltroTipo(t)}
                    // Mesmo chip de filtro do Calendário, maior e com o ativo em rosa nesta aba.
                    className={cn(
                      'filter-chip filter-chip--roomy filter-chip--accent pointer-coarse:min-h-11',
                      filtroTipo === t && 'filter-chip-active',
                    )}
                  >
                    {t === 'Destaques' ? '⭐ Destaques' : t}
                  </button>
                ))}
              </div>

              {anotacoesFiltradas.length === 0 ? (
                <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] px-6 py-16 text-center">
                  <Text variant="bodyStrong" className="text-[var(--text-secondary)]">
                    {termoBusca || filtroTipo !== 'Todos' ? 'Nenhuma anotação encontrada' : 'Nenhuma anotação ainda'}
                  </Text>
                  <Text variant="meta" as="p" className="mt-1">
                    {termoBusca || filtroTipo !== 'Todos'
                      ? 'Ajuste a busca ou o filtro para ver outras anotações.'
                      : 'Use o painel ao lado para registrar a primeira.'}
                  </Text>
                </div>
              ) : (
                <div className="stack-md">
                  {anotacoesFiltradas.map(a => (
                    <BookAnnotationCard
                      key={a.id}
                      anotacao={a}
                      onToggleHighlight={() => handleToggleContentPotential(a)}
                      onSaveText={texto => handleEditarAnotacao(a, texto)}
                      onTransformIdea={() => handleTransformarEmIdeia(a)}
                      onTransformContent={() => handleTransformarEmConteudo(a)}
                      onDelete={() => handleDeleteAnotacao(a.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="stack-md lg:sticky lg:top-4">
              {statusNasAnotacoes && (
                <Surface variant="outlined" padding="md" className="flex items-center justify-between gap-3">
                  <label htmlFor="book-status-leitura" className="t-secondary font-semibold text-[var(--text-primary)]">
                    Status da leitura
                  </label>
                  <SelectField
                    id="book-status-leitura"
                    value={infoLocal.statusLeitura}
                    onChange={value => handleMudarStatus(value as StatusLeitura)}
                    options={STATUS_LEITURA[livro.tipo].map(status => ({ value: status, label: status }))}
                  />
                </Surface>
              )}
              <BookAnnotationComposer
                key={livro.id}
                book={livro}
                referencePlaceholder={coverageLabels.placeholder}
                headerAside={
                  // A largura fica no invólucro: o .filter-bar-search ocupa 100% de quem o contém.
                  <div className="w-full sm:w-52">
                    <ToolbarSearchInput
                      value={buscaAnotacoes}
                      onChange={setBuscaAnotacoes}
                      placeholder="Buscar anotações…"
                      size="compact"
                    />
                  </div>
                }
              />
            </div>
          </div>
        )}

        {/* ════ ABA: CONTEÚDOS ════ */}
        {tab === 'conteudos' && roteirosTab}
      </div>
    </PageLayout>

      {/* ── Modal Brainstorm ── */}
      <Dialog
        open={brainstormMode && anotacoesDestaque.length > 0}
        onClose={() => setBrainstormMode(false)}
        desktopMaxW="max-w-lg"
        ariaLabel="Gerar ideias"
      >
        <div className="bg-[var(--bg-primary)] rounded-[var(--radius-overlay)] p-8 max-w-lg w-full shadow-none">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-semibold  text-[var(--text-tertiary)]">
              Gerar ideias — {brainstormIdx + 1}/{anotacoesDestaque.length}
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
              Criar roteiro
            </AppButton>
            <AppButton
              variant="secondary"
              fullWidth
              onClick={() => handleBrainstormIdeia(anotacoesDestaque[brainstormIdx])}
            >
              Transformar em ideia
            </AppButton>
            <AppButton
              variant="ghost"
              onClick={handleBrainstormPular}
              className="opacity-60"
            >
              Pular
            </AppButton>
          </div>
        </div>
      </Dialog>

      {/* Modal de conteúdo */}
      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
