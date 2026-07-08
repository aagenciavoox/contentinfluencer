import { useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { Content, Serie } from '../../../lib/database';
import { broadcastDataSync } from '../../../lib/syncBroadcast';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { SeriesDetailMobileScreen } from '../../../mobile/screens/settings/SeriesDetailMobileScreen';
import { SeriesDetailHeader } from '../components/series-detail/SeriesDetailHeader';
import { SeriesStatsRow } from '../components/series-detail/SeriesStatsRow';
import { SeriesContentsToolbar } from '../components/series-detail/SeriesContentsToolbar';
import { SeriesContentsTabs } from '../components/series-detail/SeriesContentsTabs';
import { SeriesContentsFilterBar } from '../components/series-detail/SeriesContentsFilterBar';
import { SeriesContentList } from '../components/series-detail/SeriesContentList';
import { SeriesCreateContentPanel } from '../components/series-detail/SeriesCreateContentPanel';
import { SeriesContentPreviewModal } from '../components/series-detail/SeriesContentPreviewModal';
import {
  computeSeriesContentStats,
  getInboxIdeasForSeriesScripts,
  type SeriesContentTab,
} from '../lib/computeSeriesContentStats';
import { filterAndSortSeriesListItems, type SeriesListItem } from '../lib/seriesContentListUtils';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline';

function contentTypeLabel(status: string) {
  return status === CONTENT_STATUS.IDEIA ? 'ideia' : 'roteiro';
}

export function SeriesScriptsPage() {
  const { serieId } = useParams<{ serieId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<SeriesContentTab>('roteiros');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [sortBy, setSortBy] = useState('updatedAt:desc');
  const [panelMode, setPanelMode] = useState<'roteiro' | 'ideia'>('roteiro');
  const [previewItem, setPreviewItem] = useState<SeriesListItem | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showToolbarMenu, setShowToolbarMenu] = useState(false);

  const serie = state.series.find(item => item.id === serieId) ?? null;
  const platformNames = state.platforms.filter(platform => platform.ativo).map(platform => platform.nome);

  const linkedContents = useMemo(
    () =>
      state.contents
        .filter(content => content.seriesId === serieId && !content.deletedAt)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [serieId, state.contents],
  );

  const inboxIdeas = useMemo(
    () => getInboxIdeasForSeriesScripts(state.ideas),
    [state.ideas],
  );

  const stats = useMemo(
    () => computeSeriesContentStats(linkedContents, inboxIdeas),
    [linkedContents, inboxIdeas],
  );

  const tabCounts = useMemo(
    () => ({
      roteiros: stats.roteiros,
      ideias: stats.ideias,
      total: stats.total + stats.inboxIdeas,
    }),
    [stats],
  );

  const listTotalCount = useMemo(() => {
    if (activeTab === 'roteiros') return stats.roteiros;
    if (activeTab === 'ideias') return stats.ideias;
    return stats.total + stats.inboxIdeas;
  }, [activeTab, stats]);

  const filteredItems = useMemo(
    () =>
      filterAndSortSeriesListItems(linkedContents, inboxIdeas, {
        tab: activeTab,
        search: searchTerm,
        status: filterStatus,
        sort: sortBy,
      }),
    [activeTab, filterStatus, linkedContents, inboxIdeas, searchTerm, sortBy],
  );

  const handleCreateBulkContents = async (contents: Content[]) => {
    if (contents.length === 0) return;

    const firstType = contentTypeLabel(contents[0].status);
    const plural = contents.length > 1 ? `${firstType}s` : firstType;
    notifySaveFeedback({
      status: 'saving',
      message: contents.length > 1 ? `Criando ${contents.length} ${plural}...` : `Criando ${firstType}...`,
    });

    for (const content of contents) {
      await dispatch(
        { type: 'ADD_CONTENT', payload: content },
        { silent: true, skipBroadcast: true },
      );
    }

    broadcastDataSync();
    notifySaveFeedback({
      status: 'success',
      message:
        contents.length > 1
          ? `${contents.length} ${plural} criados`
          : `${firstType.charAt(0).toUpperCase()}${firstType.slice(1)} criado`,
    });
  };

  const handleSaveSerie = (updatedSerie: Serie) => {
    const payload = { ...updatedSerie, userId: updatedSerie.userId || user?.id || '' };
    dispatch({ type: 'UPDATE_SERIE', payload });
  };

  const handleToggleActive = (targetSerie: Serie) => {
    dispatch({
      type: 'UPDATE_SERIE',
      payload: { ...targetSerie, ativa: !targetSerie.ativa, updatedAt: new Date().toISOString() },
    });
  };

  if (!serie) {
    if (isMobile) {
      return (
        <div className="min-h-full bg-[var(--bg-primary)] py-10 text-center">
          <Layers className="mx-auto mb-3 h-8 w-8 opacity-10" />
          <Text variant="body" className="text-[var(--text-tertiary)]">
            {state.isLoaded ? 'Série não encontrada.' : 'Carregando série...'}
          </Text>
          {state.isLoaded ? (
            <AppButton variant="secondary" className="mt-4" onClick={() => navigate('/configuracoes/series')}>
              Voltar para séries
            </AppButton>
          ) : null}
        </div>
      );
    }

    return (
      <SettingsPageScaffold
        title="Roteiros da série"
        icon={Layers}
        backTo="/configuracoes/series"
        backLabel="Séries"
      >
        <div className="py-12 text-center">
          <Layers className="mx-auto mb-3 h-8 w-8 opacity-10" />
          <p className="text-sm font-medium opacity-50">
            {state.isLoaded ? 'Série não encontrada.' : 'Carregando série...'}
          </p>
          {state.isLoaded ? (
            <AppButton
              variant="secondary"
              className="mt-4"
              onClick={() => navigate('/configuracoes/series')}
            >
              Voltar para séries
            </AppButton>
          ) : null}
        </div>
      </SettingsPageScaffold>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <SeriesDetailMobileScreen
          serie={serie}
          pilares={state.pilares}
          platformNames={platformNames}
          linkedContents={linkedContents}
          linkedInboxIdeas={inboxIdeas}
          contents={state.contents}
          onSaveSerie={handleSaveSerie}
          onToggleActive={handleToggleActive}
          onCreateBulkContents={handleCreateBulkContents}
        />
      </div>
    );
  }

  return (
    <PageLayout variant="settings">
      <div className="stack-xl">
        <SeriesDetailHeader
          serie={serie}
          pilares={state.pilares}
          contentCount={linkedContents.length}
          showMoreMenu={showHeaderMenu}
          onToggleMore={() => setShowHeaderMenu(current => !current)}
          onEdit={() => navigate(`/configuracoes/series/${serie.id}/editar`)}
          onMenuAction={action => {
            if (action === 'toggle-active') handleToggleActive(serie);
          }}
        />

        <SeriesStatsRow stats={stats} />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] xl:gap-8">
          <div className="min-w-0 stack-xl">
            <SeriesContentsToolbar
              showMoreMenu={showToolbarMenu}
              onToggleMore={() => setShowToolbarMenu(current => !current)}
              onNewRoteiro={() => setPanelMode('roteiro')}
              onNewIdeia={() => setPanelMode('ideia')}
              onMenuAction={action => {
                if (action === 'bulk-create') navigate(`/configuracoes/series/${serie.id}/editar`);
              }}
            />

            <SeriesContentsTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={tabCounts}
            />

            <SeriesContentsFilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              statusValue={filterStatus}
              onStatusChange={setFilterStatus}
              sortValue={sortBy}
              onSortChange={setSortBy}
            />

            <SeriesContentList
              items={filteredItems}
              totalCount={listTotalCount}
              tab={activeTab}
              onItemClick={setPreviewItem}
            />
          </div>

          <aside className="min-w-0 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
            <SeriesCreateContentPanel
              mode={panelMode}
              serie={serie}
              pilares={state.pilares}
              platformNames={platformNames}
              onCreate={handleCreateBulkContents}
            />
          </aside>
        </div>
      </div>

      <SeriesContentPreviewModal
        item={previewItem}
        serie={serie}
        platforms={state.platforms}
        onClose={() => setPreviewItem(null)}
      />
    </PageLayout>
  );
}
