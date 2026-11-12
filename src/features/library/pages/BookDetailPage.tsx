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
  Download,
} from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { Anotacao, BibliotecaItem, Content, type ContentPlataforma, fetchBibliotecaItemById, Projeto } from '../../../lib/database';
import { generateUUID as _uuid } from '../../../utils/uuid';
import { GENEROS_SUGERIDOS } from '../lib/libraryGenres';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { createIdeaContent, createScriptWithPublications, promoteContentToScript } from '../../contents/lib/creationContent';
import { pilarEscolhidoDaBiblioteca } from '../lib/pilarDeItemDaBiblioteca';
import { ScriptComposer } from '../../creation/components/ScriptComposer';
import { buildIdeaFields, getIdeaNotes, getIdeaTitle, parseLegacyIdeaText } from '../../ideas/lib/ideaText';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { CONTENT_STATUS, getDisplayStatus, type ContentDetailTab } from '../../contents/lib/contentPipeline';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { returnTo } from '../../../lib/navigation/goBack';
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
import { Badge } from '../../../components/ui/Badge';
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
import { getErrorDetail, notifySaveFeedback } from '../../../lib/saveFeedback';
import { BookReadingPanel, STATUS_AVALIAVEL } from '../components/BookReadingPanel';
import { BookSummary } from '../components/BookSummary';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { isAllowedDetailBackPath, type DetailBackState } from '../../../lib/navigation/detailBack';
import { STATUS_BY_TYPE, datasAoMudarStatus, statusDotColor } from '../lib/libraryStatus';
import { avaliacaoGeralDosCriterios, mediaDosCriterios, type AvaliacaoCriterios, type CriterioAvaliacao } from '../lib/avaliacaoCriterios';
import { downloadAnnotationsDocx } from '../lib/exportAnnotationsDocx';
import { ANNOTATION_TYPES } from '../lib/annotationDraft';

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
  'Edição': 'bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]',
  'Programado': 'bg-[var(--accent-purple)]/20 text-[var(--accent-purple)]',
  'Publicado': 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
};

const SLOT_ROTULO: Record<string, string> = {
  'ÚNICO': 'Único',
  'SÉRIE': 'Série',
  'JANELA': 'Janela',
};

// As mesmas categorias do formulário de nova anotação, a padrão ("Anotação") inclusa.
const TIPOS: TipoAnotacao[] = ANNOTATION_TYPES;
const STATUS_LEITURA = STATUS_BY_TYPE;

function montarInfoLocal(livro: BibliotecaItem | undefined) {
  const itemType = livro?.tipo ?? 'livro';
  const metadata = livro?.ficha ?? {};
  return {
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
    serieColecao: metadata.serieColecao || metadata.colecaoNome || '',
    generoAutor: metadata.generoAutor ?? '',
    paisAutor: metadata.paisAutor ?? '',
    racaAutor: metadata.racaAutor ?? '',
    duracaoPorEpisodio: metadata.duracaoPorEpisodio ?? '',
    avaliacaoCriterios: metadata.avaliacaoCriterios as AvaliacaoCriterios | undefined,
  };
}
type Tab = 'info' | 'anotacoes' | 'conteudos';
type OrdemAnotacoes = 'recentes' | 'leitura';

// A aba vem do endereço: recarregar ou voltar mantém a mesma aba. Sem `tab`, abre Anotações.
function tabDaUrl(value: string | null): Tab {
  return value === 'info' || value === 'conteudos' ? value : 'anotacoes';
}

function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text variant="label" className={cn('mb-4 block text-[var(--text-secondary)]', className)}>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const livro = state.bibliotecaItems.find(b => b.id === id);
  const bibliotecaItemsRef = useRef(state.bibliotecaItems);
  bibliotecaItemsRef.current = state.bibliotecaItems;

  const [obraAusente, setObraAusente] = useState(false);
  useEffect(() => {
    if (!id || !user || livro) return;
    let cancelled = false;
    setObraAusente(false);
    // O livro acabou de vir do servidor: entra só no estado, sem gravar de volta nem avisar "Alterações salvas".
    void fetchBibliotecaItemById(user.id, id).then(item => {
      if (cancelled) return;
      if (!item) {
        setObraAusente(true);
        return;
      }
      const atuais = bibliotecaItemsRef.current;
      if (atuais.some(b => b.id === item.id)) return;
      dispatch({ type: 'SET_DATA', payload: { bibliotecaItems: [item, ...atuais] } });
    });
    return () => {
      cancelled = true;
    };
  }, [dispatch, id, livro, user]);
  const tab = tabDaUrl(searchParams.get('tab'));
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', next);
    // `replace` com o mesmo state: o "voltar" do cabeçalho segue levando à grade filtrada.
    setSearchParams(params, { replace: true, state: location.state });
  };
  // De onde a obra foi aberta (a Biblioteca com os filtros dela); sem isso, a Biblioteca inteira.
  const fromPath = (location.state as DetailBackState | null)?.from;
  const backTo = fromPath && fromPath.startsWith('/biblioteca') && isAllowedDetailBackPath(fromPath)
    ? fromPath
    : '/biblioteca';

  // Anotações state
  const [filtroTipo, setFiltroTipo] = useState<TipoAnotacao | 'Todos' | 'Destaques'>('Todos');
  const [buscaAnotacoes, setBuscaAnotacoes] = useState('');
  const [ordemAnotacoes, setOrdemAnotacoes] = useState<OrdemAnotacoes>('recentes');
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
  const [origemRoteiro, setOrigemRoteiro] = useState<{
    title: string;
    notes: string | null;
    annotationId?: string;
  } | null>(null);
  const [brainstormIdx, setBrainstormIdx] = useState(0);

  // Info state
  const [infoSalvo, setInfoSalvo] = useState(false);
  const [baixandoWord, setBaixandoWord] = useState(false);
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
  const [infoLocal, setInfoLocal] = useState(() => montarInfoLocal(livro));
  const [fichaId, setFichaId] = useState(livro?.id ?? null);
  // Ficha editada e ainda não salva segura a troca de versão do app.
  const infoSavedSnapshotRef = useRef(JSON.stringify(infoLocal));
  const salvarInfoRef = useRef<() => void | Promise<void>>(() => {});
  useUnsavedChangesRegistration(
    Boolean(livro) && JSON.stringify(infoLocal) !== infoSavedSnapshotRef.current,
    () => salvarInfoRef.current(),
  );
  // A ficha salva sozinha ~0,9s depois da ultima mudanca (antes so no botao Salvar)
  // e grava o que faltar ao sair da tela.
  const infoJson = JSON.stringify(infoLocal);
  const hasLivro = Boolean(livro);
  useEffect(() => {
    if (!hasLivro || fichaId !== id || infoJson === infoSavedSnapshotRef.current) return;
    const timer = window.setTimeout(() => void salvarInfoRef.current(), 900);
    return () => window.clearTimeout(timer);
  }, [fichaId, hasLivro, id, infoJson]);
  const infoJsonRef = useRef(infoJson);
  infoJsonRef.current = infoJson;
  const infoPendente = infoJson !== infoSavedSnapshotRef.current;
  useEffect(() => () => {
    if (infoJsonRef.current !== infoSavedSnapshotRef.current) void salvarInfoRef.current();
  }, []);

  if (livro && fichaId !== livro.id) {
    const next = montarInfoLocal(livro);
    infoSavedSnapshotRef.current = JSON.stringify(next);
    setInfoLocal(next);
    setFichaId(livro.id);
  }

  if (!livro || fichaId !== livro.id) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-16">
        <div className="stack-lg text-center">
          {livro || !obraAusente ? (
            <Text variant="bodyStrong">Carregando a ficha…</Text>
          ) : (
            <>
              <Text variant="bodyStrong">Item não encontrado</Text>
              <AppButton variant="secondary" onClick={() => returnTo(navigate, '/biblioteca')}>
                Voltar à biblioteca
              </AppButton>
            </>
          )}
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
    // "Ordem de leitura": a ordem em que foram escritas, da primeira à última.
    .sort((a, b) => {
      const diferenca = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return ordemAnotacoes === 'leitura' ? -diferenca : diferenca;
    });

  // Contagem por categoria, antes da busca: os filtros sem nenhuma anotação somem.
  const contagemPorFiltro = new Map<string, number>([['Todos', livro.anotacoes.length]]);
  for (const anotacao of livro.anotacoes) {
    contagemPorFiltro.set(anotacao.tipo, (contagemPorFiltro.get(anotacao.tipo) ?? 0) + 1);
    if (anotacao.contentPotential) contagemPorFiltro.set('Destaques', (contagemPorFiltro.get('Destaques') ?? 0) + 1);
  }
  const filtrosAnotacao = (['Todos', 'Destaques', ...TIPOS] as (TipoAnotacao | 'Todos' | 'Destaques')[])
    .filter(filtro => filtro === 'Todos' || filtro === filtroTipo || (contagemPorFiltro.get(filtro) ?? 0) > 0);

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
      ...(pilarEscolhidoDaBiblioteca(state.pilares) ?? { pilarId: null }),
      seriesId: null,
      bibliotecaItemId: livro.id,
    });
    dispatch({ type: 'ADD_CONTENT', payload: ideia });
    dispatch({ type: 'DISTILL_ANNOTATION', payload: { livroId: livro.id, annotationId: anotacao.id } });
  };

  const handleTransformarEmConteudo = (anotacao: BookAnnotation) => {
    setBrainstormMode(false);
    setOrigemRoteiro({
      title: anotacao.texto.slice(0, 60),
      notes: anotacao.texto,
      annotationId: anotacao.id,
    });
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
  const handleSalvarInfo = async (info = infoLocal) => {
    const json = JSON.stringify(info);
    try {
      await dispatch({
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
          // "Faz parte de série?" e o nome dela saem do mesmo campo (o MCP ainda lê os três).
          colecaoStatus: info.serieColecao.trim() ? 'sim' : 'nao',
          colecaoNome: info.serieColecao,
          generoAutor: info.generoAutor,
          paisAutor: info.paisAutor,
          racaAutor: info.racaAutor,
          duracaoPorEpisodio: info.duracaoPorEpisodio,
          capitulosCobertos,
          ...(info.avaliacaoCriterios ? { avaliacaoCriterios: info.avaliacaoCriterios } : {}),
        },
      },
    });
      if (infoJsonRef.current !== json) return;
      infoSavedSnapshotRef.current = json;
      setInfoSalvo(true);
      window.setTimeout(() => setInfoSalvo(false), 2000);
    } catch {
      // O aviso de erro já saiu. O que foi digitado continua na ficha.
    }
  };
  salvarInfoRef.current = handleSalvarInfo;

  // Nos livros a avaliação por critério mora na aba Anotações (no lugar das 5 estrelas da Info).
  // O status fica no cabeçalho, grava na hora e completa as datas vazias (começar → início, terminar → fim).
  const leituraNasAnotacoes = livro.tipo === 'livro';
  const handleMudarStatus = (statusLeitura: StatusLeitura) => {
    const datas = datasAoMudarStatus(statusLeitura, {
      dataInicio: infoLocal.dataInicio || null,
      dataFim: infoLocal.dataFim || null,
    });
    const proximo = { ...infoLocal, statusLeitura, dataInicio: datas.dataInicio ?? '', dataFim: datas.dataFim ?? '' };
    setInfoLocal(proximo);
    handleSalvarInfo(proximo);
  };

  const handleMudarCriterio = (criterio: CriterioAvaliacao, nota: number | null) => {
    setInfoLocal(prev => {
      const avaliacaoCriterios: AvaliacaoCriterios = { ...prev.avaliacaoCriterios };
      if (nota === null) delete avaliacaoCriterios[criterio];
      else avaliacaoCriterios[criterio] = nota;
      return { ...prev, avaliacaoCriterios, avaliacao: avaliacaoGeralDosCriterios(avaliacaoCriterios) };
    });
  };

  const pedirExclusao = () => setConfirm({
    ...CONFIRM.excluirBiblioteca(livro.titulo),
    onConfirm: () => {
      dispatch({ type: 'DELETE_BOOK', payload: livro.id });
      navigate(backTo, { replace: true });
    },
  });

  const handleBaixarWord = async () => {
    if (baixandoWord) return;
    setBaixandoWord(true);
    try {
      await downloadAnnotationsDocx({
        titulo: livro.titulo,
        criador: livro.autorDiretor,
        rotuloCriador: creatorLabel,
        rotuloTipo: itemTypeLabel,
        // A ficha da tela: a nota recém-dada pode ainda não ter salvado.
        // Como na tela, a avaliação só vai com a leitura como Lido.
        criterios: !leituraNasAnotacoes || infoLocal.statusLeitura === STATUS_AVALIAVEL
          ? infoLocal.avaliacaoCriterios
          : undefined,
        anotacoes: livro.anotacoes,
      });
    } catch (error) {
      notifySaveFeedback({
        status: 'error',
        message: 'Não foi possível baixar as anotações. Tente novamente.',
        detail: getErrorDetail(error),
      });
    } finally {
      setBaixandoWord(false);
    }
  };

  const handleCriarConteudo = () => {
    setOrigemRoteiro({ title: `Roteiro sobre "${livro.titulo}"`, notes: null });
  };

  const criarRoteiroNasPlataformas = (plataformas: ContentPlataforma[]) => {
    const origem = origemRoteiro;
    setOrigemRoteiro(null);
    if (!origem) return;
    const content = createScriptWithPublications(plataformas, {
      title: origem.title,
      notes: origem.notes,
      bibliotecaItemId: livro.id,
      ...(pilarEscolhidoDaBiblioteca(state.pilares) ?? {}),
    });
    dispatch({ type: 'ADD_CONTENT', payload: content });
    if (origem.annotationId) {
      dispatch({ type: 'DISTILL_ANNOTATION', payload: { livroId: livro.id, annotationId: origem.annotationId } });
    }
    navigate(
      `${buildContentDetailRoute(content.id)}&focus=script`,
      buildDetailBackState(`${location.pathname}${location.search}`),
    );
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
          <Text variant="secondary" as="p" className="text-[var(--text-secondary)]">Concluído. Ainda pode render roteiros.</Text>
        </div>
      )}

      {/* Mini resumo */}
      {/* No celular os três dividem a linha, com o ícone acima do número. */}
      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
        {[
          { label: 'roteiros', value: conteudosDoLivro.length, icon: FileText },
          { label: 'publicados', value: conteudosPostados.length, icon: Play },
          { label: 'em produção', value: conteudosEmProducao.length, icon: Settings },
        ].map(({ label, value, icon: StatIcon }) => (
          <div
            key={label}
            className="flex flex-col items-start gap-2 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-3 sm:min-w-[8.5rem] sm:flex-row sm:items-center sm:gap-3 sm:px-4"
          >
            <StatIcon className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" aria-hidden />
            <div>
              <Text variant="sectionTitle" as="p" className="leading-tight tabular-nums text-[var(--text-primary)]">{value}</Text>
              <Text variant="meta" as="p" className="text-inherit">{label}</Text>
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
          <Text variant="itemTitle" as="p" className="mb-2 text-[var(--warning)]">
            {anotacoesDestaque.length === 1
              ? '1 destaque pode render um roteiro.'
              : `${anotacoesDestaque.length} destaques podem render roteiros.`}
          </Text>
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
                <Badge variant="neutral">{conteudos.length}</Badge>
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
          <Text variant="bodyStrong" as="p" className="text-[var(--text-secondary)]">Nenhum roteiro criado a partir desta obra ainda</Text>
        </div>
      )}

      {/* ── Ideias deste livro ── */}
      {ideiasDeLivro.length > 0 && (
        <div className="bg-[var(--bg-primary)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] p-6">
          <div className="mb-3 flex items-center gap-2">
            <Text variant="itemTitle" className="text-[var(--text-tertiary)]">
              Ideias a partir desta obra
            </Text>
            <Badge variant="neutral">{ideiasDeLivro.length}</Badge>
          </div>
          <div className="stack-sm">
            {ideiasDeLivro.map(ideia => (
              <div key={ideia.id} className="flex items-center gap-3 py-2 border-b border-[var(--border-color)] last:border-0">
                <Lightbulb className="w-3.5 h-3.5 shrink-0 text-[var(--warning)]" />
                <Text variant="body" as="p" className="text-[var(--text-primary)] opacity-70 flex-1">{ideia.title || 'Ideia sem título'}</Text>
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
          <Text variant="bodyStrong" as="h3" className="">Produção editorial</Text>
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
          <div className="mb-4 p-4 bg-[var(--bg-hover)] rounded-[var(--radius-card)] stack-md">
            <input
              type="text"
              value={campForm.nome}
              onChange={e => setCampForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="Nome da produção editorial"
              className="w-full t-body bg-[var(--bg-secondary)] border border-[var(--border-input)] rounded-[var(--radius-card)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="t-label text-[var(--text-tertiary)] block mb-1">Início</label>
                <input type="date" value={campForm.dataInicio} onChange={e => setCampForm(p => ({ ...p, dataInicio: e.target.value }))} className="w-full t-body bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--radius-card)] px-3 py-2 text-[var(--text-primary)]" />
              </div>
              <div>
                <label className="t-label text-[var(--text-tertiary)] block mb-1">Fim</label>
                <input type="date" value={campForm.dataFim} onChange={e => setCampForm(p => ({ ...p, dataFim: e.target.value }))} className="w-full t-body bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--radius-card)] px-3 py-2 text-[var(--text-primary)]" />
              </div>
            </div>
            <div>
              <label className="t-label text-[var(--text-tertiary)] block mb-1">Meta de peças</label>
              <input type="number" min={1} value={campForm.metaConteudos} onChange={e => setCampForm(p => ({ ...p, metaConteudos: e.target.value }))} className="w-full t-body bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[var(--radius-card)] px-3 py-2 text-[var(--text-primary)]" />
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
              <Text variant="bodyStrong" as="p" className="text-[var(--text-secondary)]">Nenhuma produção editorial ainda</Text>
              <Text variant="secondary" as="p" className="mt-1 max-w-md text-[var(--text-tertiary)]">
                Crie uma produção editorial para planejar, com período e meta de peças, os roteiros desta obra.
              </Text>
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
                    <Text variant="itemTitle" as="span" className="text-[var(--text-primary)]">{camp.nome}</Text>
                    <Text variant="label" as="span" className="text-[var(--text-tertiary)]">{criados}/{camp.metaConteudos} peças</Text>
                  </div>
                  <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--accent-blue)] rounded-full transition-all" style={{ width: `${progresso}%` }} />
                  </div>
                  <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">{camp.status}</Text>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Capítulos/Partes cobertos ── */}
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 sm:p-6">
        <Text variant="bodyStrong" as="h3" className="mb-3 ">{coverageLabels.section}</Text>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={novoCapituloCoberto}
            onChange={e => setNovoCapituloCoberto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdicionarCapitulo(); }}
            placeholder={coverageLabels.placeholder}
            aria-label={coverageLabels.section}
            className="h-[var(--control-height)] min-w-0 flex-1 rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 t-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
          <Text variant="secondary" as="p" className="text-[var(--text-tertiary)]">{coverageLabels.empty}</Text>
        ) : (
          <div className="flex flex-wrap gap-2">
            {capitulosCobertos.map((cap: string) => (
              <div key={cap} className="flex items-center gap-1 t-label px-2.5 py-1 rounded-full bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border-color)]">
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
          <Text variant="itemTitle" as="span" className="text-[var(--text-primary)]">Hashtags sugeridas</Text>
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
                    'rounded-[var(--radius-input)] px-3 py-1.5 t-label transition-all',
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
              <div className="bg-[var(--bg-hover)] rounded-[var(--radius-card)] p-3 relative">
                <Text variant="meta" as="p" className="pr-10 text-[var(--text-secondary)]">{hashtagsUnicas[hashtagTab]}</Text>
                <button
                  type="button"
                  onClick={() => handleCopiarHashtags(hashtagsUnicas[hashtagTab])}
                  className={cn('absolute right-2 top-2 rounded-[var(--radius-input)] p-1.5 transition-colors hover:bg-[var(--bg-secondary)]', FOCUS_INTERACTIVE)}
                  title="Copiar hashtags"
                >
                  {hashtagCopiado ? <Check className="w-4 h-4 text-[var(--accent-green)]" /> : <Copy className="w-4 h-4 text-[var(--text-tertiary)]" />}
                </button>
              </div>
            ) : (
              <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">Nenhuma hashtag configurada nos pilares dos roteiros desta obra.</Text>
            )}
          </div>
        )}
      </section>
    </div>
  );

  const roteiroComposer = (
    <ScriptComposer
      open={origemRoteiro !== null}
      onClose={() => setOrigemRoteiro(null)}
      onCreate={criarRoteiroNasPlataformas}
    />
  );

  const brainstormModal = (
    <Dialog
      open={brainstormMode && anotacoesDestaque.length > 0}
      onClose={() => setBrainstormMode(false)}
      desktopMaxW="max-w-lg"
      ariaLabel="Gerar ideias"
    >
      <div className="bg-[var(--bg-primary)] rounded-[var(--radius-overlay)] p-8 max-w-lg w-full shadow-none">
        <div className="flex items-center justify-between mb-6">
          <Text variant="label" as="span" className="text-[var(--text-tertiary)]">
            Gerar ideias — {brainstormIdx + 1}/{anotacoesDestaque.length}
          </Text>
          <button
            type="button"
            onClick={() => setBrainstormMode(false)}
            className={cn('rounded-full p-2 transition-colors hover:bg-[var(--bg-hover)]', FOCUS_INTERACTIVE)}
          >
            <X className="w-5 h-5 text-[var(--text-tertiary)]" />
          </button>
        </div>
        <Text variant="sectionTitle" as="p" className="text-[var(--text-primary)] leading-relaxed mb-8">
          &quot;{anotacoesDestaque[brainstormIdx]?.texto}&quot;
        </Text>
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
  );

  const confirmModal = (
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
            leituraNasAnotacoes={leituraNasAnotacoes}
            onStatusChange={handleMudarStatus}
            onCriterioChange={handleMudarCriterio}
            onDownloadWord={handleBaixarWord}
            baixandoWord={baixandoWord}
            generoOptions={[...GENEROS_SUGERIDOS]}
            infoLocal={infoLocal}
            onInfoLocalPatch={(patch) => setInfoLocal((prev) => ({ ...prev, ...patch }))}
            onSaveInfo={() => handleSalvarInfo()}
            infoSalvo={infoSalvo}
            onRequestDelete={pedirExclusao}
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
        {brainstormModal}
        {roteiroComposer}
        {confirmModal}
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
        <BookDetailHeader
          title={livro.titulo}
          creator={livro.autorDiretor}
          typeLabel={itemTypeLabel}
          backLabel="Biblioteca"
          backTo={backTo}
          actions={
            <>
              {/* O status muda daqui, de qualquer aba. */}
              <SelectField
                ariaLabel="Status"
                value={infoLocal.statusLeitura}
                onChange={value => handleMudarStatus(value as StatusLeitura)}
                options={STATUS_LEITURA[livro.tipo].map(status => ({ value: status, label: status }))}
                leadingIcon={
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusDotColor(infoLocal.statusLeitura) }} />
                }
              />
              <AppButton
                variant="secondary"
                leftIcon={<Download className="h-4 w-4" />}
                onClick={handleBaixarWord}
                disabled={baixandoWord}
              >
                {baixandoWord ? 'Gerando Word…' : 'Baixar em Word'}
              </AppButton>
              <MoreMenu
                label={`Mais ações de ${livro.titulo}`}
                items={[{ id: 'delete', label: 'Excluir da biblioteca', tone: 'danger', onClick: pedirExclusao }]}
              />
            </>
          }
        />
      }
      navigation={
        <SegmentTabs<Tab>
          ariaLabel={`Seções de ${livro.titulo}`}
          value={tab}
          onChange={setTab}
          options={[
            { id: 'anotacoes', label: 'Anotações', count: tabCounts.anotacoes ?? 0 },
            { id: 'info', label: 'Info' },
            { id: 'conteudos', label: 'Roteiros', count: tabCounts.conteudos ?? 0 },
          ]}
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
              {/* A capa troca embaixo dela mesma, fora do formulário. */}
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
              {/* Livros avaliam por critério na aba Anotações. */}
              {!leituraNasAnotacoes && (
                <div>
                  <Text variant="label" className="mb-2 block ">Avaliação</Text>
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
              )}
              <BookSummary
                progresso={(infoLocal.totalPaginas as number) > 0
                  ? { atual: Number(infoLocal.paginasLidas) || 0, total: Number(infoLocal.totalPaginas) }
                  : null}
                dataInicio={infoLocal.dataInicio || null}
                dataFim={infoLocal.dataFim || null}
                nota={leituraNasAnotacoes ? mediaDosCriterios(infoLocal.avaliacaoCriterios) : infoLocal.avaliacao ?? null}
                anotacoes={livro.anotacoes.length}
                roteiros={conteudosDoLivro.length}
              />
            </div>

            {/* Campos direita */}
            <div className="stack-2xl">

              {/* Seção 1 — Identificação */}
              <section>
                <div className="flex items-baseline justify-between gap-3">
                  <SectionLabel>Identificação</SectionLabel>
                  {/* A ficha salva sozinha ~0,9s depois da última mudança: sem botão Salvar. */}
                  <Text variant="meta" as="span" role="status" className="mb-4">
                    {infoPendente ? 'Salvando…' : 'Salvo automaticamente'}
                  </Text>
                </div>
                <div className="grid-form">
                  <div>
                    <label htmlFor="book-titulo" className="t-label text-[var(--text-tertiary)] block mb-1.5">Título</label>
                    <input id="book-titulo" type="text" value={infoLocal.titulo} onChange={e => setInfoLocal(prev => ({ ...prev, titulo: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label htmlFor="book-autor" className="t-label text-[var(--text-tertiary)] block mb-1.5">{creatorLabel}</label>
                    <input id="book-autor" type="text" value={infoLocal.autor} onChange={e => setInfoLocal(prev => ({ ...prev, autor: e.target.value }))} className="input" />
                  </div>
                </div>
                <div className="mt-4">
                  <TagSelect
                    label="Gêneros"
                    hint="Selecione um ou mais gêneros para categorizar esta obra."
                    values={infoLocal.generos}
                    onChange={generos => setInfoLocal(prev => ({ ...prev, generos: generos as GeneroLivro[] }))}
                    options={GENEROS_SUGERIDOS.map(genero => ({ value: genero, label: genero }))}
                    placeholder="Selecione gêneros"
                  />
                </div>
              </section>

              {/* Seção 2 — Consumo */}
              <section className="border-t border-[var(--border-color)] pt-6">
                {/* O status fica no cabeçalho; a capa, embaixo da própria capa. */}
                <SectionLabel>Consumo</SectionLabel>
                <div className="grid-form">
                  <div>
                    <label className="t-label text-[var(--text-tertiary)] block mb-1.5">Início</label>
                    <PropertyDatePicker
                      value={infoLocal.dataInicio || null}
                      onChange={dataInicio => setInfoLocal(prev => ({ ...prev, dataInicio: dataInicio ?? '' }))}
                      placeholder="Selecionar início"
                      variant="field"
                    />
                  </div>
                  <div>
                    <label className="t-label text-[var(--text-tertiary)] block mb-1.5">Fim</label>
                    <PropertyDatePicker
                      value={infoLocal.dataFim || null}
                      onChange={dataFim => setInfoLocal(prev => ({ ...prev, dataFim: dataFim ?? '' }))}
                      placeholder="Selecionar fim"
                      variant="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="book-paginas-lidas" className="t-label text-[var(--text-tertiary)] block mb-1.5">{progressLabels.current}</label>
                    <input id="book-paginas-lidas" type="number" min={0} value={infoLocal.paginasLidas} onChange={e => setInfoLocal(prev => ({ ...prev, paginasLidas: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder={livro.tipo === 'filme' ? 'Ex.: 95' : livro.tipo === 'série' || livro.tipo === 'anime' ? 'Ex.: 8' : livro.tipo === 'manga' ? 'Ex.: 12' : 'Ex.: 120'} className="input" />
                  </div>
                  <div>
                    <label htmlFor="book-total-paginas" className="t-label text-[var(--text-tertiary)] block mb-1.5">{progressLabels.total}</label>
                    <input id="book-total-paginas" type="number" min={1} value={infoLocal.totalPaginas} onChange={e => setInfoLocal(prev => ({ ...prev, totalPaginas: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder={livro.tipo === 'filme' ? 'Ex.: 130' : livro.tipo === 'série' || livro.tipo === 'anime' ? 'Ex.: 10' : 'Ex.: 380'} className="input" />
                  </div>
                  {(livro.tipo === 'série' || livro.tipo === 'anime') && (
                    <div>
                      <label htmlFor="book-duracao-episodio" className="t-label text-[var(--text-tertiary)] block mb-1.5">Duração por episódio</label>
                      <input id="book-duracao-episodio" type="text" value={infoLocal.duracaoPorEpisodio} onChange={e => setInfoLocal(prev => ({ ...prev, duracaoPorEpisodio: e.target.value }))} placeholder="Ex.: 45 min" className="input" />
                    </div>
                  )}
                </div>
                {(infoLocal.totalPaginas as number) > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="t-label text-[var(--text-tertiary)]">Progresso</label>
                      <Text variant="label" as="span" className="text-[var(--accent-purple)]">
                        {(infoLocal.paginasLidas as number || 0)}/{infoLocal.totalPaginas} {progressLabels.unit} · {Math.min(100, Math.round(((infoLocal.paginasLidas as number || 0) / (infoLocal.totalPaginas as number)) * 100))}%
                      </Text>
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
                    <label htmlFor="book-editora" className="t-label text-[var(--text-tertiary)] block mb-1.5">{technicalLabels.publisher}</label>
                    <input id="book-editora" type="text" value={infoLocal.editora} onChange={e => setInfoLocal(prev => ({ ...prev, editora: e.target.value }))} placeholder={technicalLabels.publisherPlaceholder} className="input" />
                  </div>
                  <div>
                    <label htmlFor="book-ano" className="t-label text-[var(--text-tertiary)] block mb-1.5">Ano de publicação</label>
                    <input id="book-ano" type="number" value={infoLocal.anoPublicacao} onChange={e => setInfoLocal(prev => ({ ...prev, anoPublicacao: e.target.value }))} placeholder="Ex.: 2024" className="input" />
                  </div>
                  {(livro.tipo === 'livro' || livro.tipo === 'manga' || livro.tipo === 'quadrinho') && (
                    <div>
                      <label htmlFor="book-isbn" className="t-label text-[var(--text-tertiary)] block mb-1.5">ISBN</label>
                      <input id="book-isbn" type="text" value={infoLocal.isbn} onChange={e => setInfoLocal(prev => ({ ...prev, isbn: e.target.value }))} placeholder="978-…" className="input" />
                    </div>
                  )}
                  <div>
                    <label htmlFor="book-idioma" className="t-label text-[var(--text-tertiary)] block mb-1.5">Idioma</label>
                    <input id="book-idioma" type="text" value={infoLocal.idioma} onChange={e => setInfoLocal(prev => ({ ...prev, idioma: e.target.value }))} placeholder="Ex.: Português" className="input" />
                  </div>
                  <div>
                    <label htmlFor="book-traducao" className="t-label text-[var(--text-tertiary)] block mb-1.5">{technicalLabels.translation}</label>
                    <input id="book-traducao" type="text" value={infoLocal.traducao} onChange={e => setInfoLocal(prev => ({ ...prev, traducao: e.target.value }))} placeholder={technicalLabels.translationPlaceholder} className="input" />
                  </div>
                  <div>
                    <label htmlFor="book-serie-colecao" className="t-label text-[var(--text-tertiary)] block mb-1.5">{technicalLabels.collection}</label>
                    <input id="book-serie-colecao" type="text" value={infoLocal.serieColecao} onChange={e => setInfoLocal(prev => ({ ...prev, serieColecao: e.target.value }))} placeholder={technicalLabels.collectionPlaceholder} className="input" />
                  </div>
                  {(livro.tipo === 'livro' || livro.tipo === 'manga' || livro.tipo === 'quadrinho') && (
                    <>
                      <div>
                        <label htmlFor="book-genero-autor" className="t-label text-[var(--text-tertiary)] block mb-1.5">Gênero do autor</label>
                        <input id="book-genero-autor" type="text" value={infoLocal.generoAutor} onChange={e => setInfoLocal(prev => ({ ...prev, generoAutor: e.target.value }))} placeholder="Ex.: mulher, homem, não binárie" className="input" />
                      </div>
                      <div>
                        <label htmlFor="book-pais-autor" className="t-label text-[var(--text-tertiary)] block mb-1.5">País do autor</label>
                        <input id="book-pais-autor" type="text" value={infoLocal.paisAutor} onChange={e => setInfoLocal(prev => ({ ...prev, paisAutor: e.target.value }))} placeholder="Ex.: Nigéria" className="input" />
                      </div>
                      <div>
                        <label htmlFor="book-raca-autor" className="t-label text-[var(--text-tertiary)] block mb-1.5">Raça do autor</label>
                        <input id="book-raca-autor" type="text" value={infoLocal.racaAutor} onChange={e => setInfoLocal(prev => ({ ...prev, racaAutor: e.target.value }))} placeholder="Como você prefere catalogar" className="input" />
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* ════ ABA: ANOTAÇÕES ════ */}
        {tab === 'anotacoes' && (
          <div className="grid items-start gap-8 pb-10 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
            <div className="stack-lg min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {filtrosAnotacao.map(t => {
                    const total = contagemPorFiltro.get(t) ?? 0;
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={filtroTipo === t}
                        aria-label={`${t} (${total})`}
                        onClick={() => setFiltroTipo(t)}
                        // Mesmo chip de filtro do Calendário, maior e com o ativo em rosa nesta aba.
                        className={cn(
                          'filter-chip filter-chip--roomy filter-chip--accent pointer-coarse:min-h-11',
                          filtroTipo === t && 'filter-chip-active',
                        )}
                      >
                        <span>{t}</span>
                        <span aria-hidden className="filter-chip-count tabular-nums">{total}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                  <SelectField
                    ariaLabel="Ordem das anotações"
                    value={ordemAnotacoes}
                    onChange={value => setOrdemAnotacoes(value as OrdemAnotacoes)}
                    options={[
                      { value: 'recentes', label: 'Mais recentes' },
                      { value: 'leitura', label: 'Ordem de leitura' },
                    ]}
                  />
                  <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
                    <ToolbarSearchInput
                      value={buscaAnotacoes}
                      onChange={setBuscaAnotacoes}
                      placeholder="Buscar anotações…"
                      size="compact"
                    />
                  </div>
                </div>
              </div>

              {anotacoesFiltradas.length === 0 ? (
                <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] px-6 py-16 text-center">
                  <Text variant="bodyStrong" className="text-[var(--text-secondary)]">
                    {termoBusca || filtroTipo !== 'Todos' ? 'Nenhuma anotação nesse filtro' : 'Nenhuma anotação ainda'}
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

            {/* Coluna da direita: escrever e, com a leitura terminada, dar as notas.
                Presa no topo, rola sozinha se passar da altura da tela. */}
            <div className="stack-lg lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
              <BookAnnotationComposer
                key={livro.id}
                book={livro}
                referencePlaceholder={coverageLabels.placeholder}
              />
              {leituraNasAnotacoes && (
                <BookReadingPanel
                  showStatus={false}
                  status={infoLocal.statusLeitura}
                  statusOptions={STATUS_LEITURA[livro.tipo]}
                  onStatusChange={handleMudarStatus}
                  criterios={infoLocal.avaliacaoCriterios}
                  onCriterioChange={handleMudarCriterio}
                />
              )}
            </div>
          </div>
        )}

        {/* ════ ABA: CONTEÚDOS ════ */}
        {tab === 'conteudos' && roteirosTab}
      </div>
    </PageLayout>
    {brainstormModal}
    {roteiroComposer}
    {confirmModal}
    </>
  );
}
