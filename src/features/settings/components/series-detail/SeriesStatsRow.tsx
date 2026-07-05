import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import type { SeriesContentStats } from '../../lib/computeSeriesContentStats';

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Surface variant="outlined" padding="md" className="min-w-0">
      <Text variant="meta" className="text-[var(--text-tertiary)]">
        {label}
      </Text>
      <Text variant="sectionTitle" className="mt-1">
        {value}
      </Text>
    </Surface>
  );
}

interface SeriesStatsRowProps {
  stats: SeriesContentStats;
}

export function SeriesStatsRow({ stats }: SeriesStatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Conteúdos" value={stats.total} />
      <StatCard label="Roteiros" value={stats.roteiros} />
      <StatCard label="Ideias" value={stats.ideias} />
      <StatCard label="Publicados" value={stats.publicados} />
      <StatCard label="Em produção" value={stats.emProducao} />
      <StatCard label="Rascunhos" value={stats.rascunhos} />
    </div>
  );
}
