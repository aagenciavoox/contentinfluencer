import { BarChart3 } from 'lucide-react';
import type { Content } from '../../../lib/database';
import { AnalyticsCategoryCards, type RuleResult } from '../../../features/analytics/components/AnalyticsCategoryCards';
import type { Pilar } from '../../../lib/database';
import type { GentleExperienceSettings } from '../../../features/settings/lib/gentleExperience';

interface AnalyticsMobileScreenProps {
  resultados: RuleResult[];
  score: number | null;
  regrasAtivasCount: number;
  mixPeriodo: 30 | 90;
  onMixPeriodoChange: (value: 30 | 90) => void;
  mixData: Array<{ pilar: Pilar; count: number; pct: number }>;
  semPostar: Array<{ pilar: Pilar }>;
  totais: { views: number; likes: number; saves: number; comments: number };
  topViews: Array<{ content: Content | undefined; views: number }>;
  topSaves: Array<{ content: Content | undefined; saves: number }>;
  postedContents: Content[];
  hasMetrics: boolean;
  perfPlatforma: string;
  onPerfPlatformaChange: (value: string) => void;
  platforms: Array<{ id: string; nome: string; ativo: boolean }>;
  gentleExperience: GentleExperienceSettings;
}

export function AnalyticsMobileScreen(props: AnalyticsMobileScreenProps) {
  const useGentleLanguage = props.gentleExperience.enabled;
  return (
    <div className="space-y-4 pb-8">
      <section className="ds-card bg-[var(--bg-secondary)] p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-[var(--radius-card)] bg-[var(--accent-green)]/12 p-3 text-[var(--accent-green)]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--text-primary)]">Analise editorial</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {useGentleLanguage
                ? 'Mix, resposta e aprendizados em uma leitura tranquila.'
                : 'Consistencia, mix e resposta do publico em um fluxo unico.'}
            </p>
          </div>
        </div>
      </section>
      <AnalyticsCategoryCards {...props} />
    </div>
  );
}
