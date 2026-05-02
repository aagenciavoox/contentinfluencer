import { useState } from 'react';
import { BarChart3, Gauge, Target, TrendingUp } from 'lucide-react';
import type { Content, GoldenRule } from '../../../lib/database';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';

type AnalyticsMobileTab = 'rules' | 'mix' | 'performance';

interface RuleResult {
  regra: GoldenRule;
  status: 'ok' | 'aviso' | 'violacao';
  detalhe: string;
}

interface AnalyticsMobileScreenProps {
  resultados: RuleResult[];
  score: number | null;
  mixPeriodo: 30 | 90;
  onMixPeriodoChange: (value: 30 | 90) => void;
  mixData: Array<{ pilar: { id: string; nome: string; cor: string }; count: number; pct: number }>;
  semPostar: Array<{ pilar: { id: string; nome: string } }>;
  totais: { views: number; likes: number; saves: number; comments: number };
  topViews: Array<{ content: Content | undefined; views: number }>;
  topSaves: Array<{ content: Content | undefined; saves: number }>;
}

export function AnalyticsMobileScreen({
  resultados,
  score,
  mixPeriodo,
  onMixPeriodoChange,
  mixData,
  semPostar,
  totais,
  topViews,
  topSaves,
}: AnalyticsMobileScreenProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsMobileTab>('rules');

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-green)]/12 p-3 text-[var(--accent-green)]">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Insights resumidos</p>
            <p className="t-secondary">Consistencia editorial, mix e performance em leitura rapida.</p>
          </div>
        </div>

        <MobileSegmentTabs
          tabs={[
            { value: 'rules', label: 'Regras', count: resultados.length },
            { value: 'mix', label: 'Mix', count: mixData.length },
            { value: 'performance', label: 'Perf.', count: topViews.length },
          ]}
          value={activeTab}
          onChange={(value) => setActiveTab(value)}
        />
      </section>

      {activeTab === 'rules' ? (
        <section className="space-y-4">
          {resultados.length === 0 ? (
            <MobileEmptyState
              title="Nenhuma regra ativa"
              description="Configure regras de ouro para receber alertas editoriais no mobile."
              icon={<Target className="h-8 w-8" />}
            />
          ) : (
            <>
              {score !== null ? (
                <MobileListCard
                  eyebrow="Score geral"
                  title={`${score}% de aderencia`}
                  description={`${resultados.filter((item) => item.status === 'ok').length} de ${resultados.length} regras cumpridas`}
                  trailing={<Gauge className="h-4 w-4 text-[var(--accent-green)]" />}
                />
              ) : null}

              <div className="space-y-3">
                {resultados.map(({ regra, status, detalhe }) => (
                  <MobileListCard
                    key={regra.id}
                    eyebrow={status === 'ok' ? 'OK' : status === 'aviso' ? 'Aviso' : 'Violacao'}
                    title={regra.descricao}
                    description={`${regra.tipo} · ${regra.periodo} · ${detalhe}`}
                    trailing={<span className="text-lg">{status === 'ok' ? '✓' : status === 'aviso' ? '!' : '×'}</span>}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      ) : null}

      {activeTab === 'mix' ? (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] bg-[var(--bg-hover)] p-1">
            {([30, 90] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onMixPeriodoChange(days)}
                className={`rounded-[1rem] px-3 py-3 text-xs font-black uppercase tracking-[0.14em] ${
                  mixPeriodo === days ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-tertiary)]'
                }`}
              >
                {days} dias
              </button>
            ))}
          </div>

          {semPostar.length > 0 ? (
            <div className="space-y-3">
              {semPostar.map(({ pilar }) => (
                <MobileListCard
                  key={pilar.id}
                  eyebrow="Alerta"
                  title={pilar.nome}
                  description={`Sem publicacoes nos ultimos ${mixPeriodo} dias.`}
                  trailing={<Target className="h-4 w-4 text-[var(--accent-orange)]" />}
                />
              ))}
            </div>
          ) : null}

          {mixData.length === 0 ? (
            <MobileEmptyState
              title="Nenhum pilar ativo"
              description="Ative pilares para acompanhar a distribuicao do mix no mobile."
              icon={<BarChart3 className="h-8 w-8" />}
            />
          ) : (
            <div className="space-y-3">
              {mixData.map(({ pilar, count, pct }) => (
                <div key={pilar.id} className="rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: pilar.cor }} />
                      <p className="text-sm font-black text-[var(--text-primary)]">{pilar.nome}</p>
                    </div>
                    <span className="text-[11px] font-black text-[var(--text-tertiary)]">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-hover)]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pilar.cor }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === 'performance' ? (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Views', value: totais.views },
              { label: 'Likes', value: totais.likes },
              { label: 'Saves', value: totais.saves },
              { label: 'Comentarios', value: totais.comments },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-[1.25rem] bg-[var(--bg-hover)] px-3 py-3">
                <p className="t-label text-[var(--text-tertiary)]">{label}</p>
                <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{value.toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {topViews.slice(0, 3).map(({ content, views }, index) => (
              <MobileListCard
                key={`views-${index}`}
                eyebrow={`Top views #${index + 1}`}
                title={content?.title || '(sem titulo)'}
                description={`${views.toLocaleString('pt-BR')} views`}
                trailing={<TrendingUp className="h-4 w-4 text-[var(--accent-blue)]" />}
              />
            ))}

            {topSaves.slice(0, 3).map(({ content, saves }, index) => (
              <MobileListCard
                key={`saves-${index}`}
                eyebrow={`Top saves #${index + 1}`}
                title={content?.title || '(sem titulo)'}
                description={`${saves.toLocaleString('pt-BR')} saves`}
                trailing={<Target className="h-4 w-4 text-[var(--accent-green)]" />}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
