import { useState, useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import type { GoldenRule, Content } from '../../../lib/database';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { AnalyticsMobileScreen } from '../../../mobile/screens/analytics/AnalyticsMobileScreen';
import { AnalyticsCategoryCards, type RuleResult } from '../components/AnalyticsCategoryCards';

function periodoDias(periodo: GoldenRule['periodo']): number {
  if (periodo === 'semana') return 7;
  if (periodo === 'quinzena') return 14;
  return 30;
}

function contentsDoPeriodo(contents: Content[], dias: number): Content[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - dias);
  return contents.filter(c => c.status === 'Postado' && c.publishDate && new Date(c.publishDate) >= cutoff);
}

function avaliarRegra(regra: GoldenRule, contents: Content[]): RuleResult {
  const janela = contentsDoPeriodo(contents, periodoDias(regra.periodo));

  let count = 0;
  if (regra.tipo === 'pilar') {
    count = janela.length;
  } else if (regra.tipo === 'publi') {
    count = janela.filter(c => (c as {tipo?: string}).tipo === 'publi').length;
  } else if (regra.tipo === 'série') {
    count = janela.filter(c => c.seriesId).length;
  } else if (regra.tipo === 'formato') {
    count = janela.filter(c => c.formatoVisual).length;
  } else {
    count = janela.length;
  }

  const { condicao, minimo, maximo } = regra;
  const violacao = (minimo != null && count < minimo) || (maximo != null && count > maximo);
  const detalheRange = `${count} (min. ${minimo ?? '—'} · max. ${maximo ?? '—'})`;

  if (condicao === 'impedir') {
    if (violacao) return { regra, status: 'violacao', detalhe: detalheRange };
    return { regra, status: 'ok', detalhe: `${count} ok` };
  }

  if (violacao) return { regra, status: 'aviso', detalhe: detalheRange };
  return { regra, status: 'ok', detalhe: `${count} ok` };
}

export function AnalyticsPage() {
  const { state } = useAppContext();
  const isMobile = useIsMobile();
  const [mixPeriodo, setMixPeriodo] = useState<30 | 90>(30);
  const [perfPlatforma, setPerfPlatforma] = useState('');

  const regrasAtivas = state.goldenRules.filter(r => r.ativa);
  const resultados = useMemo(
    () => regrasAtivas.map(r => avaliarRegra(r, state.contents)),
    [regrasAtivas, state.contents]
  );
  const score = regrasAtivas.length > 0
    ? Math.round((resultados.filter(r => r.status === 'ok').length / regrasAtivas.length) * 100)
    : null;

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

  const postedContents = useMemo(
    () => contentsDoPeriodo(state.contents, 28),
    [state.contents]
  );

  const categoryProps = {
    resultados,
    score,
    regrasAtivasCount: regrasAtivas.length,
    mixPeriodo,
    onMixPeriodoChange: setMixPeriodo,
    mixData,
    semPostar,
    totais,
    topViews,
    postedContents,
    hasMetrics: state.contentMetrics.length > 0,
    perfPlatforma,
    onPerfPlatformaChange: setPerfPlatforma,
    platforms: state.platforms,
  };

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)] px-4 py-4">
        <AnalyticsMobileScreen {...categoryProps} topSaves={topSaves} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="desktop-header-frame">
        <DesktopPageHeader section="Inteligencia" title="Analise" icon={BarChart3} />
      </div>
      <div className="desktop-content-frame">
        <AnalyticsCategoryCards {...categoryProps} />
      </div>
    </div>
  );
}
