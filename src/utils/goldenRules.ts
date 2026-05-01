import type {Content, GoldenRule} from '../lib/database.ts';
import {addDays, isWithinInterval, startOfDay} from 'date-fns';

export interface Violation {
  ruleId: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  affectedContentIds: string[];
}

function getWeekInterval(weekStart: Date) {
  return {
    start: startOfDay(weekStart),
    end: startOfDay(addDays(weekStart, 6)),
  };
}

function countHashtags(text: string): number {
  return (text.match(/#\w+/g) || []).length;
}

function getViolationType(rule: GoldenRule): Violation['type'] {
  if (rule.condicao === 'max') return 'error';
  if (rule.condicao === 'min') return 'warning';
  return 'info';
}

function compareRule(
  current: number,
  rule: GoldenRule
): {matched: boolean; detail: string} {
  const minimo = rule.minimo ?? (rule.condicao === 'min' ? rule.valor : null);
  const maximo = rule.maximo ?? (rule.condicao === 'max' ? rule.valor : null);

  if (minimo != null && current < minimo) {
    return {matched: true, detail: `${current} abaixo do mínimo ${minimo}`};
  }

  if (maximo != null && current > maximo) {
    return {matched: true, detail: `${current} acima do máximo ${maximo}`};
  }

  if (rule.condicao === 'recomendado' && rule.valor > 0 && current !== rule.valor) {
    return {matched: true, detail: `${current} fora do recomendado ${rule.valor}`};
  }

  return {matched: false, detail: ''};
}

export function validateWeeklyContent(
  contents: Content[],
  weekStart: Date,
  _legacyPilares?: unknown,
  rules: GoldenRule[] = []
): Violation[] {
  const interval = getWeekInterval(weekStart);

  const publishedThisWeek = contents.filter(content => {
    if (!content.publishDate) return false;
    try {
      return isWithinInterval(new Date(content.publishDate), interval);
    } catch {
      return false;
    }
  });

  const activeRules = rules.filter(rule => rule.ativa);
  const violations: Violation[] = [];

  activeRules.forEach(rule => {
    if (rule.tipo === 'publi') {
      const result = compareRule(publishedThisWeek.length, rule);
      if (result.matched) {
        violations.push({
          ruleId: rule.id,
          type: getViolationType(rule),
          message: `${rule.titulo || rule.descricao}: ${result.detail}`,
          affectedContentIds: publishedThisWeek.map(content => content.id),
        });
      }
      return;
    }

    if (rule.tipo === 'série') {
      const bySeries = new Map<string, Content[]>();
      publishedThisWeek.forEach(content => {
        if (!content.seriesId) return;
        const current = bySeries.get(content.seriesId) || [];
        current.push(content);
        bySeries.set(content.seriesId, current);
      });

      bySeries.forEach((seriesContents, seriesId) => {
        const result = compareRule(seriesContents.length, rule);
        if (result.matched) {
          violations.push({
            ruleId: rule.id,
            type: getViolationType(rule),
            message: `${rule.titulo || rule.descricao} — série ${seriesId}: ${result.detail}`,
            affectedContentIds: seriesContents.map(content => content.id),
          });
        }
      });
      return;
    }

    if (rule.tipo === 'formato') {
      const byFormat = new Map<string, Content[]>();
      publishedThisWeek.forEach(content => {
        if (!content.formatoVisual) return;
        const current = byFormat.get(content.formatoVisual) || [];
        current.push(content);
        byFormat.set(content.formatoVisual, current);
      });

      byFormat.forEach((formatContents, formatName) => {
        const result = compareRule(formatContents.length, rule);
        if (result.matched) {
          violations.push({
            ruleId: rule.id,
            type: getViolationType(rule),
            message: `${rule.titulo || rule.descricao} — formato ${formatName}: ${result.detail}`,
            affectedContentIds: formatContents.map(content => content.id),
          });
        }
      });
      return;
    }

    if (rule.tipo === 'plataforma') {
      publishedThisWeek.forEach(content => {
        (content.plataformas || []).forEach(plataforma => {
          const hashtagsCount = countHashtags(plataforma.legenda || '');
          const result = compareRule(hashtagsCount, rule);
          if (result.matched) {
            violations.push({
              ruleId: rule.id,
              type: getViolationType(rule),
              message: `${rule.titulo || rule.descricao} — ${plataforma.platformId}: ${result.detail}`,
              affectedContentIds: [content.id],
            });
          }
        });
      });
      return;
    }

    if (rule.tipo === 'pilar') {
      const byPillar = new Map<string, Content[]>();
      publishedThisWeek.forEach(content => {
        if (!content.pilarId) return;
        const current = byPillar.get(content.pilarId) || [];
        current.push(content);
        byPillar.set(content.pilarId, current);
      });

      byPillar.forEach((pillarContents, pillarId) => {
        const result = compareRule(pillarContents.length, rule);
        if (result.matched) {
          violations.push({
            ruleId: rule.id,
            type: getViolationType(rule),
            message: `${rule.titulo || rule.descricao} — pilar ${pillarId}: ${result.detail}`,
            affectedContentIds: pillarContents.map(content => content.id),
          });
        }
      });
    }
  });

  const seen = new Set<string>();
  return violations.filter(violation => {
    const key = `${violation.ruleId}-${violation.affectedContentIds.sort().join(',')}-${violation.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
