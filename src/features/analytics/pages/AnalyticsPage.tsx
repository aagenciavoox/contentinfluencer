import { useState, useMemo } from 'react';
import { BarChart3, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../../context/AppContext';
import type { GoldenRule, Content } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { useIsMobile } from '../../../hooks/useIsMobile';

type Aba = 'regras' | 'mix' | 'performance';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodoDias(periodo: GoldenRule['periodo']): number {
  if (periodo === 'dia') return 1;
  if (periodo === 'semana') return 7;
  return 30;
}

function contentsDoPeriodo(contents: Content[], dias: number): Content[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - dias);
  return contents.filter(c => c.status === 'Postado' && c.publishDate && new Date(c.publishDate) >= cutoff);
}

type RuleResult = { regra: GoldenRule; status: 'ok' | 'aviso' | 'violacao'; detalhe: string };

function avaliarRegra(regra: GoldenRule, contents: Content[]): RuleResult {
  const janela = contentsDoPeriodo(contents, periodoDias(regra.periodo));

  let count = 0;
  if (regra.tipo === 'pilar') {
    count = janela.length;
  } else if (regra.tipo === 'publi') {
    count = janela.filter(c => (c as any).tipo === 'publi').length;
  } else if (regra.tipo === 'série') {
    count = janela.filter(c => c.seriesId).length;
  } else if (regra.tipo === 'formato') {
    count = janela.filter(c => c.formatoVisual).length;
  } else {
    count = janela.length;
  }

  const { condicao, valor } = regra;

  if (condicao === 'max') {
    if (count > valor) return { regra, status: 'violacao', detalhe: `${count} (máx. ${valor})` };
    return { regra, status: 'ok', detalhe: `${count} / máx. ${valor}` };
  }
  if (condicao === 'min') {
    if (count < valor) return { regra, status: 'violacao', detalhe: `${count} (mín. ${valor})` };
    return { regra, status: 'ok', detalhe: `${count} / mín. ${valor}` };
  }
  if (condicao === 'recomendado') {
    if (count !== valor) return { regra, status: 'aviso', detalhe: `${count} (recomendado: ${valor})` };
    return { regra, status: 'ok', detalhe: `${count} ✓` };
  }

  return { regra, status: 'ok', detalhe: `${count}` };
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [aba, setAba] = useState<Aba>('regras');
  const [mixPeriodo, setMixPeriodo] = useState<30 | 90>(30);
  const [perfPlatforma, setPerfPlatforma] = useState('');

  // ── E1 — Regras de Ouro ──────────────────────────────────────────────────
  const regrasAtivas = state.goldenRules.filter(r => r.ativa);
  const resultados = useMemo(
    () => regrasAtivas.map(r => avaliarRegra(r, state.contents)),
    [regrasAtivas, state.contents]
  );
  const score = regrasAtivas.length > 0
    ? Math.round((resultados.filter(r => r.status === 'ok').length / regrasAtivas.length) * 100)
    : null;

  // ── E2 — Mix de Conteúdo ─────────────────────────────────────────────────
  const mixContents = contentsDoPeriodo(state.contents, mixPeriodo);
  const pilaresAtivos = state.pilares.filter(p => p.ativo);
  const mixData = useMemo(() => {
    const total = mixContents.length;
    return pilaresAtivos.map(p => {
      const count = mixContents.filter(c => c.pilarId === p.id).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { pilar: p, count, pct };
    });
  }, [mixContents, pilaresAtivos]);
  const semPostar = mixData.filter(d => d.count === 0);

  // ── E3 — Performance ─────────────────────────────────────────────────────
  const metricas = perfPlatforma
    ? state.contentMetrics.filter(m => m.platformId === perfPlatforma)
    : state.contentMetrics;

  const totais = useMemo(() => ({
    views: metricas.reduce((s, m) => s + (m.views || 0), 0),
    likes: metricas.reduce((s, m) => s + (m.likes || 0), 0),
    saves: metricas.reduce((s, m) => s + (m.saves || 0), 0),
    comments: metricas.reduce((s, m) => s + (m.comments || 0), 0),
  }), [metricas]);

  const topViews = useMemo(() => {
    const agrupado = new Map<string, number>();
    metricas.forEach(m => {
      agrupado.set(m.contentId, (agrupado.get(m.contentId) || 0) + (m.views || 0));
    });
    return [...agrupado.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([contentId, views]) => ({
        content: state.contents.find(c => c.id === contentId),
        views,
      }));
  }, [metricas, state.contents]);

  const topSaves = useMemo(() => {
    const agrupado = new Map<string, number>();
    metricas.forEach(m => {
      agrupado.set(m.contentId, (agrupado.get(m.contentId) || 0) + (m.saves || 0));
    });
    return [...agrupado.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([contentId, saves]) => ({
        content: state.contents.find(c => c.id === contentId),
        saves,
      }));
  }, [metricas, state.contents]);

  const abas: { key: Aba; label: string }[] = [
    { key: 'regras', label: 'Regras de Ouro' },
    { key: 'mix', label: 'Mix de Conteúdo' },
    { key: 'performance', label: 'Performance' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Inteligência"
          title="Análise"
          subtitle="Monitore consistência editorial, equilíbrio entre pilares e resultados de performance."
          icon={BarChart3}
        />
      </div>

      <div className="desktop-content-frame">

        {/* Abas */}
        <div className="flex gap-1 mb-8 border-b border-[var(--border-color)] overflow-x-auto">
          {abas.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={cn(
                'px-5 py-3 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 -mb-px',
                aba === key
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                  : 'border-transparent opacity-40 hover:opacity-70'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── ABA 1 — Regras de Ouro ── */}
        {aba === 'regras' && (
          <div className="space-y-4">
            {regrasAtivas.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhuma regra de ouro configurada</p>
                <button
                  onClick={() => navigate('/configuracoes/regras')}
                  className="text-[11px] font-black uppercase tracking-widest underline opacity-50"
                >
                  Configurar regras
                </button>
              </div>
            ) : (
              <>
                {/* Score card */}
                {score !== null && (
                  <div className="px-6 py-5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl flex items-center gap-4">
                    <div className="text-3xl font-black text-[var(--text-primary)]">{score}%</div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Score geral</p>
                      <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                        {resultados.filter(r => r.status === 'ok').length}/{regrasAtivas.length} regras cumpridas
                      </p>
                    </div>
                  </div>
                )}

                {/* Regras */}
                {resultados.map(({ regra, status, detalhe }) => (
                  <div
                    key={regra.id}
                    className={cn(
                      'flex items-center gap-4 px-5 py-4 bg-[var(--bg-primary)] border rounded-2xl',
                      status === 'violacao' ? 'border-red-500/30' : status === 'aviso' ? 'border-yellow-500/30' : 'border-[var(--border-color)]'
                    )}
                  >
                    <span className="text-lg shrink-0">
                      {status === 'ok' ? '✅' : status === 'aviso' ? '⚠️' : '❌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[var(--text-primary)]">{regra.descricao}</p>
                      <p className="text-[10px] font-bold opacity-40 mt-0.5 capitalize">
                        {regra.tipo} · {regra.periodo} · {detalhe}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── ABA 2 — Mix de Conteúdo ── */}
        {aba === 'mix' && (
          <div className="space-y-4">
            {/* Filtro de período */}
            {isMobile ? (
              <select
                value={mixPeriodo}
                onChange={(e) => setMixPeriodo(Number(e.target.value) as 30 | 90)}
                className="filter-select t-label w-full"
              >
                <option value={30}>Últimos 30 dias</option>
                <option value={90}>Últimos 90 dias</option>
              </select>
            ) : (
              <div className="flex gap-2">
                {([30, 90] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setMixPeriodo(d)}
                    className={cn(
                      'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all',
                      mixPeriodo === d
                        ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent'
                        : 'border-[var(--border-color)] opacity-50 hover:opacity-80'
                    )}
                  >
                    {d} dias
                  </button>
                ))}
              </div>
            )}

            {/* Alertas de pilares sem posts */}
            {semPostar.length > 0 && (
              <div className="space-y-2">
                {semPostar.map(({ pilar }) => (
                  <div key={pilar.id} className="flex items-center gap-3 px-5 py-3 bg-yellow-400/5 border border-yellow-400/20 rounded-2xl">
                    <span>⚠️</span>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      Você não postou nada de <strong>{pilar.nome}</strong> nos últimos {mixPeriodo} dias
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Barras por pilar */}
            {pilaresAtivos.length === 0 ? (
              <p className="text-center text-sm opacity-30 py-12 font-black uppercase tracking-widest">
                Nenhum pilar ativo configurado
              </p>
            ) : (
              <div className="space-y-3">
                {mixData.map(({ pilar, count, pct }) => (
                  <div key={pilar.id} className="px-5 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pilar.cor }} />
                        <span className="text-sm font-black text-[var(--text-primary)]">{pilar.nome}</span>
                      </div>
                      <span className="text-[11px] font-black opacity-50">{count} posts · {pct}%</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: pilar.cor }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ABA 3 — Performance ── */}
        {aba === 'performance' && (
          <div className="space-y-4">
            {/* Filtro plataforma */}
            <select
              value={perfPlatforma}
              onChange={e => setPerfPlatforma(e.target.value)}
              className="px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
            >
              <option value="">Todas as plataformas</option>
              {state.platforms.filter(p => p.ativo).map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>

            {state.contentMetrics.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhuma métrica registrada ainda</p>
                <p className="text-[11px] opacity-20 font-bold">Adicione métricas nos detalhes de cada conteúdo</p>
              </div>
            ) : (
              <>
                {/* Totais */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Views', value: totais.views },
                    { label: 'Likes', value: totais.likes },
                    { label: 'Saves', value: totais.saves },
                    { label: 'Comentários', value: totais.comments },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-5 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{label}</p>
                      <p className="text-2xl font-black text-[var(--text-primary)]">{value.toLocaleString('pt-BR')}</p>
                    </div>
                  ))}
                </div>

                {/* Top 5 por views */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Top 5 por Views</p>
                  <div className="space-y-2">
                    {topViews.map(({ content, views }, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                        <span className="text-[11px] font-black opacity-30 w-4 shrink-0">{i + 1}</span>
                        <p className="flex-1 text-sm font-black text-[var(--text-primary)] truncate min-w-0">
                          {content?.title || '(sem título)'}
                        </p>
                        <span className="text-[11px] font-black opacity-60 shrink-0">{views.toLocaleString('pt-BR')} views</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top 5 por saves */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Top 5 por Saves</p>
                  <div className="space-y-2">
                    {topSaves.map(({ content, saves }, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl">
                        <span className="text-[11px] font-black opacity-30 w-4 shrink-0">{i + 1}</span>
                        <p className="flex-1 text-sm font-black text-[var(--text-primary)] truncate min-w-0">
                          {content?.title || '(sem título)'}
                        </p>
                        <span className="text-[11px] font-black opacity-60 shrink-0">{saves.toLocaleString('pt-BR')} saves</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



