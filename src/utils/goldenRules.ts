import { Content, Violation } from '../types';
import { addDays, isWithinInterval, startOfDay } from 'date-fns';

function getWeekInterval(weekStart: Date) {
  return {
    start: startOfDay(weekStart),
    end: startOfDay(addDays(weekStart, 6)),
  };
}

function contarHashtags(texto: string): number {
  return (texto.match(/#\w+/g) || []).length;
}

import { Pilar } from '../types';

export function validateWeeklyContent(contents: Content[], weekStart: Date, pilares?: Pilar[]): Violation[] {
  const interval = getWeekInterval(weekStart);

  const semanais = contents.filter(c => {
    if (!c.publishDate) return false;
    try {
      return isWithinInterval(new Date(c.publishDate), interval);
    } catch {
      return false;
    }
  });

  const violations: Violation[] = [];

  // RG-01: Mesmo assunto/série: máx. 2 na semana
  // Agrupamos por seriesId (proxy de assunto)
  const porSerie: Record<string, Content[]> = {};
  semanais.forEach(c => {
    if (!c.seriesId) return;
    if (!porSerie[c.seriesId]) porSerie[c.seriesId] = [];
    porSerie[c.seriesId].push(c);
  });

  Object.entries(porSerie).forEach(([serieId, conteudos]) => {
    if (conteudos.length > 2) {
      violations.push({
        ruleId: 'RG-01',
        type: 'warning',
        message: `Série "${serieId}" aparece ${conteudos.length}x esta semana (máx. recomendado: 2)`,
        affectedContentIds: conteudos.map(c => c.id),
      });
    }
  });

  // RG-02: Mesma série: máx. 1 episódio por semana
  Object.entries(porSerie).forEach(([serieId, conteudos]) => {
    if (conteudos.length > 1) {
      violations.push({
        ruleId: 'RG-02',
        type: 'warning',
        message: `Série "${serieId}" tem ${conteudos.length} episódios esta semana (máx. 1 por semana)`,
        affectedContentIds: conteudos.map(c => c.id),
      });
    }
  });

  // RG-03: Mesmo formato visual: máx. 1 por dia
  const porDia: Record<string, Content[]> = {};
  semanais.forEach(c => {
    if (!c.publishDate) return;
    if (!porDia[c.publishDate]) porDia[c.publishDate] = [];
    porDia[c.publishDate].push(c);
  });

  Object.entries(porDia).forEach(([dia, conteudos]) => {
    const porFormato: Record<string, Content[]> = {};
    conteudos.forEach(c => {
      if (!c.formatoVisual) return;
      if (!porFormato[c.formatoVisual]) porFormato[c.formatoVisual] = [];
      porFormato[c.formatoVisual].push(c);
    });
    Object.entries(porFormato).forEach(([formato, cs]) => {
      if (cs.length > 1) {
        violations.push({
          ruleId: 'RG-03',
          type: 'info',
          message: `Formato visual "${formato}" aparece ${cs.length}x no dia ${dia} (máx. 1/dia)`,
          affectedContentIds: cs.map(c => c.id),
        });
      }
    });
  });

  // RG-05 e RG-06: Hashtags por plataforma
  semanais.forEach(c => {
    const legendas = c.legendas || {};
    const plataformas = c.plataformas || [];

    plataformas.forEach(plat => {
      const legenda = legendas[plat] || c.caption || '';
      if (!legenda) return;
      const n = contarHashtags(legenda);

      if ((plat === 'Instagram' || plat === 'TikTok') && n > 5) {
        violations.push({
          ruleId: 'RG-05',
          type: 'error',
          message: `"${c.title}" — ${plat} tem ${n} hashtags (máx. 5)`,
          affectedContentIds: [c.id],
        });
      }

      if (plat === 'YouTube' && (n < 8 || n > 10)) {
        violations.push({
          ruleId: 'RG-06',
          type: 'info',
          message: `"${c.title}" — YouTube tem ${n} hashtags (recomendado: 8–10)`,
          affectedContentIds: [c.id],
        });
      }
    });
  });

  // RG-07: Pilar dominante (>60%)
  if (semanais.length >= 3) {
    const porPilar: Record<string, number> = {};
    semanais.forEach(c => {
      if (!c.pillar) return;
      porPilar[c.pillar] = (porPilar[c.pillar] || 0) + 1;
    });

    Object.entries(porPilar).forEach(([pilar, count]) => {
      const pct = count / semanais.length;
      if (pct > 0.6) {
        violations.push({
          ruleId: 'RG-07',
          type: 'warning',
          message: `Pilar "${pilar}" domina ${Math.round(pct * 100)}% da semana (máx. recomendado: 60%)`,
          affectedContentIds: semanais.filter(c => c.pillar === pilar).map(c => c.id),
        });
      }
    });
  }

  // RG-MIX: Harmonia de Mix (Metas Semanais por Pilar)
  if (pilares && pilares.length > 0) {
    pilares.forEach(pilar => {
      if (!pilar.metaSemanalMax || pilar.metaSemanalMax === 0) return;
      
      const count = semanais.filter(c => c.pillar === pilar.nome).length;
      
      if (count < (pilar.metaSemanalMin || 0)) {
        violations.push({
          ruleId: 'RG-MIX',
          type: 'info',
          message: `Mix Semanal: Pilar "${pilar.nome}" tem ${count} posts (meta mín: ${pilar.metaSemanalMin})`,
          affectedContentIds: [],
        });
      } else if (count > pilar.metaSemanalMax) {
        violations.push({
          ruleId: 'RG-MIX',
          type: 'warning',
          message: `Mix Semanal: Pilar "${pilar.nome}" tem ${count} posts (meta máx: ${pilar.metaSemanalMax})`,
          affectedContentIds: []
        });
      }
    });
  }

  // Deduplica RG-01 e RG-02 (que apontam a mesma coisa, manter só o mais severo por série)
  const seen = new Set<string>();
  return violations.filter(v => {
    const key = `${v.ruleId}-${v.affectedContentIds.sort().join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
