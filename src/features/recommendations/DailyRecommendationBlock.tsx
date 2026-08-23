import { ArrowRight, Clapperboard, Settings2, Sparkles, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SpotlightCta } from '../../components/ui/SpotlightCta';
import { Text } from '../../components/ui/Text';
import type { DailyRecommendation } from './types';

interface DailyRecommendationBlockProps {
  recommendation: DailyRecommendation;
  gentleLanguage?: boolean;
}

export function DailyRecommendationBlock({
  recommendation,
  gentleLanguage = true,
}: DailyRecommendationBlockProps) {
  const navigate = useNavigate();
  const { kind, pilar, serie, message, href } = recommendation;

  const eyebrow = gentleLanguage ? 'O que posto hoje?' : 'Decisão do ciclo';
  const title =
    kind === 'post'
      ? serie
        ? `Postar de "${serie.name}"`
        : `Cobrir gap em "${pilar.nome}"`
      : kind === 'record'
        ? serie
          ? `Gravar "${serie.name}"`
          : `Produzir para "${pilar.nome}"`
        : kind === 'configure_meta'
          ? `Definir meta de "${pilar.nome}"`
          : 'Ciclo em dia';

  const Icon =
    kind === 'post'
      ? Sparkles
      : kind === 'record'
        ? Clapperboard
        : kind === 'configure_meta'
          ? Settings2
          : Video;

  const borderColor =
    kind === 'on_track' ? 'var(--accent-green)' : 'var(--accent-blue)';

  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="editorial-card group flex w-full items-center justify-between gap-6 border-l-2 bg-[var(--bg-secondary)] p-6 text-left shadow-sm transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] md:p-8"
      style={{ borderLeftColor: borderColor }}
    >
      <div className="min-w-0">
        <Text variant="eyebrow">{eyebrow}</Text>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: pilar.cor }}
            aria-hidden
          />
          <Text variant="sectionTitle" truncate>
            {title}
          </Text>
        </div>
        <Text variant="body" className="mt-2 text-[var(--text-secondary)]">
          {message}
        </Text>
        {pilar.metaCiclo != null ? (
          <Text variant="meta" className="mt-2 text-[var(--text-tertiary)]">
            Estoque: {pilar.totalDisponivel} · Meta do ciclo: {pilar.metaCiclo}
            {pilar.gapCiclo != null && pilar.gapCiclo > 0 ? ` · Gap: ${pilar.gapCiclo}` : ''}
          </Text>
        ) : null}
        <SpotlightCta>
          Ver caminho <ArrowRight className="h-3.5 w-3.5" />
        </SpotlightCta>
      </div>
      <div className="rounded-[var(--radius-card-mobile)] bg-[var(--bg-hover)] p-6">
        <Icon className="h-8 w-8 text-[var(--text-secondary)]" />
      </div>
    </button>
  );
}
