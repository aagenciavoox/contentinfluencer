import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Columns3,
  Download,
  FileText,
  LayoutGrid,
  Lightbulb,
  List,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { FilterBar } from '../../../components/ui/FilterBar';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Surface } from '../../../components/ui/Surface';
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
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
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
  const { state, dispatch, updateContent } = useAppContext();
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [persistingIds, setPersistingIds] = useState<Set<string>>(new Set());
  const handledComposeRef = useRef<string | null>(null);
  const isMobile = useIsMobile();

  const legacyType = searchParams.get('tipo');
  const requestedTab = searchParams.get('tab')
    ?? (legacyType === 'ideia' ? 'ideias' : legacyType === 'roteiro' ? 'roteiros' : '');
  const activeTab = QUERY_TAB[requestedTab] ?? 'Todos';
  const search = searchParams.get('q') ?? '';
  const pilarId = searchParams.get('pilar') ?? '';
  const seriesId = searchParams.get('serie') ?? '';
  const originId = searchParams.get('origem') ?? '';
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

  const filteredContents = useMemo(
    () => sortCreationContents(
      filterCreationContents(canonicalContents, {
        tab: activeTab,
        search,
        pilarId,
        seriesId,
        originId,
      }),
      sort,
    ),
    [activeTab, canonicalContents, originId, pilarId, search, seriesId, sort],
  );

  const pageData = useMemo(
    () => paginateCreationContents(filteredContents, requestedPage),
    [filteredContents, requestedPage],
  );

  const visibleContents = viewMode === 'kanban' ? filteredContents : pageData.items;
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
    if (exportMode) setSelectedExportIds(new Set());
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
    const content = createIdeaContent(input);
    await dispatch({ type: 'ADD_CONTENT', payload: content });
    navigate(
      buildContentDetailRoute(content.id),
      buildDetailBackState('/criacao?tab=ideias'),
    );
  }, [dispatch, navigate]);

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
    const next = moveCreationToKanbanTab(content, tab);
    if (
      previous.status === next.status
      && (previous.postedAt ?? null) === (next.postedAt ?? null)
    ) {
      return;
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
  }, [updateContent]);

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
    selectable: exportableIds.has(content.id),
    selected: selectedExportIds.has(content.id),
  }), [exportableIds, selectedExportIds, state.pilares, state.series]);

  const listItems = useMemo(
    () => visibleContents.map(resolveItem),
    [resolveItem, visibleContents],
  );

  const showStatus = true;
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
      {isClearingTrash ? 'Limpando...' : 'Limpar toda a lixeira'}
    </AppButton>
  );

  const desktopTabs = (
    <SegmentTabs
      options={tabOptions}
      value={activeTab}
      onChange={tab => updateSearchParam('tab', TAB_QUERY[tab], 'todos')}
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
      onChange={tab => updateSearchParam('tab', TAB_QUERY[tab], 'todos')}
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
  ], [
    originId,
    pilarId,
    seriesId,
    state.bibliotecaItems,
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

  const filters = (
    <div className="desktop-subheader !mb-0">
      <FilterBar
        className="min-w-0 flex-1"
        searchValue={search}
        onSearchChange={value => updateSearchParam('q', value)}
        searchPlaceholder="Buscar por título, nota ou tag..."
        filters={filterDefinitions}
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
        {activeTab !== 'Lixeira' ? (
          <CreationOverflowMenu
            exportLabel={`Exportar ${exportCopy.plural}`}
            exportEnabled={exportableContents.length > 0}
            exportMode={exportMode}
            onToggleExport={toggleExportMode}
          />
        ) : null}
      </div>
    </div>
  );

  const mobileFilters = (
    <MobileSearchBar
      value={search}
      onChange={value => updateSearchParam('q', value)}
      placeholder="Buscar por título, nota ou tag"
      onFilterClick={() => setMobileFiltersOpen(true)}
      rounded="tight"
      trailing={
        activeTab !== 'Lixeira' ? (
          <CreationOverflowMenu
            exportLabel={`Exportar ${exportCopy.plural}`}
            exportEnabled={exportableContents.length > 0}
            exportMode={exportMode}
            onToggleExport={toggleExportMode}
          />
        ) : undefined
      }
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
    <Surface
      variant="outlined"
      padding="sm"
      className="flex flex-col gap-3 border-[var(--border-strong)] md:flex-row md:items-center"
    >
      <div className="min-w-0 flex-1">
        <Text variant="label">
          Seleção: {selectedExportIds.size} {selectedExportIds.size === 1
            ? exportCopy.singular
            : exportCopy.plural}
        </Text>
        <Text variant="meta" as="p">
          Disponíveis nos filtros: {exportableContents.length} {
            exportableContents.length === 1 ? exportCopy.singular : exportCopy.plural
          }
        </Text>
      </div>

      <div className="flex flex-wrap gap-2">
        <AppButton
          variant="secondary"
          size="sm"
          leftIcon={allExportableSelected
            ? <X className="h-4 w-4" />
            : <Check className="h-4 w-4" />}
          onClick={toggleSelectAllExportable}
        >
          {allExportableSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        </AppButton>
        <AppButton
          variant="primary"
          size="sm"
          leftIcon={<Download className="h-4 w-4" />}
          disabled={selectedExportIds.size === 0 || isExporting}
          onClick={() => void handleExportCreations()}
        >
          {isExporting ? 'Gerando DOCX...' : `Exportar DOCX (${selectedExportIds.size})`}
        </AppButton>
        <AppButton
          variant="ghost"
          size="sm"
          leftIcon={<X className="h-4 w-4" />}
          onClick={toggleExportMode}
        >
          Cancelar
        </AppButton>
      </div>
    </Surface>
  ) : null;

  const hasFilters = Boolean(search || pilarId || seriesId || originId);
  const shownCount = viewMode === 'kanban' ? filteredContents.length : pageData.items.length;

  return (
    <>
      <PageLayout
        contentWidth="wide"
        contentStack="dense"
        header={(
          <DesktopPageHeader
            section="Criação"
            title="Criação"
            meta={`${shownCount} de ${filteredContents.length} itens`}
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
        {exportSelectionToolbar}

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
                showStatus
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
                showStatus
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
                contents={filteredContents}
                activeTab={activeTab}
                resolveItem={resolveItem}
                selectionMode={exportMode}
                onOpen={openContent}
                actions={itemActions}
                onMoveToTab={handleMoveToTab}
                persistingIds={persistingIds}
              />
            ) : null}

            {viewMode !== 'kanban' ? (
              <PaginationBar
                variant={isMobile ? 'simple' : 'full'}
                itemLabel="criações"
                totalItems={pageData.totalItems}
                currentPage={pageData.page}
                totalPages={pageData.totalPages}
                pageSize={CREATION_PAGE_SIZE}
                onPageChange={page => updateSearchParam('page', String(page), '1', false)}
              />
            ) : null}
          </div>
        </QueryViewState>
      </PageLayout>

      {isMobile ? mobileFilterSheet : null}

      <CreationComposer
        open={composerOpen}
        state={state}
        initialOriginId={searchParams.get('itemId') ?? originId}
        onClose={closeIdeaComposer}
        onSave={saveIdea}
      />

      <ConfirmModal
        open={Boolean(permanentDeleteTarget)}
        message={`Excluir definitivamente este roteiro — ${permanentDeleteTarget?.title || 'Roteiro sem título'}? Esta ação não pode ser desfeita.`}
        confirmLabel={isPermanentDeleting ? 'Excluindo...' : 'Excluir definitivamente'}
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
        confirmLabel={isClearingTrash ? 'Limpando...' : 'Limpar toda a lixeira'}
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
