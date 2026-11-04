import {useEffect, useMemo, useRef, useState, type DragEvent} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {ArrowDownToLine, CalendarDays, ChevronDown, ChevronRight, LayoutGrid, Pencil, Plus, StickyNote, Trash2} from 'lucide-react';
import {
  calendarEntryPillStyle,
  CalendarEventPill,
  CalendarMonthGrid,
  CalendarPeriodNav,
} from '../../../components/calendar';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {MoreMenu, type MoreMenuItem} from '../../../components/ui/MoreMenu';
import {PageToolbar} from '../../../components/ui/PageToolbar';
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
import {CONTENT_STATUS, DISPLAY_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline';
import {calendarEntryIcon, CalendarNetworkIcons} from '../../editorial-calendar/components/CalendarNetworkIcons';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';
import {getCreationCardTags} from '../../creation/lib/creationItemPresentation';
import {metasDoPeriodo, readProporcao} from '../../editorial/lib/proporcaoObjetivos';
import {FUNCAO_CURTA, FUNCAO_LABELS, FUNCOES, FUNIL_DA_FUNCAO, isFuncaoEditorial} from '../../editorial/lib/funcoes';
import {objetivoDoConteudo, objetivoHerdadoDaSerie, pilarDoConteudo, pilarHerdadoDaSerie} from '../../editorial/lib/herancaSerie';
import {sortPilares} from '../../settings/lib/activePilares';
import {CampoDia} from '../components/CampoDia';
import {EncaixeDialog} from '../components/EncaixeDialog';
import {PlanejamentoResumo} from '../components/PlanejamentoResumo';
import {PlanejamentoWeekGrid} from '../components/PlanejamentoWeekGrid';
import {SaudeEditorialPanel} from '../components/SaudeEditorialPanel';
import {PlanejamentoContentCard} from '../components/PlanejamentoContentCard';
import {PlanejamentoReservaCard} from '../components/PlanejamentoReservaCard';
import {PostItRapidoDialog} from '../components/PostItRapidoDialog';
import {PuxarConteudoDialog} from '../components/PuxarConteudoDialog';
import {PlanejamentoMobileView} from '../components/PlanejamentoMobileView';
import {SemDataPanel} from '../components/SemDataPanel';
import {PlatformIcons} from '../../../components/ui/PlatformIcons';
import {RedeChips} from '../components/RedeChips';
import {redesDoCartao, redesDoConteudo} from '../lib/redesDoCartao';
import {diaDaRede, dividirPorRede, weekdayDaData} from '../lib/divisoriaRede';
import {DivisoriaRede} from '../components/DivisoriaRede';
import {redeDaRef} from '../../contas/lib/contas';
import {REDE_ROTULO, rotuloDaRef} from '../../contas/lib/contas';
import {saudeDoMes} from '../lib/monthHealth';
import {avisoDoCalendario, rotuloDoPeriodo} from '../lib/periodoDaSaude';
import {continuidadeDasSeries, distribuicaoPorObjetivo, janelaDaContinuidade, proporcaoDesejadaDoPeriodo} from '../lib/saudeIndicadores';
import {linhasDaContinuidadePorEscopo} from '../lib/continuidadePorEscopoNaSaude';
import {publicacoesNaSaude} from '../lib/publicacoesNaSaude';
import {contasDoCard, conteudoPassa, filtroAtivo, formatosDoFiltro, indiceDaAgenda, postItPassa, publicacoesDoCard, type FiltroCalendario} from '../lib/filtroCalendario';
import {diaDoAviso} from '../lib/detalheDoAviso';
import {publicacoesDaAgenda, rotuloDoFormato} from '../../editorial/lib/publicacoes';
import {Drawer} from '../../../components/overlays/Drawer';
import {CreationRedeQuickFilter} from '../../creation/components/CreationRedeQuickFilter';
import {redesDoFiltroRapido} from '../../creation/lib/creationRedeFilter';
import {usePostItsNaData} from '../hooks/usePostItsNaData';
import {levarRoteiroAoDia, roteiroPublicado} from '../lib/postItsNaData';
import {POST_IT_MIME, PostItAssuntosObras, PostItIdentity, PostItNote, type PostItMark} from '../components/PostItNote';
import {assuntosEmUso, conteudoTemAssunto, nomesDasObras, nomesDosAssuntos} from '../lib/assuntosObras';
import {avisosDeOrientacao, type AvisoOrientacao} from '../lib/orientacaoEditorial';
import {periodoDaVista, type VistaPlanejamento} from '../lib/periodoPlanejamento';
import {publicacoesPorDia, type PublicacaoNoDia} from '../lib/publicacoesDoMes';
import {PeriodoPanel} from '../../editorial/components/plano/PeriodoPanel';
import {periodoInicial, type PeriodoSelecionado} from '../../editorial/components/plano/PeriodoEditorialControl';
import {decisaoDoPeriodo, lerPeriodoSalvo} from '../../editorial/lib/periodoEditorial';
import {SelectField} from '../../../components/ui/SelectField';
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
  // Mesma resolução da ficha e da Saúde: gravado vale, campo vazio sobe quadro → série.
  const pilarId = content
    ? pilarDoConteudo(content, series)
    : postIt?.pilarId || pilarHerdadoDaSerie(postIt?.serieId, series);
  const pilar = pilarId ? pilares.find(item => item.id === pilarId) ?? null : null;
  const funcao = content
    ? objetivoDoConteudo(content, series)
    : postIt?.objetivo ?? objetivoHerdadoDaSerie(postIt?.serieId, series);
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
    seriesColor: content ? serie?.cor?.trim() || null : null,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialVista = (searchParams.get('vista') as VistaPlanejamento) || 'mes';
  const [month, setMonth] = useState(new Date());
  const [vista, setVistaRaw] = useState<VistaPlanejamento>(initialVista);

  const setVista = (novaVista: VistaPlanejamento) => {
    setVistaRaw(novaVista);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('vista', novaVista);
      return next;
    }, {replace: true});
  };

  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [pileOver, setPileOver] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pullOpen, setPullOpen] = useState(false);
  const [pullDate, setPullDate] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [classeDraft, setClasseDraft] = useState<PostItEdit>({texto: '', date: null});
  const [encaixeId, setEncaixeId] = useState<string | null>(null);
  const [assuntoFiltroId, setAssuntoFiltroId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [destaqueIds, setDestaqueIds] = useState<Set<string>>(() => new Set());
  const [avisoAtivoId, setAvisoAtivoId] = useState<string | null>(null);
  /** Dia do post-it rápido. `undefined` = fechado; `null` = fora do calendário. */
  const [rapidoDate, setRapidoDate] = useState<string | null | undefined>(undefined);
  const [direcaoAberta, setDirecaoAberta] = useState(false);
  // 2D: filtros por conta e formato; trecho da Saúde (calendário ou intervalo); análise da Saúde.
  const [filtro, setFiltro] = useState<FiltroCalendario>({redes: [], formato: null});
  const [trecho, setTrecho] = useState<'calendario' | 'intervalo'>('calendario');
  const [intervalo, setIntervalo] = useState<{inicio: string; fim: string}>({inicio: '', fim: ''});
  const [analiseAberta, setAnaliseAberta] = useState(false);
  const periodoEditorial = useMemo(
    () => (state.editorialVisao ? lerPeriodoSalvo(state.editorialVisao) : null) ?? periodoInicial(),
    [state.editorialVisao],
  );
  const salvarPeriodoEditorial = (next: PeriodoSelecionado) => {
    dispatch({ type: 'SET_EDITORIAL_VISAO', payload: next });
  };
  /** "Mais opções" abre o post-it recém-criado já no editor completo. */
  const editarAoAbrir = useRef(false);
  /** Celular: post-it sendo movido pelo menu ⋯ (ou "Mover para…" do post-it aberto). */
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState<string | null>(null);

  const contents = state.contents;
  // Post-it ligado fica no dia do roteiro: a mesma data do Calendário e do próprio roteiro.
  const postIts = usePostItsNaData();
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

  // Uma publicação por conta: base dos filtros e da situação de cada conta nos cards.
  const indiceAgenda = useMemo(
    () => indiceDaAgenda(publicacoesDaAgenda({contents, contas: state.platforms, series: state.series})),
    [contents, state.platforms, state.series],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, PlanejamentoPostIt[]>();
    postIts.forEach(postIt => {
      if (!postIt.date) return;
      if (!postItPassa(indiceAgenda, postIt, filtro)) return;
      const list = map.get(postIt.date) ?? [];
      list.push(postIt);
      map.set(postIt.date, list);
    });
    return map;
  }, [postIts, indiceAgenda, filtro]);

  const undated = useMemo(
    () => postIts.filter(postIt => !postIt.date && postItPassa(indiceAgenda, postIt, filtro)),
    [postIts, indiceAgenda, filtro],
  );

  const publicacoesDoDia = useMemo(() => {
    const map = publicacoesPorDia({
      contents,
      platforms: state.platforms,
      series: state.series,
      redeReferenciaId: state.editorial.redeReferenciaId,
      postIts,
    });
    if (!filtroAtivo(filtro)) return map;
    const filtrado = new Map<string, PublicacaoNoDia[]>();
    map.forEach((lista, dia) => {
      const passam = lista.filter(publicacao => conteudoPassa(indiceAgenda, publicacao.contentId, filtro));
      if (passam.length > 0) filtrado.set(dia, passam);
    });
    return filtrado;
  }, [contents, state.platforms, state.series, state.editorial, postIts, indiceAgenda, filtro]);
  const filtroRotulo = filtroAtivo(filtro)
    ? [
      filtro.redes.length > 0 ? filtro.redes.map(rede => REDE_ROTULO[rede]).join(', ') : null,
      filtro.formato ? rotuloDoFormato(filtro.formato) : null,
    ].filter(Boolean).join(' · ')
    : null;

  const assuntosDoPlanejamento = useMemo(
    () => assuntosEmUso(postIts, contents, state.temas),
    [postIts, contents, state.temas],
  );
  const assuntoFiltro = assuntosDoPlanejamento.find(tema => tema.id === assuntoFiltroId) ?? null;

  const renderPostIt = (postIt: PlanejamentoPostIt, compact: boolean, className?: string) => {
    const content = contentById(contents, postIt.contentId);
    const appearance = postItAppearance(content, state.series, state.pilares, state.temas, postIt);
    const highlighted = destaqueIds.size > 0 && destaqueIds.has(postIt.id);
    const dimmedByFiltro = assuntoFiltro ? !conteudoTemAssunto(content, assuntoFiltro.id) : false;
    const dimmedByDestaque = destaqueIds.size > 0 && !highlighted;
    return (
      <PostItNote
        key={postIt.id}
        postIt={postIt}
        content={content}
        seriesColor={appearance.seriesColor}
        marks={appearance.marks}
        assuntos={appearance.assuntos}
        obras={nomesDasObras(content, state.bibliotecaItems)}
        redes={redesDoCartao({content, postIt, contas: state.platforms})}
        dimmed={dimmedByFiltro || dimmedByDestaque}
        highlighted={highlighted}
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

  /**
   * Semana: pílula aberta (título inteiro). Mês: compacta, com o título na segunda linha;
   * numa linha só, ícones e hora tomavam a célula e o título sumia.
   */
  const renderPublicacao = (publicacao: PublicacaoNoDia, variant: 'compact' | 'expanded' = 'compact') => {
    const posted = publicacao.estado === 'postado';
    return (
      <CalendarEventPill
        key={publicacao.id}
        variant={variant}
        className={variant === 'compact' ? 'flex-wrap gap-y-0.5 [&>span:last-child]:basis-full' : undefined}
        label={publicacao.titulo}
        time={publicacao.time}
        secondary={posted ? CONTENT_STATUS.POSTADO : DISPLAY_STATUS.PROGRAMADO}
        icon={calendarEntryIcon({platformNames: publicacao.platformNames, posted, scheduled: !posted})}
        style={calendarEntryPillStyle({type: 'publish', posted})}
        onClick={event => {
          event.stopPropagation();
          navigate(
            buildContentDetailRoute(publicacao.contentId, 'publicacao'),
            buildDetailBackState('/planejamento'),
          );
        }}
      />
    );
  };

  /**
   * Celular: publicação já programada ou postada. Só leitura (abre o conteúdo), mais apagada
   * que os post-its editáveis e com o estado por extenso.
   */
  const renderPublicacaoMobile = (publicacao: PublicacaoNoDia) => {
    const status = publicacao.estado === 'postado' ? CONTENT_STATUS.POSTADO : DISPLAY_STATUS.PROGRAMADO;
    return (
      <button
        type="button"
        onClick={() =>
          navigate(buildContentDetailRoute(publicacao.contentId, 'roteiro'), buildDetailBackState('/planejamento'))
        }
        aria-label={`${publicacao.titulo}, ${status}${publicacao.time ? ` às ${publicacao.time}` : ''}. Abrir roteiro`}
        className="flex min-h-11 w-full min-w-0 flex-col gap-1 rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Badge variant="status" status={status}>{status}</Badge>
          {publicacao.time ? (
            <Text variant="meta" as="span" className="shrink-0 tabular-nums text-[var(--text-secondary)]">
              {publicacao.time}
            </Text>
          ) : null}
          <span className="ml-auto flex shrink-0 items-center gap-1 text-[var(--text-tertiary)]">
            <CalendarNetworkIcons names={publicacao.platformNames} />
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        </span>
        <Text variant="body" as="span" className="block min-w-0 break-words text-[var(--text-secondary)]">
          {publicacao.titulo}
        </Text>
      </button>
    );
  };

  const abrirMover = (postIt: PlanejamentoPostIt) => {
    setMoveDate(postIt.date ?? null);
    setMoveId(postIt.id);
  };

  const abrirMoverPublicacao = (publicacao: PublicacaoNoDia) => {
    const content = contentById(contents, publicacao.contentId);
    const dia = content?.publishDate ? content.publishDate.slice(0, 10) : null;
    setMoveDate(dia);
    setMoveId(`content:${publicacao.contentId}`);
  };

  const fecharMover = () => setMoveId(null);

  const confirmarMover = () => {
    const id = moveId;
    setMoveId(null);
    if (!id) return;
    if (id.startsWith('content:')) {
      const cId = id.slice(8);
      const content = contentById(contents, cId);
      const currentDia = content?.publishDate ? content.publishDate.slice(0, 10) : null;
      if (!content || currentDia === moveDate) return;
      moveMany([id], moveDate);
      return;
    }
    const postIt = postIts.find(item => item.id === id);
    if (!postIt || (postIt.date ?? null) === moveDate) return;
    // moveMany mantém os avisos de "Passa do editorial".
    moveMany([id], moveDate);
  };

  const removePostItById = (id: string) => {
    const postIt = postIts.find(p => p.id === id);
    const removal = deletePostIt({postIts, contents, id});
    if (removal.postIts.length !== postIts.length) {
      dispatch({type: 'DELETE_POST_IT', payload: id});
      if (postIt?.contentId) {
        levarRoteiroDoPostIt(postIt.contentId, null);
      }
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
  const renderMobilePostIt = (postIt: PlanejamentoPostIt) => {
    const items: MoreMenuItem[] = [
      {
        id: 'mover',
        label: postIt.date ? 'Mover para outro dia…' : 'Colocar em um dia…',
        onClick: () => abrirMover(postIt),
      },
      ...(postIt.date
        ? [{id: 'tirar', label: 'Tirar do período', onClick: () => moveMany([postIt.id], null)} satisfies MoreMenuItem]
        : []),
      {id: 'apagar', label: 'Apagar', tone: 'danger', onClick: () => removePostItById(postIt.id)},
    ];
    return (
      <div className="relative min-w-0">
        {renderPostIt(postIt, false, 'min-h-11 pr-12')}
        <div className="absolute right-0.5 top-0.5">
          <MoreMenu items={items} align="right" label="Opções do post-it" size="sm" />
        </div>
      </div>
    );
  };

  const periodo = useMemo(() => periodoDaVista(month, vista), [month, vista]);

  // Decisão 3 (03/11): a Saúde segue o trecho visível no calendário (mês ou semana).
  // O plano do Editorial continua identificado à parte, no card de metas do período.
  // 2D: "Intervalo" troca o trecho da Saúde por datas escolhidas; incompleto ou invertido, vale o calendário.
  const intervaloValido = trecho === 'intervalo' && Boolean(intervalo.inicio && intervalo.fim && intervalo.inicio <= intervalo.fim);
  const periodoDaSaude = useMemo(
    () => (intervaloValido ? {inicio: intervalo.inicio, fim: intervalo.fim} : {inicio: periodo.inicio, fim: periodo.fim}),
    [intervaloValido, intervalo.inicio, intervalo.fim, periodo.inicio, periodo.fim],
  );
  // Com filtro, Saúde e calendário olham o mesmo recorte: só os conteúdos e post-its que passam nele.
  // A continuidade geral fica de todas as contas (o acompanhamento geral é de todas), identificada na análise.
  const contentsDoFiltro = useMemo(
    () => (filtroAtivo(filtro) ? contents.filter(content => conteudoPassa(indiceAgenda, content.id, filtro)) : contents),
    [contents, indiceAgenda, filtro],
  );
  const postItsDoFiltro = useMemo(
    () => (filtroAtivo(filtro) ? postIts.filter(postIt => postItPassa(indiceAgenda, postIt, filtro)) : postIts),
    [postIts, indiceAgenda, filtro],
  );
  const monthHealth = useMemo(() => {
    const settings = state.editorial;
    const counts = saudeDoMes({
      postIts: postItsDoFiltro,
      contents: contentsDoFiltro,
      series: state.series,
      pilares: state.pilares,
      settings,
      periodo: periodoDaSaude,
      platforms: state.platforms,
    });
    // Indicadores da Saúde: só leem. Objetivo de cada conteúdo; séries intervalo a intervalo.
    const proporcao = proporcaoDesejadaDoPeriodo({
      periodo: periodoDaSaude,
      limiteSemanal: settings.preferencias?.limiteSemanal ?? null,
      proporcaoFuncoes: readProporcao(settings.proporcaoFuncoes),
      vigencias: settings.vigencias,
    });
    // As mesmas metas em número do editor do Editorial: o ajuste do período, senão proporção × meta.
    // Com filtro não há meta de conteúdos daquela rede: os objetivos ficam em percentual contra a proporção.
    const metasObjetivo = metasDoPeriodo({
      limite: filtroAtivo(filtro) ? null : counts.limite,
      proporcao,
      ajustes: decisaoDoPeriodo(settings.periodos ?? [], periodoDaSaude.inicio, periodoDaSaude.fim)?.metas,
    });
    const objetivos = distribuicaoPorObjetivo({itens: counts.itens, contents: contentsDoFiltro, series: state.series, proporcao, metas: metasObjetivo});
    // Semanas e meses das pontas são avaliados inteiros: busca os itens além do período.
    const estendido = saudeDoMes({
      postIts,
      contents,
      series: state.series,
      pilares: state.pilares,
      settings,
      periodo: janelaDaContinuidade(periodoDaSaude),
      platforms: state.platforms,
    });
    const continuidade = continuidadeDasSeries({series: state.series, itens: estendido.itens, periodo: periodoDaSaude, pausas: settings.pausas ?? []});
    // Publicações por conta no trecho, com a meta de cada conta e a soma (incompleta quando falta meta).
    const publicacoes = publicacoesNaSaude({
      contents: contentsDoFiltro,
      platforms: state.platforms,
      series: state.series,
      periodo: periodoDaSaude,
      linhas: settings.metasDasContas ?? [],
      decisao: decisaoDoPeriodo(settings.periodos ?? [], periodoDaSaude.inicio, periodoDaSaude.fim),
      proporcaoGeral: readProporcao(settings.proporcaoFuncoes),
      pausas: settings.pausas ?? [],
      filtro,
    });
    // Acompanhamentos por conta ou formato: cada um conferido à parte, pelas publicações de cada conta.
    // Com filtro, ficam os acompanhamentos daquela conta ou formato e os que valem para todas.
    const escopos = linhasDaContinuidadePorEscopo({
      series: state.series,
      contents,
      postIts,
      platforms: state.platforms,
      periodo: periodoDaSaude,
      pausas: settings.pausas ?? [],
    }).filter(linha =>
      (filtro.redes.length === 0 || !linha.platformId || filtro.redes.includes(redeDaRef(linha.platformId, state.platforms) ?? 'outra'))
      && (!filtro.formato || !linha.formato || linha.formato === filtro.formato));
    return {
      // A meta absoluta do período já vem na contagem (`metaDoPeriodo`).
      counts,
      temDistribuicao: readProporcao(settings.proporcaoFuncoes) != null,
      objetivos,
      continuidade,
      escopos,
      publicacoes,
    };
  }, [postIts, contents, postItsDoFiltro, contentsDoFiltro, state.series, state.pilares, state.platforms, state.editorial, periodoDaSaude, filtro]);
  const rotuloSaude = rotuloDoPeriodo(periodoDaSaude);
  const avisoSaude = avisoDoCalendario(periodoDaSaude, periodo);

  // Avisos no mesmo trecho da Saúde (o intervalo, quando escolhido) e no mesmo recorte do filtro.
  // Gravações por dia são capacidade do dia, de todas as redes: esse aviso não segue o filtro.
  const avisosOrientacao = useMemo(() => {
    const avisosDo = (lista: {postIts: PlanejamentoPostIt[]; contents: typeof contents}) => avisosDeOrientacao({
      postIts: lista.postIts,
      contents: lista.contents,
      series: state.series,
      temas: state.temas,
      obras: state.bibliotecaItems,
      periodo: periodoDaSaude,
      // Frequência das séries com a mesma apuração da Saúde: janelas inteiras nas pontas.
      itensSerie: saudeDoMes({
        postIts: lista.postIts,
        contents: lista.contents,
        series: state.series,
        pilares: state.pilares,
        settings: state.editorial,
        periodo: janelaDaContinuidade(periodoDaSaude),
        platforms: state.platforms,
      }).itens,
      limiteGravacoesDia: state.editorial.preferencias.limiteGravacoesDia,
      concentracao: state.editorial.concentracao,
      excecoesConcentracao: state.editorial.excecoesConcentracao,
      pausas: state.editorial.pausas ?? [],
    });
    const todos = avisosDo({postIts, contents});
    if (!filtroAtivo(filtro)) return todos;
    const doFiltro = avisosDo({postIts: postItsDoFiltro, contents: contentsDoFiltro});
    return [
      ...doFiltro.filter(aviso => aviso.tipo !== 'gravacoes-no-dia'),
      ...todos.filter(aviso => aviso.tipo === 'gravacoes-no-dia'),
    ];
  }, [postIts, contents, postItsDoFiltro, contentsDoFiltro, filtro, state.series, state.pilares, state.platforms, state.editorial, state.temas, state.bibliotecaItems, periodoDaSaude]);

  const verPautasDoAviso = (aviso: AvisoOrientacao) => {
    setAvisoAtivoId(aviso.id);
    setDestaqueIds(new Set(aviso.postItIds));
  };

  const localizarAviso = (aviso: AvisoOrientacao) => {
    const dia = diaDoAviso(aviso, postIts, contents);
    if (dia) setMonth(new Date(`${dia}T12:00:00`));
    verPautasDoAviso(aviso);
    setAnaliseAberta(false);
  };

  /** Análise da Saúde: drawer por cima da tela, em qualquer largura; no celular ocupa a tela inteira. */
  const renderAnalise = () => (
    <SaudeEditorialPanel
      modo="analise"
      rotuloPeriodo={rotuloSaude}
      avisoPeriodo={avisoSaude}
      counts={monthHealth.counts}
      series={state.series}
      pilares={state.pilares}
      objetivos={monthHealth.objetivos}
      continuidade={monthHealth.continuidade}
      escopos={monthHealth.escopos}
      publicacoes={monthHealth.publicacoes}
      filtroRotulo={filtroRotulo}
      avisos={avisosOrientacao}
      onLocalizarAviso={localizarAviso}
      onFechar={() => setAnaliseAberta(false)}
      onAddReserva={() => addEmpty(format(new Date(), 'yyyy-MM-dd'))}
      onOpenGravacao={() => navigate('/gravacao')}
    />
  );

  const limparDestaque = () => {
    setAvisoAtivoId(null);
    setDestaqueIds(new Set());
  };

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

  /** O roteiro ligado vai junto: Calendário e roteiro passam a mostrar o mesmo dia. */
  const levarRoteiroDoPostIt = (contentId: string | null, date: string | null) => {
    const content = contentById(contents, contentId);
    const movido = content ? levarRoteiroAoDia(content, date) : null;
    if (movido) void dispatch({type: 'UPDATE_CONTENT', payload: movido});
  };

  const moveMany = (ids: readonly string[], date: string | null) => {
    const targets: PlanejamentoPostIt[] = [];
    const contentTargets: Content[] = [];

    for (const id of ids) {
      if (id.startsWith('content:')) {
        const cId = id.slice(8);
        const content = contentById(contents, cId);
        if (content && !roteiroPublicado(content) && !contentTargets.some(c => c.id === cId)) {
          contentTargets.push(content);
        }
        continue;
      }

      const postIt = postIts.find(item => item.id === id);
      if (postIt) {
        if (targets.some(item => item.id === id) || postIt.date === date) continue;
        const content = contentById(contents, postIt.contentId);
        if (content && roteiroPublicado(content)) continue;
        targets.push(postIt);
        continue;
      }

      const content = contentById(contents, id);
      if (content && !roteiroPublicado(content) && !contentTargets.some(c => c.id === id)) {
        contentTargets.push(content);
      }
    }

    if (targets.length > 0) {
      dispatch({
        type: 'UPDATE_POST_ITS',
        payload: targets.map(postIt => movePostIt(postIt, date)),
      });
      targets.forEach(postIt => levarRoteiroDoPostIt(postIt.contentId, date));
    }

    if (contentTargets.length > 0) {
      for (const content of contentTargets) {
        const movido = levarRoteiroAoDia(content, date);
        if (movido) {
          void dispatch({type: 'UPDATE_CONTENT', payload: movido});
        }
        const linkedPostIts = postIts.filter(p => p.contentId === content.id && p.date !== date);
        if (linkedPostIts.length > 0) {
          dispatch({
            type: 'UPDATE_POST_ITS',
            payload: linkedPostIts.map(p => movePostIt(p, date)),
          });
        }
      }
    }
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
      // Puxado para a pilha, o roteiro mantém a data que já tinha.
      if (date) levarRoteiroDoPostIt(content.id, date);
      setPullOpen(false);
    });
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
      if (saved.date !== openPostIt.date) levarRoteiroDoPostIt(openPostIt.contentId, saved.date);
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

  const commitTransform = (target: 'ideia' | 'roteiro') => {
    if (!openPostIt || editing) return;
    const result = transformPostIt({
      postIt: openPostIt,
      contents,
      target,
      contas: state.platforms,
    });
    if (!result.ok) return;
    void (async () => {
      await dispatch({
        type: result.mode === 'create' ? 'ADD_CONTENT' : 'UPDATE_CONTENT',
        payload: result.content,
      });
      await dispatch({type: 'UPDATE_POST_IT', payload: result.postIt});
    })();
    setOpenId(null);
    if (result.openScript) {
      navigate(
        buildContentDetailRoute(result.content.id, 'roteiro'),
        buildDetailBackState('/planejamento'),
      );
    }
  };

  const desenvolverReserva = (postIt: PlanejamentoPostIt) => {
    const result = transformPostIt({
      postIt,
      contents,
      target: 'roteiro',
      contas: state.platforms,
    });
    if (!result.ok) {
      setEditing(false);
      setOpenId(postIt.id);
      return;
    }
    void (async () => {
      await dispatch({
        type: result.mode === 'create' ? 'ADD_CONTENT' : 'UPDATE_CONTENT',
        payload: result.content,
      });
      await dispatch({type: 'UPDATE_POST_IT', payload: result.postIt});
    })();
    if (result.openScript) {
      navigate(
        buildContentDetailRoute(result.content.id, 'roteiro'),
        buildDetailBackState('/planejamento'),
      );
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

  const options = openPostIt ? postItTransformOptions(openPostIt, openContent) : {ideia: false, roteiro: false};
  const openKind = openPostIt ? postItKind(openPostIt, openContent) : 'vazio';
  const openRedes = openPostIt ? redesDoCartao({content: openContent, postIt: openPostIt, contas: state.platforms}) : [];
  const openAppearance = postItAppearance(openContent, state.series, state.pilares, state.temas, openPostIt);
  const opcoesDeSerie = [...state.series]
    .filter(serie => serie.ativa || serie.id === classeDraft.serieId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map(serie => ({value: serie.id, label: serie.name}));
  const redeReferencia = rotuloDaRef(
    state.editorial.preferencias?.redeReferenciaId ?? state.editorial.redeReferenciaId,
    state.platforms,
  );
  const opcoesDePilar = sortPilares(state.pilares)
    .filter(pilar => pilar.ativo || pilar.id === classeDraft.pilarId)
    .map(pilar => ({value: pilar.id, label: pilar.nome}));

  return (
    <PageLayout
      contentWidth="wide"
      header={(
        <DesktopPageHeader
          section="Produção"
          title="Planejamento"
          subtitle="Distribua suas pautas e encontre espaço para novas ideias."
          actions={(
            <>
              <AppButton
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => addEmpty(format(new Date(), 'yyyy-MM-dd'))}
              >
                Criar post-it
              </AppButton>
              <AppButton
                variant="secondary"
                leftIcon={<ArrowDownToLine className="h-4 w-4" />}
                onClick={() => {
                  setPullDate(null);
                  setPullOpen(true);
                }}
              >
                Adicionar conteúdo
              </AppButton>
            </>
          )}
        />
      )}
      navigation={(
        <CalendarPeriodNav
          anchorDate={month}
          onAnchorDateChange={setMonth}
          viewMode={vista}
          onViewModeChange={mode => setVista(mode)}
          weekViewId="semana"
          views={[
            {id: 'mes' as const, label: 'Mês'},
            {id: 'semana' as const, label: 'Semana'},
          ]}
        />
      )}
      toolbar={(
        <PageToolbar
          filters={
            <>
            {/* O mesmo filtro rápido de redes da Criação; com uma rede só, não aparece. */}
            {redesDoFiltroRapido(state.platforms, filtro.redes).length > 1 ? (
              <CreationRedeQuickFilter
                redes={redesDoFiltroRapido(state.platforms, filtro.redes)}
                value={filtro.redes}
                onChange={redes => setFiltro(atual => ({...atual, redes}))}
              />
            ) : null}
            <SelectField
              ariaLabel="Filtrar por formato"
              prefix="Formato:"
              value={filtro.formato ?? 'todos'}
              onChange={value => setFiltro(atual => ({...atual, formato: value === 'todos' ? null : value}))}
              selected={Boolean(filtro.formato)}
              options={[{value: 'todos', label: 'Todos'}, ...formatosDoFiltro()]}
            />
            <SelectField
              ariaLabel="Trecho da Saúde"
              prefix="Saúde:"
              value={trecho}
              onChange={value => setTrecho(value === 'intervalo' ? 'intervalo' : 'calendario')}
              selected={trecho === 'intervalo'}
              options={[
                {value: 'calendario', label: vista === 'semana' ? 'Semana visível' : 'Mês visível'},
                {value: 'intervalo', label: 'Intervalo'},
              ]}
            />
            {trecho === 'intervalo' ? (
              <span className="inline-flex flex-wrap items-center gap-1">
                <input
                  type="date"
                  aria-label="Início do intervalo da Saúde"
                  value={intervalo.inicio}
                  onChange={event => setIntervalo(atual => ({...atual, inicio: event.target.value}))}
                  className="min-h-9 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 text-[var(--text-primary)]"
                />
                <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">a</Text>
                <input
                  type="date"
                  aria-label="Fim do intervalo da Saúde"
                  value={intervalo.fim}
                  onChange={event => setIntervalo(atual => ({...atual, fim: event.target.value}))}
                  className="min-h-9 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 text-[var(--text-primary)]"
                />
              </span>
            ) : null}
            {assuntosDoPlanejamento.length > 0 ? (
              <SelectField
                ariaLabel="Destacar por assunto"
                prefix="Assunto:"
                value={assuntoFiltro?.id ?? 'todos'}
                onChange={value => setAssuntoFiltroId(value === 'todos' ? null : value)}
                selected={Boolean(assuntoFiltro)}
                options={[
                  {value: 'todos', label: 'Todos'},
                  ...assuntosDoPlanejamento.map(tema => ({value: tema.id, label: tema.nome})),
                ]}
              />
            ) : null}
            </>
          }
          view={(
            <AppButton
              variant="secondary"
              aria-expanded={direcaoAberta}
              aria-controls="direcao-periodo-planejamento"
              rightIcon={<ChevronDown className={cn('h-4 w-4 transition-transform', direcaoAberta && 'rotate-180')} />}
              onClick={() => setDirecaoAberta(atual => !atual)}
            >
              Prioridade e metas
            </AppButton>
          )}
        />
      )}
    >
      {(() => {
        // Dia em que uma conta do YouTube tem horário próprio: cartões só do YouTube vão abaixo da linha.
        const separarDia = (dateKey: string) => {
          if (!diaDaRede({weekday: weekdayDaData(dateKey), rede: 'youtube', horarios: state.postingTimeEntries ?? [], contas: state.platforms})) return null;
          const pubs = dividirPorRede(publicacoesDoDia.get(dateKey) ?? [], pub => redesDoConteudo(contentById(contents, pub.contentId), state.platforms), 'youtube');
          const postIts = dividirPorRede(byDate.get(dateKey) ?? [], postIt => redesDoCartao({content: contentById(contents, postIt.contentId), postIt, contas: state.platforms}), 'youtube');
          return {rede: 'youtube' as const, pubsAcima: pubs.acima, pubsAbaixo: pubs.abaixo, postItsAcima: postIts.acima, postItsAbaixo: postIts.abaixo};
        };

        const renderPlanejamentoContentCard = (publicacao: PublicacaoNoDia) => {
          const content = contentById(contents, publicacao.contentId);
          const serie = content?.seriesId
            ? state.series.find(s => s.id === content.seriesId)
            : null;
          const pilarId = content ? pilarDoConteudo(content, state.series) : null;
          const pilar = pilarId ? state.pilares.find(p => p.id === pilarId) ?? null : null;
          const posted = publicacao.estado === 'postado';

          return (
            <PlanejamentoContentCard
              key={publicacao.id}
              publicacao={publicacao}
              content={content}
              serie={serie}
              pilar={pilar}
              contas={contasDoCard(publicacoesDoCard(indiceAgenda, publicacao.contentId, publicacao.dia), state.platforms)}
              draggable={!isMobile && !posted}
              onDragStart={event => {
                if (isMobile || posted) return;
                const payload = `content:${publicacao.contentId}`;
                event.dataTransfer.setData(POST_IT_MIME, payload);
                event.dataTransfer.setData('text/plain', payload);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onOpen={() => {
                navigate(
                  buildContentDetailRoute(publicacao.contentId, 'roteiro'),
                  buildDetailBackState('/planejamento'),
                );
              }}
              onMove={posted ? undefined : () => abrirMoverPublicacao(publicacao)}
              onRemoveFromDate={posted ? undefined : () => moveMany([`content:${publicacao.contentId}`], null)}
            />
          );
        };

        const renderPlanejamentoReservaCard = (postIt: PlanejamentoPostIt) => {
          const content = contentById(contents, postIt.contentId);
          const serie = (postIt.serieId || content?.seriesId)
            ? state.series.find(s => s.id === (postIt.serieId || content?.seriesId))
            : null;
          // Com conteúdo ligado vale o pilar do conteúdo, como na contagem; sem conteúdo, o do post-it ou o herdado da série.
          const pilarId = content
            ? pilarDoConteudo(content, state.series)
            : postIt.pilarId || pilarHerdadoDaSerie(postIt.serieId, state.series);
          // Sem pilar escolhido não há pilar: o cartão fica com a cor de post-it, não com o primeiro da lista.
          const pilar = pilarId ? state.pilares.find(p => p.id === pilarId) ?? null : null;

          if (content) {
            const redes = redesDoCartao({content, postIt, contas: state.platforms});
            const publicacao: PublicacaoNoDia = {
              id: `postit:${postIt.id}`,
              contentId: content.id,
              titulo: content.title?.trim() || postIt.texto?.trim() || 'Sem título',
              time: (content.publishTime ? content.publishTime.slice(0, 5) : null) || (content.publishDate?.includes('T') ? content.publishDate.slice(11, 16) : null),
              // A referência é o id da conta: vira a rede dela. Sem rede conhecida, nenhum ícone.
              platformNames: redes.length > 0 ? redes : (() => {
                if (!state.editorial.redeReferenciaId) return ['instagram'];
                const rede = redeDaRef(state.editorial.redeReferenciaId, state.platforms);
                return rede ? [rede] : [];
              })(),
              estado: 'previsto',
            };

            return (
              <PlanejamentoContentCard
                key={postIt.id}
                publicacao={publicacao}
                content={content}
                serie={serie}
                pilar={pilar}
                contas={contasDoCard(publicacoesDoCard(indiceAgenda, content.id, postIt.date), state.platforms)}
                draggable={!isMobile}
                onDragStart={event => {
                  if (isMobile) return;
                  const ids =
                    selectedIds.has(postIt.id) && selectedIds.size > 0
                      ? [...selectedIds]
                      : [postIt.id];
                  const payload = ids.join('\n');
                  event.dataTransfer.setData(POST_IT_MIME, payload);
                  event.dataTransfer.setData('text/plain', payload);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onOpen={() => {
                  navigate(
                    buildContentDetailRoute(content.id, 'roteiro'),
                    buildDetailBackState('/planejamento'),
                  );
                }}
                onMove={() => abrirMover(postIt)}
                onRemoveFromDate={() => removePostItById(postIt.id)}
                onDelete={() => removePostItById(postIt.id)}
              />
            );
          }

          return (
            <PlanejamentoReservaCard
              key={postIt.id}
              postIt={postIt}
              content={content}
              serie={serie}
              pilar={pilar}
              draggable={!isMobile}
              onDragStart={event => {
                if (isMobile) return;
                const ids =
                  selectedIds.has(postIt.id) && selectedIds.size > 0
                    ? [...selectedIds]
                    : [postIt.id];
                const payload = ids.join('\n');
                event.dataTransfer.setData(POST_IT_MIME, payload);
                event.dataTransfer.setData('text/plain', payload);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onOpen={() => {
                setEditing(false);
                setOpenId(postIt.id);
              }}
              onDesenvolver={() => desenvolverReserva(postIt)}
              onMove={() => abrirMover(postIt)}
              onDelete={() => removePostItById(postIt.id)}
            />
          );
        };

        if (isMobile) {
          return (
            <div className="stack-md pb-8">
              <SaudeEditorialPanel
                rotuloPeriodo={rotuloSaude}
                avisoPeriodo={avisoSaude}
                counts={monthHealth.counts}
                series={state.series}
                pilares={state.pilares}
                objetivos={monthHealth.objetivos}
                continuidade={monthHealth.continuidade}
                escopos={monthHealth.escopos}
                publicacoes={monthHealth.publicacoes}
                modo="faixa"
                filtroRotulo={filtroRotulo}
                avisos={avisosOrientacao}
                onVerAnalise={() => setAnaliseAberta(true)}
                onAddReserva={() => addEmpty(format(new Date(), 'yyyy-MM-dd'))}
                onOpenGravacao={() => navigate('/gravacao')}
              />
              <PlanejamentoMobileView
                month={month}
                onMonthChange={setMonth}
                vista={vista}
                onVistaChange={setVista}
                byDate={byDate}
                publicacoesDoDia={publicacoesDoDia}
                undated={undated}
                contents={contents}
                series={state.series}
                temas={assuntosDoPlanejamento}
                renderPostIt={renderPlanejamentoReservaCard}
                renderPublicacao={renderPlanejamentoContentCard}
                onNovoPostIt={addEmpty}
                onPuxar={date => {
                  setPullDate(date);
                  setPullOpen(true);
                }}
                onEditorial={() => navigate('/editorial')}
                resumo={
                  <PlanejamentoResumo
                    counts={monthHealth.counts}
                    entries={monthHealth.counts.entries}
                    series={state.series}
                    pilares={state.pilares}
                    temas={state.temas}
                    obras={state.bibliotecaItems}
                    contents={contents}
                    temDistribuicao={monthHealth.temDistribuicao}
                    outrasRedes={monthHealth.counts.outrasRedes}
                    vista={vista}
                    avisos={avisosOrientacao}
                    avisoAtivoId={avisoAtivoId}
                    onVerPautas={verPautasDoAviso}
                    onLimparDestaque={limparDestaque}
                  />
                }
                assuntoFiltroId={assuntoFiltroId}
                onAssuntoFiltroChange={setAssuntoFiltroId}
              />
            </div>
          );
        }

        return (
          // Sem padding lateral próprio: o frame já dá a margem, e assim o conteúdo alinha com o título.
          <div className="stack-md pt-4 pb-8">
            {direcaoAberta ? (
              <div id="direcao-periodo-planejamento" className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <PeriodoPanel
                  periodo={periodoEditorial}
                  onPeriodoChange={salvarPeriodoEditorial}
                  onAbrirAjustes={() => navigate('/editorial?aba=direcao')}
                />
              </div>
            ) : null}

            <SaudeEditorialPanel
              rotuloPeriodo={rotuloSaude}
              avisoPeriodo={avisoSaude}
              counts={monthHealth.counts}
              series={state.series}
              pilares={state.pilares}
              objetivos={monthHealth.objetivos}
              continuidade={monthHealth.continuidade}
              escopos={monthHealth.escopos}
              publicacoes={monthHealth.publicacoes}
              modo="faixa"
              filtroRotulo={filtroRotulo}
              avisos={avisosOrientacao}
              onVerAnalise={() => setAnaliseAberta(atual => !atual)}
              onAddReserva={() => addEmpty(format(new Date(), 'yyyy-MM-dd'))}
              onOpenGravacao={() => navigate('/gravacao')}
            />

            {selectedIds.size > 0 ? (
              <Surface variant="outlined" padding="sm" className="flex flex-wrap items-center justify-between gap-3">
                <Text variant="meta" className="text-[var(--text-secondary)]">
                  {selectedIds.size === 1 ? '1 post-it selecionado.' : `${selectedIds.size} post-its selecionados.`} Arraste um deles para mover todos.
                </Text>
                <div className="flex flex-wrap items-center gap-2">
                  <AppButton
                    variant="secondary"
                    size="sm"
                    leftIcon={<Trash2 className="h-4 w-4" />}
                    onClick={removeSelected}
                  >
                    {selectedIds.size === 1 ? 'Apagar 1' : `Apagar ${selectedIds.size}`}
                  </AppButton>
                  <AppButton variant="ghost" size="sm" onClick={clearSelection}>
                    Sair da seleção
                  </AppButton>
                </div>
              </Surface>
            ) : null}

            <div className={cn(
              vista === 'semana'
                ? 'grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_20rem]'
                : 'w-full min-w-0'
            )}>
              <div className="stack-md min-w-0">
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
                      const ids = readDragIds(event);
                      if (ids.length > 0) moveMany(ids, key);
                    }}
                    renderPostIt={renderPlanejamentoReservaCard}
                    renderPublicacao={renderPlanejamentoContentCard}
                    separarDia={separarDia}
                    onAddPauta={addEmpty}
                    onPuxarConteudo={key => {
                      setPullDate(key);
                      setPullOpen(true);
                    }}
                  />
                ) : (
                  <CalendarMonthGrid
                    anchorDate={month}
                    weekStartsOn={1}
                    headerFormat="short"
                    dayNumberAlign="start"
                    minCellHeight={110}
                    expandContent
                    tone="elevated"
                    getDayClassName={day => cn(
                      'group/day',
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
                      const ids = readDragIds(event);
                      if (ids.length > 0) moveMany(ids, day.dateKey);
                    }}
                    renderDayContent={day => {
                      const dayPostIts = byDate.get(day.dateKey) ?? [];
                      const dayPublicacoes = publicacoesDoDia.get(day.dateKey) ?? [];
                      return (
                        <div className="@container stack-sm">
                          {(() => {
                            const dia = separarDia(day.dateKey);
                            if (!dia) return (<>
                              {dayPublicacoes.map(renderPlanejamentoContentCard)}
                              {dayPostIts.map(renderPlanejamentoReservaCard)}
                            </>);
                            return (<>
                              {dia.pubsAcima.map(renderPlanejamentoContentCard)}
                              {dia.postItsAcima.map(renderPlanejamentoReservaCard)}
                              <DivisoriaRede rede={dia.rede}>
                                {dia.pubsAbaixo.map(renderPlanejamentoContentCard)}
                                {dia.postItsAbaixo.map(renderPlanejamentoReservaCard)}
                              </DivisoriaRede>
                            </>);
                          })()}
                          <div className="mt-1 flex items-center gap-1 opacity-70 transition-opacity md:opacity-0 md:group-hover/day:opacity-100 md:focus-within:opacity-100 pointer-coarse:opacity-100">
                            <AppButton
                              variant="ghost"
                              size="xs"
                              className="px-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              leftIcon={<Plus className="h-3 w-3" />}
                              aria-label={`Criar post-it no dia ${format(day.day, 'd')}`}
                              onClick={event => {
                                event.stopPropagation();
                                addEmpty(day.dateKey);
                              }}
                            >
                              Post-it
                            </AppButton>
                            <AppButton
                              variant="ghost"
                              size="xs"
                              className="px-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              leftIcon={<ArrowDownToLine className="h-3 w-3" />}
                              aria-label={`Puxar da criação para o dia ${format(day.day, 'd')}`}
                              onClick={event => {
                                event.stopPropagation();
                                setPullDate(day.dateKey);
                                setPullOpen(true);
                              }}
                            >
                              Puxar
                            </AppButton>
                          </div>
                        </div>
                      );
                    }}
                  />
                )}
              </div>

              {vista === 'semana' && (
                <SemDataPanel
                  undated={undated}
                  contents={contents}
                  series={state.series}
                  temas={state.temas}
                  pileOver={pileOver}
                  className="xl:sticky xl:top-32 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto"
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
                  renderPostIt={renderPlanejamentoReservaCard}
                />
              )}
            </div>
          </div>
        );
      })()}

      <Drawer
        open={analiseAberta}
        onClose={() => setAnaliseAberta(false)}
        widthClassName="max-w-xl"
        ariaLabel="Análise da Saúde"
      >
        <div className="h-full min-h-0 overflow-y-auto bg-[var(--bg-elevated)]">
          {renderAnalise()}
        </div>
      </Drawer>

      <Dialog open={Boolean(openPostIt)} onClose={closePostIt} desktopMaxW="max-w-lg" ariaLabel="Post-it">
        {openPostIt ? (
          <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
            <OverlayHeader
              title={editing ? 'Editar post-it' : 'Post-it'}
              icon={<StickyNote className="h-6 w-6 text-[var(--brand-accent-text)]" />}
              onClose={closePostIt}
            />
            <OverlayBody>
              <div className={editing ? 'stack-md' : 'stack-lg'}>
                {!editing ? (
                  <div className="stack-sm">
                    <div>
                      <Badge
                        variant={openKind === 'vazio' ? 'neutral' : 'status'}
                        status={openKind === 'vazio' ? undefined : normalizeContentStatus(openContent?.status || '')}
                      >
                        {openKind === 'vazio'
                          ? 'Pauta'
                          : normalizeContentStatus(openContent?.status || '')}
                      </Badge>
                    </div>
                    <p className="flex items-center gap-2 t-body text-[var(--text-secondary)]">
                      <CalendarDays className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                      {openPostIt.date
                        ? format(new Date(`${openPostIt.date}T12:00:00`), "d 'de' MMMM 'de' yyyy", {locale: ptBR})
                        : 'Sem data'}
                    </p>
                    {isMobile ? (
                      <AppButton variant="secondary" size="sm" className="self-start" onClick={() => abrirMover(openPostIt)}>
                        Mover para…
                      </AppButton>
                    ) : null}
                  </div>
                ) : null}
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
                    O roteiro puxado não está mais aqui. Exclua o post-it se ele não servir.
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
                  <label className="stack-xs">
                    <Text variant="label" as="span">Nota</Text>
                    <textarea
                      value={noteDraft}
                      onChange={event => setNoteDraft(event.target.value)}
                      rows={3}
                      autoFocus
                      placeholder="Pode ficar em branco."
                      className="w-full resize-none placeholder:text-[var(--text-tertiary)]"
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
                      Objetivo, série e pilar vêm do roteiro ligado.
                    </Text>
                  ) : (
                    <div className="stack-xs">
                      {/* O rótulo visível segue o dos outros campos; o do TagSelect fica só para leitor de tela. */}
                      <Text variant="label" as="span" aria-hidden>Série ou quadro</Text>
                      <TagSelect
                        id="postit-serie"
                        label="Série ou quadro"
                        hideLabel
                        placeholder="Sem série (cor neutra)"
                        searchable
                        maxSelections={1}
                        values={classeDraft.serieId ? [classeDraft.serieId] : []}
                        options={opcoesDeSerie}
                        onChange={values => setClasseDraft(atual => escolherSerieNoPostIt(
                          atual,
                          state.series.find(serie => serie.id === values[0]) ?? null,
                          state.series,
                        ))}
                      />
                    </div>
                  )
                ) : null}
                {editing ? (
                  <div className="stack-xs">
                    <Text variant="label" as="span">Conta de publicação</Text>
                    <RedeChips
                      value={classeDraft.redes ?? []}
                      onChange={redes => setClasseDraft(atual => ({...atual, redes}))}
                      platforms={state.platforms}
                    />
                  </div>
                ) : null}
                {editing ? <CampoDia id="postit-dia" value={dateDraft} onChange={setDateDraft} /> : null}
                {!editing && openKind !== 'roteiro' && (options.ideia || options.roteiro) ? (
                  <section className="stack-md border-t border-[var(--border-color)] pt-6" aria-labelledby="postit-transformar">
                    <div className="stack-xs">
                      <Text variant="itemTitle" as="h3">
                        <span id="postit-transformar">Transformar post-it</span>
                      </Text>
                      <Text variant="secondary" className="text-[var(--text-secondary)]">
                        {openKind === 'ideia'
                          ? 'Ao transformar em roteiro, a data do post-it vai para a publicação.'
                          : 'A nota, a série, o objetivo, as contas e o dia vão junto. O dia aparece no Calendário.'}
                      </Text>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {openKind === 'vazio' && options.ideia ? (
                        <AppButton variant="secondary" fullWidth onClick={() => commitTransform('ideia')}>
                          Transformar em ideia
                        </AppButton>
                      ) : null}
                      {options.roteiro ? (
                        <AppButton
                          variant={openKind === 'vazio' ? 'primary' : 'secondary'}
                          fullWidth
                          className={openKind === 'vazio' && options.ideia ? undefined : 'sm:col-span-2'}
                          onClick={() => commitTransform('roteiro')}
                        >
                          Transformar em roteiro
                        </AppButton>
                      ) : null}
                    </div>
                  </section>
                ) : null}
                {!editing && openKind === 'vazio' ? (
                  <section className="stack-md border-t border-[var(--border-color)] pt-6" aria-labelledby="postit-encaixar">
                    <div className="stack-xs">
                      <Text variant="itemTitle" as="h3">
                        <span id="postit-encaixar">Usar uma ideia ou roteiro que já existe</span>
                      </Text>
                      <Text variant="secondary" className="text-[var(--text-secondary)]">
                        Veja as ideias e os roteiros sem data que podem ocupar este espaço.
                      </Text>
                    </div>
                    <AppButton variant="secondary" fullWidth onClick={() => setEncaixeId(openPostIt.id)}>
                      Ver o que encaixa
                    </AppButton>
                  </section>
                ) : null}
              </div>
            </OverlayBody>
            <OverlayFooter className={editing ? 'justify-end gap-2' : 'justify-between'}>
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
      </Dialog>

      <Dialog open={moveId !== null} onClose={fecharMover} desktopMaxW="max-w-sm" zIndex="z-[140]" ariaLabel={moveId?.startsWith('content:') ? 'Mover publicação' : 'Mover post-it'}>
        <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
          <OverlayHeader title={moveId?.startsWith('content:') ? 'Mover publicação' : 'Mover post-it'} onClose={fecharMover} />
          <OverlayBody>
            <CampoDia id="mover-dia" value={moveDate} onChange={setMoveDate} />
          </OverlayBody>
          <OverlayFooter className="justify-end gap-2">
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
        platforms={state.platforms}
        onClose={fecharRapido}
        onSalvar={salvarRapido}
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
