import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { AppButton } from '../../../components/ui/AppButton';
import { PageToolbar } from '../../../components/ui/PageToolbar';
import { SelectField } from '../../../components/ui/SelectField';
import { LibrarySectionTabs } from '../../library/components/LibrarySectionTabs';
import {
  LIBRARY_FORMATS,
  buildLibraryPeriodAnalysis,
  currentPeriodLabel,
  findPeriod,
  libraryPeriodOptions,
  periodRangeText,
  type LibraryFormatFilter,
} from '../lib/libraryPeriodAnalysis';
import {
  LibraryActiveCard,
  LibraryConsumptionTable,
  LibraryFormatChips,
  LibraryGenresCard,
  LibraryKpis,
  LibraryNotesCard,
  LibraryRatingsCard,
} from '../components/LibraryAnalysisSections';

export function AnalyticsPage() {
  const { state, ensureDataDomains } = useAppContext();
  const navigate = useNavigate();
  const libraryReady = useDomainsReady(['library']);
  const loading = !libraryReady;

  useEffect(() => {
    void ensureDataDomains(['library-generos']);
  }, [ensureDataDomains]);

  const periodOptions = useMemo(() => libraryPeriodOptions(state.bibliotecaItems), [state.bibliotecaItems]);
  const [periodId, setPeriodId] = useState('ano:' + new Date().getFullYear());
  const [format, setFormat] = useState<LibraryFormatFilter>('todos');
  const period = findPeriod(periodOptions, periodId);

  const analysis = useMemo(
    () => buildLibraryPeriodAnalysis(state.bibliotecaItems, period, format, state.bibliotecaGeneros),
    [state.bibliotecaItems, state.bibliotecaGeneros, period, format],
  );

  const selectOptions = periodOptions.map(option => ({
    value: option.id,
    label: option.current
      ? currentPeriodLabel(option)
      : option.grouping === 'ano' ? `Ano de ${option.label}` : option.label,
  }));
  const formatLabel = format === 'todos' ? '' : LIBRARY_FORMATS.find(entry => entry.id === format)?.label ?? '';

  const periodSelect = (
    <SelectField
      value={period.id}
      onChange={setPeriodId}
      options={selectOptions}
      ariaLabel="Período"
      leadingIcon={<CalendarDays className="h-4 w-4" aria-hidden />}
    />
  );
  const newItem = () => navigate('/biblioteca?compose=novo');

  return (
    <PageLayout
      contentWidth="wide"
      header={(
        <DesktopPageHeader
          section="Estratégia"
          title="Análise"
          backLabel="Biblioteca"
          backTo="/biblioteca"
          actions={(
            <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={newItem}>
              Novo item
            </AppButton>
          )}
        />
      )}
      navigation={<LibrarySectionTabs />}
      toolbar={(
        <PageToolbar
          leading={periodSelect}
          chips={<LibraryFormatChips value={format} onChange={setFormat} />}
        />
      )}
      mobileHeader={(
        <div className="stack-sm">
          <LibrarySectionTabs />
          <div className="flex items-center gap-2 [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1">
            {periodSelect}
            <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={newItem}>
              Novo item
            </AppButton>
          </div>
          <LibraryFormatChips value={format} onChange={setFormat} />
        </div>
      )}
    >
      <div className="stack-lg">
        <LibraryKpis analysis={analysis} formatLabel={formatLabel} rangeText={periodRangeText(period)} loading={loading} />
        <LibraryConsumptionTable analysis={analysis} loading={loading} showAllFormats={format === 'todos'} />
        <div className="grid-content">
          <LibraryActiveCard analysis={analysis} loading={loading} />
          <LibraryNotesCard analysis={analysis} loading={loading} />
          <LibraryGenresCard analysis={analysis} loading={loading} />
          <LibraryRatingsCard analysis={analysis} loading={loading} onRate={() => navigate('/biblioteca?status=concluidos')} />
        </div>
      </div>
    </PageLayout>
  );
}
