import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Columns3,
  FileText,
  LayoutGrid,
  Lightbulb,
  List,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { Dialog } from '../../../components/overlays/Dialog';
import { TagSelect } from '../../../components/ui/TagSelect';
import { LEGACY_TAGS_PARAM, TEMA_FILTER_PARAM, dedupeTemasPorNome, migrateLegacyTemaParams, parseTemaFilterParam, serializeTemaFilterParam } from '../../contents/lib/temaFilter';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { FilterBar } from '../../../components/ui/FilterBar';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Text } from '../../../components/ui/Text';
import { QueryViewState, resolveQueryViewStatus } from '../../../components/ui/QueryViewState';
import { ViewModeToggle } from '../../../components/ui/ViewModeToggle';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { CreateMenuButton } from '../../../components/ui/CreateMenuButton';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { MobileFilterSheet } from '../../../mobile/components/MobileFilterSheet';
import { MobileSearchBar } from '../../../mobile/components/MobileSearchBar';
import { MobileSegmentTabs } from '../../../mobile/components/MobileSegmentTabs';
import {
  emptyContentTrash,
  fetchArchivedContents,
  fetchContentsByIds,
  fetchDeletedContents,
  permanentlyDeleteContent,
  restoreContent,
  type Content,
} from '../../../lib/database';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { getErrorMessage, notifySaveFeedback } from '../../../lib/saveFeedback';
import { CONFIRM, ERRORS } from '../../../lib/uiCopy';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { aplicarEscolhasDaSerie, marcarEscolhaManual } from '../../editorial/lib/escolhasSerie';
import { datasNaGrade } from '../../editorial/lib/datasNaGrade';
import { FUNCAO_LABELS, FUNCOES } from '../../editorial/lib/funcoes';
import {
  aplicarFiltroData,
  lerFiltroData,
  opcoesDoFiltroData,
  valorDoFiltroData,
} from '../lib/creationDateFilter';
import {
  archiveCreation,
  CREATION_PAGE_SIZE,
  createIdeaContent,
  createScriptContent,
  CREATION_TABS,
  filterCreationContents,
  getCreationTabCounts,
  paginateCreationContents,
  promoteContentToScript,
  removeDeletedCreations,
  restoreCreation,
  restoreDeletedCreation,
  sortCreationContents,
  type CreationSort,
  type CreationTab,
  type CreationViewMode,
} from '../../contents/lib/creationContent';
import { CreationComposer, type CreationIdeaInput } from '../components/CreationComposer';
import { CreationDisplayMenu } from '../components/CreationDisplayMenu';
import { CreationGridView } from '../components/CreationGridView';
import { CreationKanbanView } from '../components/CreationKanbanView';
import { CreationListView } from '../components/CreationListView';
import { CreationOverflowMenu } from '../components/CreationOverflowMenu';
import { CreationSelectionBar } from '../components/CreationSelectionBar';
import {
  canExportCreation,
  downloadCreationsDocx,
  getCreationExportCopy,
} from '../lib/exportScriptsDocx';
import {
  CREATION_FILTER_QUERY_KEYS,
  CREATION_SORT_OPTIONS,
  CREATION_VIEW_MODE_LABELS,
  CREATION_VIEW_MODE_VALUES,
  type CreationSortValue,
} from '../lib/creationFilterOptions';
import type { CreationItemActionHandlers } from '../lib/creationItemActions';
import {
  REDE_FILTER_PARAM,
  mapaDeRedesDaCriacao,
  opcoesDoFiltroRede,
  parseRedeFilter,
} from '../lib/creationRedeFilter';
import {
  etiquetasVisiveis,
  isCreationKanbanTab,
  moveCreationToKanbanTab,
  readStoredCreationViewMode,
  storeCreationViewMode,
  type CreationKanbanTab,
} from '../lib/creationItemPresentation';

const TAB_QUERY: Record<CreationTab, string> = {
  Todos: 'todos',
  Ideias: 'ideias',
  Roteiros: 'roteiros',
  Produção: 'producao',
  Edição: 'edicao',
  Publicados: 'publicados',
  Arquivados: 'arquivados',
  Lixeira: 'lixeira',
};

const QUERY_TAB = Object.fromEntries(
  Object.entries(TAB_QUERY).map(([label, query]) => [query, label]),
) as Record<string, CreationTab>;

const VIEW_OPTIONS = CREATION_VIEW_MODE_VALUES.map(value => ({
  value,
  label: CREATION_VIEW_MODE_LABELS[value],
  icon: value === 'grid' ? LayoutGrid : value === 'list' ? List : Columns3,
}));

function parseViewMode(value: string | null): CreationViewMode | null {
  if (value === 'list' || value === 'kanban' || value === 'grid') return value;
  return null;
}

export function CreationHubPage() {
  const { state, dispatch, updateContent, ensureDataDomains } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [archivedContents, setArchivedContents] = useState<Content[]>([]);
  const [deletedContents, setDeletedContents] = useState<Content[]>([]);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<Content | null>(null);
  const [isPermanentDeleting, setIsPermanentDeleting] = useState(false);
  const [trashClearConfirmOpen, setTrashClearConfirmOpen] = useState(false);
  const [isClearingTrash, setIsClearingTrash] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [assignField, setAssignField] = useState<'seriesId' | 'pilarId' | null>(null);
  const [assignValue, setAssignValue] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [persistingIds, setPersistingIds] = useState<Set<string>>(new Set());
  const handledComposeRef = useRef<string | null>(null);
  const isMobile = useIsMobile();

  const legacyType = searchParams.get('tipo');
  const requestedTab = searchParams.get('tab')
    ?? (legacyType === 'ideia' ? 'ideias' : legacyType === 'roteiro' ? 'roteiros' : '');
  const activeTab = QUERY_TAB[requestedTab] ?? 'Roteiros';
  const search = searchParams.get('q') ?? '';
  const pilarId = searchParams.get('pilar') ?? '';
  const seriesId = searchParams.get('serie') ?? '';
  const temasParam = searchParams.get(TEMA_FILTER_PARAM);
  const legacyTemaParam = searchParams.get('tema');
  const temaFilter = useMemo(
    () => parseTemaFilterParam(temasParam, legacyTemaParam),
    [legacyTemaParam, temasParam],
  );
  const redeFilter = parseRedeFilter(searchParams.get(REDE_FILTER_PARAM));
  const originId = searchParams.get('origem') ?? '';
  const funcaoId = searchParams.get('funcao') ?? '';
  const filtroData = useMemo(() => lerFiltroData(searchParams), [searchParams]);
  const valorFiltroData = valorDoFiltroData(filtroData);
  const sortParam = searchParams.get('sort');
  const sort: CreationSort =
    sortParam === 'oldest' || sortParam === 'title' ? sortParam : 'recent';
  const viewParam = searchParams.get('view');
  const requestedView: CreationViewMode =
    parseViewMode(viewParam) ?? readStoredCreationViewMode() ?? 'grid';
  const viewMode: CreationViewMode =
    isMobile && requestedView === 'kanban' ? 'grid' : requestedView;
  const requestedPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const composerOpen = searchParams.get('compose') === 'idea';

  const updateSearchParam = useCallback((
    key: string,
    value: string,
    defaultValue = '',
    resetPage = true,
  ) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (!value || value === defaultValue) next.delete(key);
      else next.set(key, value);
      if (key === 'tab') next.delete('tipo');
      if (resetPage && key !== 'page') next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setViewMode = useCallback((value: CreationViewMode) => {
    storeCreationViewMode(value);
    updateSearchParam('view', value, 'grid');
  }, [updateSearchParam]);

  useEffect(() => {
    storeCreationViewMode(requestedView);
  }, [requestedView]);

  const canonicalContents = useMemo(() => {
    const byId = new Map<string, Content>();
    [...deletedContents, ...archivedContents, ...state.contents]
      .forEach(content => byId.set(content.id, content));
    return [...byId.values()];
  }, [archivedContents, deletedContents, state.contents]);

  const tabCounts = useMemo(
    () => getCreationTabCounts(canonicalContents),
    [canonicalContents],
  );

  // A data de cada conteúdo na grade, pela mesma regra do Editorial (publicação de referência e post-its).
  const datas = useMemo(() => datasNaGrade({
    contents: state.contents,
    series: state.series,
    postIts: state.postIts ?? [],
    redeReferenciaId: state.editorial.preferencias.redeReferenciaId,
    platforms: state.platforms,
  }), [state.contents, state.series, state.postIts, state.preferences, state.platforms]);

  // As redes anotadas nos post-its só são carregadas quando o filtro de rede é usado.
  useEffect(() => {
    if (redeFilter) void ensureDataDomains(['planejamento']);
  }, [ensureDataDomains, redeFilter]);

  // Rede de cada item pelas contas das publicações; sem publicação, pelas redes do post-it ligado.
  const redesPorConteudo = useMemo(
    () => (redeFilter ? mapaDeRedesDaCriacao(canonicalContents, state.platforms, state.postIts ?? []) : undefined),
    [canonicalContents, redeFilter, state.platforms, state.postIts],
  );

  const filteredContents = useMemo(
    () => sortCreationContents(
      filterCreationContents(canonicalContents, {
        tab: activeTab,
        search,
        pilarId,
        seriesId,
        temaIds: temaFilter,
        originId,
        funcao: funcaoId,
        filtroData,
        datasNaGrade: datas,
        rede: redeFilter,
        redesPorConteudo,
        series: state.series,
        temas: state.temas,
      }),
      sort,
    ),
    [activeTab, canonicalContents, datas, filtroData, funcaoId, originId, pilarId, redeFilter, redesPorConteudo, search, seriesId, sort, state.series, state.temas, temaFilter],
  );

  // No kanban, as colunas são as etapas; a aba de etapa só destaca a coluna.
  const kanbanContents = useMemo(() => {
    if (viewMode !== 'kanban' || !isCreationKanbanTab(activeTab)) return filteredContents;
    return sortCreationContents(
      filterCreationContents(canonicalContents, {
        tab: 'Todos',
        search,
        pilarId,
        seriesId,
        temaIds: temaFilter,
        originId,
        funcao: funcaoId,
        filtroData,
        datasNaGrade: datas,
        rede: redeFilter,
        redesPorConteudo,
        series: state.series,
        temas: state.temas,
      }),
      sort,
    );
  }, [activeTab, canonicalContents, datas, filteredContents, filtroData, funcaoId, originId, pilarId, redeFilter, redesPorConteudo, search, seriesId, sort, state.series, state.temas, temaFilter, viewMode]);

  // "Mostrar mais" acumula páginas em vez de trocar de página: a coleção é pequena.
  const pageData = useMemo(
    () => paginateCreationContents(filteredContents, 1, CREATION_PAGE_SIZE * requestedPage),
    [filteredContents, requestedPage],
  );

  const visibleContents = viewMode === 'kanban' ? kanbanContents : pageData.items;
  const exportableContents = useMemo(
    () => filteredContents.filter(canExportCreation),
    [filteredContents],
  );
  const exportCopy = useMemo(
    () => getCreationExportCopy(exportableContents),
    [exportableContents],
  );
  const exportableIds = useMemo(
    () => new Set(exportableContents.map(content => content.id)),
    [exportableContents],
  );
  const allExportableSelected = exportableContents.length > 0
    && exportableContents.every(content => selectedExportIds.has(content.id));

  useEffect(() => {
    setSelectedExportIds(previous => {
      const next = new Set([...previous].filter(id => exportableIds.has(id)));
      if (
        next.size === previous.size
        && [...next].every(id => previous.has(id))
      ) {
        return previous;
      }
      return next;
    });
    if (exportableContents.length === 0) setExportMode(false);
  }, [exportableContents.length, exportableIds]);

  const openContent = useCallback((content: Content) => {
    navigate(
      buildContentDetailRoute(content.id),
      buildDetailBackState(`${location.pathname}${location.search}`),
    );
  }, [location.pathname, location.search, navigate]);

  const toggleExportMode = useCallback(() => {
    if (exportMode) {
      setSelectedExportIds(new Set());
      setAssignField(null);
      setAssignValue('');
      setBulkDeleteOpen(false);
    }
    setExportMode(!exportMode);
  }, [exportMode]);

  const toggleExportSelection = useCallback((id: string) => {
    setExportMode(true);
    setSelectedExportIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllExportable = useCallback(() => {
    setExportMode(true);
    setSelectedExportIds(
      allExportableSelected
        ? new Set()
        : new Set(exportableContents.map(content => content.id)),
    );
  }, [allExportableSelected, exportableContents]);

  const handleExportCreations = useCallback(async () => {
    if (selectedExportIds.size === 0 || isExporting) return;

    const selectedSummaries = exportableContents.filter(content =>
      selectedExportIds.has(content.id)
    );
    setIsExporting(true);
    try {
      const fetched = user?.id
        ? await fetchContentsByIds(user.id, selectedSummaries.map(content => content.id))
        : [];
      const fetchedById = new Map(fetched.map(content => [content.id, content]));
      const selectedContents = selectedSummaries.map(
        content => fetchedById.get(content.id) ?? content,
      );

      await downloadCreationsDocx(selectedContents, state.platforms);
      const selectedCopy = getCreationExportCopy(selectedContents);
      notifySaveFeedback({
        status: 'success',
        message: `Exportação concluída: ${selectedContents.length} ${
          selectedContents.length === 1 ? selectedCopy.singular : selectedCopy.plural
        }`,
      });
      setSelectedExportIds(new Set());
      setExportMode(false);
    } catch (error) {
      notifySaveFeedback({
        status: 'error',
        message: 'Não foi possível exportar os itens selecionados.',
        detail: getErrorMessage(error),
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    exportableContents,
    isExporting,
    selectedExportIds,
    state.platforms,
    user?.id,
  ]);

  const selectedContents = useMemo(
    () => exportableContents.filter(content => selectedExportIds.has(content.id)),
    [exportableContents, selectedExportIds],
  );
  const selectedCopy = useMemo(
    () => getCreationExportCopy(selectedContents),
    [selectedContents],
  );
  // "Selecionar todos" pega o filtro inteiro, inclusive o que "Mostrar mais" ainda não abriu.
  const hiddenSelectedCount = useMemo(() => {
    const visibleIds = new Set(visibleContents.map(content => content.id));
    return [...selectedExportIds].filter(id => !visibleIds.has(id)).length;
  }, [selectedExportIds, visibleContents]);

  const beginSelection = useCallback(() => {
    setExportMode(true);
  }, []);

  const openBulkAssign = useCallback((field: 'seriesId' | 'pilarId') => {
    if (selectedExportIds.size === 0) return;
    setAssignValue('');
    setAssignField(field);
  }, [selectedExportIds.size]);

  const applyBulkAssign = useCallback(() => {
    if (!assignField || !assignValue || selectedContents.length === 0) return;

    const field = assignField;
    const nextValue = assignValue === '__none__' ? null : assignValue;
    const selected = selectedContents;
    const series = state.series;
    setAssignField(null);
    setAssignValue('');
    setSelectedExportIds(new Set());
    setExportMode(false);
    notifySaveFeedback({ status: 'saving', message: 'Salvando alterações…' });

    void (async () => {
      try {
        const ids = selected.map(content => content.id);
        const fetched = user?.id ? await fetchContentsByIds(user.id, ids) : selected;
        if (user?.id && fetched.length !== ids.length) {
          throw new Error('Nem todos os itens selecionados puderam ser carregados.');
        }

        const now = new Date().toISOString();
        for (const content of fetched) {
          const currentValue = field === 'seriesId' ? content.seriesId : content.pilarId;
          if (currentValue === nextValue) continue;
          const next = field === 'seriesId'
            ? aplicarEscolhasDaSerie(
              content,
              nextValue ? series.find(item => item.id === nextValue) ?? {id: nextValue} : null,
            )
            : marcarEscolhaManual(content, 'pilar', nextValue);
          await updateContent({
            ...next,
            updatedAt: now,
          }, { silent: true });
        }

        notifySaveFeedback({
          status: 'success',
          message: field === 'seriesId'
            ? 'Série atualizada na seleção'
            : 'Pilar atualizado na seleção',
        });
      } catch (error) {
        notifySaveFeedback({
          status: 'error',
          message: ERRORS.aplicarAlteracoesMassa,
          detail: getErrorMessage(error),
        });
      }
    })();
  }, [assignField, assignValue, selectedContents, state.series, updateContent, user?.id]);

  const confirmBulkDelete = useCallback(() => {
    if (selectedContents.length === 0) return;
    const ids = selectedContents.map(content => content.id);
    const removedAt = new Date().toISOString();
    const removed = selectedContents.map(content => ({
      ...content,
      deletedAt: removedAt,
      updatedAt: removedAt,
    }));
    const final = selectedCopy.feminine ? 'a' : 'o';
    const noun = ids.length === 1
      ? `${selectedCopy.singular[0].toUpperCase()}${selectedCopy.singular.slice(1)} movid${final} para a lixeira`
      : `${ids.length} ${selectedCopy.plural} movid${final}s para a lixeira`;
    // Arquivados vivem numa lista à parte; sem tirar de lá, a cópia arquivada encobriria a da lixeira.
    const archivedRemoved = archivedContents.filter(item => ids.includes(item.id));

    setDeletedContents(previous => [
      ...removed,
      ...previous.filter(item => !ids.includes(item.id)),
    ]);
    setArchivedContents(previous => previous.filter(item => !ids.includes(item.id)));
    setBulkDeleteOpen(false);
    setSelectedExportIds(new Set());
    setExportMode(false);
    notifySaveFeedback({ status: 'saving', message: 'Salvando alterações…' });
    void dispatch({ type: 'DELETE_MULTIPLE_CONTENTS', payload: ids }, { silent: true })
      .then(() => notifySaveFeedback({ status: 'success', message: noun }))
      .catch(error => {
        setDeletedContents(previous => previous.filter(item => !ids.includes(item.id)));
        setArchivedContents(previous => [
          ...archivedRemoved,
          ...previous.filter(item => !ids.includes(item.id)),
        ]);
        notifySaveFeedback({
          status: 'error',
          message: ERRORS.salvarGenerico,
          detail: getErrorMessage(error),
        });
      });
  }, [archivedContents, dispatch, selectedContents, selectedCopy]);

  const createScript = useCallback((replace = false) => {
    const content = createScriptContent({ title: 'Novo roteiro' });
    void dispatch({ type: 'ADD_CONTENT', payload: content });
    navigate(
      `${buildContentDetailRoute(content.id)}&focus=script`,
      {
        ...buildDetailBackState('/criacao?tab=roteiros'),
        replace,
      },
    );
  }, [dispatch, navigate]);

  useEffect(() => {
    const compose = searchParams.get('compose');
    if (compose !== 'script') {
      if (handledComposeRef.current === 'script') {
        handledComposeRef.current = null;
      }
      return;
    }
    if (handledComposeRef.current === compose) return;

    handledComposeRef.current = compose;
    createScript(true);
  }, [createScript, searchParams]);

  const openIdeaComposer = useCallback(() => {
    updateSearchParam('compose', 'idea', '', false);
  }, [updateSearchParam]);

  const closeIdeaComposer = useCallback(() => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('compose');
      next.delete('itemId');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const saveIdea = useCallback(async (input: CreationIdeaInput) => {
    const serie = input.seriesId
      ? state.series.find(item => item.id === input.seriesId) ?? {id: input.seriesId}
      : null;
    let content = createIdeaContent({
      ...input,
      pilarOrigem: input.pilarId ? 'escolhida' : null,
      plataformas: input.plataformas.map(plataforma => ({...plataforma, contentId: ''})),
    });
    if (serie) content = aplicarEscolhasDaSerie(content, serie);
    content.plataformas = content.plataformas.map(plataforma => ({...plataforma, contentId: content.id}));
    // Fecha o modal e vai para Ideias antes do await, como o roteiro faz: o
    // `previous` é a URL do render em que o modal abriu, então navegar depois
    // do await trazia o compose=idea de volta e reabria o modal.
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('compose');
      next.delete('itemId');
      next.delete('tipo');
      next.delete('page');
      next.set('tab', 'ideias');
      return next;
    }, { replace: true });
    await dispatch({ type: 'ADD_CONTENT', payload: content });
  }, [dispatch, setSearchParams, state.series]);

  useEffect(() => {
    if (!user?.id) {
      setArchivedContents([]);
      setDeletedContents([]);
      return undefined;
    }

    let active = true;
    void Promise.all([
      fetchArchivedContents(user.id),
      fetchDeletedContents(user.id),
    ])
      .then(([archived, deleted]) => {
        if (!active) return;
        setArchivedContents(archived);
        setDeletedContents(deleted);
      })
      .catch(error => {
        console.error('[CreationHubPage] inactive contents fetch failed:', error);
        if (!active) return;
        setArchivedContents([]);
        setDeletedContents([]);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleArchive = useCallback(async (content: Content) => {
    const archived = archiveCreation(content);
    setArchivedContents(previous => [
      archived,
      ...previous.filter(item => item.id !== content.id),
    ]);
    try {
      await updateContent(archived);
    } catch {
      setArchivedContents(previous => previous.filter(item => item.id !== content.id));
    }
  }, [updateContent]);

  const handleRestore = useCallback(async (content: Content) => {
    const restored = restoreCreation(content);
    setArchivedContents(previous => previous.filter(item => item.id !== content.id));
    try {
      if (state.contents.some(item => item.id === content.id)) {
        await updateContent(restored);
      } else {
        await dispatch({ type: 'ADD_CONTENT', payload: restored });
      }
    } catch {
      setArchivedContents(previous => [
        content,
        ...previous.filter(item => item.id !== content.id),
      ]);
    }
  }, [dispatch, state.contents, updateContent]);

  const handleRestoreDeleted = useCallback(async (content: Content) => {
    if (!user?.id) return;
    const restored = restoreDeletedCreation(content);
    try {
      await restoreContent(content.id, user.id);
      setDeletedContents(previous => previous.filter(item => item.id !== content.id));
      await updateContent(restored, { silent: true });
      notifySaveFeedback({ status: 'success', message: 'Roteiro restaurado' });
    } catch (error) {
      notifySaveFeedback({
        status: 'error',
        message: 'Não foi possível restaurar o roteiro.',
        detail: getErrorMessage(error),
      });
    }
  }, [updateContent, user?.id]);

  const handlePermanentDelete = useCallback(async () => {
    if (!permanentDeleteTarget || !user?.id) return;
    setIsPermanentDeleting(true);
    try {
      await permanentlyDeleteContent(permanentDeleteTarget.id, user.id);
      setDeletedContents(previous =>
        previous.filter(item => item.id !== permanentDeleteTarget.id)
      );
      setPermanentDeleteTarget(null);
      notifySaveFeedback({ status: 'success', message: 'Roteiro excluído definitivamente' });
    } catch (error) {
      notifySaveFeedback({
        status: 'error',
        message: 'Não foi possível excluir o roteiro.',
        detail: getErrorMessage(error),
      });
    } finally {
      setIsPermanentDeleting(false);
    }
  }, [permanentDeleteTarget, user?.id]);

  const handleClearTrash = useCallback(async () => {
    if (!user?.id || deletedContents.length === 0) return;
    setIsClearingTrash(true);
    try {
      const deletedCount = await emptyContentTrash(user.id);
      setDeletedContents(removeDeletedCreations);
      setTrashClearConfirmOpen(false);
      notifySaveFeedback({
        status: 'success',
        message: deletedCount === 1
          ? '1 roteiro excluído definitivamente'
          : `${deletedCount} roteiros excluídos definitivamente`,
      });
    } catch (error) {
      notifySaveFeedback({
        status: 'error',
        message: 'Não foi possível limpar a lixeira.',
        detail: getErrorMessage(error),
      });
    } finally {
      setIsClearingTrash(false);
    }
  }, [deletedContents.length, user?.id]);

  const handleMoveToTab = useCallback(async (content: Content, tab: CreationKanbanTab) => {
    const previous = content;
    // Publicado não grava no arraste: abre o detalhe no formulário de publicação.
    if (tab === 'Publicados') {
      navigate(buildContentDetailRoute(content.id, 'publicacao'), {
        state: {
          ...buildDetailBackState(`${location.pathname}${location.search}`).state,
          openMarkPosted: true,
        },
      });
      return;
    }

    const next = moveCreationToKanbanTab(content, tab);
    if (
      previous.status === next.status
      && (previous.postedAt ?? null) === (next.postedAt ?? null)
    ) {
      return;
    }

    // Sair de Publicado pelo Kanban: a data some — confirma antes.
    const saindoDePublicado = Boolean(previous.postedAt)
      || previous.status === 'Publicado'
      || previous.status === 'Postado';
    if (saindoDePublicado) {
      const ok = window.confirm(
        'Desfazer publicação?\n\nA data de publicação registrada neste conteúdo será apagada.',
      );
      if (!ok) return;
    }

    setPersistingIds(current => new Set(current).add(content.id));
    try {
      await updateContent(next);
    } catch (error) {
      try {
        await updateContent(previous, { silent: true });
      } catch {
        // keep UI on previous via failed update rollback below
      }
      notifySaveFeedback({
        status: 'error',
        message: 'Não foi possível mover o item.',
        detail: getErrorMessage(error),
      });
    } finally {
      setPersistingIds(current => {
        const nextSet = new Set(current);
        nextSet.delete(content.id);
        return nextSet;
      });
    }
  }, [location, navigate, updateContent]);

  const itemActions: CreationItemActionHandlers = useMemo(() => ({
    onPromote: content => {
      void updateContent(promoteContentToScript(content));
    },
    onArchive: content => {
      void handleArchive(content);
    },
    onRestore: content => {
      void (content.deletedAt ? handleRestoreDeleted(content) : handleRestore(content));
    },
    onPermanentDelete: content => {
      setPermanentDeleteTarget(content);
    },
    onMoveToTab: (content, tab) => {
      void handleMoveToTab(content, tab);
    },
  }), [handleArchive, handleMoveToTab, handleRestore, handleRestoreDeleted, updateContent]);

  const resolveItem = useCallback((content: Content) => ({
    content,
    pillar: state.pilares.find(pilar => pilar.id === content.pilarId) ?? null,
    series: state.series.find(item => item.id === content.seriesId) ?? null,
    etiquetas: etiquetasVisiveis(content, state.temas),
    selectable: exportableIds.has(content.id),
    selected: selectedExportIds.has(content.id),
  }), [exportableIds, selectedExportIds, state.pilares, state.series, state.temas]);

  const listItems = useMemo(
    () => visibleContents.map(resolveItem),
    [resolveItem, visibleContents],
  );

  const tabOptions = CREATION_TABS.map(tab => ({
    id: tab,
    label: `${tab} ${tabCounts[tab]}`,
  }));

  const creationActions = (
    <>
      <AppButton
        variant="secondary"
        size="sm"
        leftIcon={<Lightbulb className="h-4 w-4" />}
        onClick={openIdeaComposer}
      >
        Nova ideia
      </AppButton>
      <AppButton
        variant="primary"
        size="sm"
        leftIcon={<FileText className="h-4 w-4" />}
        onClick={() => createScript()}
      >
        Novo roteiro
      </AppButton>
    </>
  );

  const trashActions = (
    <AppButton
      variant="secondary"
      size="sm"
      fullWidth={isMobile}
      leftIcon={<Trash2 className="h-4 w-4" />}
      className="border-[color-mix(in_srgb,var(--danger),transparent_55%)] text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger),transparent_90%)]"
      disabled={deletedContents.length === 0 || isClearingTrash}
      onClick={() => setTrashClearConfirmOpen(true)}
    >
      {isClearingTrash ? 'Limpando…' : 'Limpar toda a lixeira'}
    </AppButton>
  );

  const desktopTabs = (
    <SegmentTabs
      options={tabOptions}
      value={activeTab}
      onChange={tab => updateSearchParam('tab', TAB_QUERY[tab], 'roteiros')}
    />
  );

  const mobileTabs = (
    <MobileSegmentTabs
      rounded="tight"
      tabs={CREATION_TABS.map(tab => ({
        value: tab,
        label: tab,
        count: tabCounts[tab],
      }))}
      value={activeTab}
      onChange={tab => updateSearchParam('tab', TAB_QUERY[tab], 'roteiros')}
    />
  );

  // URL antiga: ?tema=id e ?tags=nome viram ?temas=. Tags só se resolvem com os temas carregados.
  useEffect(() => {
    if (searchParams.has(LEGACY_TAGS_PARAM) && state.temas.length === 0) return;
    const next = migrateLegacyTemaParams(searchParams, state.temas);
    if (next) setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, state.temas]);

  const temaOptions = useMemo(
    () => dedupeTemasPorNome([...state.temas]
      .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR')))
      .map(tema => ({ value: tema.id, label: tema.nome })),
    [state.temas],
  );
  const setTemaFilter = useCallback((ids: string[]) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('tema');
      const value = serializeTemaFilterParam(ids);
      if (value) next.set(TEMA_FILTER_PARAM, value);
      else next.delete(TEMA_FILTER_PARAM);
      next.delete('page');
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  const temaFilterField = (
    <TagSelect
      id="criacao-filtro-temas"
      label="Temas"
      values={temaFilter}
      options={temaOptions}
      searchable
      disabled={temaOptions.length === 0 && temaFilter.length === 0}
      placeholder={temaOptions.length === 0 ? 'Nenhum tema ainda' : 'Todos os temas'}
      onChange={setTemaFilter}
    />
  );

  const filterDefinitions = useMemo(() => [
    {
      id: 'pilar',
      label: 'Pilar',
      value: pilarId,
      onChange: (value: string) => updateSearchParam('pilar', value),
      options: [
        { label: 'Todos os pilares', value: '' },
        ...state.pilares.map(pilar => ({ label: pilar.nome, value: pilar.id })),
      ],
    },
    {
      id: 'serie',
      label: 'Série',
      value: seriesId,
      onChange: (value: string) => updateSearchParam('serie', value),
      options: [
        { label: 'Todas as séries', value: '' },
        ...state.series.map(series => ({ label: series.name, value: series.id })),
      ],
    },
    {
      id: 'rede',
      label: 'Rede',
      value: redeFilter,
      onChange: (value: string) => updateSearchParam(REDE_FILTER_PARAM, value),
      options: opcoesDoFiltroRede(state.platforms, redeFilter),
    },
    {
      id: 'origem',
      label: 'Origem',
      value: originId,
      onChange: (value: string) => updateSearchParam('origem', value),
      options: [
        { label: 'Todas as origens', value: '' },
        ...state.bibliotecaItems.map(item => ({
          label: item.titulo,
          value: item.id,
        })),
      ],
    },
    {
      id: 'funcao',
      label: 'Função',
      value: funcaoId,
      onChange: (value: string) => updateSearchParam('funcao', value),
      options: [
        { label: 'Todas as funções', value: '' },
        ...FUNCOES.map(funcao => ({ label: FUNCAO_LABELS[funcao], value: funcao })),
      ],
    },
    {
      id: 'data',
      label: 'Data',
      value: valorFiltroData,
      onChange: (value: string) => setSearchParams(previous => aplicarFiltroData(previous, value), { replace: true }),
      options: opcoesDoFiltroData(new Date(), filtroData),
    },
  ], [
    filtroData,
    funcaoId,
    setSearchParams,
    valorFiltroData,
    originId,
    pilarId,
    redeFilter,
    seriesId,
    state.bibliotecaItems,
    state.platforms,
    state.temas,
    state.pilares,
    state.series,
    updateSearchParam,
  ]);

  const clearMobileFilters = useCallback(() => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      CREATION_FILTER_QUERY_KEYS.forEach(key => next.delete(key));
      return next;
    }, { replace: true });
    setMobileFiltersOpen(false);
  }, [setSearchParams]);

  const selectionMenu = activeTab === 'Lixeira' ? null : (
    <CreationOverflowMenu
      exportLabel={`Exportar ${exportCopy.plural}`}
      exportEnabled={exportableContents.length > 0}
      exportMode={exportMode}
      onToggleExport={toggleExportMode}
      cancelLabel="Cancelar seleção"
      extraItems={[
        { id: 'bulk-series', label: 'Mudar série em massa', onClick: beginSelection },
        { id: 'bulk-pillar', label: 'Mudar pilar em massa', onClick: beginSelection },
        { id: 'bulk-delete', label: 'Mover para a lixeira', tone: 'danger', onClick: beginSelection },
      ]}
    />
  );

  const filters = (
    <div className="desktop-subheader !mb-0">
      <FilterBar
        className="min-w-0 flex-1"
        searchValue={search}
        onSearchChange={value => updateSearchParam('q', value)}
        searchPlaceholder="Buscar por título, nota ou tema…"
        filters={filterDefinitions}
        panelExtra={temaFilterField}
        extraActiveCount={temaFilter.length > 0 ? 1 : 0}
        onClearExtra={() => setTemaFilter([])}
      />
      <div className="inline-stack-sm shrink-0">
        <CreationDisplayMenu
          sort={sort as CreationSortValue}
          onSortChange={value => updateSearchParam('sort', value, 'recent')}
        />
        <ViewModeToggle
          value={viewMode}
          options={VIEW_OPTIONS}
          onChange={value => setViewMode(value)}
          showLabels
        />
        {selectionMenu}
      </div>
    </div>
  );

  const mobileFilters = (
    <MobileSearchBar
      value={search}
      onChange={value => updateSearchParam('q', value)}
      placeholder="Buscar por título, nota ou tema"
      onFilterClick={() => setMobileFiltersOpen(true)}
      rounded="tight"
      trailing={selectionMenu ?? undefined}
    />
  );

  const mobileFilterSheet = (
    <MobileFilterSheet
      open={mobileFiltersOpen}
      title="Filtrar criações"
      onClose={() => setMobileFiltersOpen(false)}
    >
      {filterDefinitions.map(filter => (
        <label key={filter.id} className="block stack-sm">
          <Text variant="label" as="span">{filter.label}</Text>
          <select
            value={filter.value}
            onChange={event => filter.onChange(event.target.value)}
            className="min-h-11 w-full rounded-[var(--radius-input)]"
          >
            {filter.options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <div className="block">{temaFilterField}</div>

      <label className="block stack-sm">
        <Text variant="label" as="span">Ordenar</Text>
        <select
          value={sort}
          onChange={event => updateSearchParam('sort', event.target.value, 'recent')}
          className="min-h-11 w-full rounded-[var(--radius-input)]"
        >
          {CREATION_SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block stack-sm">
        <Text variant="label" as="span">Visualização</Text>
        <select
          value={requestedView}
          onChange={event => setViewMode(event.target.value as CreationViewMode)}
          className="min-h-11 w-full rounded-[var(--radius-input)]"
        >
          {CREATION_VIEW_MODE_VALUES.map(value => (
            <option key={value} value={value}>
              {CREATION_VIEW_MODE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <AppButton variant="primary" size="lg" fullWidth onClick={clearMobileFilters}>
        Limpar filtros
      </AppButton>
    </MobileFilterSheet>
  );

  const exportSelectionToolbar = exportMode ? (
    <CreationSelectionBar
      selectedCount={selectedExportIds.size}
      availableCount={exportableContents.length}
      hiddenSelectedCount={hiddenSelectedCount}
      selectedNoun={selectedCopy}
      availableNoun={exportCopy}
      isExporting={isExporting}
      onToggleAll={toggleSelectAllExportable}
      onChangeSeries={() => openBulkAssign('seriesId')}
      onChangePillar={() => openBulkAssign('pilarId')}
      onExport={() => void handleExportCreations()}
      onDelete={() => setBulkDeleteOpen(true)}
      onCancel={toggleExportMode}
    />
  ) : null;

  const hasFilters = Boolean(search || pilarId || seriesId || redeFilter || temaFilter.length > 0 || originId || funcaoId || filtroData);
  const shownCount = viewMode === 'kanban' ? kanbanContents.length : pageData.items.length;
  const totalCount = viewMode === 'kanban' ? kanbanContents.length : filteredContents.length;
  const hiddenCount = totalCount - shownCount;
  const countMeta = hiddenCount > 0
    ? `Mostrando ${shownCount} de ${totalCount}`
    : `${totalCount} ${totalCount === 1 ? 'item' : 'itens'}`;

  return (
    <>
      <PageLayout
        contentWidth="wide"
        contentStack="dense"
        header={(
          <DesktopPageHeader
            section="Criação"
            title="Criação"
            meta={countMeta}
            actions={activeTab === 'Lixeira' ? trashActions : (
              <CreateMenuButton
                onCreateIdea={openIdeaComposer}
                onCreateScript={() => createScript()}
              />
            )}
          />
        )}
        toolbar={(
          <div className="stack-md">
            {desktopTabs}
            {filters}
          </div>
        )}
        mobileHeader={(
          <div className="stack-sm pb-1 pt-1">
            {activeTab === 'Lixeira' ? trashActions : null}
            {mobileTabs}
          </div>
        )}
        mobileToolbar={mobileFilters}
      >
        <QueryViewState
          status={resolveQueryViewStatus({
            loading: !state.isLoaded,
            enabled: true,
            fetchAttempted: state.isLoaded,
            itemCount: visibleContents.length,
          })}
          skeletonCount={8}
          skeletonVariant="content"
          emptyTitle={hasFilters ? 'Nenhum resultado' : `Nenhum item em ${activeTab}`}
          emptyDescription={
            hasFilters
              ? 'Ajuste a busca ou limpe os filtros para encontrar outros itens.'
              : activeTab === 'Lixeira'
                ? 'Roteiros excluídos aparecem aqui para que você possa restaurá-los.'
                : isMobile
                  ? 'Use o botão + da barra inferior para criar uma ideia ou um roteiro.'
                  : 'Crie uma ideia ou um roteiro para começar a preencher esta etapa.'
          }
          emptyAction={
            !isMobile && !hasFilters && activeTab !== 'Lixeira' ? (
              <div className="flex flex-wrap justify-center gap-2">{creationActions}</div>
            ) : undefined
          }
        >
          <div className={isMobile ? 'stack-md' : 'stack-lg'} aria-live="polite">
            {viewMode === 'grid' ? (
              <CreationGridView
                items={listItems}
                selectionMode={exportMode}
                compact={isMobile}
                onOpen={openContent}
                onToggleSelect={content => toggleExportSelection(content.id)}
                actions={itemActions}
              />
            ) : null}

            {viewMode === 'list' ? (
              <CreationListView
                items={listItems}
                selectionMode={exportMode}
                sort={sort}
                onSortChange={value => updateSearchParam('sort', value, 'recent')}
                onOpen={openContent}
                onToggleSelect={content => toggleExportSelection(content.id)}
                actions={itemActions}
              />
            ) : null}

            {viewMode === 'kanban' ? (
              <CreationKanbanView
                contents={kanbanContents}
                activeTab={activeTab}
                resolveItem={resolveItem}
                selectionMode={exportMode}
                onOpen={openContent}
                actions={itemActions}
                onMoveToTab={handleMoveToTab}
                persistingIds={persistingIds}
              />
            ) : null}

            {viewMode !== 'kanban' && hiddenCount > 0 ? (
              <div className="flex justify-center">
                <AppButton
                  variant="secondary"
                  onClick={() => updateSearchParam('page', String(requestedPage + 1), '1', false)}
                >
                  Mostrar mais ({Math.min(hiddenCount, CREATION_PAGE_SIZE)})
                </AppButton>
              </div>
            ) : null}
          </div>
        </QueryViewState>

        {/* Depois da lista: a barra fica presa ao pé da tela e não empurra os cards. */}
        {exportSelectionToolbar}
      </PageLayout>

      {isMobile ? mobileFilterSheet : null}

      <CreationComposer
        open={composerOpen}
        state={state}
        initialOriginId={searchParams.get('itemId') ?? originId}
        onClose={closeIdeaComposer}
        onSave={saveIdea}
      />

      <Dialog
        open={assignField !== null}
        onClose={() => setAssignField(null)}
        desktopMaxW="max-w-md"
        ariaLabel={assignField === 'seriesId' ? 'Mudar série' : 'Mudar pilar'}
      >
        <div className="stack-md p-4">
          <Text variant="sectionTitle">
            {assignField === 'seriesId' ? 'Mudar série' : 'Mudar pilar'}
          </Text>
          <Text variant="secondary">
            A mudança vale para a seleção atual.
          </Text>
          <select
            value={assignValue}
            onChange={event => setAssignValue(event.target.value)}
            className="min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 text-sm text-[var(--text-primary)]"
            aria-label={assignField === 'seriesId' ? 'Série' : 'Pilar'}
          >
            <option value="">Escolha</option>
            <option value="__none__">
              {assignField === 'seriesId' ? 'Sem série' : 'Sem pilar'}
            </option>
            {assignField === 'seriesId'
              ? [...state.series]
                .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'))
                .map(series => (
                  <option key={series.id} value={series.id}>{series.name}</option>
                ))
              : [...state.pilares]
                .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'))
                .map(pilar => (
                  <option key={pilar.id} value={pilar.id}>{pilar.nome}</option>
                ))}
          </select>
          <div className="flex justify-end gap-2">
            <AppButton
              variant="secondary"
              size="sm"
              onClick={() => setAssignField(null)}
            >
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              disabled={!assignValue}
              onClick={() => void applyBulkAssign()}
            >
              Aplicar
            </AppButton>
          </div>
        </div>
      </Dialog>

      <ConfirmModal
        open={bulkDeleteOpen}
        message={CONFIRM.excluirCriacoes(Math.max(selectedExportIds.size, 1), selectedCopy).message}
        confirmLabel={CONFIRM.excluirCriacoes(Math.max(selectedExportIds.size, 1), selectedCopy).confirmLabel}
        cancelLabel="Manter seleção"
        confirmDisabled={selectedExportIds.size === 0}
        onConfirm={() => void confirmBulkDelete()}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      <ConfirmModal
        open={Boolean(permanentDeleteTarget)}
        message={`Excluir definitivamente este roteiro — ${permanentDeleteTarget?.title || 'Roteiro sem título'}? Esta ação não pode ser desfeita.`}
        confirmLabel={isPermanentDeleting ? 'Excluindo…' : 'Excluir definitivamente'}
        cancelLabel="Manter na lixeira"
        confirmDisabled={isPermanentDeleting}
        cancelDisabled={isPermanentDeleting}
        onConfirm={() => void handlePermanentDelete()}
        onCancel={() => {
          if (!isPermanentDeleting) setPermanentDeleteTarget(null);
        }}
      />

      <ConfirmModal
        open={trashClearConfirmOpen}
        message={deletedContents.length === 1
          ? 'Excluir definitivamente o roteiro da lixeira? Esta ação não pode ser desfeita.'
          : `Excluir definitivamente os ${deletedContents.length} roteiros da lixeira? Esta ação não pode ser desfeita.`}
        confirmLabel={isClearingTrash ? 'Limpando…' : 'Limpar toda a lixeira'}
        cancelLabel="Manter os roteiros"
        confirmDisabled={isClearingTrash}
        cancelDisabled={isClearingTrash}
        onConfirm={() => void handleClearTrash()}
        onCancel={() => {
          if (!isClearingTrash) setTrashClearConfirmOpen(false);
        }}
      />
    </>
  );
}
