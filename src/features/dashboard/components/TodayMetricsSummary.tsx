import { Link } from 'react-router-dom';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';

export interface TodayMetrics {
  readyScriptsCount: number;
  publicationsCount: number;
  urgentDeadlinesCount: number;
  agendaCount: number;
}

export function TodayMetricsSummary({
  metrics,
}: {
  metrics: TodayMetrics;
}) {
  return (
    <section className="stack-sm h-full flex flex-col" aria-labelledby="today-metrics-title">
      <Text variant="sectionTitle" id="today-metrics-title">Resumo do dia</Text>
      <Surface variant="outlined" padding="md" className="h-full flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-3 h-full">
          <Link
            to="/gravacao?tab=queue"
            className="group rounded-[var(--radius-sm)] p-3 bg-[var(--surface-subtle)] hover:bg-[var(--bg-hover)] transition-colors flex flex-col justify-between focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Text variant="meta" className="text-[var(--text-secondary)]">Para gravar</Text>
            <div className="flex items-baseline gap-1.5 pt-1">
              <Text variant="itemTitle" as="span" className="tabular-nums group-hover:text-[var(--brand-accent)] transition-colors">
                {metrics.readyScriptsCount}
              </Text>
              <Text variant="meta">{metrics.readyScriptsCount === 1 ? 'roteiro' : 'roteiros'}</Text>
            </div>
          </Link>

          <a
            href="#today-publications-title"
            className="group rounded-[var(--radius-sm)] p-3 bg-[var(--surface-subtle)] hover:bg-[var(--bg-hover)] transition-colors flex flex-col justify-between focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Text variant="meta" className="text-[var(--text-secondary)]">Hoje</Text>
            <div className="flex items-baseline gap-1.5 pt-1">
              <Text variant="itemTitle" as="span" className="tabular-nums group-hover:text-[var(--brand-accent)] transition-colors">
                {metrics.publicationsCount}
              </Text>
              <Text variant="meta">{metrics.publicationsCount === 1 ? 'publicação' : 'publicações'}</Text>
            </div>
          </a>

          <Link
            to="/planejamento"
            className="group rounded-[var(--radius-sm)] p-3 bg-[var(--surface-subtle)] hover:bg-[var(--bg-hover)] transition-colors flex flex-col justify-between focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Text variant="meta" className="text-[var(--text-secondary)]">Prazos</Text>
            <div className="flex items-baseline gap-1.5 pt-1">
              <Text variant="itemTitle" as="span" className="tabular-nums group-hover:text-[var(--brand-accent)] transition-colors">
                {metrics.urgentDeadlinesCount}
              </Text>
              <Text variant="meta">esta semana</Text>
            </div>
          </Link>

          <Link
            to="/calendario"
            className="group rounded-[var(--radius-sm)] p-3 bg-[var(--surface-subtle)] hover:bg-[var(--bg-hover)] transition-colors flex flex-col justify-between focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Text variant="meta" className="text-[var(--text-secondary)]">Agenda</Text>
            <div className="flex items-baseline gap-1.5 pt-1">
              <Text variant="itemTitle" as="span" className="tabular-nums group-hover:text-[var(--brand-accent)] transition-colors">
                {metrics.agendaCount}
              </Text>
              <Text variant="meta">{metrics.agendaCount === 1 ? 'evento' : 'eventos'}</Text>
            </div>
          </Link>
        </div>
      </Surface>
    </section>
  );
}
