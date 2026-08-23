import type { ElementType } from 'react';
import { BookOpen, CheckCircle2, Clock3, Gauge, Library, NotebookPen, Star, Tv } from 'lucide-react';
import { DonutChart } from '../../../components/charts/DonutChart';
import { HorizontalBarChart } from '../../../components/charts/HorizontalBarChart';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { LibraryAnalyticsSnapshot } from '../lib/libraryAnalytics';
import { formatWatchTime } from '../lib/libraryAnalytics';

interface AnalyticsCategoryCardsProps {
  analytics: LibraryAnalyticsSnapshot;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Surface variant="outlined" padding="sm" className="min-w-0">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] bg-[var(--bg-hover)] text-[var(--text-secondary)]">
        <Icon className="h-4 w-4" />
      </div>
      <Text variant="label" uppercase>{label}</Text>
      <Text variant="sectionTitle" className="mt-1 truncate">{value}</Text>
      {hint ? <Text variant="meta" className="mt-1 block">{hint}</Text> : null}
    </Surface>
  );
}

function formatAverage(value: number, suffix = '') {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${suffix}`;
}

export function AnalyticsCategoryCards({ analytics }: AnalyticsCategoryCardsProps) {
  const { totals, annotations } = analytics;
  const pagesPercent = totals.pagesCatalogued > 0
    ? Math.min(100, Math.round((totals.pagesRead / totals.pagesCatalogued) * 100))
    : 0;

  return (
    <div className="stack-xl">
      <Surface variant="elevated" padding="lg">
        <div className="mb-5">
          <Text variant="eyebrow">Biblioteca em números</Text>
          <Text variant="sectionTitle" className="mt-1">Seu consumo cultural</Text>
          <Text variant="secondary" className="mt-1">
            Métricas calculadas a partir do progresso registrado em cada item do acervo.
          </Text>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            icon={Library}
            label="Itens"
            value={totals.items}
            hint={`${totals.books} livros e mangás`}
          />
          <MetricCard
            icon={BookOpen}
            label="Páginas lidas"
            value={totals.pagesRead.toLocaleString('pt-BR')}
            hint={totals.pagesCatalogued > 0
              ? `de ${totals.pagesCatalogued.toLocaleString('pt-BR')} catalogadas`
              : 'Sem total informado'}
          />
          <MetricCard
            icon={Clock3}
            label="Tempo assistido"
            value={formatWatchTime(totals.minutesWatched)}
            hint={`${totals.minutesWatched.toLocaleString('pt-BR')} minutos`}
          />
          <MetricCard
            icon={Tv}
            label="Episódios vistos"
            value={totals.episodesWatched.toLocaleString('pt-BR')}
            hint="Séries e animes"
          />
          <MetricCard
            icon={Star}
            label="Avaliação média"
            value={totals.averageRating === null ? '—' : formatAverage(totals.averageRating)}
            hint={`${totals.ratedItems} ${totals.ratedItems === 1 ? 'item avaliado' : 'itens avaliados'}`}
          />
          <MetricCard
            icon={NotebookPen}
            label="Anotações"
            value={annotations.total.toLocaleString('pt-BR')}
            hint={`${annotations.highlights} destaques`}
          />
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface variant="outlined" padding="lg">
          <Text variant="eyebrow">Progresso</Text>
          <Text variant="sectionTitle" className="mt-1">Ritmo do acervo</Text>

          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <DonutChart value={totals.averageProgress} label="progresso médio" />
            <div className="grid flex-1 grid-cols-2 gap-3">
              <MetricCard icon={Gauge} label="Em andamento" value={totals.active} />
              <MetricCard icon={CheckCircle2} label="Concluídos" value={totals.completed} />
              <MetricCard icon={CheckCircle2} label="Neste mês" value={analytics.completedThisMonth} />
              <MetricCard icon={CheckCircle2} label="Neste ano" value={analytics.completedThisYear} />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Surface variant="plain" padding="sm" className="bg-[var(--bg-hover)]">
              <Text variant="label" uppercase>Páginas percorridas</Text>
              <Text variant="bodyStrong" className="mt-1">{pagesPercent}% do total catalogado</Text>
            </Surface>
            <Surface variant="plain" padding="sm" className="bg-[var(--bg-hover)]">
              <Text variant="label" uppercase>Tempo médio para concluir</Text>
              <Text variant="bodyStrong" className="mt-1">
                {totals.averageCompletionDays === null
                  ? 'Datas insuficientes'
                  : `${totals.averageCompletionDays} ${totals.averageCompletionDays === 1 ? 'dia' : 'dias'}`}
              </Text>
            </Surface>
          </div>
        </Surface>

        <Surface variant="outlined" padding="lg">
          <Text variant="eyebrow">Situação</Text>
          <Text variant="sectionTitle" className="mt-1">Status do acervo</Text>
          <div className="mt-6">
            <HorizontalBarChart items={analytics.statusData} />
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface variant="outlined" padding="lg">
          <Text variant="eyebrow">Formatos</Text>
          <Text variant="sectionTitle" className="mt-1">Composição da biblioteca</Text>
          <div className="mt-6">
            <HorizontalBarChart items={analytics.typeData} />
          </div>
        </Surface>

        <Surface variant="outlined" padding="lg">
          <Text variant="eyebrow">Preferências</Text>
          <Text variant="sectionTitle" className="mt-1">Gêneros mais presentes</Text>
          <div className="mt-6">
            <HorizontalBarChart items={analytics.genreData} />
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface variant="outlined" padding="lg">
          <Text variant="eyebrow">Anotações</Text>
          <Text variant="sectionTitle" className="mt-1">Livros que mais renderam notas</Text>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <MetricCard icon={NotebookPen} label="Com notas" value={annotations.itemsWithNotes} />
            <MetricCard icon={Star} label="Destaques" value={annotations.highlights} />
            <MetricCard
              icon={Gauge}
              label="Média"
              value={formatAverage(annotations.averagePerAnnotatedItem)}
              hint="por item anotado"
            />
          </div>

          <div className="mt-6">
            <HorizontalBarChart items={analytics.mostAnnotated} valueSuffix=" notas" />
          </div>
        </Surface>

        <Surface variant="outlined" padding="lg">
          <Text variant="eyebrow">Avaliações</Text>
          <Text variant="sectionTitle" className="mt-1">Distribuição das notas</Text>
          <Text variant="secondary" className="mt-1">
            {totals.averageRating === null
              ? 'Avalie os itens concluídos para formar esta leitura.'
              : `Média de ${formatAverage(totals.averageRating)} em ${totals.ratedItems} ${totals.ratedItems === 1 ? 'avaliação' : 'avaliações'}.`}
          </Text>
          <div className="mt-6">
            <HorizontalBarChart items={analytics.ratingData} />
          </div>
        </Surface>
      </div>
    </div>
  );
}
