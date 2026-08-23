import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowRight,
  Check,
  Columns3,
  Download,
  FileText,
  LayoutGrid,
  Lightbulb,
  List,
  RotateCcw,
  SlidersHorizontal,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { FilterBar } from '../../../components/ui/FilterBar';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { ViewModeToggle } from '../../../components/ui/ViewModeToggle';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { MobileFilterSheet } from '../../../mobile/components/MobileFilterSheet';
import { MobileSearchBar } from '../../../mobile/components/MobileSearchBar';
import {
  emptyContentTrash,
  fetchArchivedContents,
  fetchContentsByIds,
  fetchDeletedContents,
  permanentlyDeleteContent,
  restoreContent,
  type Content,
  type Pilar,
  type Serie,
} from '../../../lib/database';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { getErrorMessage, notifySaveFeedback } from '../../../lib/saveFeedback';
import { cn, htmlToReadableText } from '../../../lib/utils';
import { ContentEntityTags } from '../../contents/components/ContentEntityTags';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import {
  archiveCreation,
  CREATION_PAGE_SIZE,
  createIdeaContent,
  createScriptContent,
  CREATION_TABS,
  filterCreationContents,
  filterContentsByCreationTab,
  getCreationTabCounts,
  paginateCreationContents,
  promoteContentToScript,
  removeDeletedCreations,
  restoreCreation,
  restoreDeletedCreation,
  sortCreationContents,
  type CreationTab,
  type CreationViewMode,
} from '../../contents/lib/creationContent';
import { getDisplayStatus } from '../../contents/lib/contentPipeline';
import {
  CreationComposer,
  type CreationIdeaInput,
} from '../components/CreationComposer';
import {
  canExportCreation,
  downloadCreationsDocx,
  getCreationExportCopy,
} from '../lib/exportScriptsDocx';

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

const SORT_OPTIONS = [
  { label: 'Mais recentes', value: 'recent' },
  { label: 'Mais antigos', value: 'oldest' },
  { label: 'Título A–Z', value: 'title' },
];

const VIEW_OPTIONS = [
  {value: 'grid', label: 'Grade', icon: LayoutGrid},
  {value: 'list', label: 'Lista', icon: List},
  {value: 'kanban', label: 'Kanban', icon: Columns3},
] satisfies Array<{
  value: CreationViewMode;
  label: string;
  icon: typeof LayoutGrid;
}>;

const KANBAN_TABS: Exclude<CreationTab, 'Todos'>[] = [
  'Ideias',
  'Roteiros',
  'Produção',
  'Publicados',
];

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(value));
}

function getExcerpt(content: Content) {
  const notes = htmlToReadableText(content.notes).trim();
  if (notes) return notes;
  return htmlToReadableText(content.script).trim();
}

function CreationCard({
  content,
  onOpen,
  onToggleSelect,
  onPromote,
  onArchive,
  onRestore,
  onPermanentDelete,
  selectionMode,
  selectable,
  selected,
  pillar,
  series,
}: {
  content: Content;
  onOpen: () => void;
  onToggleSelect: () => void;
  onPromote: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  selectionMode: boolean;
  selectable: boolean;
  selected: boolean;
  pillar?: Pilar | null;
  series?: Serie | null;
}) {
  const archived = Boolean(content.archivedAt);
  const deleted = Boolean(content.deletedAt);
  const status = deleted ? 'Na lixeira' : archived ? 'Arquivado' : getDisplayStatus(content);
  const excerpt = getExcerpt(content);
  const isIdea = !deleted && !archived && getDisplayStatus(content) === 'Ideia';
  const title = content.title.trim() || 'Sem título';
  const canOpen = !deleted;
  const canActivate = selectionMode ? selectable : canOpen;
  const handleActivate = selectionMode
    ? (selectable ? onToggleSelect : undefined)
    : (canOpen ? onOpen : undefined);

  return (
    <Surface
      as="article"
      variant="outlined"
      padding="sm"
      className={cn(
        'group flex h-full flex-col gap-2',
        selectionMode && selected
          && 'border-[var(--text-primary)] bg-[var(--bg-hover)] shadow-[0_0_0_1px_var(--text-primary)]',
        selectionMode && !selectable && 'opacity-55',
      )}
    >
      <button
        type="button"
        onClick={handleActivate}
        disabled={!canActivate}
        className={cn(
          'min-w-0 flex-1 stack-xs text-left focus-visible:outline-none',
          canActivate
            ? 'cursor-pointer rounded-[var(--radius-input)] focus-visible:shadow-[var(--focus-ring)]'
            : 'cursor-default',
        )}
        aria-label={selectionMode
          ? (selectable
              ? `${selected ? 'Desmarcar' : 'Selecionar'} ${title} para exportação`
              : `${title} não pode ser exportado`)
          : (canOpen ? `Abrir ${title}` : title)}
      >
        <Text variant="itemTitle" className="line-clamp-2 leading-snug">
          {title}
        </Text>
        {excerpt ? (
          <Text variant="secondary" className="line-clamp-2">
            {excerpt}
          </Text>
        ) : null}
        <ContentEntityTags
          pillar={pillar}
          series={series}
          pillarId={content.pilarId}
          seriesId={content.seriesId}
          size="sm"
          className="pt-0.5"
        />
      </button>

      <div className="mt-auto flex items-center gap-1.5">
        <Text variant="meta" as="p" className="min-w-0 truncate leading-none">
          <span>{status}</span>
          <span aria-hidden> · </span>
          <time dateTime={content.updatedAt}>{formatUpdatedAt(content.updatedAt)}</time>
        </Text>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {selectionMode ? (
            selectable ? (
              <AppButton
                size="xs"
                variant={selected ? 'primary' : 'secondary'}
                iconOnly
                leftIcon={selected
                  ? <Check className="h-3.5 w-3.5 stroke-[3px]" />
                  : <Square className="h-3.5 w-3.5" />}
                onClick={onToggleSelect}
                aria-label={`${selected ? 'Desmarcar' : 'Selecionar'} ${title} para exportação`}
                title={selected ? 'Desmarcar roteiro' : 'Selecionar roteiro'}
              />
            ) : (
              <Badge>Não exportável</Badge>
            )
          ) : deleted ? (
            <>
              <AppButton
                size="xs"
                variant="secondary"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                onClick={onRestore}
              >
                Restaurar
              </AppButton>
              <AppButton
                size="xs"
                variant="ghost"
                iconOnly
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={onPermanentDelete}
                className="text-[var(--accent-red)] hover:text-[var(--accent-red)]"
                aria-label={`Excluir definitivamente ${title}`}
                title="Excluir definitivamente"
              />
            </>
          ) : archived ? (
            <AppButton
              size="xs"
              variant="ghost"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={onRestore}
            >
              Restaurar
            </AppButton>
          ) : (
            <>
              {isIdea ? (
                <AppButton
                  size="xs"
                  variant="secondary"
                  rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                  onClick={onPromote}
                >
                  Virar roteiro
                </AppButton>
              ) : null}
              <AppButton
                size="xs"
                variant="ghost"
                iconOnly
                leftIcon={<Archive className="h-3.5 w-3.5" />}
                onClick={onArchive}
                className={cn(
                  'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
                  'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
                )}
                aria-label={`Arquivar ${title}`}
                title="Arquivar"
              />
            </>
          )}
        </div>
      </div>
    </Surface>
  );
}

function CreationListRow({
  content,
  onOpen,
  onToggleSelect,
  onPromote,
  onArchive,
  onRestore,
  onPermanentDelete,
  selectionMode,
  selectable,
  selected,
  pillar,
  series,
  originName,
}: {
  content: Content;
  onOpen: () => void;
  onToggleSelect: () => void;
  onPromote: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  selectionMode: boolean;
  selectable: boolean;
  selected: boolean;
  pillar?: Pilar | null;
  series?: Serie | null;
  originName?: string;
}) {
  const archived = Boolean(content.archivedAt);
  const deleted = Boolean(content.deletedAt);
  const status = deleted ? 'Na lixeira' : archived ? 'Arquivado' : getDisplayStatus(content);
  const excerpt = getExcerpt(content);
  const isIdea = !deleted && !archived && getDisplayStatus(content) === 'Ideia';
  const title = content.title.trim() || 'Sem título';
  const canOpen = !deleted;
  const canActivate = selectionMode ? selectable : canOpen;
  const handleActivate = selectionMode
    ? (selectable ? onToggleSelect : undefined)
    : (canOpen ? onOpen : undefined);

  return (
    <Surface
      as="article"
      variant="outlined"
      padding="sm"
      className={cn(
        'group flex flex-col gap-3 md:flex-row md:items-center',
        selectionMode && selected
          && 'border-[var(--text-primary)] bg-[var(--bg-hover)] shadow-[0_0_0_1px_var(--text-primary)]',
        selectionMode && !selectable && 'opacity-55',
      )}
    >
      <button
        type="button"
        onClick={handleActivate}
        disabled={!canActivate}
        className={cn(
          'min-w-0 flex-1 stack-xs text-left focus-visible:outline-none',
          canActivate
            ? 'cursor-pointer rounded-[var(--radius-input)] focus-visible:shadow-[var(--focus-ring)]'
            : 'cursor-default',
        )}
        aria-label={selectionMode
          ? (selectable
              ? `${selected ? 'Desmarcar' : 'Selecionar'} ${title} para exportação`
              : `${title} não pode ser exportado`)
          : (canOpen ? `Abrir ${title}` : title)}
      >
        <Text variant="meta" as="p" className="leading-none">
          <span>{status}</span>
          <span aria-hidden> · </span>
          <time dateTime={content.updatedAt}>{formatUpdatedAt(content.updatedAt)}</time>
        </Text>
        <Text variant="itemTitle" className="line-clamp-1">
          {title}
        </Text>
        {excerpt ? (
          <Text variant="secondary" className="line-clamp-2">{excerpt}</Text>
        ) : null}
        <div className="flex flex-wrap items-center gap-1">
          <ContentEntityTags
            pillar={pillar}
            series={series}
            pillarId={content.pilarId}
            seriesId={content.seriesId}
            size="sm"
          />
          {originName ? <Badge>{originName}</Badge> : null}
        </div>
      </button>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {selectionMode ? (
          selectable ? (
            <AppButton
              size="xs"
              variant={selected ? 'primary' : 'secondary'}
              leftIcon={selected
                ? <Check className="h-3.5 w-3.5 stroke-[3px]" />
                : <Square className="h-3.5 w-3.5" />}
              onClick={onToggleSelect}
            >
              {selected ? 'Selecionado' : 'Selecionar'}
            </AppButton>
          ) : (
            <Badge>Não exportável</Badge>
          )
        ) : deleted ? (
          <>
            <AppButton
              size="xs"
              variant="secondary"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={onRestore}
            >
              Restaurar
            </AppButton>
            <AppButton
              size="xs"
              variant="ghost"
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={onPermanentDelete}
              className="text-[var(--accent-red)] hover:text-[var(--accent-red)]"
            >
              Excluir definitivamente
            </AppButton>
          </>
        ) : archived ? (
          <AppButton
            size="xs"
            variant="ghost"
            leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
            onClick={onRestore}
          >
            Restaurar
          </AppButton>
        ) : (
          <>
            {isIdea ? (
              <AppButton
                size="xs"
                variant="secondary"
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={onPromote}
              >
                Virar roteiro
              </AppButton>
            ) : null}
            <AppButton
              size="xs"
              variant="ghost"
              iconOnly
              leftIcon={<Archive className="h-3.5 w-3.5" />}
              onClick={onArchive}
              className={cn(
                'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
                'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
              )}
              aria-label={`Arquivar ${title}`}
              title="Arquivar"
            />
          </>
        )}
      </div>
    </Surface>
  );
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
  const sort = sortParam === 'oldest' || sortParam === 'title' ? sortParam : 'recent';
  const viewParam = searchParams.get('view');
  const requestedView: CreationViewMode =
    viewParam === 'list' || viewParam === 'kanban' ? viewParam : 'grid';
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

  const openContent = (content: Content) => {
    navigate(
      buildContentDetailRoute(content.id),
      buildDetailBackState(`${location.pathname}${location.search}`),
    );
  };

  const toggleExportMode = useCallback(() => {
    if (exportMode) setSelectedExportIds(new Set());
    setExportMode(!exportMode);
  }, [exportMode]);

  const toggleExportSelection = useCallback((id: string) => {
    setSelectedExportIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllExportable = useCallback(() => {
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
    if (compose !== 'script') return;
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
    }, {replace: true});
  }, [setSearchParams]);

  const saveIdea = useCallback(async (input: CreationIdeaInput) => {
    const content = createIdeaContent(input);
    await dispatch({type: 'ADD_CONTENT', payload: content});
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('tab', TAB_QUERY.Ideias);
      next.delete('tipo');
      next.delete('compose');
      next.delete('itemId');
      next.delete('page');
      return next;
    }, {replace: true});
  }, [dispatch, setSearchParams]);

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
      await updateContent(restored, {silent: true});
      notifySaveFeedback({status: 'success', message: 'Roteiro restaurado'});
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
      notifySaveFeedback({status: 'success', message: 'Roteiro excluído definitivamente'});
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

  const tabOptions = CREATION_TABS.map(tab => ({
    id: tab,
    label: `${tab} ${tabCounts[tab]}`,
  }));

  const creationActions = (
    <>
      {exportableContents.length > 0 ? (
        <AppButton
          variant={exportMode ? 'primary' : 'secondary'}
          size="sm"
          leftIcon={exportMode
            ? <X className="h-4 w-4" />
            : <Download className="h-4 w-4" />}
          onClick={toggleExportMode}
          className={isMobile ? 'col-span-2' : undefined}
        >
          {exportMode ? 'Cancelar exportação' : `Exportar ${exportCopy.plural}`}
        </AppButton>
      ) : null}
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

  const headerActions = activeTab === 'Lixeira' ? trashActions : creationActions;

  const tabs = (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <SegmentTabs
        options={tabOptions}
        value={activeTab}
        onChange={tab => updateSearchParam('tab', TAB_QUERY[tab], 'todos')}
        className={cn(
          'min-w-max',
          isMobile && '[&_.segment-tabs-item]:min-h-11 [&_.segment-tabs-item]:px-4',
        )}
      />
    </div>
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

  const activeFilterCount = filterDefinitions.filter(filter => filter.value).length;

  const clearMobileFilters = useCallback(() => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      ['pilar', 'serie', 'origem', 'sort', 'page'].forEach(key => next.delete(key));
      return next;
    }, { replace: true });
    setMobileFiltersOpen(false);
  }, [setSearchParams]);

  const filters = (
    <div className="flex flex-col gap-2 md:flex-row md:items-start">
      <FilterBar
        className="min-w-0 flex-1"
        searchValue={search}
        onSearchChange={value => updateSearchParam('q', value)}
        searchPlaceholder="Buscar por título, nota ou tag..."
        filters={filterDefinitions}
        sortValue={sort}
        onSortChange={value => updateSearchParam('sort', value, 'recent')}
        sortOptions={SORT_OPTIONS}
      />
      <ViewModeToggle
        value={viewMode}
        options={VIEW_OPTIONS}
        onChange={value => updateSearchParam('view', value, 'grid')}
        showLabels
        className="self-start"
      />
    </div>
  );

  const mobileFilters = (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <MobileSearchBar
          value={search}
          onChange={value => updateSearchParam('q', value)}
          placeholder="Buscar por título, nota ou tag"
          rounded="tight"
        />
      </div>
      <AppButton
        variant={activeFilterCount > 0 ? 'primary' : 'secondary'}
        size="lg"
        leftIcon={<SlidersHorizontal className="h-4 w-4" />}
        rightIcon={activeFilterCount > 0 ? <Badge>{activeFilterCount}</Badge> : undefined}
        onClick={() => setMobileFiltersOpen(true)}
      >
        Filtros
      </AppButton>
    </div>
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
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
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
      </div>
    </Surface>
  ) : null;

  const renderCard = (content: Content) => (
    <CreationCard
      key={content.id}
      content={content}
      onOpen={() => openContent(content)}
      onToggleSelect={() => toggleExportSelection(content.id)}
      onPromote={() => void updateContent(promoteContentToScript(content))}
      onArchive={() => void handleArchive(content)}
      onRestore={() => void (
        content.deletedAt ? handleRestoreDeleted(content) : handleRestore(content)
      )}
      onPermanentDelete={() => setPermanentDeleteTarget(content)}
      selectionMode={exportMode}
      selectable={exportableIds.has(content.id)}
      selected={selectedExportIds.has(content.id)}
      pillar={state.pilares.find(pilar => pilar.id === content.pilarId) ?? null}
      series={state.series.find(item => item.id === content.seriesId) ?? null}
    />
  );

  const renderListRow = (content: Content) => (
    <CreationListRow
      key={content.id}
      content={content}
      onOpen={() => openContent(content)}
      onToggleSelect={() => toggleExportSelection(content.id)}
      onPromote={() => void updateContent(promoteContentToScript(content))}
      onArchive={() => void handleArchive(content)}
      onRestore={() => void (
        content.deletedAt ? handleRestoreDeleted(content) : handleRestore(content)
      )}
      onPermanentDelete={() => setPermanentDeleteTarget(content)}
      selectionMode={exportMode}
      selectable={exportableIds.has(content.id)}
      selected={selectedExportIds.has(content.id)}
      pillar={state.pilares.find(pilar => pilar.id === content.pilarId) ?? null}
      series={state.series.find(item => item.id === content.seriesId) ?? null}
      originName={state.bibliotecaItems.find(item => item.id === content.bibliotecaItemId)?.titulo}
    />
  );

  const hasFilters = Boolean(search || pilarId || seriesId || originId);
  const shownCount = viewMode === 'kanban' ? filteredContents.length : pageData.items.length;
  const kanbanTabs = activeTab === 'Todos'
    ? KANBAN_TABS
    : [activeTab as Exclude<CreationTab, 'Todos'>];

  return (
    <>
      <PageLayout
        contentWidth="wide"
        contentStack="dense"
        header={(
          <DesktopPageHeader
            section="Criação"
            title="Central de criação"
            meta={`${shownCount} de ${filteredContents.length} itens`}
            actions={headerActions}
          >
            {tabs}
          </DesktopPageHeader>
        )}
        toolbar={filters}
        mobileHeader={(
          <div className="stack-md border-b border-[var(--border-color)] pb-4 pt-2">
            <Text variant="meta">{shownCount} de {filteredContents.length} itens</Text>
            <div className={activeTab === 'Lixeira' ? 'w-full' : 'grid grid-cols-2 gap-2'}>
              {headerActions}
            </div>
            {tabs}
          </div>
        )}
        mobileToolbar={mobileFilters}
      >
        {exportSelectionToolbar}

        {visibleContents.length > 0 ? (
          <div className="stack-lg" aria-live="polite">
            {viewMode === 'grid' ? (
              <div className="grid-content">{visibleContents.map(renderCard)}</div>
            ) : null}

            {viewMode === 'list' ? (
              <div className="stack-sm">{visibleContents.map(renderListRow)}</div>
            ) : null}

            {viewMode === 'kanban' ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {kanbanTabs.map(tab => {
                  const columnItems = filterContentsByCreationTab(filteredContents, tab);
                  return (
                    <Surface
                      key={tab}
                      as="section"
                      variant="outlined"
                      padding="none"
                      className="flex w-[min(320px,86vw)] shrink-0 flex-col bg-[var(--bg-hover)]/20"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-3">
                        <Text variant="label">{tab}</Text>
                        <Badge>{columnItems.length}</Badge>
                      </div>
                      <div className="flex max-h-[68vh] flex-col gap-2 overflow-y-auto p-2">
                        {columnItems.length > 0 ? columnItems.map(renderCard) : (
                          <Text variant="meta" className="px-2 py-8 text-center">
                            Nenhum item nesta etapa.
                          </Text>
                        )}
                      </div>
                    </Surface>
                  );
                })}
              </div>
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
        ) : (
          <Surface
            variant="outlined"
            padding="lg"
            className="flex min-h-[240px] flex-col items-center justify-center gap-3 border-dashed text-center"
          >
            <Text variant="sectionTitle">
              {hasFilters ? 'Nenhum resultado' : `Nenhum item em ${activeTab}`}
            </Text>
            <Text variant="secondary" className="max-w-md">
              {hasFilters
                ? 'Ajuste a busca ou limpe os filtros para encontrar outros itens.'
                : activeTab === 'Lixeira'
                  ? 'Roteiros excluídos aparecem aqui para que você possa restaurá-los.'
                  : 'Crie uma ideia ou um roteiro para começar a preencher esta etapa.'}
            </Text>
            {!hasFilters && activeTab !== 'Lixeira' ? (
              <div className="flex flex-wrap justify-center gap-2">{creationActions}</div>
            ) : null}
          </Surface>
        )}
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
