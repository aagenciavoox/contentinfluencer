import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useDomainsReady } from '../../../hooks/useDomainsReady';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { AppButton } from '../../../components/ui/AppButton';
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
  LibraryAnalysisFooter,
  LibraryConsumptionTable,
  LibraryFormatChips,
  LibraryGenresCard,
  LibraryKpis,
  LibraryNotesCard,
  LibraryRatingsCard,
} from '../components/LibraryAnalysisSections';

const GROUP_LABELS = { ano: 'Ano', semestre: 'Semestre', trimestre: 'Trimestre' } as const;

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
    label: `${GROUP_LABELS[option.grouping]} · ${currentPeriodLabel(option)}`,
  }));
  const formatLabel = format === 'todos' ? 'Todos os formatos' : LIBRARY_FORMATS.find(entry => entry.id === format)?.label ?? '';

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
          section="Criação"
          title="Análise"
          subtitle="Seu consumo de livros, filmes, séries e outras histórias."
          backLabel="Biblioteca"
          backTo="/biblioteca"
          actions={(
            <div className="flex items-center gap-2">
              {periodSelect}
              <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={newItem}>
                Novo item
              </AppButton>
            </div>
          )}
        />
      )}
      toolbar={<LibrarySectionTabs />}
      mobileHeader={(
        <div className="flex flex-col gap-2 pb-1 pt-1">
          <LibrarySectionTabs />
          <div className="flex items-center gap-2 [&>*:first-child]:min-w-0 [&>*:first-child]:flex-1">
            {periodSelect}
            <AppButton variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={newItem}>
              Novo item
            </AppButton>
          </div>
        </div>
      )}
    >
      <div className="stack-lg">
        <LibraryFormatChips value={format} onChange={setFormat} />
        <LibraryKpis analysis={analysis} formatLabel={formatLabel} rangeText={periodRangeText(period)} loading={loading} />
        <LibraryConsumptionTable analysis={analysis} periodLabel={period.label} loading={loading} />
        <div className="grid gap-4 lg:grid-cols-2">
          <LibraryActiveCard analysis={analysis} loading={loading} />
          <LibraryNotesCard analysis={analysis} loading={loading} />
          <LibraryGenresCard analysis={analysis} loading={loading} />
          <LibraryRatingsCard analysis={analysis} loading={loading} onRate={() => navigate('/biblioteca?status=concluidos')} />
        </div>
        <LibraryAnalysisFooter />
      </div>
    </PageLayout>
  );
}
