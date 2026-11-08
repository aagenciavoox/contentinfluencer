import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
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
import { PageToolbar } from '../../../components/ui/PageToolbar';
import { PaginationBar } from '../../../components/ui/PaginationBar';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { SelectField } from '../../../components/ui/SelectField';
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
  type ContentPlataforma,
  type RedeSocial,
} from '../../../lib/database';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { getErrorDetail, notifySaveFeedback, UserFacingError } from '../../../lib/saveFeedback';
import { CONFIRM, ERRORS } from '../../../lib/uiCopy';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline';
import { aplicarEscolhasDaSerie, marcarEscolhaManual } from '../../editorial/lib/escolhasSerie';
import { datasNaGrade } from '../../editorial/lib/datasNaGrade';
import { FUNCAO_LABELS, FUNCOES } from '../../editorial/lib/funcoes';
import { seriesParaFiltro } from '../../settings/lib/serieAgrupamento';
import {
  aplicarFiltroData,
  lerFiltroData,
  opcoesDoFiltroData,
  valorDoFiltroData,
} from '../lib/creationDateFilter';
import {
  archiveCreation,
  CREATION_PAGE_SIZE,
  comModoDaEscolha,
  createIdeaContent,
  createScriptWithPublications,
  CREATION_TABS,
  filterCreationContents,
  getCreationTabCounts,
  paginateCreationContents,
  promoteContentToScript,
  removeDeletedCreations,
  restoreCreation,
  restoreDeletedCreation,
  sortCreationContents,
  transitionCreationStatus,
  type CreationSort,
  type CreationTab,
  type CreationViewMode,
} from '../../contents/lib/creationContent';
import { pilarEscolhidoDaBiblioteca } from '../../library/lib/pilarDeItemDaBiblioteca';
import { CreationComposer, type CreationIdeaInput } from '../components/CreationComposer';
import { CreationDisplayMenu } from '../components/CreationDisplayMenu';
import { CreationGridView } from '../components/CreationGridView';
import { CreationKanbanView } from '../components/CreationKanbanView';
import { CreationListView } from '../components/CreationListView';
import { CreationOverflowMenu } from '../components/CreationOverflowMenu';
import { CreationRedeQuickFilter } from '../components/CreationRedeQuickFilter';
import { CreationSelectionBar } from '../components/CreationSelectionBar';
import { CreationStorageLinks, type CreationStorageTab } from '../components/CreationStorageLinks';
import { ScriptComposer } from '../components/ScriptComposer';
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
import { usePostItsNaData } from '../../planejamento/hooks/usePostItsNaData';
import type { CreationItemActionHandlers } from '../lib/creationItemActions';
import {
  REDE_FILTER_PARAM,
  mapaDeRedesDaCriacao,
  parseRedesFilter,
  redesDoFiltroRapido,
  serializeRedesFilter,
  type RedeDoFiltro,
} from '../lib/creationRedeFilter';
import {
  etiquetasVisiveis,
  isCreationKanbanTab,
  isIdeaContent,
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

// Arquivados e Lixeira não são etapas: saem das abas e abrem uma tela à parte.
const ETAPA_TABS = CREATION_TABS.filter(tab => tab !== 'Arquivados' && tab !== 'Lixeira');

// Etapas da troca em massa. Publicado não entra: só o formulário registra a publicação.
const BULK_STATUS_OPTIONS = [
  CONTENT_STATUS.IDEIA,
  CONTENT_STATUS.ROTEIRO,
  CONTENT_STATUS.PRODUCAO,
  CONTENT_STATUS.EDICAO,
].map(status => ({value: status, label: status}));

function isCreationStorageTab(tab: CreationTab): tab is CreationStorageTab {
  return tab === 'Arquivados' || tab === 'Lixeira';
}

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
  const postItsNaData = usePostItsNaData();
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
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusValue, setStatusValue] = useState('');
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Content | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<{content: Content; tab: CreationKanbanTab} | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [persistingIds, setPersistingIds] = useState<Set<string>>(new Set());
  const contentsRef = useRef(state.contents);
  contentsRef.current = state.contents;
  const filaDeMovimento = useRef(Promise.resolve());
  const epocaDoMovimento = useRef(new Map<string, number>());
  const [scriptComposerOpen, setScriptComposerOpen] = useState(false);
  const isMobile = useIsMobile();
  const resultsRef = useRef<HTMLDivElement>(null);

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
  const redeParam = searchParams.get(REDE_FILTER_PARAM);
  const redesFilter = useMemo(() => parseRedesFilter(redeParam), [redeParam]);
  const temFiltroRede = redesFilter.length > 0;
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

  // O setSearchParams não enfileira: "Limpar filtros" troca vários de uma vez no mesmo clique.
  const paramsRef = useRef(searchParams);
  paramsRef.current = searchParams;
  const mutateSearchParams = useCallback((updater: (previous: URLSearchParams) => URLSearchParams) => {
    const next = updater(paramsRef.current);
    paramsRef.current = next;
    setSearchParams(next, { replace: true });
  }, [setSearchParams]);

  const updateSearchParam = useCallback((
    key: string,
    value: string,
    defaultValue = '',
    resetPage = true,
  ) => {
    mutateSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (!value || value === defaultValue) next.delete(key);
      else next.set(key, value);
      if (key === 'tab') next.delete('tipo');
      if (resetPage && key !== 'page') next.delete('page');
      return next;
    });
  }, [mutateSearchParams]);

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
    postIts: postItsNaData,
    redeReferenciaId: state.editorial.preferencias.redeReferenciaId,
    platforms: state.platforms,
  }), [state.contents, state.series, postItsNaData, state.preferences, state.platforms]);

  // As redes anotadas nos post-its só são carregadas quando o filtro de rede é usado.
  useEffect(() => {
    if (temFiltroRede) void ensureDataDomains(['planejamento']);
  }, [ensureDataDomains, temFiltroRede]);

  // Rede de cada item pelas contas das publicações; sem publicação, pelas redes do post-it ligado.
  const redesPorConteudo = useMemo(
    () => (temFiltroRede ? mapaDeRedesDaCriacao(canonicalContents, state.platforms, state.postIts ?? []) : undefined),
    [canonicalContents, temFiltroRede, state.platforms, state.postIts],
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
        redes: redesFilter,
        redesPorConteudo,
        series: state.series,
        temas: state.temas,
      }),
      sort,
    ),
    [activeTab, canonicalContents, datas, filtroData, funcaoId, originId, pilarId, redesFilter, redesPorConteudo, search, seriesId, sort, state.series, state.temas, temaFilter],
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
        redes: redesFilter,
        redesPorConteudo,
        series: state.series,
        temas: state.temas,
      }),
      sort,
    );
  }, [activeTab, canonicalContents, datas, filteredContents, filtroData, funcaoId, originId, pilarId, redesFilter, redesPorConteudo, search, seriesId, sort, state.series, state.temas, temaFilter, viewMode]);

  const pageData = useMemo(
    () => paginateCreationContents(filteredContents, requestedPage, CREATION_PAGE_SIZE),
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
      setStatusDialogOpen(false);
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
        message: 'Não foi possível exportar os itens selecionados. Tente novamente.',
        detail: getErrorDetail(error),
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
  // "Selecionar todos" pega o filtro inteiro, inclusive os itens de outras páginas.
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
          throw new UserFacingError('Nem todos os itens selecionados puderam ser carregados.');
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
          detail: getErrorDetail(error),
        });
      }
    })();
  }, [assignField, assignValue, selectedContents, state.series, updateContent, user?.id]);

  const selectedPublishedCount = useMemo(
    () => selectedContents.filter(content =>
      Boolean(content.postedAt) || normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO
    ).length,
    [selectedContents],
  );

  const openBulkStatus = useCallback(() => {
    if (selectedExportIds.size === 0) return;
    setStatusValue('');
    setStatusDialogOpen(true);
  }, [selectedExportIds.size]);

  // Mesma regra da troca um por um. Publicado fica de fora: a publicação se registra em cada conteúdo.
  const applyBulkStatus = useCallback(() => {
    if (!statusValue || selectedContents.length === 0) return;

    const status = statusValue;
    const selected = selectedContents;
    setStatusDialogOpen(false);
    setStatusValue('');
    setSelectedExportIds(new Set());
    setExportMode(false);
    notifySaveFeedback({ status: 'saving', message: 'Salvando alterações…' });

    void (async () => {
      try {
        // A lista é leve; entrar ou sair de Ideia mexe nos textos, então a troca parte do conteúdo completo.
        const ids = selected.map(content => content.id);
        const fetched = user?.id ? await fetchContentsByIds(user.id, ids) : selected;
        if (user?.id && fetched.length !== ids.length) {
          throw new UserFacingError('Nem todos os itens selecionados puderam ser carregados.');
        }

        const now = new Date().toISOString();
        const movedIds = new Set<string>();
        for (const content of fetched) {
          const next = transitionCreationStatus(content, status, now);
          if (
            next.status === content.status
            && (next.postedAt ?? null) === (content.postedAt ?? null)
            && !content.archivedAt
          ) continue;
          await updateContent(next, { silent: true });
          movedIds.add(content.id);
        }
        // Trocar de etapa tira do arquivo, como no "Mover para…".
        setArchivedContents(previous => previous.filter(item => !movedIds.has(item.id)));

        notifySaveFeedback({ status: 'success', message: 'Etapa atualizada na seleção' });
      } catch (error) {
        notifySaveFeedback({
          status: 'error',
          message: ERRORS.aplicarAlteracoesMassa,
          detail: getErrorDetail(error),
        });
      }
    })();
  }, [selectedContents, statusValue, updateContent, user?.id]);

  const moveToTrash = useCallback((contents: Content[], exitSelection: boolean) => {
    if (contents.length === 0) return;
    const copy = getCreationExportCopy(contents);
    const ids = contents.map(content => content.id);
    const removedAt = new Date().toISOString();
    const removed = contents.map(content => ({
      ...content,
      deletedAt: removedAt,
      updatedAt: removedAt,
    }));
    const final = copy.feminine ? 'a' : 'o';
    const noun = ids.length === 1
      ? `${copy.singular[0].toUpperCase()}${copy.singular.slice(1)} movid${final} para a lixeira`
      : `${ids.length} ${copy.plural} movid${final}s para a lixeira`;
    // Arquivados vivem numa lista à parte; sem tirar de lá, a cópia arquivada encobriria a da lixeira.
    const archivedRemoved = archivedContents.filter(item => ids.includes(item.id));

    setDeletedContents(previous => [
      ...removed,
      ...previous.filter(item => !ids.includes(item.id)),
    ]);
    setArchivedContents(previous => previous.filter(item => !ids.includes(item.id)));
    setBulkDeleteOpen(false);
    setDeleteTarget(null);
    if (exitSelection) {
      setSelectedExportIds(new Set());
      setExportMode(false);
    }
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
          detail: getErrorDetail(error),
        });
      });
  }, [archivedContents, dispatch]);

  // Novo roteiro passa antes pela escolha das redes; cada rede marcada já leva a legenda para a Gestão.
  const createScript = useCallback((plataformas: ContentPlataforma[]) => {
    setScriptComposerOpen(false);
    const content = createScriptWithPublications(plataformas, { title: 'Novo roteiro' });
    void dispatch({ type: 'ADD_CONTENT', payload: content });
    navigate(
      `${buildContentDetailRoute(content.id)}&focus=script`,
      buildDetailBackState('/criacao?tab=roteiros'),
    );
  }, [dispatch, navigate]);

  // Link de outra tela (?compose=script) abre a escolha e sai da URL: voltar do roteiro não reabre o modal.
  useEffect(() => {
    if (searchParams.get('compose') !== 'script') return;
    setScriptComposerOpen(true);
    mutateSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('compose');
      return next;
    });
  }, [mutateSearchParams, searchParams]);

  const openIdeaComposer = useCallback(() => {
    updateSearchParam('compose', 'idea', '', false);
  }, [updateSearchParam]);

  const closeIdeaComposer = useCallback(() => {
    mutateSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('compose');
      next.delete('itemId');
      return next;
    });
  }, [mutateSearchParams]);

  const saveIdea = useCallback(async (input: CreationIdeaInput) => {
    const {abrirDetalhe, plataformas, ...campos} = input;
    const serie = campos.seriesId
      ? state.series.find(item => item.id === campos.seriesId) ?? {id: campos.seriesId}
      : null;
    const pilarDaObra = !campos.pilarId && campos.bibliotecaItemId
      ? pilarEscolhidoDaBiblioteca(state.pilares)
      : null;
    let content = createIdeaContent({
      ...campos,
      pilarId: pilarDaObra?.pilarId ?? campos.pilarId,
      pilarOrigem: pilarDaObra || campos.pilarId ? 'escolhida' : null,
      plataformas: [],
    });
    if (serie) content = aplicarEscolhasDaSerie(content, serie);
    content = comModoDaEscolha({
      ...content,
      plataformas: plataformas.map(plataforma => ({...plataforma, contentId: content.id})),
    });
    // Só as plataformas: abre a ideia para preencher título e texto lá.
    if (abrirDetalhe) {
      void dispatch({ type: 'ADD_CONTENT', payload: content });
      navigate(buildContentDetailRoute(content.id), buildDetailBackState('/criacao?tab=ideias'));
      return;
    }
    // Fecha o modal e vai para Ideias antes do await, como o roteiro faz: o
    // `previous` é a URL do render em que o modal abriu, então navegar depois
    // do await trazia o compose=idea de volta e reabria o modal.
    mutateSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('compose');
      next.delete('itemId');
      next.delete('tipo');
      next.delete('page');
      next.set('tab', 'ideias');
      return next;
    });
    await dispatch({ type: 'ADD_CONTENT', payload: content });
  }, [dispatch, mutateSearchParams, navigate, state.pilares, state.series]);

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
        message: 'Não foi possível restaurar o roteiro. Tente novamente.',
        detail: getErrorDetail(error),
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
        message: 'Não foi possível excluir o roteiro. Tente novamente.',
        detail: getErrorDetail(error),
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
        message: 'Não foi possível limpar a lixeira. Tente novamente.',
        detail: getErrorDetail(error),
      });
    } finally {
      setIsClearingTrash(false);
    }
  }, [deletedContents.length, user?.id]);

  // A lista é leve (sem roteiro, rascunho nem texto da ideia). Entrar ou sair de Ideias mexe nesses
  // textos, então a troca parte do conteúdo completo; nas outras basta a etapa.
  const withBodyForIdeaMove = useCallback(async (
    content: Content,
    tab: CreationKanbanTab,
    next: Content,
  ): Promise<Content> => {
    const touchesIdea = tab === 'Ideias' || isIdeaContent(content);
    if (!touchesIdea || content.script !== undefined || !user?.id) return next;
    const [full] = await fetchContentsByIds(user.id, [content.id]);
    return full ? moveCreationToKanbanTab(full, tab) : next;
  }, [user?.id]);

  const gravarMovimento = useCallback(async (content: Content, tab: CreationKanbanTab) => {
    const atual = contentsRef.current.find(item => item.id === content.id) ?? content;
    const next = moveCreationToKanbanTab(atual, tab);
    if (atual.status === next.status && (atual.postedAt ?? null) === (next.postedAt ?? null)) return;
    const epoca = (epocaDoMovimento.current.get(atual.id) ?? 0) + 1;
    epocaDoMovimento.current.set(atual.id, epoca);
    setPersistingIds(current => new Set(current).add(atual.id));
    try {
      await updateContent(await withBodyForIdeaMove(atual, tab, next));
    } catch (error) {
      if (epocaDoMovimento.current.get(atual.id) === epoca) {
        try {
          await updateContent(atual, { silent: true });
        } catch {
          // O refresh do contexto restaura o que o banco confirmou.
        }
      }
      notifySaveFeedback({
        status: 'error',
        message: 'Não foi possível mudar a etapa. Tente novamente.',
        detail: getErrorDetail(error),
      });
    } finally {
      setPersistingIds(current => {
        const nextSet = new Set(current);
        nextSet.delete(atual.id);
        return nextSet;
      });
    }
  }, [updateContent, withBodyForIdeaMove]);

  const enfileirarMovimento = useCallback((content: Content, tab: CreationKanbanTab) => {
    const pedido = filaDeMovimento.current.then(
      () => gravarMovimento(content, tab),
      () => gravarMovimento(content, tab),
    );
    filaDeMovimento.current = pedido.then(() => undefined, () => undefined);
  }, [gravarMovimento]);

  const handleMoveToTab = useCallback(async (content: Content, tab: CreationKanbanTab) => {
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
    if (content.status === next.status && (content.postedAt ?? null) === (next.postedAt ?? null)) return;

    const saindoDePublicado = Boolean(content.postedAt)
      || content.status === 'Publicado'
      || content.status === 'Postado';
    if (saindoDePublicado) {
      setUnpublishTarget({content, tab});
      return;
    }

    enfileirarMovimento(content, tab);
  }, [enfileirarMovimento, location, navigate]);

  const confirmUnpublishMove = useCallback(async () => {
    const alvo = unpublishTarget;
    if (!alvo) return;
    setUnpublishTarget(null);
    enfileirarMovimento(alvo.content, alvo.tab);
  }, [enfileirarMovimento, unpublishTarget]);

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
    onDelete: content => setDeleteTarget(content),
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

  // No kanban, as colunas já são as etapas: as abas de etapa saem da fileira.
  const tabOptions = (viewMode === 'kanban'
    ? ETAPA_TABS.filter(tab => !isCreationKanbanTab(tab))
    : ETAPA_TABS
  ).map(tab => ({
    id: tab,
    label: tab,
    count: tabCounts[tab],
    muted: tabCounts[tab] === 0,
  }));
  // No kanban sobra só "Todos": sem escolha, a fileira de abas some.
  const showStageTabs = tabOptions.length > 1;
  const isStorageTab = isCreationStorageTab(activeTab);
  const openStorage = useCallback((tab: CreationStorageTab) => {
    updateSearchParam('tab', TAB_QUERY[tab], 'roteiros');
  }, [updateSearchParam]);
  const leaveStorage = useCallback(() => {
    updateSearchParam('tab', '', 'roteiros');
  }, [updateSearchParam]);
  const storageCounts = { Arquivados: tabCounts.Arquivados, Lixeira: tabCounts.Lixeira };
  const storageSubtitle = isStorageTab
    ? `${tabCounts[activeTab]} ${tabCounts[activeTab] === 1 ? 'item' : 'itens'}. Ficam fora das etapas, da grade e das metas. ${
      activeTab === 'Lixeira' ? 'Restaure ou exclua de vez.' : 'Restaure quando quiser trazer de volta.'
    }`
    : '';

  useEffect(() => {
    if (viewMode === 'kanban' && isCreationKanbanTab(activeTab)) {
      updateSearchParam('tab', TAB_QUERY.Todos, '');
    }
  }, [activeTab, updateSearchParam, viewMode]);

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
        onClick={() => setScriptComposerOpen(true)}
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

  // Sem abas (kanban), Arquivados e Lixeira vão para a barra da busca em vez de ocupar uma linha sozinhos.
  const desktopTabs = isStorageTab || !showStageTabs ? null : (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <SegmentTabs
          className="creation-hub-tabs"
          options={tabOptions}
          value={activeTab}
          onChange={tab => updateSearchParam('tab', TAB_QUERY[tab], 'roteiros')}
        />
      </div>
      <CreationStorageLinks counts={storageCounts} onOpen={openStorage} />
    </div>
  );

  const mobileTabs = isStorageTab || !showStageTabs ? null : (
    <MobileSegmentTabs
      rounded="tight"
      tabs={tabOptions.map(tab => ({
        value: tab.id,
        label: tab.label,
        count: tab.count,
      }))}
      value={activeTab}
      onChange={tab => updateSearchParam('tab', TAB_QUERY[tab], 'roteiros')}
    />
  );

  // URL antiga: ?tema=id e ?tags=nome viram ?temas=. Tags só se resolvem com os temas carregados.
  useEffect(() => {
    if (searchParams.has(LEGACY_TAGS_PARAM) && state.temas.length === 0) return;
    const next = migrateLegacyTemaParams(searchParams, state.temas);
    if (next) {
      paramsRef.current = next;
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, state.temas]);

  const temaOptions = useMemo(
    () => dedupeTemasPorNome([...state.temas]
      .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR')))
      .map(tema => ({ value: tema.id, label: tema.nome })),
    [state.temas],
  );
  const setTemaFilter = useCallback((ids: string[]) => {
    mutateSearchParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('tema');
      next.delete(LEGACY_TAGS_PARAM);
      const value = serializeTemaFilterParam(ids);
      if (value) next.set(TEMA_FILTER_PARAM, value);
      else next.delete(TEMA_FILTER_PARAM);
      next.delete('page');
      return next;
    });
  }, [mutateSearchParams]);
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

  const redesRapidas = useMemo(
    () => redesDoFiltroRapido(state.platforms, redesFilter),
    [redesFilter, state.platforms],
  );
  const setRedesFilter = useCallback((redes: RedeDoFiltro[]) => {
    updateSearchParam(REDE_FILTER_PARAM, serializeRedesFilter(redes));
  }, [updateSearchParam]);
  // Com uma rede só, filtrar por ela não separa nada.
  const redeQuickFilter = redesRapidas.length > 1 ? (
    <CreationRedeQuickFilter
      redes={redesRapidas}
      value={redesFilter}
      onChange={setRedesFilter}
    />
  ) : null;

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
        ...seriesParaFiltro(state.series, seriesId).map(series => ({ label: series.name, value: series.id })),
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
    {
      id: 'funcao',
      label: 'Objetivo',
      value: funcaoId,
      onChange: (value: string) => updateSearchParam('funcao', value),
      options: [
        { label: 'Todos os objetivos', value: '' },
        ...FUNCOES.map(funcao => ({ label: FUNCAO_LABELS[funcao], value: funcao })),
      ],
    },
    {
      id: 'data',
      label: 'Data',
      value: valorFiltroData,
      onChange: (value: string) => mutateSearchParams(previous => aplicarFiltroData(previous, value)),
      options: opcoesDoFiltroData(new Date(), filtroData),
    },
  ], [
    filtroData,
    funcaoId,
    mutateSearchParams,
    valorFiltroData,
    originId,
    pilarId,
    seriesId,
    state.bibliotecaItems,
    state.temas,
    state.pilares,
    state.series,
    updateSearchParam,
  ]);

  const clearMobileFilters = useCallback(() => {
    mutateSearchParams(previous => {
      const next = new URLSearchParams(previous);
      CREATION_FILTER_QUERY_KEYS.forEach(key => next.delete(key));
      return next;
    });
    setMobileFiltersOpen(false);
  }, [mutateSearchParams]);

  const selectionMenu = activeTab === 'Lixeira' ? null : (
    <CreationOverflowMenu
      exportLabel={`Exportar ${exportCopy.plural}`}
      exportEnabled={exportableContents.length > 0}
      exportMode={exportMode}
      onToggleExport={toggleExportMode}
      cancelLabel="Cancelar seleção"
      extraItems={[
        { id: 'bulk-status', label: 'Mudar etapa em massa', onClick: beginSelection },
        { id: 'bulk-series', label: 'Mudar série em massa', onClick: beginSelection },
        { id: 'bulk-pillar', label: 'Mudar pilar em massa', onClick: beginSelection },
        { id: 'bulk-delete', label: 'Mover para a lixeira', tone: 'danger', onClick: beginSelection },
      ]}
    />
  );

  const activeTemaChips = useMemo(
    () => temaFilter.map(temaId => {
      const label = state.temas.find(tema => tema.id === temaId)?.nome ?? temaId;
      return {
        id: `tema-${temaId}`,
        label: `Tema: ${label}`,
        onRemove: () => setTemaFilter(temaFilter.filter(id => id !== temaId)),
      };
    }),
    [setTemaFilter, state.temas, temaFilter],
  );

  const filters = (
    <FilterBar
      className="min-w-0 flex-1"
      panelMode="dropdown"
      fluidSearch
      searchValue={search}
      onSearchChange={value => updateSearchParam('q', value)}
      searchPlaceholder="Buscar por título, nota ou tema…"
      leading={redeQuickFilter}
      filters={filterDefinitions}
      panelExtra={temaFilterField}
      extraActiveCount={temaFilter.length > 0 ? 1 : 0}
      extraActiveChips={activeTemaChips}
      onClearExtra={() => {
        if (temaFilter.length > 0) setTemaFilter([]);
        if (temFiltroRede) setRedesFilter([]);
      }}
    />
  );

  const toolbarView = (
    <div className="inline-stack-sm shrink-0">
      {isStorageTab || showStageTabs ? null : (
        <CreationStorageLinks compact counts={storageCounts} onOpen={openStorage} />
      )}
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
  );

  const mobileFilters = (
    <div className="stack-sm">
      <MobileSearchBar
        value={search}
        onChange={value => updateSearchParam('q', value)}
        placeholder="Buscar por título, nota ou tema"
        onFilterClick={() => setMobileFiltersOpen(true)}
        rounded="tight"
        trailing={selectionMenu ?? undefined}
      />
      {redeQuickFilter || !isStorageTab ? (
        <div className="flex items-center justify-between gap-2">
          {redeQuickFilter ?? <span aria-hidden />}
          {isStorageTab ? null : <CreationStorageLinks compact counts={storageCounts} onOpen={openStorage} />}
        </div>
      ) : null}
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
          <SelectField
            ariaLabel={filter.label}
            value={filter.value}
            onChange={filter.onChange}
            options={filter.options.map(option => ({value: option.value, label: option.label}))}
            block
          />
        </label>
      ))}

      <div className="block">{temaFilterField}</div>

      <label className="block stack-sm">
        <Text variant="label" as="span">Ordenar</Text>
        <SelectField
          ariaLabel="Ordenar"
          value={sort}
          onChange={value => updateSearchParam('sort', value, 'recent')}
          options={CREATION_SORT_OPTIONS.map(option => ({value: option.value, label: option.label}))}
          block
        />
      </label>

      <label className="block stack-sm">
        <Text variant="label" as="span">Visualização</Text>
        <SelectField
          ariaLabel="Visualização"
          value={requestedView}
          onChange={value => setViewMode(value as CreationViewMode)}
          options={CREATION_VIEW_MODE_VALUES.map(value => ({value, label: CREATION_VIEW_MODE_LABELS[value]}))}
          block
        />
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
      onChangeStatus={openBulkStatus}
      onChangeSeries={() => openBulkAssign('seriesId')}
      onChangePillar={() => openBulkAssign('pilarId')}
      onExport={() => void handleExportCreations()}
      onDelete={() => setBulkDeleteOpen(true)}
      onCancel={toggleExportMode}
    />
  ) : null;

  const hasFilters = Boolean(search || pilarId || seriesId || temFiltroRede || temaFilter.length > 0 || originId || funcaoId || filtroData);

  return (
    <>
      <PageLayout
        contentWidth="wide"
        contentStack="dense"
        header={isStorageTab ? (
          <DesktopPageHeader
            section="Produção"
            backLabel="Criação"
            onBack={leaveStorage}
            title={activeTab}
            subtitle={storageSubtitle}
            actions={activeTab === 'Lixeira' ? trashActions : undefined}
          />
        ) : (
          <DesktopPageHeader
            section="Produção"
            title="Criação"
            actions={(
              <CreateMenuButton
                onCreateIdea={openIdeaComposer}
                onCreateScript={() => setScriptComposerOpen(true)}
              />
            )}
          />
        )}
        navigation={desktopTabs}
        toolbar={(
          <PageToolbar
            className="creation-hub-toolbar"
            filters={filters}
            view={toolbarView}
          />
        )}
        mobileHeader={isStorageTab ? (
          <div className="stack-sm">
            <button
              type="button"
              onClick={leaveStorage}
              className="inline-flex min-h-11 items-center gap-1 self-start text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
              <Text variant="secondary" as="span">Criação</Text>
            </button>
            <Text variant="sectionTitle" as="h2">{activeTab}</Text>
            <Text variant="secondary">{storageSubtitle}</Text>
            {activeTab === 'Lixeira' ? trashActions : null}
          </div>
        ) : mobileTabs}
        mobileToolbar={mobileFilters}
        footer={exportMode || viewMode !== 'kanban' ? (
          <div className="creation-hub-footer stack-sm">
            {exportSelectionToolbar}
            {viewMode !== 'kanban' ? (
              <PaginationBar
                currentPage={pageData.page}
                totalPages={pageData.totalPages}
                totalItems={pageData.totalItems}
                pageSize={pageData.pageSize}
                variant={isMobile ? 'simple' : 'full'}
                alwaysVisible
                className="rounded-none border-0 bg-transparent p-0"
                onPageChange={page => {
                  updateSearchParam('page', String(page), '1', false);
                  requestAnimationFrame(() => {
                    const results = resultsRef.current;
                    if (!results) return;
                    if (!isMobile) {
                      const controls = document.querySelector('.desktop-header-sticky');
                      results.style.scrollMarginTop = `calc(${controls?.getBoundingClientRect().height ?? 0}px + var(--space-lg))`;
                    }
                    results.scrollIntoView({ block: 'start' });
                  });
                }}
              />
            ) : null}
          </div>
        ) : undefined}
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
                ? 'Roteiros movidos para a lixeira ficam aqui até você restaurar ou excluir.'
                : activeTab === 'Arquivados'
                  ? 'Itens arquivados ficam aqui até você restaurar.'
                  : isMobile
                  ? 'Use o botão + da barra inferior para criar uma ideia ou um roteiro.'
                  : 'Crie uma ideia ou um roteiro para começar a preencher esta etapa.'
          }
          emptyAction={
            !isMobile && !hasFilters && !isStorageTab ? (
              <div className="flex flex-wrap justify-center gap-2">{creationActions}</div>
            ) : undefined
          }
        >
          <div ref={resultsRef} className={isMobile ? 'stack-md scroll-mt-24' : 'stack-lg scroll-mt-4'} aria-live="polite">
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

      <ScriptComposer
        open={scriptComposerOpen}
        onClose={() => setScriptComposerOpen(false)}
        onCreate={createScript}
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
          <TagSelect
            label={assignField === 'seriesId' ? 'Série' : 'Pilar'}
            hideLabel
            maxSelections={1}
            placeholder="Escolha"
            values={assignValue ? [assignValue] : []}
            onChange={values => setAssignValue(values[0] ?? '')}
            options={[
              {value: '__none__', label: assignField === 'seriesId' ? 'Sem série' : 'Sem pilar'},
              ...(assignField === 'seriesId'
                ? seriesParaFiltro(state.series).map(series => ({value: series.id, label: series.name}))
                : [...state.pilares]
                  .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'))
                  .map(pilar => ({value: pilar.id, label: pilar.nome}))),
            ]}
          />
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

      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        desktopMaxW="max-w-md"
        ariaLabel="Mudar etapa"
      >
        <div className="stack-md p-4">
          <Text variant="sectionTitle">Mudar etapa</Text>
          <Text variant="secondary">
            A mudança vale para a seleção atual. Publicado fica de fora: a publicação é registrada em cada conteúdo.
          </Text>
          <TagSelect
            label="Etapa"
            hideLabel
            maxSelections={1}
            placeholder="Escolha"
            values={statusValue ? [statusValue] : []}
            onChange={values => setStatusValue(values[0] ?? '')}
            options={BULK_STATUS_OPTIONS}
          />
          {statusValue === CONTENT_STATUS.IDEIA ? (
            <Text variant="secondary">
              O texto do roteiro e o rascunho entram no texto da ideia, cada um com seu marcador.
            </Text>
          ) : null}
          {selectedPublishedCount > 0 ? (
            <Text variant="secondary">
              {selectedPublishedCount === 1
                ? 'Um item já publicado sai de Publicados e perde a data de publicação.'
                : `${selectedPublishedCount} itens já publicados saem de Publicados e perdem a data de publicação.`}
            </Text>
          ) : null}
          <div className="flex justify-end gap-2">
            <AppButton
              variant="secondary"
              size="sm"
              onClick={() => setStatusDialogOpen(false)}
            >
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              disabled={!statusValue}
              onClick={() => void applyBulkStatus()}
            >
              Aplicar
            </AppButton>
          </div>
        </div>
      </Dialog>

      <ConfirmModal
        open={unpublishTarget !== null}
        message="Desfazer publicação? A data de publicação registrada neste conteúdo será apagada."
        confirmLabel="Desfazer publicação"
        cancelLabel="Manter publicada"
        onConfirm={() => void confirmUnpublishMove()}
        onCancel={() => setUnpublishTarget(null)}
      />

      <ConfirmModal
        open={deleteTarget !== null}
        message={deleteTarget ? CONFIRM.excluirCriacoes(1, getCreationExportCopy([deleteTarget])).message : ''}
        confirmLabel="Mover para a lixeira"
        cancelLabel="Cancelar"
        onConfirm={() => { if (deleteTarget) moveToTrash([deleteTarget], false); }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={bulkDeleteOpen}
        message={CONFIRM.excluirCriacoes(Math.max(selectedExportIds.size, 1), selectedCopy).message}
        confirmLabel={CONFIRM.excluirCriacoes(Math.max(selectedExportIds.size, 1), selectedCopy).confirmLabel}
        cancelLabel="Manter seleção"
        confirmDisabled={selectedExportIds.size === 0}
        onConfirm={() => moveToTrash(selectedContents, true)}
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
