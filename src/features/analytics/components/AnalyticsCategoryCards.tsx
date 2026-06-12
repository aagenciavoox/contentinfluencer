import {useMemo} from 'react';
import {useNavigate} from 'react-router-dom';
import type {Content, GoldenRule, Pilar} from '../../../lib/database';
import {DonutChart} from '../../../components/charts/DonutChart';
import {HorizontalBarChart} from '../../../components/charts/HorizontalBarChart';
import {HeatmapGrid} from '../../../components/charts/HeatmapGrid';
import {cn} from '../../../lib/utils';
import type {GentleExperienceSettings} from '../../settings/lib/gentleExperience';

export type RuleResult = {regra: GoldenRule; status: 'ok' | 'aviso'; detalhe: string};

interface AnalyticsCategoryCardsProps {
  resultados: RuleResult[];
  score: number | null;
  regrasAtivasCount: number;
  mixPeriodo: 30 | 90;
  onMixPeriodoChange: (value: 30 | 90) => void;
  mixData: Array<{pilar: Pilar; count: number; pct: number}>;
  semPostar: Array<{pilar: Pilar}>;
  totais: {views: number; likes: number; saves: number; comments: number};
  topViews: Array<{content: Content | undefined; views: number}>;
  postedContents: Content[];
  hasMetrics: boolean;
  perfPlatforma: string;
  onPerfPlatformaChange: (value: string) => void;
  platforms: Array<{id: string; nome: string; ativo: boolean}>;
  gentleExperience: GentleExperienceSettings;
}

function buildPostingHeatmap(contents: Content[]) {
  const cells = [];
  const today = new Date();
  for (let i = 27; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    const count = contents.filter(
      c => c.publishDate && c.publishDate.slice(0, 10) === key
    ).length;
    cells.push({
      key,
      label: String(day.getDate()),
      value: count,
    });
  }
  return cells;
}

export function AnalyticsCategoryCards({
  resultados,
  score,
  regrasAtivasCount,
  mixPeriodo,
  onMixPeriodoChange,
  mixData,
  semPostar,
  totais,
  topViews,
  postedContents,
  hasMetrics,
  perfPlatforma,
  onPerfPlatformaChange,
  platforms,
  gentleExperience,
}: AnalyticsCategoryCardsProps) {
  const navigate = useNavigate();
  const useGentleLanguage = gentleExperience.enabled;
  const excecoes = resultados.filter(r => r.status !== 'ok');
  const heatmapCells = useMemo(() => buildPostingHeatmap(postedContents), [postedContents]);

  const formatoBars = useMemo(() => {
    const map = new Map<string, number>();
    postedContents.forEach(c => {
      const key = c.formatoVisual || 'Sem formato';
      map.set(key, (map.get(key) || 0) + 1);
    });
    const total = postedContents.length || 1;
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value], index) => ({
        id: `${label}-${index}`,
        label,
        value,
        percent: Math.round((value / total) * 100),
      }));
  }, [postedContents]);

  const topViewsBars = topViews.map((item, index) => ({
    id: `views-${index}`,
    label: item.content?.title || '(sem titulo)',
    value: item.views,
    percent: topViews[0]?.views ? Math.round((item.views / topViews[0].views) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <section className="ds-card bg-[var(--bg-primary)] p-5">
        <h2 className="ds-h3 mb-4">{useGentleLanguage ? 'Leitura editorial' : 'Consistencia editorial'}</h2>
        {regrasAtivasCount === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--text-secondary)]">Nenhuma regra de ouro configurada</p>
            <button
              type="button"
              onClick={() => navigate('/configuracoes/regras')}
              className="mt-2 text-xs font-semibold text-[var(--accent-blue)] underline"
            >
              Configurar regras
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {score !== null ? (
              <DonutChart value={score} label={useGentleLanguage ? 'leitura' : 'score'} />
            ) : null}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">
                {useGentleLanguage
                  ? `${resultados.filter(r => r.status === 'ok').length}/${regrasAtivasCount} combinados em harmonia`
                  : `${resultados.filter(r => r.status === 'ok').length}/${regrasAtivasCount} regras cumpridas`}
              </p>
              {excecoes.length === 0 ? (
                <p className="rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                  {useGentleLanguage ? 'Nada para revisar neste periodo.' : 'Nenhum ponto fora do combinado no periodo.'}
                </p>
              ) : (
                excecoes.map(({regra, status, detalhe}) => (
                  <div
                    key={regra.id}
                    className={cn(
                      'rounded-[var(--radius-input)] border px-3 py-2',
                      status === 'aviso' ? 'border-amber-500/30 bg-amber-500/5' : 'border-[var(--border-color)] bg-[var(--bg-hover)]'
                    )}
                  >
                    <p className="text-sm font-medium text-[var(--text-primary)]">{regra.descricao}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      {regra.tipo} · {detalhe}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <section className="ds-card bg-[var(--bg-primary)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="ds-h3">Mix de conteudo</h2>
          <div className="flex gap-1">
            {([30, 90] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => onMixPeriodoChange(d)}
                className={cn(
                  'ds-pill px-3 py-1 text-xs font-semibold border transition-all',
                  mixPeriodo === d
                    ? 'border-transparent bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'border-[var(--border-color)] text-[var(--text-secondary)]'
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {semPostar.length > 0 ? (
          <div className="mb-4 space-y-1">
            {semPostar.map(({pilar}) => (
              <p key={pilar.id} className="text-xs text-amber-700">
                {useGentleLanguage
                  ? `${pilar.nome} ficou mais quieto nos ultimos ${mixPeriodo} dias`
                  : `Sem posts de ${pilar.nome} nos ultimos ${mixPeriodo} dias`}
              </p>
            ))}
          </div>
        ) : null}
        <HorizontalBarChart
          items={mixData.map(({pilar, count, pct}) => ({
            id: pilar.id,
            label: pilar.nome,
            value: count,
            percent: pct,
            color: pilar.cor,
          }))}
          valueSuffix=" posts"
        />
      </section>

      <section className="ds-card bg-[var(--bg-primary)] p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="ds-h3">{useGentleLanguage ? 'Resposta do publico' : 'Metricas publicadas'}</h2>
          <select
            value={perfPlatforma}
            onChange={e => onPerfPlatformaChange(e.target.value)}
            className="h-8 min-w-[140px] text-xs"
          >
            <option value="">Todas plataformas</option>
            {platforms.filter(p => p.ativo).map(p => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
        {!hasMetrics ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            Nenhuma metrica registrada ainda
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                {label: 'Views', value: totais.views},
                {label: 'Likes', value: totais.likes},
                {label: 'Saves', value: totais.saves},
                {label: 'Comentarios', value: totais.comments},
              ].map(({label, value}) => (
                <div key={label} className="rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-2">
                  <p className="ds-meta">{label}</p>
                  <p className="text-lg font-bold text-[var(--text-primary)]">
                    {value.toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
            <div>
              <p className="ds-meta mb-2">Top formatos</p>
              <HorizontalBarChart items={formatoBars} />
            </div>
            <div>
              <p className="ds-meta mb-2">{useGentleLanguage ? 'Mais vistos' : 'Top por views'}</p>
              <HorizontalBarChart items={topViewsBars} />
            </div>
            <div>
              <p className="ds-meta mb-2">{useGentleLanguage ? 'Presenca nos ultimos 28 dias' : 'Ritmo de postagem (28 dias)'}</p>
              <HeatmapGrid cells={heatmapCells} columns={7} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
