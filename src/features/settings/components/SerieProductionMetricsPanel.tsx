import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Text } from '../../../components/ui/Text';
import type { Content, Serie } from '../../../lib/database';
import { computeSerieMetrics } from '../../recommendations/computeSerieMetrics';
import {
  PropertyRow,
  PropertySection,
} from '../../../components/ui/PropertyRow';
import { BarChart3 } from 'lucide-react';

export function SerieProductionMetricsPanel({
  serie,
  contents,
}: {
  serie: Serie;
  contents: Content[];
}) {
  const metrics = computeSerieMetrics(serie, contents);
  const lastPublicationLabel = metrics.ultimaPublicacao
    ? formatDistanceToNow(new Date(metrics.ultimaPublicacao), { addSuffix: true, locale: ptBR })
    : 'Nunca';

  return (
    <PropertySection label="Produção e publicação">
      <PropertyRow label="Roteiros escritos" icon={<BarChart3 />}>
        <Text variant="body">{metrics.roteirosEscritos}</Text>
      </PropertyRow>
      <PropertyRow label="Gravados / prontos" icon={<BarChart3 />}>
        <Text variant="body">{metrics.gravadosProntos}</Text>
      </PropertyRow>
      <PropertyRow label="Publicados no ciclo" icon={<BarChart3 />}>
        <Text variant="body">{metrics.publicadosNoCiclo}</Text>
      </PropertyRow>
      <PropertyRow label="Última publicação" icon={<BarChart3 />}>
        <Text variant="body">{lastPublicationLabel}</Text>
      </PropertyRow>
      <PropertyRow label="Status da série" icon={<BarChart3 />}>
        <Text variant="body">{serie.ativa ? 'Ativa' : 'Inativa'}</Text>
      </PropertyRow>
    </PropertySection>
  );
}
