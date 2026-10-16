import {useEffect, useMemo, useRef, useState, type DragEvent} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {CalendarDays, Pencil, Plus, StickyNote, Tag, Trash2} from 'lucide-react';
import {
  calendarEntryPillStyle,
  CalendarEventPill,
  CalendarMonthGrid,
  CalendarPeriodNav,
} from '../../../components/calendar';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
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
import {calendarEntryIcon} from '../../editorial-calendar/components/CalendarNetworkIcons';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';
import {etiquetasVisiveis} from '../../creation/lib/creationItemPresentation';
import {distribuicaoFecha} from '../../editorial/lib/gradeCounts';
import {FUNCAO_CURTA, FUNCAO_LABELS, FUNCOES, FUNIL_DA_FUNCAO, isFuncaoEditorial, resolveFuncao} from '../../editorial/lib/funcoes';
import {sortPilares} from '../../settings/lib/activePilares';
import {EncaixeDialog} from '../components/EncaixeDialog';
import {MonthHealth} from '../components/MonthHealth';
import {PuxarConteudoDialog} from '../components/PuxarConteudoDialog';
import {excessosAoAcrescentar, periodoDoMes, saudeDoMes, type ExcessoMes} from '../lib/monthHealth';
import {POST_IT_MIME, PostItIdentity, PostItNote, PostItTemas, type PostItMark} from '../components/PostItNote';
import {conteudoTemTema, temasEmUso} from '../lib/temasPlanejamento';
import {publicacoesPorDia} from '../lib/publicacoesDoMes';
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
): {seriesColor: string | null; marks: PostItMark[]; temas: string[]} {
  if (!content && !postIt) return {seriesColor: null, marks: [], temas: []};
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
    seriesColor: content ? serie?.cor?.trim() || null : null,
    marks,
    temas: content ? etiquetasVisiveis(content, temas) : [],
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
  const [month, setMonth] = useState(new Date());
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [pileOver, setPileOver] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pullOpen, setPullOpen] = useState(false);
  const [pullDate, setPullDate] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [classeDraft, setClasseDraft] = useState<PostItEdit>({texto: '', date: null});
  const [avisos, setAvisos] = useState<ExcessoMes[] | null>(null);
  const [encaixeId, setEncaixeId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [temaFiltroId, setTemaFiltroId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const avisoPendente = useRef<(() => void) | null>(null);

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
      const list = map.get(postIt.date) ?? [];
      list.push(postIt);
      map.set(postIt.date, list);
    });
    return map;
  }, [postIts]);

  const undated = useMemo(
    () => postIts.filter(postIt => !postIt.date),
    [postIts],
  );

  const publicacoesDoDia = useMemo(
    () => publicacoesPorDia({
      contents,
      platforms: state.platforms,
      series: state.series,
      redeReferenciaId: state.editorial.redeReferenciaId,
    }),
    [contents, state.platforms, state.series, state.preferences],
  );

  const temasDoPlanejamento = useMemo(
    () => temasEmUso(postIts, contents, state.temas),
    [postIts, contents, state.temas],
  );
  const temaFiltro = temasDoPlanejamento.find(tema => tema.id === temaFiltroId) ?? null;

  const renderPostIt = (postIt: PlanejamentoPostIt, compact: boolean) => {
    const content = contentById(contents, postIt.contentId);
    const appearance = postItAppearance(content, state.series, state.pilares, state.temas, postIt);
    return (
      <PostItNote
        key={postIt.id}
        postIt={postIt}
        content={content}
        seriesColor={appearance.seriesColor}
        marks={appearance.marks}
        temas={appearance.temas}
        dimmed={temaFiltro ? !conteudoTemTema(content, temaFiltro.id) : false}
        compact={compact}
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

  const monthHealth = useMemo(() => {
    const settings = state.editorial;
    return {
      counts: saudeDoMes({
        postIts,
        contents,
        series: state.series,
        pilares: state.pilares,
        settings,
        periodo: periodoDoMes(month),
        platforms: state.platforms,
      }),
      temDistribuicao: distribuicaoFecha(settings.distribuicaoFuncoes),
    };
  }, [postIts, contents, state.series, state.pilares, state.platforms, state.preferences, month]);

  const applyList = (next: PlanejamentoPostIt[]) => {
    const {added, updated} = changedPostIts(postIts, next);
    added.forEach(postIt => dispatch({type: 'ADD_POST_IT', payload: postIt}));
    updated.forEach(postIt => dispatch({type: 'UPDATE_POST_IT', payload: postIt}));
  };

  const addEmpty = (date: string | null) => {
    const postIt = createEmptyPostIt({date});
    dispatch({type: 'ADD_POST_IT', payload: postIt});
    setEditing(false);
    setOpenId(postIt.id);
  };

  const fecharAviso = () => {
    avisoPendente.current = null;
    setAvisos(null);
  };

  const confirmarSeCouber = (content: Content | null, date: string | null, commit: () => void) => {
    const lista = excessosAoAcrescentar({
      content,
      date,
      postIts,
      contents,
      series: state.series,
      pilares: state.pilares,
      settings: state.editorial,
      platforms: state.platforms,
    });
    if (lista.length === 0) {
      commit();
      return;
    }
    avisoPendente.current = commit;
    setAvisos(lista);
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

    let cursor = postIts;
    const avisosPorNome = new Map<string, ExcessoMes>();
    const settings = state.editorial;
    for (const postIt of targets) {
      const lista = excessosAoAcrescentar({
        content: contentById(contents, postIt.contentId),
        date,
        postIts: cursor,
        contents,
        series: state.series,
        pilares: state.pilares,
        settings,
        platforms: state.platforms,
      });
      for (const aviso of lista) {
        if (!avisosPorNome.has(aviso.nome)) avisosPorNome.set(aviso.nome, aviso);
      }
      cursor = cursor.map(item => item.id === postIt.id ? {...item, date} : item);
    }

    const commit = () => {
      dispatch({
        type: 'UPDATE_POST_ITS',
        payload: targets.map(postIt => movePostIt(postIt, date)),
      });
    };
    const lista = [...avisosPorNome.values()];
    if (lista.length === 0) {
      commit();
      return;
    }
    avisoPendente.current = commit;
    setAvisos(lista);
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
      ? {}
      : {serieId: classeDraft.serieId, pilarId: classeDraft.pilarId, objetivo: classeDraft.objetivo};
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
      if (openId || pullOpen || avisos) return;
      event.preventDefault();
      removeSelected();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobile, selectedIds, openId, pullOpen, avisos, postIts]);

  const commitTransform = (target: 'ideia' | 'roteiro') => {
    if (!openPostIt || editing) return;
    const result = transformPostIt({
      postIt: openPostIt,
      contents,
      target,
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
  const openAppearance = postItAppearance(openContent, state.series, state.pilares, state.temas, openPostIt);
  const opcoesDeSerie = [...state.series]
    .filter(serie => serie.ativa || serie.id === classeDraft.serieId)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    .map(serie => ({value: serie.id, label: serie.name}));
  const opcoesDePilar = sortPilares(state.pilares)
    .filter(pilar => pilar.ativo || pilar.id === classeDraft.pilarId)
    .map(pilar => ({value: pilar.id, label: pilar.nome}));

  return (
    <PageLayout
      contentWidth="full"
      contentStack="none"
      className="min-h-full"
      contentClassName="!py-0"
      header={(
        <DesktopPageHeader
          section="Produção"
          title="Planejamento"
          meta="Rascunhe o mês com post-its. Transforme em ideia ou roteiro para levar ao Calendário."
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
              <AppButton variant="secondary" leftIcon={<StickyNote className="h-4 w-4" />} onClick={() => addEmpty(null)}>
                Novo post-it
              </AppButton>
              <AppButton
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setPullDate(null);
                  setPullOpen(true);
                }}
              >
                Puxar conteúdo
              </AppButton>
            </>
          )}
        >
          {!isMobile && selectedIds.size > 0 ? (
            <Text variant="meta" className="text-[var(--text-secondary)]">
              {selectedIds.size === 1 ? '1 post-it selecionado.' : `${selectedIds.size} post-its selecionados.`} Arraste um deles para mover todos. Apagar remove todos.
            </Text>
          ) : null}
        </DesktopPageHeader>
      )}
    >
        <div className="stack-md p-3 md:p-4">
        {isMobile ? (
          <div className="flex flex-wrap gap-2">
            <AppButton variant="secondary" size="sm" leftIcon={<StickyNote className="h-4 w-4" />} onClick={() => addEmpty(null)}>
              Novo post-it
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setPullDate(null);
                setPullOpen(true);
              }}
            >
              Puxar conteúdo
            </AppButton>
          </div>
        ) : null}
        <CalendarPeriodNav
          anchorDate={month}
          onAnchorDateChange={setMonth}
          viewMode="month"
          onViewModeChange={() => undefined}
          views={[]}
        />
        <MonthHealth
          counts={monthHealth.counts}
          entries={monthHealth.counts.entries}
          series={state.series}
          pilares={state.pilares}
          temDistribuicao={monthHealth.temDistribuicao}
          outrasRedes={monthHealth.counts.outrasRedes}
        />

        {temasDoPlanejamento.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Destacar por tema">
            <Text variant="label" as="span" className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" aria-hidden />
              Temas
            </Text>
            <AppButton
              variant={temaFiltro ? 'ghost' : 'secondary'}
              size="xs"
              aria-pressed={!temaFiltro}
              onClick={() => setTemaFiltroId(null)}
            >
              Todos
            </AppButton>
            {temasDoPlanejamento.map(tema => {
              const ativo = temaFiltro?.id === tema.id;
              return (
                <AppButton
                  key={tema.id}
                  variant={ativo ? 'primary' : 'secondary'}
                  size="xs"
                  aria-pressed={ativo}
                  onClick={() => setTemaFiltroId(ativo ? null : tema.id)}
                >
                  {tema.nome}
                </AppButton>
              );
            })}
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start">
          <CalendarMonthGrid
            anchorDate={month}
            weekStartsOn={0}
            minCellHeight={168}
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
              const dayLabel = format(day.day, "d 'de' MMMM", {locale: ptBR});
              return (
                <div className="stack-sm">
                  {(publicacoesDoDia.get(day.dateKey) ?? []).map(publicacao => {
                    const posted = publicacao.estado === 'postado';
                    return (
                      <CalendarEventPill
                        key={publicacao.id}
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
                  })}
                  {dayPostIts.map(postIt => renderPostIt(postIt, true))}
                  <div className="flex gap-0.5 transition-opacity md:opacity-0 md:focus-within:opacity-100 md:group-hover/day:opacity-100 md:group-focus-within/day:opacity-100 pointer-coarse:opacity-100">
                    <AppButton
                      variant="ghost"
                      size="xs"
                      iconOnly
                      className="h-7 w-7 text-[var(--text-secondary)]"
                      aria-label={`Novo post-it em ${dayLabel}`}
                      onClick={event => {
                        event.stopPropagation();
                        addEmpty(day.dateKey);
                      }}
                      leftIcon={<StickyNote className="h-3.5 w-3.5" />}
                    />
                    <AppButton
                      variant="ghost"
                      size="xs"
                      iconOnly
                      className="h-7 w-7 text-[var(--text-secondary)]"
                      aria-label={`Puxar conteúdo para ${dayLabel}`}
                      onClick={event => {
                        event.stopPropagation();
                        setPullDate(day.dateKey);
                        setPullOpen(true);
                      }}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    />
                  </div>
                </div>
              );
            }}
          />

          {!isMobile || undated.length > 0 ? (
            <Surface
              variant="outlined"
              padding="sm"
              className={cn(
                'stack-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto',
                pileOver && 'bg-[color-mix(in_srgb,var(--accent-orange)_12%,var(--bg-elevated))] ring-2 ring-[var(--accent-orange)]',
              )}
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
            >
              <div>
                <Text variant="sectionTitle">Fora do calendário</Text>
                <Text variant="meta" className="mt-1 block text-[var(--text-secondary)]">
                  Arraste para cá para retirar do mês.
                </Text>
              </div>
              {undated.length === 0 ? (
                <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-8 text-center">
                  <Text variant="meta" className="text-[var(--text-secondary)]">
                    Solte aqui para deixar o card fora do mês.
                  </Text>
                </div>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
                  {undated.map(postIt => (
                    <li key={postIt.id}>{renderPostIt(postIt, false)}</li>
                  ))}
                </ul>
              )}
            </Surface>
          ) : null}
        </div>
      </div>

      <Dialog open={Boolean(openPostIt)} onClose={closePostIt} desktopMaxW="max-w-lg" ariaLabel="Post-it">
        {openPostIt ? (
          <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
            <OverlayHeader
              title={editing ? 'Editar post-it' : 'Post-it'}
              icon={<StickyNote className="h-6 w-6 text-[var(--brand-accent-strong)]" />}
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
                        ? 'Vazio'
                        : normalizeContentStatus(openContent?.status || '')}
                    </Badge>
                  </div>
                  {editing ? (
                    <div className="stack-sm">
                      <label className="stack-sm">
                        <Text variant="label" as="span">Dia</Text>
                        <input
                          type="date"
                          value={dateDraft ?? ''}
                          onChange={event => setDateDraft(event.target.value || null)}
                          className="w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                        />
                      </label>
                      {dateDraft ? (
                        <AppButton variant="secondary" size="sm" className="self-start" onClick={() => setDateDraft(null)}>
                          Sem data
                        </AppButton>
                      ) : (
                        <Text variant="secondary" className="text-[var(--text-secondary)]">
                          Sem data · Fora do calendário
                        </Text>
                      )}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 t-body text-[var(--text-secondary)]">
                      <CalendarDays className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                      {openPostIt.date
                        ? format(new Date(`${openPostIt.date}T12:00:00`), "d 'de' MMMM 'de' yyyy", {locale: ptBR})
                        : 'Sem data · Fora do calendário'}
                    </p>
                  )}
                </div>
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
                    <PostItTemas temas={openAppearance.temas} />
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
                {editing ? (
                  <label className="stack-sm">
                    <Text variant="label" as="span">Nota</Text>
                    <textarea
                      value={noteDraft}
                      onChange={event => setNoteDraft(event.target.value)}
                      rows={5}
                      autoFocus
                      placeholder="Pode ficar em branco."
                      className="w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
                {!editing && openKind === 'vazio' ? (
                  <section className="stack-md border-t border-[var(--border-color)] pt-6" aria-labelledby="postit-encaixar">
                    <div className="stack-xs">
                      <Text variant="itemTitle" as="h3" className="font-semibold">
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
                        <AppButton variant="secondary" fullWidth onClick={() => commitTransform('ideia')}>
                          Virar ideia
                        </AppButton>
                      ) : null}
                      {options.roteiro ? (
                        <AppButton
                          variant={openKind === 'vazio' ? 'primary' : 'secondary'}
                          fullWidth
                          className={openKind === 'vazio' && options.ideia ? undefined : 'sm:col-span-2'}
                          onClick={() => commitTransform('roteiro')}
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
      </Dialog>

      <EncaixeDialog postIt={encaixePostIt} onClose={() => setEncaixeId(null)} zIndex="z-[140]" />

      <PuxarConteudoDialog
        open={pullOpen}
        date={pullDate}
        candidatos={pullable}
        onClose={() => setPullOpen(false)}
        onPuxar={content => pullOnto(content, pullDate)}
      />
      <Dialog
        open={Boolean(avisos?.length)}
        onClose={fecharAviso}
        desktopMaxW="max-w-md"
        zIndex="z-[140]"
        ariaLabel="Passa do editorial"
      >
        <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
          <OverlayHeader title="Passa do editorial" onClose={fecharAviso} />
          <OverlayBody>
            <div className="stack-sm">
              {(avisos ?? []).map(aviso => (
                <Text key={aviso.nome} variant="body">
                  {aviso.nome} já tem {aviso.planejado} de {aviso.meta} neste mês.
                </Text>
              ))}
              <Text variant="secondary">
                Colocar mais um passa do que foi definido no editorial.
              </Text>
            </div>
          </OverlayBody>
          <OverlayFooter>
            <AppButton variant="secondary" fullWidth onClick={fecharAviso}>
              Não colocar
            </AppButton>
            <AppButton
              variant="primary"
              fullWidth
              onClick={() => {
                const commit = avisoPendente.current;
                fecharAviso();
                commit?.();
              }}
            >
              Colocar mesmo assim
            </AppButton>
          </OverlayFooter>
        </div>
      </Dialog>
    </PageLayout>
  );
}
