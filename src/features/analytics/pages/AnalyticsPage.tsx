import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import type { BibliotecaItemMeta } from '../../../lib/database';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { Surface } from '../../../components/ui/Surface';
import { MobileSectionHeader } from '../../../mobile/components/MobileSectionHeader';
import { LibrarySectionTabs } from '../../library/components/LibrarySectionTabs';
import { AnalyticsCategoryCards } from '../components/AnalyticsCategoryCards';
import { buildLibraryAnalytics } from '../lib/libraryAnalytics';

export function AnalyticsPage() {
  const { state } = useAppContext();

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
        <DesktopPageHeader section="Biblioteca" title="Análise" icon={BarChart3}>
          <LibrarySectionTabs />
        </DesktopPageHeader>
      )}
      mobileHeader={(
        <div className="stack-md px-4 pt-4">
          <Surface variant="outlined" padding="md">
            <MobileSectionHeader
              icon={BarChart3}
              tone="green"
              title="Análise da Biblioteca"
              description="Livros, páginas, minutagem, progresso e anotações."
            />
          </Surface>
          <LibrarySectionTabs />
        </div>
      )}
    >
      <AnalyticsCategoryCards analytics={analytics} />
    </PageLayout>
  );
}
