import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { AppButton } from '../../../components/ui/AppButton';
import { LibrarySectionTabs } from '../../library/components/LibrarySectionTabs';
import { AnalyticsCategoryCards } from '../components/AnalyticsCategoryCards';
import { buildLibraryAnalytics } from '../lib/libraryAnalytics';
import { groupLibraryByPeriod, type LibraryPeriodGrouping } from '../lib/libraryPeriods';
import { LibraryPeriodBreakdown } from '../components/LibraryPeriodBreakdown';

export function AnalyticsPage() {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const libraryReady = useDomainsReady(['library']);

  const analytics = useMemo(
    () => buildLibraryAnalytics(
      state.bibliotecaItems,
      itemId => state.bibliotecaItems.find(item => item.id === itemId)?.ficha ?? {},
    ),
    [state.bibliotecaItems],
  );
  const [periodGrouping, setPeriodGrouping] = useState<LibraryPeriodGrouping>('ano');
  const periodBuckets = useMemo(
    () => groupLibraryByPeriod(state.bibliotecaItems, periodGrouping),
    [state.bibliotecaItems, periodGrouping],
  );

  return (
    <PageLayout
      contentWidth="wide"
      header={(
        <DesktopPageHeader
          section="Criação"
          title="Análise"
          backLabel="Biblioteca"
          backTo="/biblioteca"
          actions={
            <AppButton
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/biblioteca?compose=novo')}
            >
              Novo item
            </AppButton>
          }
        />
      )}
      toolbar={<LibrarySectionTabs />}
      mobileHeader={(
        <div className="pb-1 pt-1">
          <LibrarySectionTabs />
        </div>
      )}
    >
      <div className="stack-xl">
        <AnalyticsCategoryCards analytics={analytics} loading={!libraryReady} />
        <LibraryPeriodBreakdown
          grouping={periodGrouping}
          onGroupingChange={setPeriodGrouping}
          buckets={periodBuckets}
          loading={!libraryReady}
        />
      </div>
    </PageLayout>
  );
}
