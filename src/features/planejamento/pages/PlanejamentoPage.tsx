import {INICIO_DA_SEMANA} from '../../../lib/semana.ts';
import {useEffect, useMemo, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {format} from 'date-fns';
import {type GradeEntry} from '../../editorial/lib/gradeEntries';
import {orientacaoDoPlanejamento} from '../lib/saudeActions';
import {ptBR} from 'date-fns/locale';
import {
  ArrowDownToLine,
  CalendarDays,
  Clapperboard,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
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
import {cn, tintedTextColor} from '../../../lib/utils';
import {TemaField} from '../../contents/components/detail/TemaField';
import {buildContentDetailRoute} from '../../contents/lib/contentDetailRoute';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';
import {getCreationCardTags} from '../../creation/lib/creationItemPresentation';
import {pilarDoConteudo, pilarHerdadoDaSerie} from '../../editorial/lib/herancaSerie';
import {sortPilares} from '../../settings/lib/activePilares';
import {CampoDia} from '../components/CampoDia';
import {EncaixeDialog} from '../components/EncaixeDialog';
import {AvisosFaixa} from '../components/AvisosFaixa';
import {ReguaDeFrequencia} from '../components/ReguaDeFrequencia';
import {PlanejamentoWeekGrid} from '../components/PlanejamentoWeekGrid';
import {PlanejamentoContentCard} from '../components/PlanejamentoContentCard';
import {PlanejamentoReservaCard} from '../components/PlanejamentoReservaCard';
import {ConteudoPuxadoDialog} from '../components/ConteudoPuxadoDialog';
import {CriarBlocoDialog} from '../components/CriarBlocoDialog';
import {entraNoBloco} from '../../recording/lib/blocoDeGravacao';
import {PostItRapidoDialog} from '../components/PostItRapidoDialog';
import {PuxarConteudoDialog} from '../components/PuxarConteudoDialog';
import {
  SalvarNoCalendarioDialog,
  type ConfirmacaoSalvarCalendario,
} from '../components/SalvarNoCalendarioDialog';
import {executarSalvarNoCalendario, tirarRoteiroDoCalendario} from '../lib/salvarNoCalendario';
import {PlanejamentoMobileView} from '../components/PlanejamentoMobileView';
import {SemDataPanel} from '../components/SemDataPanel';
import {PlatformIcons} from '../../../components/ui/PlatformIcons';
import {RedeChips} from '../components/RedeChips';
import {redesDoCartao} from '../lib/redesDoCartao';
import {diaDaRede, dividirPorRede, weekdayDaData} from '../lib/divisoriaRede';
import {DivisoriaRede} from '../components/DivisoriaRede';
import {redeDaRef} from '../../contas/lib/contas';
import {ROTULO_REDE_DO_FILTRO, rotuloDaRef} from '../../contas/lib/contas';
import {
  contasDoCard,
  filtroAtivo,
  formatosDoFiltro,
  indiceDaAgenda,
  postItPassa,
  publicacoesDoCard,
} from '../lib/filtroCalendario';
import {textoSeloSoNoPlano} from '../lib/reguaFrequencia';
import {publicacoesDaAgenda, rotuloDoFormato} from '../../editorial/lib/publicacoes';
import {CreationRedeQuickFilter} from '../../creation/components/CreationRedeQuickFilter';
import {redesDoFiltroRapido} from '../../creation/lib/creationRedeFilter';
import {usePostItsNaData} from '../hooks/usePostItsNaData';
import {roteiroPublicado} from '../lib/postItsNaData';
import {
  POST_IT_MIME,
  PostItAssuntosObras,
  PostItIdentity,
  PostItNote,
} from '../components/PostItNote';
import {assuntosEmUso, conteudoTemAssunto, nomesDasObras} from '../lib/assuntosObras';
import {fimDeSemana} from '../lib/periodoPlanejamento';
import {rotulosDeEpisodio} from '../lib/episodioNaTemporada';
import type {PublicacaoNoDia} from '../lib/publicacoesDoMes';
import {SelectField} from '../../../components/ui/SelectField';
import {
  canPullContent,
  deletePostIt,
  escolherSerieNoPostIt,
  postItKind,
  postItTransformOptions,
  type PlanejamentoPostIt,
} from '../lib/postIt';

import {contentById, postItAppearance} from '../lib/postItAppearance';
import {useContextoPlanejamento} from '../hooks/useContextoPlanejamento';
import {useSaudeEAvisos} from '../hooks/useSaudeEAvisos';
import {useMovimentacaoPlanejamento} from '../hooks/useMovimentacaoPlanejamento';
import {useEditorPostIt} from '../hooks/useEditorPostIt';
import {useSelecaoETeclado} from '../hooks/useSelecaoETeclado';
import {AnalisePlanejamento} from '../components/AnalisePlanejamento';

export function PlanejamentoPage() {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const retornoPlanejamento = `${location.pathname}${location.search}`;
  const isMobile = useIsMobile();
  const {
    searchParams, setSearchParams,
    month, setMonth, vista, setVista, setVistaRaw,
    intervaloEmFoco, setIntervaloEmFoco,
    origemSaude, setOrigemSaude, navegarCalendario,
    assuntoFiltroId, setAssuntoFiltroId,
    destaqueIds, setDestaqueIds,
    filtro, setFiltro, trecho, setTrecho, intervalo, setIntervalo,
    analiseAberta, setAnaliseAberta,
    seriePlanejandoId, setSeriePlanejandoId,
  } = useContextoPlanejamento();
  const seriePlanejando = seriePlanejandoId ? state.series.find(s => s.id === seriePlanejandoId) ?? null : null;
  const [salvarCalendarioIds, setSalvarCalendarioIds] = useState<string[] | null>(null);

  const contents = state.contents;
  const episodioPorId = useMemo(() => rotulosDeEpisodio(contents), [contents]);
  // O dia do post-it é rascunho. O Calendário só muda em "Salvar no calendário".
  const postIts = usePostItsNaData();

  // Uma publicação por conta: base dos filtros e da situação de cada conta nos cards.
  const indiceAgenda = useMemo(
    () => indiceDaAgenda(publicacoesDaAgenda({contents, contas: state.platforms, series: state.series})),
    [contents, state.platforms, state.series],
  );

  const saude = useSaudeEAvisos({
    month, vista, setMonth, setVistaRaw,
    intervaloEmFoco, setIntervaloEmFoco,
    origemSaude, setOrigemSaude,
    filtro, trecho, intervalo,
    postIts, contents, indiceAgenda,
    destaqueIds, setDestaqueIds, setAnaliseAberta, setSeriePlanejandoId,
    retornoPlanejamento,
  });
  const {
    periodo, periodoDaSaude, contentsDoFiltro, postItsDoFiltro, vistaTemRoteiro,
    pausedDateKeys, monthHealth, rotuloSaude, avisoSaude, avisosOrientacao,
    verPautasDoAviso, localizarAviso, marcarFoiDeProposito, handlePlanejarIntervalo, handleReorganizarEpisodios,
    roteiroIdsDoPeriodo, handleOpenGravacao, foraDoPrazo, avisoAtivoId, setAvisoAtivoId,
    limparDestaque,
  } = saude;

  const {
    dragOverDay, setDragOverDay, pileOver, setPileOver,
    pullOpen, setPullOpen, pullDate, setPullDate,
    moveId, setMoveId, moveDate, setMoveDate,
    moveMany, readDragIds, pullOnto,
    abrirMover, abrirMoverPublicacao, fecharMover, confirmarMover,
    confirmarSeCouber,
  } = useMovimentacaoPlanejamento({postIts, contents, periodoDaSaude, filtro});

  const {
    openId, setOpenId, editing, setEditing,
    noteDraft, setNoteDraft, dateDraft, setDateDraft, classeDraft, setClasseDraft,
    encaixeId, setEncaixeId, preview, setPreview, rapidoDate, setRapidoDate,
    openPostIt, openContent, openPostItId, encaixePostIt,
    addEmpty, fecharRapido, salvarRapido, abrirEmEdicao, maisOpcoesDoRapido,
    closePostIt, startEdit, saveEdit,
    abrirRoteiro, commitTransform, desenvolverReserva,
  } = useEditorPostIt({postIts, contents, confirmarSeCouber, retornoPlanejamento, setMonth});

  const {
    selectedIds, setSelectedIds, blocoAlvo, setBlocoAlvo,
    toggleSelected, clearSelection, removeSelected, conteudosSelecionados,
  } = useSelecaoETeclado({
    postIts, contents, isMobile, openId, pullOpen, preview,
    setPreview, setEditing, setOpenId, closePostIt,
  });

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


  const byDate = useMemo(() => {
    const map = new Map<string, PlanejamentoPostIt[]>();
    postIts.forEach(postIt => {
      if (!postIt.date) return;
      if (!intervaloEmFoco && !postItPassa(indiceAgenda, postIt, filtro)) return;
      const list = map.get(postIt.date) ?? [];
      list.push(postIt);
      map.set(postIt.date, list);
    });
    return map;
  }, [postIts, indiceAgenda, filtro, intervaloEmFoco]);

  const undated = useMemo(
    () => postIts.filter(postIt => !postIt.date && postItPassa(indiceAgenda, postIt, filtro)),
    [postIts, indiceAgenda, filtro],
  );

  const filtroRotulo = filtroAtivo(filtro)
    ? [
      filtro.redes.length > 0 ? filtro.redes.map(rede => ROTULO_REDE_DO_FILTRO[rede]).join(', ') : null,
      filtro.formato ? rotuloDoFormato(filtro.formato) : null,
    ].filter(Boolean).join(' · ')
    : null;

  const assuntosDoPlanejamento = useMemo(
    () => assuntosEmUso(postIts, contents, state.temas),
    [postIts, contents, state.temas],
  );
  const assuntoFiltro = assuntosDoPlanejamento.find(tema => tema.id === assuntoFiltroId) ?? null;

  const classeDestaque = (contentId: string | null, postItId?: string) => {
    const destacado = Boolean((postItId && destaqueIds.has(postItId)) || (contentId && destaqueIds.has(contentId)));
    return cn(destaqueIds.size > 0 && (destacado ? 'ring-2 ring-[var(--accent-orange)]' : 'opacity-30'));
  };

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

  const abrirSalvarNoCalendario = (ids: readonly string[]) => {
    setSalvarCalendarioIds([...ids]);
  };

  const confirmarSalvarNoCalendario = (confirmacao: ConfirmacaoSalvarCalendario) => {
    const resultado = executarSalvarNoCalendario({
      postIts,
      contents,
      linhas: confirmacao.linhas,
      time: confirmacao.time,
      horarioPorConta: confirmacao.horarioPorConta ?? undefined,
      contas: state.platforms,
    });
    setSalvarCalendarioIds(null);
    void (async () => {
      for (const content of resultado.contents) {
        const exists = contents.some(item => item.id === content.id);
        await dispatch({
          type: exists ? 'UPDATE_CONTENT' : 'ADD_CONTENT',
          payload: content,
        });
      }
      for (const nextPostIt of resultado.postIts) {
        await dispatch({type: 'UPDATE_POST_IT', payload: nextPostIt});
      }
    })();
    if (resultado.openScriptId) {
      navigate(
        buildContentDetailRoute(resultado.openScriptId, 'roteiro'),
        buildDetailBackState(retornoPlanejamento),
      );
    }
  };

  const tirarDoCalendario = (contentId: string | null) => {
    const content = contentById(contents, contentId);
    const tirado = content ? tirarRoteiroDoCalendario(content) : null;
    if (tirado) void dispatch({type: 'UPDATE_CONTENT', payload: tirado});
  };

  /** Celular: post-it em largura toda com ⋯ (mover, tirar do mês, apagar) no lugar de arrastar. */
  const renderMobilePostIt = (postIt: PlanejamentoPostIt) => {
    const content = contentById(contents, postIt.contentId);
    const noCalendario = Boolean(
      content
      && (content.publishDate || content.plataformas.some(plataforma => plataforma.publishDate)),
    );
    const items: MoreMenuItem[] = [
      {
        id: 'mover',
        label: postIt.date ? 'Mover para outro dia…' : 'Colocar em um dia…',
        onClick: () => abrirMover(postIt),
      },
      ...(postIt.date
        ? [
          {id: 'salvar-calendario', label: 'Salvar no calendário…', onClick: () => abrirSalvarNoCalendario([postIt.id])} satisfies MoreMenuItem,
          {id: 'tirar', label: 'Tirar do período', onClick: () => moveMany([postIt.id], null)} satisfies MoreMenuItem,
        ]
        : []),
      ...(noCalendario && postIt.contentId
        ? [{id: 'tirar-calendario', label: 'Tirar do calendário', onClick: () => tirarDoCalendario(postIt.contentId)} satisfies MoreMenuItem]
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

  const resolverData = (item: GradeEntry) => {
    setMoveId(item.postItId ?? 'content:' + item.contentId);
    setMoveDate(item.data);
  };

  /** Análise da Saúde: drawer por cima da tela, em qualquer largura; no celular ocupa a tela inteira. */
  // Move/puxa primeiro; a mesma orientação aparece depois, sem modal bloqueante.

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

  const previewContent = preview ? contentById(contents, preview.contentId) : null;
  const previewPostIt = preview?.postItId ? postIts.find(item => item.id === preview.postItId) ?? null : null;
  const previewAgenda = preview ? publicacoesDoCard(indiceAgenda, preview.contentId, preview.dia) : [];
  const previewAppearance = postItAppearance(previewContent, state.series, state.pilares, state.temas, previewPostIt);

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

  const intervaloPlanejando = monthHealth.continuidade.linhas
    .find(linha => linha.serieId === seriePlanejandoId)?.intervalos
    .find(intervalo => intervalo.inicio === intervaloEmFoco?.inicio && intervalo.fim === intervaloEmFoco?.fim);

  const orientacaoCalendario = (
    <div className="stack-sm">
      {intervaloEmFoco ? (
        <Surface variant="info" padding="sm" className="flex flex-wrap items-center justify-between gap-2">
          <Text variant="meta">Intervalo: {format(new Date(intervaloEmFoco.inicio + 'T12:00:00'), 'dd/MM/yyyy')} a {format(new Date(intervaloEmFoco.fim + 'T12:00:00'), 'dd/MM/yyyy')}</Text>
          <AppButton variant="ghost" size="sm" onClick={() => { if (origemSaude) { setMonth(new Date(origemSaude.data + 'T12:00:00')); setVistaRaw(origemSaude.vista); } setOrigemSaude(null); setIntervaloEmFoco(null); setSeriePlanejandoId(null); limparDestaque(); }}>Voltar ao calendário</AppButton>
        </Surface>
      ) : null}
            {seriePlanejando ? (
              <Surface variant="outlined" padding="sm" className="flex flex-wrap items-center justify-between gap-3 border-[var(--brand-accent)] bg-[var(--surface-subtle)]">
                <div className="min-w-0 flex-1 stack-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{backgroundColor: seriePlanejando.cor || 'var(--brand-accent)'}} aria-hidden />
                    <Text variant="body" as="p" className="min-w-0 break-words text-[var(--text-primary)]">
                      Planejando série: <strong>{seriePlanejando.name}</strong>
                    </Text>
                  </div>
                  <Text variant="bodyStrong" as="p">{orientacaoDoPlanejamento(intervaloPlanejando)}</Text>
                  <Text variant="secondary" as="p">Escolha um dia e use <strong>Post-it</strong> para criar uma pauta ou <strong>Puxar</strong> para trazer um conteúdo da Criação.</Text>
                </div>
                <AppButton variant="ghost" size="sm" onClick={() => setSeriePlanejandoId(null)}>
                  Concluir planejamento
                </AppButton>
              </Surface>
            ) : null}

            {destaqueIds.size > 0 && !avisoAtivoId ? (
              <Surface variant="outlined" padding="sm" className="flex flex-wrap items-center justify-between gap-3 border-[var(--accent-orange)] bg-[var(--surface-subtle)]">
                <Text variant="meta" className="text-[var(--text-primary)]">
                  Exibindo <strong>{destaqueIds.size} {destaqueIds.size === 1 ? 'pauta destacada' : 'pautas destacadas'}</strong>. {isMobile ? 'Use o menu do episódio para mover a data.' : 'Arraste para o dia desejado para reorganizar.'}
                </Text>
                <AppButton variant="ghost" size="sm" onClick={limparDestaque}>
                  Limpar destaque
                </AppButton>
              </Surface>
            ) : null}


    </div>
  );

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
          onAnchorDateChange={navegarCalendario}
          viewMode={vista}
          onViewModeChange={mode => setVista(mode)}
          weekStartsOn={INICIO_DA_SEMANA}
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
              leftIcon={<ExternalLink className="h-4 w-4" />}
              onClick={() => navigate('/editorial')}
            >
              Abrir Editorial
            </AppButton>
          )}
        />
      )}
    >
      {(() => {
        // Dia em que uma conta do YouTube tem horário próprio: cartões só do YouTube vão abaixo da linha.
        const separarDia = (dateKey: string) => {
          if (!diaDaRede({weekday: weekdayDaData(dateKey), rede: 'youtube', horarios: state.postingTimeEntries ?? [], contas: state.platforms})) return null;
          const postIts = dividirPorRede(byDate.get(dateKey) ?? [], postIt => redesDoCartao({content: contentById(contents, postIt.contentId), postIt, contas: state.platforms}), 'youtube');
          return {rede: 'youtube' as const, postItsAcima: postIts.acima, postItsAbaixo: postIts.abaixo};
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
                className={classeDestaque(content.id, postIt.id)}
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
                episodio={episodioPorId.get(content.id) ?? null}
                onOpen={() => setPreview({contentId: content.id, postItId: postIt.id, dia: postIt.date})}
                onOpenDireto={() => abrirRoteiro(content.id)}
                onGravacao={entraNoBloco(content, state.recordingBlocks) ? () => setBlocoAlvo([content]) : undefined}
                onMove={() => abrirMover(postIt)}
                onRemoveFromDate={() => removePostItById(postIt.id)}
                onDelete={() => removePostItById(postIt.id)}
                onSalvarNoCalendario={postIt.date ? () => abrirSalvarNoCalendario([postIt.id]) : undefined}
                onTirarDoCalendario={
                  content.publishDate || content.plataformas.some(plataforma => plataforma.publishDate)
                    ? () => tirarDoCalendario(content.id)
                    : undefined
                }
                selected={!isMobile && selectedIds.has(postIt.id)}
                onToggleSelect={isMobile ? undefined : () => toggleSelected(postIt.id)}
              />
            );
          }

          return (
            <PlanejamentoReservaCard
              key={postIt.id}
              className={classeDestaque(null, postIt.id)}
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
              onVirarIdeia={() => commitTransform('ideia', postIt)}
              onEncaixar={() => setEncaixeId(postIt.id)}
              onEditar={() => abrirEmEdicao(postIt)}
              onMove={() => abrirMover(postIt)}
              onDelete={() => removePostItById(postIt.id)}
              onSalvarNoCalendario={postIt.date ? () => abrirSalvarNoCalendario([postIt.id]) : undefined}
              selected={!isMobile && selectedIds.has(postIt.id)}
              onToggleSelect={isMobile ? undefined : () => toggleSelected(postIt.id)}
              selo={textoSeloSoNoPlano({semRoteiro: !postIt.contentId, vistaTemRoteiro})}
            />
          );
        };

        if (isMobile) {
          return (
            <div className="stack-md">
              {orientacaoCalendario}
              <PlanejamentoMobileView
                intervalo={intervaloEmFoco}
                month={month}
                onMonthChange={navegarCalendario}
                vista={vista}
                onVistaChange={setVista}
                byDate={byDate}
                undated={undated}
                contents={contents}
                series={state.series}
                temas={assuntosDoPlanejamento}
                renderPostIt={renderPlanejamentoReservaCard}
                onNovoPostIt={addEmpty}
                onPuxar={date => {
                  setPullDate(date);
                  setPullOpen(true);
                }}
                onEditorial={() => navigate('/editorial')}
                onVerAnalise={() => setAnaliseAberta(true)}
                avisos={avisosOrientacao}
                avisoAtivoId={avisoAtivoId}
                onLocalizarAviso={localizarAviso}
                onFoiDeProposito={marcarFoiDeProposito}
                onLimparDestaque={limparDestaque}
                assuntoFiltroId={assuntoFiltroId}
                onAssuntoFiltroChange={setAssuntoFiltroId}
                continuidade={monthHealth.continuidade}
                pausedDateKeys={pausedDateKeys}
              />
            </div>
          );
        }

        return (
          // Sem padding lateral próprio: o frame já dá a margem, e assim o conteúdo alinha com o título.
          <div className="stack-md pt-4 pb-8">
            <AvisosFaixa
              avisos={avisosOrientacao}
              avisoAtivoId={avisoAtivoId}
              onLocalizar={localizarAviso}
              onFoiDeProposito={marcarFoiDeProposito}
              onLimparDestaque={limparDestaque}
              onVerAnalise={() => setAnaliseAberta(true)}
              onAbrirEditorial={() => navigate('/editorial')}
            />

            {orientacaoCalendario}

            {/* Régua de frequência (3.2). Só no desktop: no mobile a grade de dias vem primeiro. */}
            <div data-planejamento-regua-slot>
              <ReguaDeFrequencia continuidade={monthHealth.continuidade} />
            </div>


            {selectedIds.size > 0 ? (
              <Surface variant="outlined" padding="sm" className="flex flex-wrap items-center justify-between gap-3">
                <Text variant="meta" className="text-[var(--text-secondary)]">
                  {selectedIds.size === 1 ? '1 post-it selecionado.' : `${selectedIds.size} post-its selecionados.`} Arraste um deles para mover todos; Enter abre.
                </Text>
                <div className="flex flex-wrap items-center gap-2">
                  {conteudosSelecionados.length > 0 ? (
                    <AppButton
                      variant="secondary"
                      size="sm"
                      leftIcon={<Clapperboard className="h-4 w-4" />}
                      onClick={() => setBlocoAlvo(conteudosSelecionados)}
                    >
                      {conteudosSelecionados.length === 1 ? 'Mandar para gravação' : `Mandar ${conteudosSelecionados.length} para gravação`}
                    </AppButton>
                  ) : null}
                  {[...selectedIds].some(id => postIts.some(postIt => postIt.id === id && postIt.date)) ? (
                    <AppButton
                      variant="secondary"
                      size="sm"
                      leftIcon={<CalendarDays className="h-4 w-4" />}
                      onClick={() => abrirSalvarNoCalendario([...selectedIds])}
                    >
                      Salvar no calendário
                    </AppButton>
                  ) : null}
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
            ) : (
              <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                Dica: Ctrl (ou ⌘) + clique seleciona vários cards para mover, salvar no calendário ou apagar juntos.
              </Text>
            )}

            <div className={cn(
              vista === 'semana'
                ? 'grid gap-3 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_20rem]'
                : 'stack-md w-full min-w-0'
            )}>
              <div className="stack-md min-w-0">
                {vista === 'semana' ? (
                  <PlanejamentoWeekGrid
                    anchorDate={month}
                    intervalo={intervaloEmFoco}
                    byDate={byDate}
                    pausedDateKeys={pausedDateKeys}
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
                    weekStartsOn={INICIO_DA_SEMANA}
                    pausedDateKeys={pausedDateKeys}
                    headerFormat="short"
                    dayNumberAlign="start"
                    minCellHeight={110}
                    expandContent
                    tone="elevated"
                    tintWeekends
                    getDayClassName={day => cn(
                      'group/day',
                      dragOverDay === day.dateKey
                        ? 'bg-[color-mix(in_srgb,var(--accent-orange)_12%,transparent)]'
                        : day.inMonth && !day.isToday && fimDeSemana(day.day) && 'planejamento-fim-de-semana',
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
                      return (
                        <div className="@container stack-sm">
                          {(() => {
                            const dia = separarDia(day.dateKey);
                            if (!dia) return dayPostIts.map(renderPlanejamentoReservaCard);
                            return (<>
                              {dia.postItsAcima.map(renderPlanejamentoReservaCard)}
                              <DivisoriaRede rede={dia.rede}>
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

              {/* Sem data: ao lado da semana; abaixo da grade no mês (3.4). */}
              <SemDataPanel
                  undated={undated}
                  contents={contents}
                  series={state.series}
                  temas={state.temas}
                  pileOver={pileOver}
                  className={vista === 'semana' ? 'xl:sticky xl:top-32 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto' : undefined}
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
            </div>
          </div>
        );
      })()}

      <AnalisePlanejamento
        aberta={analiseAberta}
        onFechar={() => setAnaliseAberta(false)}
        rotuloPeriodo={rotuloSaude}
        avisoPeriodo={avisoSaude}
        counts={monthHealth.counts}
        foraDoPrazo={foraDoPrazo}
        roteiroIds={roteiroIdsDoPeriodo}
        onResolverData={resolverData}
        series={state.series}
        pilares={state.pilares}
        temas={state.temas}
        contents={contents}
        objetivos={monthHealth.objetivos}
        continuidade={monthHealth.continuidade}
        escopos={monthHealth.escopos}
        publicacoes={monthHealth.publicacoes}
        filtroRotulo={filtroRotulo}
        avisos={avisosOrientacao}
        onLocalizarAviso={localizarAviso}
        onAddReserva={() => addEmpty(format(new Date(), 'yyyy-MM-dd'))}
        onOpenGravacao={handleOpenGravacao}
        onPlanejarIntervalo={handlePlanejarIntervalo}
        onReorganizarEpisodios={handleReorganizarEpisodios}
      />

      {/* Esc, fundo e alça no modo edição só saem da edição: o post-it continua aberto. */}
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
                    {openRedes.map(rede => ROTULO_REDE_DO_FILTRO[rede]).join(' · ')}
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
                          ? 'Ao transformar em roteiro, o vínculo fica no post-it. O dia só vai ao Calendário quando você salvar.'
                          : 'A nota, a série, o objetivo e as contas vão junto. O dia do Calendário só muda em Salvar no calendário.'}
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
                  <AppButton variant="secondary" onClick={closePostIt}>
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
                    {openPostIt?.date ? (
                      <AppButton
                        variant="secondary"
                        leftIcon={<CalendarDays className="h-4 w-4" />}
                        onClick={() => {
                          abrirSalvarNoCalendario([openPostIt.id]);
                          closePostIt();
                        }}
                      >
                        Salvar no calendário
                      </AppButton>
                    ) : null}
                    <AppButton variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={startEdit} title="Editar (E)">
                      Editar
                    </AppButton>
                    {openKind !== 'vazio' && openContent ? (
                      <AppButton
                        variant="primary"
                        onClick={() => {
                          navigate(
                            buildContentDetailRoute(openContent.id, 'roteiro'),
                            buildDetailBackState(retornoPlanejamento),
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
            <div className="stack-sm">
              <CampoDia id="mover-dia" value={moveDate} onChange={setMoveDate} />
              <AppButton variant="secondary" onClick={() => setMoveDate(format(new Date(), 'yyyy-MM-dd'))}>Mover para hoje</AppButton>
            </div>
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
        initialSerieId={seriePlanejandoId}
        series={state.series}
        pilares={state.pilares}
        platforms={state.platforms}
        onClose={fecharRapido}
        onSalvar={draft => {
          salvarRapido(draft);
        }}
      />

      <EncaixeDialog
        postIt={encaixePostIt}
        periodo={periodoDaSaude}
        filtroDosAvisos={filtro}
        onClose={() => setEncaixeId(null)}
        zIndex="z-[140]"
        linhasDoRitmo={monthHealth.continuidade.linhas}
      />

      <SalvarNoCalendarioDialog
        open={salvarCalendarioIds !== null}
        postIts={postIts}
        contents={contents}
        platforms={state.platforms}
        ids={salvarCalendarioIds ?? undefined}
        onClose={() => setSalvarCalendarioIds(null)}
        onConfirm={confirmarSalvarNoCalendario}
      />

      <ConteudoPuxadoDialog
        open={Boolean(preview && previewContent)}
        content={previewContent}
        dia={preview?.dia ?? null}
        agenda={previewAgenda}
        marks={previewAppearance.marks}
        seriesColor={previewAppearance.seriesColor}
        assuntos={previewAppearance.assuntos}
        obras={nomesDasObras(previewContent, state.bibliotecaItems)}
        onClose={() => setPreview(null)}
        onAbrir={() => previewContent && abrirRoteiro(previewContent.id)}
        onTransformarEmRoteiro={previewPostIt && previewContent && normalizeContentStatus(previewContent.status) === CONTENT_STATUS.IDEIA
          ? () => {
            setPreview(null);
            desenvolverReserva(previewPostIt);
          }
          : undefined}
        onGravacao={previewContent && entraNoBloco(previewContent, state.recordingBlocks)
          ? () => {
            setPreview(null);
            setBlocoAlvo([previewContent]);
          }
          : undefined}
        onMover={previewPostIt
          ? () => {
            setPreview(null);
            abrirMover(previewPostIt);
          }
          : previewContent && !roteiroPublicado(previewContent)
            ? () => {
              setPreview(null);
              abrirMoverPublicacao(previewContent.id);
            }
            : undefined}
        onTirar={previewPostIt
          ? () => {
            setPreview(null);
            removePostItById(previewPostIt.id);
          }
          : previewContent && !roteiroPublicado(previewContent)
            ? () => {
              setPreview(null);
              moveMany([`content:${previewContent.id}`], null);
            }
            : undefined}
      />

      <CriarBlocoDialog
        open={blocoAlvo !== null}
        contents={blocoAlvo ?? []}
        onClose={() => setBlocoAlvo(null)}
        onCriado={clearSelection}
      />

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
