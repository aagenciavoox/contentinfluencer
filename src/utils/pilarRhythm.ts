import type {Content, Pilar, Platform, Serie} from '../lib/database.ts';
import {
  isTimeWithinWindow,
  isWeekdayAllowed,
  resolvePlatformUuid,
} from '../features/settings/lib/pilarPostingSchedule.ts';
import type {Weekday} from '../features/settings/lib/postingTimes.ts';
import {isScriptWritten} from '../features/recommendations/contentStock.ts';
import {addDays, getDay, isWithinInterval, parseISO, startOfDay, startOfWeek} from 'date-fns';

export interface Violation {
  ruleId: string;
  type: 'deficit' | 'warning' | 'info';
  message: string;
  affectedContentIds: string[];
}

type DeficitTarget = {
  kind: 'pilar' | 'serie';
  id: string;
  label: string;
  target: number;
  count: number;
  missing: number;
  scheduledIds: string[];
};

function getWeekInterval(weekStart: Date) {
  return {
    start: startOfDay(weekStart),
    end: startOfDay(addDays(weekStart, 6)),
  };
}

function getRollingIntervalEndingAtWeek(weekStart: Date, dayCount: number) {
  const weekEnd = startOfDay(addDays(weekStart, 6));
  return {
    start: startOfDay(addDays(weekEnd, -(dayCount - 1))),
    end: weekEnd,
  };
}

function countHashtags(text: string): number {
  return (text.match(/#\w+/g) || []).length;
}

function dateToWeekday(dateValue: string): Weekday {
  return getDay(parseISO(dateValue)) as Weekday;
}

function findPilar(pilares: Pilar[], pilarId: string | null | undefined): Pilar | null {
  if (!pilarId) return null;
  return pilares.find(pilar => pilar.id === pilarId && pilar.ativo) ?? null;
}

function findPilarPlataforma(pilar: Pilar, platformRef: string, platforms: Platform[]) {
  const platformUuid = resolvePlatformUuid(platforms, platformRef);
  return (
    pilar.plataformas.find(
      item => item.platformId === platformRef || item.platformId === platformUuid,
    ) ?? null
  );
}

function parsePublishDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseISO(value);
  }
  return parseISO(value);
}

function contentsInInterval(contents: Content[], interval: {start: Date; end: Date}): Content[] {
  return contents.filter(content => {
    if (!content.publishDate) return false;
    try {
      return isWithinInterval(parsePublishDate(content.publishDate), interval);
    } catch {
      return false;
    }
  });
}

function publishedThisWeek(contents: Content[], weekStart: Date): Content[] {
  return contentsInInterval(contents, getWeekInterval(weekStart));
}

function serieWindowDays(frequencia: string | null | undefined): number | null {
  const normalized = (frequencia || '').trim().toLowerCase();
  if (normalized === 'semanal') return 7;
  if (normalized === 'quinzenal') return 14;
  if (normalized === 'mensal') return 28;
  return null;
}

function windowLabel(dayCount: number): string {
  if (dayCount === 7) return 'esta semana';
  if (dayCount === 14) return 'nos últimos 14 dias';
  if (dayCount === 28) return 'nos últimos 28 dias';
  return 'no período';
}

function validatePilarFrequency(
  pilares: Pilar[],
  weekContents: Content[],
  violations: Violation[],
  deficits: DeficitTarget[],
) {
  pilares
    .filter(pilar => pilar.ativo && pilar.frequenciaSemanal != null)
    .forEach(pilar => {
      const target = pilar.frequenciaSemanal!;
      const pillarContents = weekContents.filter(content => content.pilarId === pilar.id);
      const count = pillarContents.length;
      const scheduledIds = pillarContents.map(content => content.id);

      if (count > target) {
        violations.push({
          ruleId: `pilar-${pilar.id}-frequency`,
          type: 'warning',
          message: `${pilar.nome}: ${count} posts esta semana, acima da frequência de ${target}.`,
          affectedContentIds: scheduledIds,
        });
        return;
      }

      if (count < target) {
        const missing = target - count;
        deficits.push({
          kind: 'pilar',
          id: pilar.id,
          label: pilar.nome,
          target,
          count,
          missing,
          scheduledIds,
        });
        violations.push({
          ruleId: `pilar-${pilar.id}-under-frequency`,
          type: 'deficit',
          message: `${pilar.nome}: ${count}/${target} posts esta semana — faltam ${missing}.`,
          affectedContentIds: scheduledIds,
        });
      }
    });
}

function validateSerieFrequency(
  series: Serie[],
  contents: Content[],
  weekStart: Date,
  violations: Violation[],
  deficits: DeficitTarget[],
) {
  series
    .filter(serie => serie.ativa)
    .forEach(serie => {
      const dayCount = serieWindowDays(serie.frequenciaRecomendada);
      if (dayCount == null) return;

      const interval =
        dayCount === 7
          ? getWeekInterval(weekStart)
          : getRollingIntervalEndingAtWeek(weekStart, dayCount);
      const serieContents = contentsInInterval(contents, interval).filter(
        content => content.seriesId === serie.id,
      );
      const count = serieContents.length;
      const target = 1;
      const scheduledIds = serieContents.map(content => content.id);
      const period = windowLabel(dayCount);

      if (count < target) {
        const missing = target - count;
        deficits.push({
          kind: 'serie',
          id: serie.id,
          label: serie.name,
          target,
          count,
          missing,
          scheduledIds,
        });
        violations.push({
          ruleId: `serie-${serie.id}-under-frequency`,
          type: 'deficit',
          message: `${serie.name}: 0 posts ${period} (meta ${serie.frequenciaRecomendada}).`,
          affectedContentIds: scheduledIds,
        });
      }
    });
}

function countScriptBacklog(
  contents: Content[],
  kind: 'pilar' | 'serie',
  id: string,
): {count: number; ids: string[]} {
  const backlog = contents.filter(content => {
    if (content.publishDate) return false;
    if (kind === 'pilar' && content.pilarId !== id) return false;
    if (kind === 'serie' && content.seriesId !== id) return false;
    return isScriptWritten(content);
  });
  return {
    count: backlog.length,
    ids: backlog.map(content => content.id),
  };
}

function validateScriptCoverage(contents: Content[], deficits: DeficitTarget[], violations: Violation[]) {
  deficits.forEach(deficit => {
    const backlog = countScriptBacklog(contents, deficit.kind, deficit.id);
    if (backlog.count >= deficit.missing) return;

    const needScripts = deficit.missing - backlog.count;
    const scope = deficit.kind === 'pilar' ? 'pilar' : 'serie';
    violations.push({
      ruleId: `${scope}-${deficit.id}-needs-scripts`,
      type: 'deficit',
      message: `${deficit.label}: faltam ${deficit.missing} post${deficit.missing === 1 ? '' : 's'} e só há ${backlog.count} roteiro${backlog.count === 1 ? '' : 's'} pronto${backlog.count === 1 ? '' : 's'} — precisa de mais ${needScripts} roteiro${needScripts === 1 ? '' : 's'}.`,
      affectedContentIds: [...deficit.scheduledIds, ...backlog.ids],
    });
  });
}

function validatePlatformSchedule(
  pilares: Pilar[],
  platforms: Platform[],
  weekContents: Content[],
  violations: Violation[],
) {
  weekContents.forEach(content => {
    const pilar = findPilar(pilares, content.pilarId);
    if (!pilar) return;

    (content.plataformas || []).forEach(plataforma => {
      const publishDate = plataforma.publishDate || content.publishDate;
      if (!publishDate) return;

      const weekday = dateToWeekday(publishDate);
      const config = findPilarPlataforma(pilar, plataforma.platformId, platforms);
      if (!config) return;

      const publishTime = plataforma.publishTime || content.publishTime;

      if (config.melhoresDias.length > 0 && !isWeekdayAllowed(weekday, config.melhoresDias)) {
        violations.push({
          ruleId: `pilar-${pilar.id}-day-${plataforma.platformId}`,
          type: 'warning',
          message: `${pilar.nome} · ${plataforma.platformId}: dia fora dos melhores dias configurados no pilar.`,
          affectedContentIds: [content.id],
        });
      }

      if (
        publishTime &&
        (config.janelaHorarioInicio || config.janelaHorarioFim) &&
        !isTimeWithinWindow(publishTime, config.janelaHorarioInicio, config.janelaHorarioFim)
      ) {
        violations.push({
          ruleId: `pilar-${pilar.id}-window-${plataforma.platformId}`,
          type: 'warning',
          message: `${pilar.nome} · ${plataforma.platformId}: horário fora da janela configurada no pilar.`,
          affectedContentIds: [content.id],
        });
      }

      const templateCount = countHashtags(config.hashtags);
      const legendaCount = countHashtags(plataforma.legenda || '');
      if (templateCount > 0 && legendaCount > templateCount) {
        violations.push({
          ruleId: `pilar-${pilar.id}-hashtags-${plataforma.platformId}`,
          type: 'info',
          message: `${pilar.nome} · ${plataforma.platformId}: legenda com ${legendaCount} hashtags, acima do padrão (${templateCount}) do pilar.`,
          affectedContentIds: [content.id],
        });
      }
    });
  });
}

function dedupeViolations(violations: Violation[]): Violation[] {
  const seen = new Set<string>();
  return violations.filter(violation => {
    const key = `${violation.ruleId}-${[...violation.affectedContentIds].sort().join(',')}-${violation.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function validateWeeklyContent(
  contents: Content[],
  weekStart: Date,
  pilares: Pilar[] = [],
  platforms: Platform[] = [],
  series: Serie[] = [],
): Violation[] {
  const activePilares = pilares.filter(pilar => pilar.ativo);
  const activeSeries = series.filter(serie => serie.ativa);
  if (activePilares.length === 0 && activeSeries.length === 0) return [];

  const weekContents = publishedThisWeek(contents, weekStart);
  const violations: Violation[] = [];
  const deficits: DeficitTarget[] = [];

  validatePilarFrequency(activePilares, weekContents, violations, deficits);
  validateSerieFrequency(activeSeries, contents, weekStart, violations, deficits);
  validateScriptCoverage(contents, deficits, violations);
  if (activePilares.length > 0) {
    validatePlatformSchedule(activePilares, platforms, weekContents, violations);
  }

  return dedupeViolations(violations);
}

function violationKey(violation: Violation): string {
  return `${violation.ruleId}-${[...violation.affectedContentIds].sort().join(',')}-${violation.message}`;
}

export function diffViolations(before: Violation[], after: Violation[]): Violation[] {
  const beforeKeys = new Set(before.map(violationKey));
  return after.filter(violation => !beforeKeys.has(violationKey(violation)));
}

export function previewScheduleViolations(
  nextContents: Content[],
  dayKey: string,
  pilares: Pilar[] = [],
  platforms: Platform[] = [],
  series: Serie[] = [],
): Violation[] {
  const weekStart = startOfWeek(parseISO(dayKey), {weekStartsOn: 1});
  return validateWeeklyContent(nextContents, weekStart, pilares, platforms, series);
}
