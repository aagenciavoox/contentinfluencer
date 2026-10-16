import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { LIBRARY_PERIOD_OPTIONS, type LibraryPeriodBucket, type LibraryPeriodGrouping } from '../lib/libraryPeriods';

interface LibraryPeriodBreakdownProps {
  grouping: LibraryPeriodGrouping;
  onGroupingChange: (value: LibraryPeriodGrouping) => void;
  buckets: LibraryPeriodBucket[];
  loading?: boolean;
}

function formatRating(value: number | null) {
  return value === null ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export function LibraryPeriodBreakdown({ grouping, onGroupingChange, buckets, loading = false }: LibraryPeriodBreakdownProps) {
  return (
    <Surface variant="info" padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text variant="eyebrow">Por período</Text>
          <Text variant="sectionTitle" className="mt-1">Concluídos ao longo do tempo</Text>
          <Text variant="meta" className="mt-2 block">Conta pela data de conclusão de cada item.</Text>
        </div>
        <div className="max-w-full overflow-x-auto">
          <SegmentTabs<LibraryPeriodGrouping>
            ariaLabel="Agrupar por período"
            className="w-max"
            value={grouping}
            onChange={onGroupingChange}
            options={LIBRARY_PERIOD_OPTIONS}
          />
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="stack-md" aria-busy="true">
            {['a', 'b', 'c'].map(key => <Skeleton key={key} className="h-10 w-full" />)}
          </div>
        ) : buckets.length === 0 ? (
          <Text variant="meta">Nenhum item concluído com data ainda.</Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--text-tertiary)]">
                  <th className="py-2 pr-4 font-medium">Período</th>
                  <th className="py-2 pr-4 font-medium">Concluídos</th>
                  <th className="py-2 pr-4 font-medium">Leituras</th>
                  <th className="py-2 pr-4 font-medium">Páginas</th>
                  <th className="py-2 font-medium">Avaliação média</th>
                </tr>
              </thead>
              <tbody>
                {[...buckets].reverse().map(bucket => (
                  <tr key={bucket.id} className="border-t border-[var(--border-color)] text-[var(--text-primary)]">
                    <td className="py-2 pr-4 font-semibold">{bucket.label}</td>
                    <td className="py-2 pr-4">{bucket.completed}</td>
                    <td className="py-2 pr-4">{bucket.books}</td>
                    <td className="py-2 pr-4">{bucket.pagesRead.toLocaleString('pt-BR')}</td>
                    <td className="py-2">{formatRating(bucket.averageRating)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Surface>
  );
}
