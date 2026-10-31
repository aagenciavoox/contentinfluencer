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
  series = [],
  onActiveChange,
  lastEditLabel,
}: {
  serie: Serie;
  contents: Content[];
  /** Todas as séries, para somar os quadros. */
  series?: readonly Pick<Serie, 'id' | 'parentId'>[];
  onActiveChange?: (ativa: boolean) => void;
  lastEditLabel?: string | null;
}) {
  const metrics = computeSerieMetrics(serie, contents, new Date(), series);
  const temQuadros = series.some(item => item.parentId === serie.id);
  const lastPublicationLabel = metrics.ultimaPublicacao
    ? formatDistanceToNow(new Date(metrics.ultimaPublicacao), { addSuffix: true, locale: ptBR })
    : 'Nunca';

  return (
    <div>
      <Text variant="itemTitle">Episódios e publicações</Text>
      <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--border-color)]">
        <Metric label="Episódios" value={metrics.episodios} />
        <Metric label="Previstas" value={metrics.publicacoesPrevistas} />
        <Metric label="Publicadas" value={metrics.publicacoesRealizadas} />
      </div>
      <Text variant="meta" as="p" className="mt-2 text-[var(--text-tertiary)]">
        {temQuadros
          ? 'Inclui os episódios dos quadros, uma vez cada. Publicações contam por conta.'
          : 'Publicações contam por conta.'}
      </Text>
      <div className="mt-4 grid grid-cols-2 divide-x divide-[var(--border-color)]">
        <Metric label="Escritos" value={metrics.roteirosEscritos} />
        <Metric label="Prontos para publicar" value={metrics.gravadosProntos} />
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
