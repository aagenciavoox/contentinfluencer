import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  FolderOpen,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { Text } from '../../../components/ui/Text';
import { Surface } from '../../../components/ui/Surface';
import { cn } from '../../../lib/utils';
import {
  fetchCampanhaPublica,
  type CampanhaPublicaData,
  type CampanhaPublicaEtapa,
} from '../../../lib/database';

const FOCUS_INTERACTIVE = 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(value: string | null) {
  if (!value) return null;
  return new Date(value + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtNum(value: number | null) {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pt-BR');
}

function fmtPct(value: number | null) {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
}

const ETAPA_STATUS: Record<CampanhaPublicaEtapa['status'], { label: string; icon: typeof CheckCircle2; color: string }> = {
  concluída: { label: 'Concluída', icon: CheckCircle2, color: 'var(--success)' },
  em_andamento: { label: 'Em andamento', icon: Clock, color: 'var(--warning)' },
  pendente: { label: 'Em aberto', icon: Circle, color: 'var(--text-tertiary)' },
};

const TIPO_COLOR: Record<string, string> = {
  campanha: 'var(--accent-blue)',
  publi:    'var(--accent-purple)',
  producao: 'var(--accent-green)',
  outro:    'var(--text-tertiary)',
};

const TIPO_LABEL: Record<string, string> = {
  campanha: 'Campanha',
  publi:    'Publi',
  producao: 'Produção',
  outro:    'Outro',
};

const STATUS_LABEL: Record<string, string> = {
  Planejando:    'Planejando',
  'Em andamento': 'Em andamento',
  Concluido:     'Concluído',
  Cancelado:     'Cancelado',
};

// Aggregate metrics across all content/platforms
function aggregateMetrics(metrics: CampanhaPublicaData['metrics']) {
  return metrics.reduce(
    (acc, m) => ({
      views:           acc.views + (m.views ?? 0),
      likes:           acc.likes + (m.likes ?? 0),
      comments:        acc.comments + (m.comments ?? 0),
      saves:           acc.saves + (m.saves ?? 0),
      shares:          acc.shares + (m.shares ?? 0),
      new_followers:   acc.new_followers + (m.new_followers ?? 0),
      accounts_reached:acc.accounts_reached + (m.accounts_reached ?? 0),
    }),
    { views: 0, likes: 0, comments: 0, saves: 0, shares: 0, new_followers: 0, accounts_reached: 0 }
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Surface variant="outlined" padding="lg">
      <Text variant="label" uppercase className="mb-2">{label}</Text>
      <Text variant="itemTitle" as="p" className="text-[1.75rem] font-bold tracking-tight">{value}</Text>
    </Surface>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        color,
      }}
    >
      {label}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="eyebrow" className="mb-4 block">
      {children}
    </Text>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export function CampanhaPublicaPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<CampanhaPublicaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    fetchCampanhaPublica(token).then(result => {
      if (!result) setNotFound(true);
      else setData(result);
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-[var(--bg-primary)]">
        <Text variant="bodyStrong">Campanha não encontrada</Text>
        <Text variant="secondary">O link pode ter expirado ou ser inválido.</Text>
      </div>
    );
  }

  const { projeto, etapas, agenda_items, conteudos, metrics, platforms } = data;
  const agg = aggregateMetrics(metrics);
  const hasMetrics = metrics.length > 0;
  const accentColor = projeto.color || projeto.brand_color || 'var(--text-primary)';
  const tipoColor = TIPO_COLOR[projeto.tipo] || 'var(--text-tertiary)';

  // published = has posted_at or status indicates published
  const publicados = conteudos.filter(c => c.posted_at || c.status === 'Publicado');
  const agendados  = conteudos.filter(c => c.publish_date && !c.posted_at && c.status !== 'Publicado');

  // Platform breakdown for metrics
  const platformMap = Object.fromEntries(platforms.map(p => [p.id, p.nome]));
  const metricsByPlatform = platforms.map(pl => {
    const plMetrics = metrics.filter(m => m.platform_id === pl.id);
    return {
      nome: pl.nome,
      totals: aggregateMetrics(plMetrics),
      count: plMetrics.length,
    };
  }).filter(p => p.count > 0);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] font-sans">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-elevated)] px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accentColor }} />
          <Text variant="bodyStrong" as="span">{projeto.brand || projeto.nome}</Text>
          {projeto.brand && (
            <Text variant="secondary" as="span">· {projeto.nome}</Text>
          )}
        </div>
        <Text variant="label" className="font-medium">Relatório de Campanha</Text>
      </div>

      {/* ── Content ── */}
      <div className="mx-auto max-w-[900px] px-6 pb-20 pt-10">

        {/* ── Header ── */}
        <div className="mb-9">
          <div className="mb-3 flex items-center gap-2.5">
            <StatusBadge label={TIPO_LABEL[projeto.tipo] || projeto.tipo} color={tipoColor} />
            <StatusBadge label={STATUS_LABEL[projeto.status] || projeto.status} color="var(--text-secondary)" />
          </div>
          <Text variant="pageTitle" className="mb-1.5">{projeto.nome}</Text>
          {projeto.brand && (
            <Text variant="secondary" className="mb-3">{projeto.brand}</Text>
          )}
          <div className="flex flex-wrap gap-4 text-[var(--text-secondary)]">
            {projeto.data_inicio && (
              <Text variant="secondary" as="span">
                Início: <strong className="text-[var(--text-primary)]">{fmtDate(projeto.data_inicio)}</strong>
              </Text>
            )}
            {projeto.data_fim && (
              <Text variant="secondary" as="span">
                Entrega: <strong className="text-[var(--text-primary)]">{fmtDate(projeto.data_fim)}</strong>
              </Text>
            )}
            {projeto.meta_conteudos != null && (
              <Text variant="secondary" as="span">
                Meta: <strong className="text-[var(--text-primary)]">{projeto.meta_conteudos} conteúdos</strong>
              </Text>
            )}
          </div>
        </div>

        {/* ── Drive link ── */}
        {projeto.drive_url && (
          <div className="mb-8">
            <a
              href={projeto.drive_url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-[18px] py-2.5 text-sm font-semibold text-[var(--text-primary)] no-underline transition-[border-color] hover:border-[var(--border-strong)]',
                FOCUS_INTERACTIVE,
              )}
            >
              <FolderOpen className="h-4 w-4 text-[var(--warning)]" />
              Pasta no Drive
              <ExternalLink className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            </a>
          </div>
        )}

        {/* ── Fases ── */}
        {etapas.length > 0 && (
          <section className="mb-10">
            <SectionTitle>Fases da campanha</SectionTitle>
            <Surface variant="outlined" padding="none">
              {etapas.map((etapa, idx) => {
                const cfg = ETAPA_STATUS[etapa.status] ?? ETAPA_STATUS.pendente;
                const Icon = cfg.icon;
                const isLast = idx === etapas.length - 1;
                return (
                  <div
                    key={etapa.id}
                    className={cn(
                      'flex items-start gap-3.5 px-6 py-4',
                      !isLast && 'border-b border-[var(--border-color)]',
                    )}
                  >
                    <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" style={{ color: cfg.color }} />
                    <div className="min-w-0 flex-1">
                      <Text variant="itemTitle">{etapa.nome}</Text>
                      {etapa.data_prazo && (
                        <Text variant="meta" className="mt-0.5">
                          Prazo: {fmtDate(etapa.data_prazo)}
                        </Text>
                      )}
                    </div>
                    <StatusBadge label={cfg.label} color={cfg.color} />
                  </div>
                );
              })}
            </Surface>
          </section>
        )}

        {/* ── Calendário de publicações ── */}
        {(agendados.length > 0 || publicados.length > 0 || agenda_items.length > 0) && (
          <section className="mb-10">
            <SectionTitle>Calendário de publicações</SectionTitle>
            <div className="grid gap-2">

              {/* Conteúdos agendados */}
              {agendados.map(c => (
                <Surface key={c.id} variant="outlined" padding="md" className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-primary)]">
                    <Calendar className="h-4 w-4 text-[var(--accent-blue)]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Text variant="itemTitle" truncate>{c.title || '(sem título)'}</Text>
                    <Text variant="meta" className="mt-0.5">
                      {fmtDate(c.publish_date)}{c.publish_time ? ` · ${c.publish_time}` : ''}
                    </Text>
                  </div>
                  <StatusBadge label="Agendado" color="var(--status-scheduled)" />
                </Surface>
              ))}

              {/* Conteúdos publicados */}
              {publicados.map(c => (
                <Surface key={c.id} variant="outlined" padding="md" className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-primary)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Text variant="itemTitle" truncate>{c.title || '(sem título)'}</Text>
                    {(c.posted_at || c.publish_date) && (
                      <Text variant="meta" className="mt-0.5">
                        Publicado {fmtDate(c.posted_at ?? c.publish_date)}
                      </Text>
                    )}
                  </div>
                  {c.link ? (
                    <a
                      href={c.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--success)] no-underline',
                        FOCUS_INTERACTIVE,
                      )}
                    >
                      Ver post <ExternalLink className="h-[11px] w-[11px]" />
                    </a>
                  ) : (
                    <StatusBadge label="Publicado" color="var(--success)" />
                  )}
                </Surface>
              ))}

              {/* Eventos de agenda (reuniões, entregas) */}
              {agenda_items.filter(a => a.tipo !== 'Publicação').map(a => (
                <Surface key={a.id} variant="outlined" padding="md" className="flex items-center gap-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-primary)]">
                    <Calendar className="h-4 w-4 text-[var(--text-tertiary)]" />
                  </span>
                  <div className="flex-1">
                    <Text variant="itemTitle">{a.title}</Text>
                    <Text variant="meta" className="mt-0.5">
                      {fmtDate(a.date)}{a.time ? ` · ${a.time}` : ''} · {a.tipo}
                    </Text>
                  </div>
                </Surface>
              ))}
            </div>
          </section>
        )}

        {/* ── Métricas ── */}
        {hasMetrics && (
          <section className="mb-10">
            <SectionTitle>Resultados</SectionTitle>

            {/* KPI grid */}
            <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {agg.views > 0            && <KpiCard label="Visualizações"   value={fmtNum(agg.views)} />}
              {agg.accounts_reached > 0 && <KpiCard label="Alcance"         value={fmtNum(agg.accounts_reached)} />}
              {agg.likes > 0            && <KpiCard label="Curtidas"        value={fmtNum(agg.likes)} />}
              {agg.comments > 0         && <KpiCard label="Comentários"     value={fmtNum(agg.comments)} />}
              {agg.saves > 0            && <KpiCard label="Salvamentos"     value={fmtNum(agg.saves)} />}
              {agg.shares > 0           && <KpiCard label="Compartilhamentos" value={fmtNum(agg.shares)} />}
              {agg.new_followers > 0    && <KpiCard label="Novos seguidores" value={fmtNum(agg.new_followers)} />}
            </div>

            {/* Per-platform breakdown */}
            {metricsByPlatform.length > 1 && (
              <>
                <SectionTitle>Por plataforma</SectionTitle>
                <Surface variant="outlined" padding="none">
                  {metricsByPlatform.map((pl, idx) => (
                    <div
                      key={pl.nome}
                      className={cn(
                        'grid grid-cols-[140px_repeat(4,1fr)] items-center gap-2 px-6 py-3.5',
                        idx < metricsByPlatform.length - 1 && 'border-b border-[var(--border-color)]',
                      )}
                    >
                      <Text variant="bodyStrong" as="span">{pl.nome}</Text>
                      <StatCell label="Views" value={fmtNum(pl.totals.views)} />
                      <StatCell label="Likes" value={fmtNum(pl.totals.likes)} />
                      <StatCell label="Comentários" value={fmtNum(pl.totals.comments)} />
                      <StatCell label="Saves" value={fmtNum(pl.totals.saves)} />
                    </div>
                  ))}
                </Surface>
              </>
            )}

            {/* Per-content details */}
            {metrics.length > 0 && (
              <div className="mt-6">
                <SectionTitle>Por conteúdo</SectionTitle>
                <Surface variant="outlined" padding="none">
                  {conteudos.map((c, idx) => {
                    const cMetrics = metrics.filter(m => m.content_id === c.id);
                    if (cMetrics.length === 0) return null;
                    const cAgg = aggregateMetrics(cMetrics);
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          'px-6 py-4',
                          idx < conteudos.length - 1 && 'border-b border-[var(--border-color)]',
                        )}
                      >
                        <div className="mb-2.5 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <TrendingUp className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
                            <Text variant="itemTitle" truncate>{c.title || '(sem título)'}</Text>
                          </div>
                          {c.link && (
                            <a
                              href={c.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                'flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--accent-blue)] no-underline',
                                FOCUS_INTERACTIVE,
                              )}
                            >
                              Ver post <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {cAgg.views > 0            && <Stat label="Views"        value={fmtNum(cAgg.views)} />}
                          {cAgg.accounts_reached > 0 && <Stat label="Alcance"      value={fmtNum(cAgg.accounts_reached)} />}
                          {cAgg.likes > 0            && <Stat label="Likes"        value={fmtNum(cAgg.likes)} />}
                          {cAgg.comments > 0         && <Stat label="Comentários"  value={fmtNum(cAgg.comments)} />}
                          {cAgg.saves > 0            && <Stat label="Saves"        value={fmtNum(cAgg.saves)} />}
                          {cAgg.shares > 0           && <Stat label="Shares"       value={fmtNum(cAgg.shares)} />}
                          {cMetrics[0]?.retention_rate  && <Stat label="Retenção"  value={fmtPct(cMetrics[0].retention_rate)} />}
                          {cMetrics[0]?.completion_rate && <Stat label="Conclusão" value={fmtPct(cMetrics[0].completion_rate)} />}
                        </div>
                        {cMetrics.map(cm => {
                          const plNome = platformMap[cm.platform_id];
                          if (!plNome) return null;
                          return (
                            <span
                              key={cm.id}
                              className="mr-1.5 mt-2 inline-block rounded px-2 py-0.5 text-xs font-semibold text-[var(--text-tertiary)] bg-[var(--bg-hover)]"
                            >
                              {plNome}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })}
                </Surface>
              </div>
            )}
          </section>
        )}

        {/* ── Notes ── */}
        {projeto.notes && (
          <section className="mb-10">
            <SectionTitle>Notas</SectionTitle>
            <Surface variant="outlined" padding="md">
              <Text variant="secondary" className="whitespace-pre-wrap leading-relaxed">{projeto.notes}</Text>
            </Surface>
          </section>
        )}

        {/* ── Footer ── */}
        <div className="mt-12 text-center">
          <Text variant="meta">
            Gerado por Content OS · {new Date().toLocaleDateString('pt-BR')}
          </Text>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-xs text-[var(--text-secondary)]">
      <Text variant="label" uppercase className="mb-0.5 block">{label}</Text>
      {value}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col gap-px">
      <Text variant="label" uppercase>{label}</Text>
      <Text variant="itemTitle" as="span">{value}</Text>
    </span>
  );
}
