import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import type { BibliotecaItemMeta } from '../../../lib/database';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { AppButton } from '../../../components/ui/AppButton';
import { LibrarySectionTabs } from '../../library/components/LibrarySectionTabs';
import { AnalyticsCategoryCards } from '../components/AnalyticsCategoryCards';
import { buildLibraryAnalytics } from '../lib/libraryAnalytics';

export function AnalyticsPage() {
  const { state } = useAppContext();
  const navigate = useNavigate();

  const analytics = useMemo(
    () => buildLibraryAnalytics(
      state.bibliotecaItems,
      itemId => (
        (state.preferences[`item_meta:${itemId}`]
          || state.preferences[`book_meta:${itemId}`]
          || {}) as BibliotecaItemMeta
      ),
    ),
    [state.bibliotecaItems, state.preferences],
  );

  return (
    <PageLayout
      contentWidth="wide"
      header={(
        <DesktopPageHeader
          section="Criação"
          title="Análise"
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
      <AnalyticsCategoryCards analytics={analytics} />
    </PageLayout>
  );
}
