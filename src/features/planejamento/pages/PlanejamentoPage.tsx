import {ProgressiveMonthGrid} from '../components/ProgressiveMonthGrid';
import {Drawer} from '../../../components/overlays/Drawer';
import {DistribuicaoPanel} from '../components/DistribuicaoPanel';
import {PropertyDatePicker} from '../../../components/ui/PropertyDatePicker';
import {FilterChips} from '../../../components/ui/FilterChips';
import {PageToolbar} from '../../../components/ui/PageToolbar';
import {SelectField} from '../../../components/ui/SelectField';
import {dia} from '../../../lib/dates';
import {buildGradeEntries} from '../../editorial/lib/gradeEntries';
import {useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent} from 'react';
import {addDays, format, parseISO} from 'date-fns';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {CalendarDays, FileText, Filter, Pencil, Plus, StickyNote, Trash2} from 'lucide-react';
import {
  CalendarMonthGrid,
  CalendarPeriodNav,
} from '../../../components/calendar';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {MoreMenu, type MoreMenuItem} from '../../../components/ui/MoreMenu';
import {Surface} from '../../../components/ui/Surface';
import {TagSelect} from '../../../components/ui/TagSelect';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import type {Content, Pilar, Serie, Tema} from '../../../lib/database';
import {cn, tintedTextColor} from '../../../lib/utils';
import {TemaField} from '../../contents/components/detail/TemaField';
import {buildContentDetailRoute} from '../../contents/lib/contentDetailRoute';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';
import {getCreationCardTags} from '../../creation/lib/creationItemPresentation';
import {FUNCAO_CURTA, FUNCAO_LABELS, FUNCOES, FUNIL_DA_FUNCAO, isFuncaoEditorial, resolveFuncao} from '../../editorial/lib/funcoes';
import {sortPilares} from '../../settings/lib/activePilares';
import {EncaixeDialog} from '../components/EncaixeDialog';
import {ContentPreviewSheet} from '../../contents/components/desktop/ContentPreviewSheet';
import {PlanejamentoResumo, type DimensaoDoMes} from '../components/PlanejamentoResumo';
import {PlanejamentoWeekGrid} from '../components/PlanejamentoWeekGrid';
import {PostItRapidoDialog} from '../components/PostItRapidoDialog';
import {PuxarConteudoDialog} from '../components/PuxarConteudoDialog';
import {PlanejamentoMobileView} from '../components/PlanejamentoMobileView';
import {SemDataPanel} from '../components/SemDataPanel';
import {PlatformIcons, RedeIcon} from '../../../components/ui/PlatformIcons';
import {MultiFilterChips} from '../../../components/ui/MultiFilterChips';
import {redesDoCartao} from '../lib/redesDoCartao';
import {normalizarRedesPostIt, REDES_DO_POSTIT} from '../lib/redesPostIt';
import {REDE_ROTULO, rotuloDaRef} from '../../contas/lib/contas';
import {saudeDoMes, periodoDoMes} from '../lib/monthHealth';
import {CONTENT_MIME, POST_IT_MIME, PostItAssuntosObras, PostItIdentity, PostItNote, type PostItMark} from '../components/PostItNote';
import {assuntosEmUso, conteudoTemAssunto, nomesDasObras, nomesDosAssuntos} from '../lib/assuntosObras';
import {avisosDeOrientacao} from '../lib/orientacaoEditorial';
import {type VistaPlanejamento} from '../lib/periodoPlanejamento';
import {publicacoesPorDia, type PublicacaoNoDia} from '../lib/publicacoesDoMes';
import {periodoInicial} from '../../editorial/components/plano/PeriodoEditorialControl';
import {lerPeriodoSalvo} from '../../editorial/lib/periodoEditorial';
import {
  canPullContent,
  cancelPostItEdit,
  createEmptyPostIt,
  deletePostIt,
  escolherSerieNoPostIt,
  movePostIt,
  postItEditDraft,
  postItMudou,
  postItKind,
  postItTransformOptions,
  pullExistingContent,
  savePostItEdit,
  transformPostIt,
  type PlanejamentoPostIt,
  type PostItEdit,
} from '../lib/postIt';

function contentById(contents: Content[], id: string | null): Content | null {
  if (!id) return null;
  return contents.find(content => content.id === id) ?? null;
}

const FUNIL_COLOR = {
  topo: 'var(--accent-blue)',
  meio: 'var(--accent-purple)',
  fundo: 'var(--accent-orange)',
  fora: 'var(--text-tertiary)',
} as const;

/**
 * Marcas do post-it. Com conteúdo, as do conteúdo; sem conteúdo, as do próprio espaço.
 * O objetivo é o mesmo que a contagem do Editorial usa.
 */
function postItAppearance(
  content: Content | null,
  series: readonly Serie[],
  pilares: readonly Pilar[],
  temas: readonly Tema[],
  postIt?: PlanejamentoPostIt | null,
): {seriesColor: string | null; marks: PostItMark[]; assuntos: string[]} {
  if (!content && !postIt) return {seriesColor: null, marks: [], assuntos: []};
  const serieId = content ? content.seriesId : postIt?.serieId ?? null;
  const serie = serieId ? series.find(item => item.id === serieId) ?? null : null;
  const pilarId = content ? content.pilarId || serie?.pilarPrincipalId || null : postIt?.pilarId ?? null;
  const pilar = pilarId ? pilares.find(item => item.id === pilarId) ?? null : null;
  const funcao = content ? resolveFuncao(content, serie).funcao : postIt?.objetivo ?? null;
  const etapa = funcao ? FUNIL_DA_FUNCAO[funcao] : null;
  const marks: PostItMark[] = [];
  if (serie?.name?.trim()) {
    marks.push({
      kind: 'serie',
      nome: serie.name.trim(),
      cor: serie.cor?.trim() || 'var(--text-tertiary)',
    });
  }
  if (funcao) {
    marks.push({
      kind: 'funil',
      nome: etapa ? `${FUNCAO_CURTA[funcao]} · ${etapa[0].toUpperCase()}${etapa.slice(1)}` : FUNCAO_CURTA[funcao],
      cor: FUNIL_COLOR[etapa ?? 'fora'],
    });
  }
  if (pilar?.nome?.trim()) {
    marks.push({
      kind: 'pilar',
      nome: pilar.nome.trim(),
      cor: pilar.cor?.trim() || 'var(--text-tertiary)',
    });
  }
  return {
    seriesColor: serie?.cor?.trim() || null,
    marks,
    assuntos: content ? nomesDosAssuntos(content, temas) : [],
  };
}

function changedPostIts(before: PlanejamentoPostIt[], after: PlanejamentoPostIt[]): {
  added: PlanejamentoPostIt[];
  updated: PlanejamentoPostIt[];
} {
  const beforeById = new Map(before.map(postIt => [postIt.id, postIt]));
  const added: PlanejamentoPostIt[] = [];
  const updated: PlanejamentoPostIt[] = [];
  for (const postIt of after) {
    const previous = beforeById.get(postIt.id);
    if (!previous) added.push(postIt);
    else if (postItMudou(previous, postIt)) {
      updated.push(postIt);
    }
  }
  return {added, updated};
}

export function PlanejamentoPage() {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarHeight, setToolbarHeight] = useState(64);
  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    const observer = new ResizeObserver(() => setToolbarHeight(toolbar.offsetHeight));
    observer.observe(toolbar);
    setToolbarHeight(toolbar.offsetHeight);
    return () => observer.disconnect();
  }, [isMobile]);
  const [month, setMonth] = useState(new Date());
  const [monthNavigation,setMonthNavigation]=useState(0);
  const goToMonth=(date:Date)=>{setMonth(date);setMonthNavigation(key=>key+1)};
  const [semDataAberto,setSemDataAberto] = useState(true);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const [propriedades,setPropriedades] = useState(['serie','redes']);
  const [densidade,setDensidade] = useState<'compacta'|'detalhada'>('compacta');
  const [vista, setVista] = useState<VistaPlanejamento>('mes');
  const [undoMove,setUndoMove]=useState<{before:PlanejamentoPostIt[];to:string|null}|null>(null);
  const [dayOpen,setDayOpen]=useState<string|null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [pileOver, setPileOver] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [converting, setConverting] = useState(false);
  const conversionPending = useRef(false);
  const [pullOpen, setPullOpen] = useState(false);
  const [pullDate, setPullDate] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [classeDraft, setClasseDraft] = useState<PostItEdit>({texto: '', date: null});
  const [encaixeId, setEncaixeId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [assuntoFiltroId, setAssuntoFiltroId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [dimensao, setDimensao] = useState<DimensaoDoMes>('ocupacao');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [serieFiltroId, setSerieFiltroId] = useState('');
  const [etapaFiltro, setEtapaFiltro] = useState('');
  /** Dia do post-it rápido. `undefined` = fechado; `null` = fora do calendário. */
  const [rapidoDate, setRapidoDate] = useState<string | null | undefined>(undefined);
  const [direcaoAberta, setDirecaoAberta] = useState(() => searchParams.get('direcao') === '1');
  useEffect(() => {
    if (searchParams.get('direcao') === '1') setDirecaoAberta(true);
  }, [searchParams]);
  const periodoEditorial = useMemo(
    () => (state.editorialVisao ? lerPeriodoSalvo(state.editorialVisao) : null) ?? periodoInicial(),
    [state.editorialVisao],
  );
  /** "Mais opções" abre o post-it recém-criado já no editor completo. */
  const editarAoAbrir = useRef(false);
  /** Celular: post-it sendo movido pelo menu ⋯ (ou "Mover para…" do post-it aberto). */
  const [moveContentId, setMoveContentId] = useState<string | null>(null);
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState<string | null>(null);

  const contents = state.contents;
  const postIts = state.postIts ?? [];
  const openPostIt = postIts.find(postIt => postIt.id === openId) ?? null;
  const openContent = contentById(contents, openPostIt?.contentId ?? null);

  const openPostItId = openPostIt?.id ?? null;
  const encaixePostIt = postIts.find(postIt => postIt.id === encaixeId) ?? null;

  // `?postit=<id>` abre o post-it no mês dele: o Editorial manda para cá.
  const postItPedido = searchParams.get('postit');
  useEffect(() => {
    if (!postItPedido) return;
    const pedido = postIts.find(postIt => postIt.id === postItPedido);
    if (!pedido) return;
    if (pedido.date) setMonth(new Date(`${pedido.date}T12:00:00`));
    setOpenId(pedido.id);
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('postit');
      return next;
    }, {replace: true});
  }, [postItPedido, postIts, setSearchParams]);

  useEffect(() => {
    if (openPostItId && editarAoAbrir.current) {
      editarAoAbrir.current = false;
      setEditing(true);
      return;
    }
    setEditing(false);
  }, [openPostItId]);

  useEffect(() => {
    if (isMobile) setSelectedIds(new Set());
  }, [isMobile]);

  const toggleSelected = (id: string) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const byDate = useMemo(() => {
    const map = new Map<string, PlanejamentoPostIt[]>();
    postIts.forEach(postIt => {
      if (!postIt.date) return;
      const content = contentById(contents, postIt.contentId);
      if (serieFiltroId && (content?.seriesId ?? postIt.serieId) !== serieFiltroId) return;
      if (etapaFiltro && postItKind(postIt, content) !== etapaFiltro) return;
      if (assuntoFiltroId && !conteudoTemAssunto(content, assuntoFiltroId)) return;
      const list = map.get(postIt.date) ?? [];
      list.push(postIt);
      map.set(postIt.date, list);
    });
    return map;
  }, [postIts, contents, serieFiltroId, etapaFiltro, assuntoFiltroId]);

  const undated = useMemo(
    () => postIts.filter(postIt => !postIt.date),
    [postIts],
  );

  const publicacoesDoDia = useMemo(() => {
    const dias = publicacoesPorDia({
      contents,
      platforms: state.platforms,
      series: state.series,
      redeReferenciaId: state.editorial.redeReferenciaId,
      postIts,
    });
    return new Map([...dias].map(([date, items]) => [date, items.filter(item => {
      const content = contentById(contents, item.contentId);
      return content && (!serieFiltroId || content.seriesId === serieFiltroId)
        && (!etapaFiltro || (item.estado === 'postado' ? 'postado' : postItKind(null, content)) === etapaFiltro)
        && (!assuntoFiltroId || conteudoTemAssunto(content, assuntoFiltroId));
    })]));
  }, [contents, postIts, state.platforms, state.series, state.editorial, serieFiltroId, etapaFiltro, assuntoFiltroId]);

  const assuntosDoPlanejamento = useMemo(
    () => assuntosEmUso(postIts, contents, state.temas),
    [postIts, contents, state.temas],
  );
  const assuntoFiltro = assuntosDoPlanejamento.find(tema => tema.id === assuntoFiltroId) ?? null;

  const renderPostIt = (postIt: PlanejamentoPostIt, compact: boolean, className?: string) => {
    const content = contentById(contents, postIt.contentId);
    const appearance = postItAppearance(content, state.series, state.pilares, state.temas, postIt);

    const dimmedByFiltro = assuntoFiltro ? !conteudoTemAssunto(content, assuntoFiltro.id) : false;

    return (
      <PostItNote
        key={postIt.id}
        postIt={postIt}
        content={content}
        seriesColor={appearance.seriesColor}
        marks={propriedades.includes('serie') ? appearance.marks : appearance.marks.filter(mark=>mark.kind!=='serie')}
        assuntos={propriedades.includes('assuntos') ? appearance.assuntos : []}
        obras={propriedades.includes('obras') ? nomesDasObras(content, state.bibliotecaItems) : []}
        redes={propriedades.includes('redes') ? redesDoCartao({content, postIt, contas: state.platforms}) : []}
        dimmed={dimmedByFiltro}
        compact={compact}
        draggable={!isMobile}
        className={className}
        selected={!isMobile && selectedIds.has(postIt.id)}
        dragIds={!isMobile && selectedIds.has(postIt.id) ? [...selectedIds] : undefined}
        onToggleSelect={isMobile ? undefined : () => toggleSelected(postIt.id)}
        onOpen={() => {
          setEditing(false);
          setOpenId(postIt.id);
        }}
      />
    );
  };

  const renderContentCard = (content: Content, options: {key?: string; caption?: string; posted?: boolean; draggable?: boolean} = {}) => {
    const appearance = postItAppearance(content, state.series, state.pilares, state.temas);
    return <PostItNote key={options.key ?? content.id} content={content}
      stage={options.posted ? 'postado' : undefined} caption={options.caption}
      seriesColor={appearance.seriesColor} marks={propriedades.includes('serie') ? appearance.marks : []}
      assuntos={propriedades.includes('assuntos') ? appearance.assuntos : []}
      obras={propriedades.includes('obras') ? nomesDasObras(content, state.bibliotecaItems) : []}
      redes={propriedades.includes('redes') ? redesDoCartao({content, contas:state.platforms}) : []}
      compact={vista === 'mes' && densidade === 'compacta'} draggable={options.draggable ?? false} onOpen={() => setPreviewId(content.id)} />;
  };
  const renderPublicacao = (publicacao: PublicacaoNoDia) => {
    const content = contentById(contents, publicacao.contentId);
    return content ? renderContentCard(content, {key:publicacao.id, posted:publicacao.estado === 'postado',
      caption:[publicacao.estado === 'programado' ? 'Programado' : publicacao.estado === 'previsto' ? 'Data prevista' : 'Publicado', publicacao.time].filter(Boolean).join(' · '),
    }) : null;
  };

  const abrirMover = (postIt: PlanejamentoPostIt) => {
    setMoveDate(postIt.date ?? null);
    setMoveId(postIt.id);
  };

  const fecharMover = () => {setMoveId(null);setMoveContentId(null);};

  const confirmarMover = () => {
    if (moveContentId) {
      const content = contentById(contents, moveContentId);
      setMoveContentId(null);
      if (content) pullOnto(content, moveDate);
      return;
    }
    const id = moveId;
    setMoveId(null);
    if (!id) return;
    const postIt = postIts.find(item => item.id === id);
    if (!postIt || (postIt.date ?? null) === moveDate) return;
    // A movimentação atualiza a grade e os indicadores do mês.
    moveMany([id], moveDate);
  };

  const removePostItById = (id: string) => {
    const removal = deletePostIt({postIts, contents, id});
    if (removal.postIts.length !== postIts.length) {
      dispatch({type: 'DELETE_POST_IT', payload: id});
    }
    setSelectedIds(current => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    if (openId === id) closePostIt();
  };

  /** Celular: post-it em largura toda com ⋯ (mover, tirar do mês, apagar) no lugar de arrastar. */
  const renderMobilePostIt = (postIt: PlanejamentoPostIt, compact = false) => {
    const items: MoreMenuItem[] = [
      {
        id: 'mover',
        label: 'Mover para data',
        onClick: () => abrirMover(postIt),
      },
      ...(postIt.date
        ? [{id: 'tirar', label: 'Deixar sem data', onClick: () => moveMany([postIt.id], null)} satisfies MoreMenuItem]
        : []),
      {id: 'apagar', label: 'Apagar', tone: 'danger', onClick: () => removePostItById(postIt.id)},
    ];
    return (
      <div key={postIt.id} className="relative min-w-0">
        {renderPostIt(postIt, compact, 'min-h-11 pr-9')}
        <div className="absolute right-0.5 top-0.5">
          <MoreMenu items={items} align="right" label="Opções do post-it" size="sm" />
        </div>
      </div>
    );
  };

  const periodo = useMemo(() => periodoDoMes(month), [month]);

  const monthHealth = useMemo(() => {
    const settings = state.editorial;
    return {
      counts: saudeDoMes({
        postIts,
        contents,
        series: state.series,
        pilares: state.pilares,
        settings,
        periodo,
        platforms: state.platforms,
      }),
    };
  }, [postIts, contents, state.series, state.pilares, state.platforms, state.editorial, periodo]);

  const avisosOrientacao = useMemo(() => {
    const entries = saudeDoMes({postIts, contents, series:state.series, pilares:state.pilares, settings:state.editorial, platforms:state.platforms,
      periodo:{inicio:format(addDays(parseISO(periodo.inicio),-6),'yyyy-MM-dd'), fim:format(addDays(parseISO(periodo.fim),6),'yyyy-MM-dd')},
    }).entries;
    return avisosDeOrientacao({postIts, contents, entries, series:state.series, temas:state.temas, obras:state.bibliotecaItems, periodo});
  }, [postIts, contents, state.series, state.pilares, state.editorial, state.platforms, state.temas, state.bibliotecaItems, periodo]);

  const applyList = (next: PlanejamentoPostIt[]) => {
    const {added, updated} = changedPostIts(postIts, next);
    added.forEach(postIt => dispatch({type: 'ADD_POST_IT', payload: postIt}));
    updated.forEach(postIt => dispatch({type: 'UPDATE_POST_IT', payload: postIt}));
  };

  // Novo post-it abre primeiro o formulário rápido. O dia clicado vai junto, sem campo de data.
  const addEmpty = (date: string | null) => {
    setRapidoDate(date);
  };

  const fecharRapido = () => setRapidoDate(undefined);

  const criarDoRapido = (draft: PostItEdit): PlanejamentoPostIt => {
    const postIt = savePostItEdit(createEmptyPostIt({date: rapidoDate ?? null}), draft);
    dispatch({type: 'ADD_POST_IT', payload: postIt});
    return postIt;
  };

  const salvarRapido = (draft: PostItEdit) => {
    const postIt = criarDoRapido(draft);
    fecharRapido();
    if (postIt.date) setMonth(new Date(`${postIt.date}T12:00:00`));
  };

  const maisOpcoesDoRapido = (draft: PostItEdit) => {
    const postIt = criarDoRapido(draft);
    fecharRapido();
    const edit = postItEditDraft(postIt);
    setNoteDraft(edit.texto);
    setDateDraft(edit.date);
    setClasseDraft(edit);
    editarAoAbrir.current = true;
    setOpenId(postIt.id);
  };

  /** Move ou puxa sem modal bloqueante; a faixa de orientação atualiza sozinha. */
  const confirmarSeCouber = (_content: Content | null, _date: string | null, commit: () => void) => {
    commit();
  };

  const moveMany = (ids: readonly string[], date: string | null) => {
    const targets: PlanejamentoPostIt[] = [];
    for (const id of ids) {
      if (targets.some(item => item.id === id)) continue;
      const postIt = postIts.find(item => item.id === id);
      if (!postIt || postIt.date === date) continue;
      targets.push(postIt);
    }
    if (targets.length === 0) return;
    dispatch({
      type: 'UPDATE_POST_ITS',
      payload: targets.map(postIt => movePostIt(postIt, date)),
    });
    setUndoMove({before:targets,to:date});
  };

  const desfazerMovimento=()=>{
    if(!undoMove)return;
    const anteriores=new Map(undoMove.before.map(postIt=>[postIt.id,postIt.date]));
    const targets=postIts.filter(postIt=>anteriores.has(postIt.id) && postIt.date===undoMove.to);
    if(targets.length)dispatch({type:'UPDATE_POST_ITS',payload:targets.map(postIt=>movePostIt(postIt,anteriores.get(postIt.id) ?? null))});
    setUndoMove(null);
  };

  const readDragIds = (event: DragEvent) => {
    const raw = event.dataTransfer.getData(POST_IT_MIME) || event.dataTransfer.getData('text/plain');
    return raw.split('\n').map(id => id.trim()).filter(Boolean);
  };

  const pullOnto = (content: Content, date: string | null) => {
    const result = pullExistingContent({
      postIts,
      content,
      date,
    });
    if (!result.pulled) return;
    confirmarSeCouber(content, date, () => {
      applyList(result.postIts);
      setPullOpen(false);
    });
  };

  const moverConteudo = (content: Content) => {setMoveDate(null);setMoveContentId(content.id);};
  const handleDayDrop = (event: DragEvent, date: string) => {
    const contentId = event.dataTransfer.getData(CONTENT_MIME);
    if (contentId) {const content = contentById(contents, contentId); if (content) pullOnto(content, date);}
    else {const ids = readDragIds(event);if (ids.length) moveMany(ids, date);}
  };

  const closePostIt = () => {
    setEditing(false);
    setOpenId(null);
  };

  const startEdit = () => {
    if (!openPostIt) return;
    const draft = postItEditDraft(openPostIt);
    setNoteDraft(draft.texto);
    setDateDraft(draft.date);
    setClasseDraft(draft);
    setEditing(true);
  };

  const cancelEdit = () => {
    if (!openPostIt) return;
    const kept = cancelPostItEdit(openPostIt, {texto: noteDraft, date: dateDraft});
    setNoteDraft(kept.texto);
    setDateDraft(kept.date);
    setEditing(false);
  };

  const saveEdit = () => {
    if (!openPostIt) return;
    // Com conteúdo ligado, a classificação é a do conteúdo: o post-it não grava a dele.
    const classe = openContent
      ? {redes: classeDraft.redes ?? []}
      : {serieId: classeDraft.serieId, pilarId: classeDraft.pilarId, objetivo: classeDraft.objetivo, redes: classeDraft.redes ?? []};
    const saved = savePostItEdit(openPostIt, {texto: noteDraft, date: dateDraft, ...classe});
    confirmarSeCouber(openContent, saved.date, () => {
      if (postItMudou(openPostIt, saved)) {
        dispatch({type: 'UPDATE_POST_IT', payload: saved});
      }
      setNoteDraft(saved.texto);
      setDateDraft(saved.date);
      setEditing(false);
    });
  };

  const removeOpenPostIt = () => {
    if (!openPostIt) return;
    if (!isMobile && selectedIds.size > 1 && selectedIds.has(openPostIt.id)) {
      removeSelected();
      return;
    }
    const removal = deletePostIt({postIts, contents, id: openPostIt.id});
    if (removal.postIts.length !== postIts.length) {
      dispatch({type: 'DELETE_POST_IT', payload: openPostIt.id});
    }
    setSelectedIds(current => {
      if (!current.has(openPostIt.id)) return current;
      const next = new Set(current);
      next.delete(openPostIt.id);
      return next;
    });
    closePostIt();
  };

  const removeSelected = () => {
    const alive = new Set(postIts.map(postIt => postIt.id));
    const targets = [...selectedIds].filter(id => alive.has(id));
    if (targets.length === 0) {
      clearSelection();
      return;
    }
    if (openId && targets.includes(openId)) closePostIt();
    clearSelection();
    dispatch({type: 'DELETE_POST_ITS', payload: targets});
  };

  useEffect(() => {
    if (isMobile || selectedIds.size === 0) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }
      if (event.key === 'Escape') {
        clearSelection();
        return;
      }
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (openId || pullOpen) return;
      event.preventDefault();
      removeSelected();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobile, selectedIds, openId, pullOpen, postIts]);

  const commitTransform = async (target: 'ideia' | 'roteiro') => {
    if (!openPostIt || editing || conversionPending.current) return;
    const result = transformPostIt({postIt:openPostIt, contents, target});
    if (!result.ok) return;
    conversionPending.current = true;
    setConverting(true);
    try {
      await dispatch({type:'CONVERT_POST_IT', payload:{content:result.content,postIt:result.postIt}});
      setOpenId(null);
      if (result.openScript) navigate(buildContentDetailRoute(result.content.id, 'roteiro'), buildDetailBackState('/planejamento'));
    } catch {
      // O contexto apresenta a falha e restaura a versão persistida.
    } finally {
      conversionPending.current = false;
      setConverting(false);
    }
  };

  const pulledContentIds = useMemo(
    () => new Set(postIts.flatMap(postIt => postIt.contentId ? [postIt.contentId] : [])),
    [postIts],
  );

  const pullable = useMemo(
    () => contents.filter(content => canPullContent(content) && !pulledContentIds.has(content.id)),
    [contents, pulledContentIds],
  );

  const semDataCandidatos = useMemo(() => {
    const ids = new Set(buildGradeEntries({contents:pullable,series:state.series,settings:state.editorial,platforms:state.platforms}).filter(entry=>entry.tipo==='original' && !entry.data).map(entry=>entry.contentId));
    return pullable.filter(content=>ids.has(content.id));
  },[pullable,state.series,state.editorial,state.platforms]);

  const options = openPostIt ? postItTransformOptions(openPostIt, openContent) : {ideia: false, roteiro: false};
  const openKind = openPostIt ? postItKind(openPostIt, openContent) : 'vazio';
  const openRedes = openPostIt ? redesDoCartao({content: openContent, postIt: openPostIt, contas: state.platforms}) : [];
  const openAppearance = postItAppearance(openContent, state.series, state.pilares, state.temas, openPostIt);
  const opcoesDeSerie = [...state.series]
    .filter(serie => serie.ativa || serie.id === classeDraft.serieId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map(serie => ({value: serie.id, label: serie.name}));
  const opcoesDePilar = sortPilares(state.pilares)
    .filter(pilar => pilar.ativo || pilar.id === classeDraft.pilarId)
    .map(pilar => ({value: pilar.id, label: pilar.nome}));

  const gradeFiltrada = Boolean(assuntoFiltroId || serieFiltroId || etapaFiltro);
  const abrirDetalhes = (next: DimensaoDoMes = 'ocupacao') => {setDimensao(next); setDirecaoAberta(true);};
  const referenciaHealth = useMemo(() => saudeDoMes({postIts, contents, series: state.series, pilares: state.pilares, settings: state.editorial, platforms: state.platforms, periodo: periodoEditorial}), [postIts, contents, state.series, state.pilares, state.editorial, state.platforms, periodoEditorial]);
  const propriedadesControl = <MoreMenu label="Propriedades visíveis" trigger={<Text variant="secondary" as="span">Propriedades</Text>} items={[
    ['serie', 'Série/quadro'], ['assuntos', 'Assuntos'], ['obras', 'Obras'], ['redes', 'Redes'],
  ].map(([id, label]) => ({id, label: (propriedades.includes(id) ? 'Ocultar ' : 'Mostrar ') + label,
    onClick: () => setPropriedades(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]),
  }))} />;
  const contaControl = <SelectField ariaLabel="Conta de referência" value={state.editorial.redeReferenciaId ?? ''}
    options={[{value: '', label: 'Conta de referência não definida'}, ...state.platforms.filter(conta => conta.ativo || conta.id === state.editorial.redeReferenciaId).map(conta => ({value: conta.id, label: rotuloDaRef(conta.id, state.platforms)}))]}
    onChange={value => dispatch({type: 'SET_EDITORIAL', payload: {...state.editorial, redeReferenciaId: value || null, preferencias: {...state.editorial.preferencias, redeReferenciaId: value || null}}})} />;
  const planningToolbar = <PageToolbar tabs={<CalendarPeriodNav<VistaPlanejamento> anchorDate={month} onAnchorDateChange={goToMonth}
    viewMode={vista} onViewModeChange={setVista} weekViewId="semana" views={[{id: 'semana', label: 'Semana'}, {id: 'mes', label: 'Mês'}]} />}
    filters={contaControl}
    view={<><AppButton variant="secondary" size="sm" leftIcon={<Filter className="h-4 w-4" />} onClick={() => setFiltrosAbertos(true)}>Filtros{gradeFiltrada ? ' · ativos' : ''}</AppButton>
      <AppButton variant={semDataAberto ? 'primary' : 'secondary'} size="sm" count={undated.length + semDataCandidatos.length} aria-expanded={semDataAberto} aria-controls="planejamento-sem-data" onClick={() => setSemDataAberto(open => !open)}>Sem data</AppButton></>} />;
  const resumoDoMes = <PlanejamentoResumo counts={monthHealth.counts} series={state.series} avisos={avisosOrientacao} onDetalhes={abrirDetalhes} sticky={!isMobile} />;
  const legenda = <Text variant="meta" className="text-[var(--text-secondary)]">Cor: série/quadro · Sem classificação: neutro · Selo: pauta ou etapa atual</Text>;

  const monthGrid = (<ProgressiveMonthGrid anchorDate={month} navigationKey={monthNavigation} onActiveMonthChange={setMonth} renderMonth={gridMonth => (<CalendarMonthGrid
                anchorDate={gridMonth}
                weekStartsOn={0}
                minCellHeight={112}
                expandContent
                tone="flat"
                stickyHeader
                getDayClassName={day => cn(
                  'group/day',
                  !day.inMonth && 'pointer-events-none',
                  dragOverDay === day.dateKey && 'bg-[color-mix(in_srgb,var(--accent-orange)_12%,transparent)]',
                )}
                onDayDragOver={(day, event) => {
                  event.preventDefault();
                  setDragOverDay(day.dateKey);
                  setPileOver(false);
                }}
                onDayDragLeave={() => setDragOverDay(null)}
                onDayDrop={(day, event) => {
                  event.preventDefault();
                  setDragOverDay(null);
                  handleDayDrop(event, day.dateKey);
                }}
                renderDayContent={day => {
                  if (!day.inMonth) return null;
                  const items = [...(publicacoesDoDia.get(day.dateKey) ?? []).map(renderPublicacao), ...(byDate.get(day.dateKey) ?? []).map(postIt => renderMobilePostIt(postIt, densidade === 'compacta'))];
                  return (
                    <div className="stack-sm">
                      {items.slice(0, densidade === 'compacta' ? 3 : undefined)}
                      {densidade==='compacta' && items.length>3 ? <AppButton variant="secondary" size="xs" onClick={event=>{event.stopPropagation();setDayOpen(day.dateKey)}}>+{items.length-3} pautas</AppButton> : null}
                      <AppButton
                        variant="ghost"
                        size="xs"
                        className="justify-start text-[var(--text-secondary)] opacity-70 transition-opacity md:opacity-0 md:group-hover/day:opacity-100 md:focus-within:opacity-100 pointer-coarse:opacity-100"
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                        onClick={event => {
                          event.stopPropagation();
                          addEmpty(day.dateKey);
                        }}
                      >
                        Novo post-it
                      </AppButton>
                    </div>
                  );
                }}
              />)} />);

  return (
    <PageLayout
      contentWidth="full"
      stickyHeader={false}
      contentStack="none"
      className="min-h-full"
      contentClassName="!py-0"
      header={(
        <DesktopPageHeader
          section="Produção"
          title="Planejamento"
          meta="Distribua suas pautas e encontre espaço para novas ideias."
          actions={(
            <>
              {!isMobile && selectedIds.size > 0 ? (
                <AppButton variant="ghost" size="sm" onClick={clearSelection}>
                  Limpar
                </AppButton>
              ) : null}
              {!isMobile && selectedIds.size > 0 ? (
                <AppButton
                  variant="secondary"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={removeSelected}
                >
                  {selectedIds.size === 1 ? 'Apagar 1' : `Apagar ${selectedIds.size}`}
                </AppButton>
              ) : null}
              <AppButton variant="secondary" leftIcon={<FileText className="h-4 w-4" />} onClick={() => {setPullDate(null); setPullOpen(true);}}>
                Puxar conteúdo
              </AppButton>
              <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => addEmpty(null)}>
                Novo post-it
              </AppButton>
            </>
          )}
        >
          {!isMobile && selectedIds.size > 0 ? (
            <Text variant="meta" className="text-[var(--text-secondary)]">
              {selectedIds.size === 1 ? '1 post-it selecionado.' : `${selectedIds.size} post-its selecionados.`} Arraste um para mover todos.
            </Text>
          ) : null}
        </DesktopPageHeader>
      )}
    >
      {undoMove ? <div role="status" className="flex items-center gap-3 px-3 py-2"><Text variant="secondary">Data atualizada</Text><AppButton variant="secondary" size="sm" onClick={desfazerMovimento}>Desfazer</AppButton></div> : null}
      {isMobile ? (
        // Sem padding próprio: o <main> do MobileAppShell já dá 16px dos dois lados.
        <PlanejamentoMobileView
            month={month}
            monthView={monthGrid}
            renderContent={content => renderContentCard(content,{draggable:!isMobile})}
            candidatos={semDataCandidatos}
            onIncluirSemData={content=>pullOnto(content,null)}
            onMoverContent={moverConteudo}
            onMonthChange={goToMonth}
            vista={vista}
            onVistaChange={setVista}
            byDate={byDate}
            publicacoesDoDia={publicacoesDoDia}
            undated={undated}
            contents={contents}
            series={state.series}
            temas={assuntosDoPlanejamento}
            renderPostIt={renderMobilePostIt}
            renderPublicacao={renderPublicacao}
            onNovoPostIt={addEmpty}
            onPuxar={date => {
              setPullDate(date);
              setPullOpen(true);
            }}
            resumo={resumoDoMes}
            filtersControl={<><AppButton variant="secondary" size="sm" onClick={() => setFiltrosAbertos(true)}>Filtros</AppButton><AppButton variant="secondary" size="sm" onClick={() => abrirDetalhes()}>Saúde do mês</AppButton></>}
            contaControl={contaControl}
            gradeFiltrada={gradeFiltrada}
            assuntoFiltroId={assuntoFiltroId}
            onAssuntoFiltroChange={setAssuntoFiltroId}
          />
      ) : (
        <div className="stack-md p-3 md:p-4" style={{'--planning-toolbar-height': toolbarHeight + 'px'} as CSSProperties}>
        <div ref={toolbarRef} className="sticky top-0 z-30 bg-[var(--bg-primary)] py-2">{planningToolbar}</div>

        <div className={cn("grid gap-3 xl:items-start",semDataAberto && "xl:grid-cols-[minmax(0,1fr)_20rem]")}>
          <div className="stack-md min-w-0">
            {resumoDoMes}
            {gradeFiltrada ? <Text variant="meta">Grade filtrada. Os indicadores consideram o mês completo.</Text> : null}
            {legenda}
            {vista === 'semana' ? (
              <PlanejamentoWeekGrid
                anchorDate={month}
                byDate={byDate}
                publicacoesDoDia={publicacoesDoDia}
                dragOverDay={dragOverDay}
                onDayDragOver={(key) => {
                  setDragOverDay(key);
                  setPileOver(false);
                }}
                onDayDragLeave={() => setDragOverDay(null)}
                onDayDrop={(key, event) => {
                  setDragOverDay(null);
                  handleDayDrop(event, key);
                }}
                renderPostIt={(postIt, compact) => renderMobilePostIt(postIt, compact)}
                renderPublicacao={renderPublicacao}
                onAddPauta={addEmpty}
              />
            ) : (
              monthGrid
            )}
          </div>

          {semDataAberto ? <div id="planejamento-sem-data" className="xl:sticky xl:top-[var(--planning-toolbar-height,64px)]"><SemDataPanel
            renderContent={content => renderContentCard(content,{draggable:!isMobile})}
            candidatos={semDataCandidatos}
            onPuxar={content=>pullOnto(content,null)}
            onMoverContent={moverConteudo}
            undated={undated}
            contents={contents}
            series={state.series}
            temas={state.temas}
            pileOver={pileOver}
            className="max-h-[72dvh] overflow-y-auto"
            onDragOver={event => {
              event.preventDefault();
              setPileOver(true);
              setDragOverDay(null);
            }}
            onDragLeave={event => {
              const next = event.relatedTarget;
              if (next instanceof Node && event.currentTarget.contains(next)) return;
              setPileOver(false);
            }}
            onDrop={event => {
              event.preventDefault();
              setPileOver(false);
              const ids = readDragIds(event);
              if (ids.length > 0) moveMany(ids, null);
            }}
            renderPostIt={postIt => renderMobilePostIt(postIt)}
          /></div> : null}
        </div>
      </div>
      )}

      <Drawer open={dayOpen!==null} onClose={()=>setDayOpen(null)} ariaLabel="Itens do dia">
        <OverlayHeader title={dayOpen ? dia(dayOpen) : 'Itens do dia'} onClose={()=>setDayOpen(null)} />
        <OverlayBody><div className="stack-sm">{(byDate.get(dayOpen ?? '') ?? []).map(postIt=>renderMobilePostIt(postIt))}{(publicacoesDoDia.get(dayOpen ?? '') ?? []).map(renderPublicacao)}</div></OverlayBody>
      </Drawer>
      <DistribuicaoPanel open={direcaoAberta} onClose={() => setDirecaoAberta(false)} counts={monthHealth.counts}
        series={state.series} settings={state.editorial} referencia={referenciaHealth} avisos={avisosOrientacao} dimensao={dimensao}
        postIts={postIts} contentsById={new Map(contents.map(content => [content.id, content]))}
        onAbrirEditorial={() => navigate('/editorial')} onOpenEntry={entry => {
          const postIt = postIts.find(item => item.id === entry.postItId || item.contentId === entry.contentId);
          setDirecaoAberta(false);
          if (postIt) setOpenId(postIt.id); else setPreviewId(entry.contentId);
        }} />
      <ContentPreviewSheet content={contents.find(content => content.id === previewId) ?? null} onClose={() => setPreviewId(null)}
        onOpen={content => navigate(buildContentDetailRoute(content.id, 'roteiro'), buildDetailBackState('/planejamento'))} />
      <Drawer open={filtrosAbertos} onClose={() => setFiltrosAbertos(false)} ariaLabel="Filtros e visualização">
        <OverlayHeader title="Filtros e visualização" onClose={() => setFiltrosAbertos(false)} />
        <OverlayBody><div className="stack-md">
          <Text variant="meta">Os filtros alteram a grade; os indicadores consideram o mês completo.</Text>
          <SelectField ariaLabel="Série/quadro da grade" value={serieFiltroId} onChange={setSerieFiltroId} options={[{value:'', label:'Todas as séries'}, ...state.series.map(serie => ({value:serie.id, label:serie.name}))]} />
          <SelectField ariaLabel="Etapa da grade" value={etapaFiltro} onChange={setEtapaFiltro} options={[{value:'',label:'Todas as etapas'}, ...[['vazio','Pauta'],['ideia','Ideia'],['roteiro','Roteiro'],['producao','Produção'],['edicao','Edição'],['postado','Publicado']].map(([value,label]) => ({value,label}))]} />
          {assuntosDoPlanejamento.length ? <FilterChips ariaLabel="Assuntos da grade" value={assuntoFiltroId ?? '__todos'} onChange={id => setAssuntoFiltroId(id === '__todos' ? null : id)} options={[{id:'__todos',label:'Todos os assuntos'}, ...assuntosDoPlanejamento.map(tema => ({id:tema.id,label:tema.nome}))]} /> : null}
          <SelectField ariaLabel="Densidade" value={densidade} onChange={value => setDensidade(value as 'compacta'|'detalhada')} options={[{value:'compacta',label:'Compacta'}, {value:'detalhada',label:'Detalhada'}]} />
          {propriedadesControl}
          <AppButton variant="secondary" onClick={() => {setAssuntoFiltroId(null);setSerieFiltroId('');setEtapaFiltro('');}}>Limpar filtros</AppButton>
        </div></OverlayBody>
      </Drawer>

      <Drawer open={Boolean(openPostIt)} onClose={closePostIt} widthClassName="max-w-lg" ariaLabel="Post-it">
        {openPostIt ? (
          <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
            <OverlayHeader
              title={editing ? 'Editar post-it' : 'Post-it'}
              icon={<StickyNote className="h-6 w-6 text-[var(--brand-accent-text)]" />}
              onClose={closePostIt}
            />
            <OverlayBody>
              <div className="stack-lg">
                <div className="stack-sm">
                  <div>
                    <Badge
                      variant={openKind === 'vazio' ? 'neutral' : 'status'}
                      status={openKind === 'vazio' ? undefined : normalizeContentStatus(openContent?.status || '')}
                    >
                      {openKind === 'vazio'
                        ? 'Post-it'
                        : normalizeContentStatus(openContent?.status || '')}
                    </Badge>
                  </div>
                  {editing ? (
                    <div className="stack-sm">
                      <PropertyDatePicker variant="field" ariaLabel="Dia" value={dateDraft} onChange={setDateDraft} />
                      {dateDraft ? (
                        <AppButton variant="secondary" size="sm" className="self-start" onClick={() => setDateDraft(null)}>
                          Sem data
                        </AppButton>
                      ) : (
                        <Text variant="secondary" className="text-[var(--text-secondary)]">
                          Sem data
                        </Text>
                      )}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 t-body text-[var(--text-secondary)]">
                      <CalendarDays className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                      {openPostIt.date
                        ? dia(openPostIt.date)
                        : 'Sem data'}
                    </p>
                  )}
                  {!editing ? (
                    <AppButton variant="secondary" size="sm" className="self-start" onClick={() => abrirMover(openPostIt)}>
                      Mover para…
                    </AppButton>
                  ) : null}
                </div>
                {!editing && openRedes.length > 0 ? (
                  <p className="flex items-center gap-2 t-body text-[var(--text-secondary)]">
                    <PlatformIcons redes={openRedes} max={4} size="md" />
                    {openRedes.map(rede => REDE_ROTULO[rede]).join(' · ')}
                  </p>
                ) : null}
                {!openContent && !editing && openAppearance.marks.length > 0 ? (
                  <PostItIdentity marks={openAppearance.marks} />
                ) : null}
                {openPostIt.contentId && !openContent ? (
                  <Text variant="secondary" className="text-[var(--text-secondary)]">
                    O conteúdo puxado não está mais aqui. Apague o post-it se ele não servir.
                  </Text>
                ) : null}
                {openContent ? (
                  <Surface
                    variant="outlined"
                    padding="sm"
                    style={openKind !== 'vazio' && openAppearance.seriesColor
                      ? {borderColor: openAppearance.seriesColor}
                      : undefined}
                  >
                    {openKind !== 'vazio' ? <PostItIdentity marks={openAppearance.marks} /> : null}
                    <Text variant="itemTitle">{openContent.title?.trim() || 'Sem título'}</Text>
                    <PostItAssuntosObras assuntos={openAppearance.assuntos} obras={nomesDasObras(openContent, state.bibliotecaItems)} />
                    <Text variant="meta" className="mt-1 block text-[var(--text-secondary)]">
                      {options.ideia || options.roteiro
                        ? `Puxado para este dia. O status continua ${normalizeContentStatus(openContent.status)} até você transformar.`
                        : `Puxado para este dia. O status continua ${normalizeContentStatus(openContent.status)}.`}
                    </Text>
                  </Surface>
                ) : null}
                {openContent && !editing ? (
                  <TemaField
                    temaIds={openContent.temaIds}
                    onChange={temaIds => dispatch({type: 'UPDATE_CONTENT', payload: {...openContent, temaIds}})}
                  />
                ) : null}
                {openContent && !editing && getCreationCardTags(openContent).length > 0 ? (
                  <div className="stack-xs">
                    <Text variant="meta" className="text-[var(--text-secondary)]">Etiquetas</Text>
                    <PostItAssuntosObras assuntos={getCreationCardTags(openContent)} />
                  </div>
                ) : null}
                {editing ? (
                  <label className="stack-sm">
                    <Text variant="label" as="span">Nota</Text>
                    <textarea
                      value={noteDraft}
                      onChange={event => setNoteDraft(event.target.value)}
                      rows={5}
                      autoFocus
                      placeholder="Pode ficar em branco."
                      className="w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 t-body text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    />
                  </label>
                ) : (
                  <Surface variant="info" padding="md">
                    <Text
                      variant="body"
                      className={cn('whitespace-pre-wrap', !openPostIt.texto.trim() && 'text-[var(--text-secondary)]')}
                    >
                      {openPostIt.texto.trim() ? openPostIt.texto : 'Sem nota.'}
                    </Text>
                  </Surface>
                )}
                {editing ? (
                  openContent ? (
                    <Text variant="secondary" className="text-[var(--text-secondary)]">
                      Objetivo, série e pilar vêm do conteúdo ligado.
                    </Text>
                  ) : (
                    <section className="stack-sm" aria-labelledby="postit-espaco">
                      <Text variant="label" as="h3"><span id="postit-espaco">Para que é este espaço</span></Text>
                      <TagSelect
                        id="postit-objetivo"
                        label="Objetivo"
                        placeholder="Sem objetivo"
                        maxSelections={1}
                        values={classeDraft.objetivo ? [classeDraft.objetivo] : []}
                        options={FUNCOES.map(funcao => ({value: funcao, label: FUNCAO_LABELS[funcao]}))}
                        onChange={values => setClasseDraft(atual => ({
                          ...atual,
                          objetivo: isFuncaoEditorial(values[0]) ? values[0] : null,
                        }))}
                      />
                      <TagSelect
                        id="postit-serie"
                        label="Série"
                        placeholder="Sem série"
                        searchable
                        maxSelections={1}
                        values={classeDraft.serieId ? [classeDraft.serieId] : []}
                        options={opcoesDeSerie}
                        onChange={values => setClasseDraft(atual => escolherSerieNoPostIt(
                          atual,
                          state.series.find(serie => serie.id === values[0]) ?? null,
                        ))}
                      />
                      <TagSelect
                        id="postit-pilar"
                        label="Pilar"
                        placeholder="Sem pilar"
                        maxSelections={1}
                        values={classeDraft.pilarId ? [classeDraft.pilarId] : []}
                        options={opcoesDePilar}
                        onChange={values => setClasseDraft(atual => ({...atual, pilarId: values[0] ?? null}))}
                      />
                      <Text variant="meta" className="text-[var(--text-secondary)]">
                        Escolher a série preenche pilar e objetivo vazios. Quando um conteúdo ocupar este espaço,
                        valem os dele.
                      </Text>
                    </section>
                  )
                ) : null}
                {editing ? (
                  <div className="stack-sm">
                    <Text variant="label" as="span">Rede</Text>
                    <MultiFilterChips
                      ariaLabel="Rede onde vai sair"
                      value={classeDraft.redes ?? []}
                      onChange={redes => setClasseDraft(atual => ({...atual, redes: normalizarRedesPostIt(redes)}))}
                      options={REDES_DO_POSTIT.map(rede => ({
                        id: rede,
                        label: REDE_ROTULO[rede],
                        icon: <RedeIcon rede={rede} className="h-3.5 w-3.5 shrink-0" />,
                      }))}
                    />
                  </div>
                ) : null}
                {!editing && openKind === 'vazio' ? (
                  <section className="stack-md border-t border-[var(--border-color)] pt-6" aria-labelledby="postit-encaixar">
                    <div className="stack-xs">
                      <Text variant="itemTitle" as="h3">
                        <span id="postit-encaixar">Usar um conteúdo que já existe</span>
                      </Text>
                      <Text variant="secondary" className="text-[var(--text-secondary)]">
                        Veja as ideias, os roteiros e os conteúdos em produção ainda sem data que podem ocupar este espaço.
                      </Text>
                    </div>
                    <AppButton variant="secondary" fullWidth onClick={() => setEncaixeId(openPostIt.id)}>
                      Ver o que encaixa
                    </AppButton>
                  </section>
                ) : null}
                {!editing && openKind !== 'roteiro' && (options.ideia || options.roteiro) ? (
                  <section className="stack-md border-t border-[var(--border-color)] pt-6" aria-labelledby="postit-transformar">
                    <div className="stack-xs">
                      <Text variant="itemTitle" as="h3" className="font-semibold">
                        <span id="postit-transformar">Transformar post-it</span>
                      </Text>
                      <Text variant="secondary" className="text-[var(--text-secondary)]">
                        {openKind === 'ideia'
                          ? 'Ao virar roteiro, a data do post-it será usada na publicação.'
                          : 'Ao virar ideia ou roteiro, a data do post-it será usada na publicação e o conteúdo aparecerá no Calendário.'}
                      </Text>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {openKind === 'vazio' && options.ideia ? (
                        <AppButton variant="secondary" fullWidth disabled={converting} onClick={() => void commitTransform('ideia')}>
                          Virar ideia
                        </AppButton>
                      ) : null}
                      {options.roteiro ? (
                        <AppButton
                          variant={openKind === 'vazio' ? 'primary' : 'secondary'}
                          fullWidth
                          className={openKind === 'vazio' && options.ideia ? undefined : 'sm:col-span-2'}
                          disabled={converting}
                          onClick={() => void commitTransform('roteiro')}
                        >
                          Virar roteiro
                        </AppButton>
                      ) : null}
                    </div>
                  </section>
                ) : null}
              </div>
            </OverlayBody>
            <OverlayFooter className="justify-between">
              {editing ? (
                <>
                  <AppButton variant="secondary" onClick={cancelEdit}>
                    Cancelar
                  </AppButton>
                  <AppButton variant="primary" onClick={saveEdit}>
                    Salvar
                  </AppButton>
                </>
              ) : (
                <>
                  <AppButton
                    variant="secondary"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    style={{color: tintedTextColor('var(--danger)')}}
                    onClick={removeOpenPostIt}
                  >
                    {!isMobile && openPostIt && selectedIds.size > 1 && selectedIds.has(openPostIt.id)
                      ? `Apagar ${selectedIds.size}`
                      : 'Apagar'}
                  </AppButton>
                  <div className="flex items-center gap-2">
                    <AppButton variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={startEdit}>
                      Editar
                    </AppButton>
                    {openKind !== 'vazio' && openContent ? (
                      <AppButton
                        variant="primary"
                        onClick={() => {
                          navigate(
                            buildContentDetailRoute(openContent.id, 'roteiro'),
                            buildDetailBackState('/planejamento'),
                          );
                          closePostIt();
                        }}
                      >
                        Visualizar
                      </AppButton>
                    ) : null}
                  </div>
                </>
              )}
            </OverlayFooter>
          </div>
        ) : null}
      </Drawer>

      <Dialog open={moveId !== null || moveContentId !== null} onClose={fecharMover} desktopMaxW="max-w-sm" zIndex="z-[140]" ariaLabel="Mover para data">
        <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
          <OverlayHeader title="Mover para data" onClose={fecharMover} />
          <OverlayBody>
            <div className="stack-sm">
              <label className="stack-sm">
                <Text variant="label" as="span">Dia</Text>
                <PropertyDatePicker variant="field" ariaLabel="Mover para data" value={moveDate} onChange={setMoveDate} />
              </label>
              {moveDate ? (
                <AppButton variant="secondary" size="sm" className="self-start" onClick={() => setMoveDate(null)}>
                  Sem data
                </AppButton>
              ) : (
                <Text variant="secondary" className="text-[var(--text-secondary)]">
                  Sem data
                </Text>
              )}
            </div>
          </OverlayBody>
          <OverlayFooter className="justify-between">
            <AppButton variant="secondary" onClick={fecharMover}>
              Cancelar
            </AppButton>
            <AppButton variant="primary" onClick={confirmarMover}>
              Mover
            </AppButton>
          </OverlayFooter>
        </div>
      </Dialog>

      <PostItRapidoDialog
        open={rapidoDate !== undefined}
        date={rapidoDate ?? null}
        series={state.series}
        pilares={state.pilares}
        onClose={fecharRapido}
        onSalvar={salvarRapido}
        onMaisOpcoes={maisOpcoesDoRapido}
      />

      <EncaixeDialog postIt={encaixePostIt} onClose={() => setEncaixeId(null)} zIndex="z-[140]" />

      <PuxarConteudoDialog
        open={pullOpen}
        date={pullDate}
        candidatos={pullable}
        onClose={() => setPullOpen(false)}
        onPuxar={content => pullOnto(content, pullDate)}
      />
    </PageLayout>
  );
}
