import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock } from 'lucide-react';
import { Text } from '../../../components/ui/Text';
import { SelectField } from '../../../components/ui/SelectField';
import type { Content, Serie } from '../../../lib/database';
import { computeSerieMetrics } from '../../recommendations/computeSerieMetrics';

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-2 text-center">
      <Text variant="meta" className="block text-[var(--text-tertiary)]">
        {label}
      </Text>
      <Text variant="pageTitle" as="p" className="mt-1">
        {value}
      </Text>
    </div>
  );
}

export function SerieProductionMetricsPanel({
  serie,
  contents,
  onActiveChange,
  lastEditLabel,
}: {
  serie: Serie;
  contents: Content[];
  onActiveChange?: (ativa: boolean) => void;
  lastEditLabel?: string | null;
}) {
  const metrics = computeSerieMetrics(serie, contents);
  const lastPublicationLabel = metrics.ultimaPublicacao
    ? formatDistanceToNow(new Date(metrics.ultimaPublicacao), { addSuffix: true, locale: ptBR })
    : 'Nunca';

  return (
    <div>
      <Text variant="itemTitle">Produção e publicação</Text>
      <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--border-color)]">
        <Metric label="Escritos" value={metrics.roteirosEscritos} />
        <Metric label="Produzidos" value={metrics.gravadosProntos} />
        <Metric label="Publicados" value={metrics.publicadosNoCiclo} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Text variant="meta" className="text-[var(--text-secondary)]">
          Última publicação
        </Text>
        <Text variant="body" className="text-[var(--text-primary)]">
          {lastPublicationLabel}
        </Text>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <Text variant="meta" className="text-[var(--text-secondary)]">
          Status da série
        </Text>
        <SelectField
          ariaLabel="Status da série"
          value={serie.ativa ? 'ativa' : 'inativa'}
          onChange={value => onActiveChange?.(value === 'ativa')}
          options={[
            { value: 'ativa', label: 'Ativa' },
            { value: 'inativa', label: 'Inativa' },
          ]}
        />
      </div>
      {lastEditLabel ? (
        <div className="mt-4 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <Text variant="meta" className="text-[var(--text-tertiary)]">
            {lastEditLabel}
          </Text>
        </div>
      ) : null}
    </div>
  );
}
