import { useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { AppButton } from '../../../components/ui/AppButton';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import type { Content } from '../../../lib/database';
import { broadcastDataSync } from '../../../lib/syncBroadcast';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { SeriesDetailMobileScreen } from '../../../mobile/screens/settings/SeriesDetailMobileScreen';
import { SeriesDetailHeader } from '../components/series-detail/SeriesDetailHeader';
import { SeriesContentsFilterBar } from '../components/series-detail/SeriesContentsFilterBar';
import { SeriesContentList } from '../components/series-detail/SeriesContentList';
import { SeriesBulkComposer } from '../components/SeriesBulkComposer';
import { SeriesContentPreviewModal } from '../components/series-detail/SeriesContentPreviewModal';
import {
  computeSeriesContentStats,
  type SeriesContentTab,
} from '../lib/computeSeriesContentStats';
import { filterAndSortSeriesListItems, type SeriesListItem } from '../lib/seriesContentListUtils';
import { CONTENT_STATUS } from '../../contents/lib/contentPipeline';
import { getEditorialSettings } from '../../editorial/lib/editorialSettings';
import { formatOpenItems, getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';

function contentTypeLabel(status: string) {
  return status === CONTENT_STATUS.IDEIA ? 'ideia' : 'roteiro';
}

export function SeriesScriptsPage() {
  const { serieId } = useParams<{ serieId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const isMobile = useIsMobile();
  const editorialSettings = getEditorialSettings(state.preferences);

  const [activeTab, setActiveTab] = useState<SeriesContentTab>('roteiros');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [sortBy, setSortBy] = useState('updatedAt:desc');
  const [previewItem, setPreviewItem] = useState<SeriesListItem | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const serie = state.series.find(item => item.id === serieId) ?? null;
  const platformNames = state.platforms.filter(platform => platform.ativo).map(platform => platform.nome);

  const linkedContents = useMemo(
    () =>
      state.contents
        .filter(content => content.seriesId === serieId && !content.deletedAt)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [serieId, state.contents],
  );

  // Ideias agora vivem no mesmo pipeline de Content; a lista legada fica fora
  // desta tela para evitar duplicar itens já migrados.
  const inboxIdeas = useMemo(() => [], []);

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

  if (!serie) {
    if (isMobile) {
      return (
        <div className="min-h-full bg-[var(--bg-primary)] py-10 text-center">
          <Layers className="mx-auto mb-3 h-8 w-8 opacity-10" />
          <Text variant="body" className="text-[var(--text-tertiary)]">
            {state.isLoaded ? 'Série não encontrada.' : 'Carregando série…'}
          </Text>
          {state.isLoaded ? (
            <AppButton variant="secondary" className="mt-4" onClick={() => navigate('/series')}>
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
        backTo="/series"
        backLabel="Séries"
      >
        <div className="py-12 text-center">
          <Layers className="mx-auto mb-3 h-8 w-8 opacity-10" />
          <p className="text-sm font-medium opacity-50">
            {state.isLoaded ? 'Série não encontrada.' : 'Carregando série…'}
          </p>
          {state.isLoaded ? (
            <AppButton
              variant="secondary"
              className="mt-4"
              onClick={() => navigate('/series')}
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
          onCreateBulkContents={handleCreateBulkContents}
          showOpenInfoNotice={editorialSettings.openInfoNotices}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          statusValue={filterStatus}
          onStatusChange={setFilterStatus}
          sortValue={sortBy}
          onSortChange={setSortBy}
        />
      </div>
    );
  }

  return (
    <PageLayout
      variant="settings"
      header={(
        <DesktopPageHeader
          section="Criação"
          title={serie.name}
          backLabel="Séries"
          backTo="/series"
        />
      )}
    >
      <div className="stack-xl">
        <SeriesDetailHeader
          serie={serie}
          pilares={state.pilares}
          contentCount={linkedContents.length}
          showMoreMenu={showHeaderMenu}
          onToggleMore={() => setShowHeaderMenu(current => !current)}
          onEdit={() => navigate(`/editorial/series/${serie.id}`)}
          hideChrome
          onMenuAction={action => {
            if (action === 'edit') navigate(`/editorial/series/${serie.id}`);
          }}
        />

        {editorialSettings.openInfoNotices && getSerieOpenItems(serie).length > 0 ? (
          <OpenInfoNotice
            items={getSerieOpenItems(serie)}
            title={`Esta série tem informações em aberto: ${formatOpenItems(getSerieOpenItems(serie))}`}
            description={null}
            actionLabel="Completar no Editorial"
            onAction={() => navigate(`/editorial/series/${serie.id}`)}
          />
        ) : null}

        <div className="grid-series-detail">
          <div className="min-w-0 order-2 stack-xl lg:order-1">
            <SegmentTabs<SeriesContentTab>
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { id: 'roteiros', label: 'Roteiros', count: tabCounts.roteiros },
                { id: 'ideias', label: 'Ideias', count: tabCounts.ideias },
                { id: 'todos', label: 'Todos', count: tabCounts.total },
              ]}
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

          <aside className="min-w-0 order-1 lg:sticky lg:top-4 lg:order-2 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
            <SeriesBulkComposer
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
