import type {Content, Pilar, Platform} from '../lib/database.ts';
import {
  isTimeWithinWindow,
  isWeekdayAllowed,
  resolvePlatformUuid,
} from '../features/settings/lib/pilarPostingSchedule.ts';
import type {Weekday} from '../features/settings/lib/postingTimes.ts';
import {addDays, getDay, isWithinInterval, parseISO, startOfDay, startOfWeek} from 'date-fns';

export interface Violation {
  ruleId: string;
  type: 'warning' | 'info';
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

function publishedThisWeek(contents: Content[], weekStart: Date): Content[] {
  const interval = getWeekInterval(weekStart);
  return contents.filter(content => {
    if (!content.publishDate) return false;
    try {
      return isWithinInterval(parsePublishDate(content.publishDate), interval);
    } catch {
      return false;
    }
  });
}

function validatePilarFrequency(
  pilares: Pilar[],
  weekContents: Content[],
  violations: Violation[],
) {
  pilares
    .filter(pilar => pilar.ativo && pilar.frequenciaSemanal != null)
    .forEach(pilar => {
      const target = pilar.frequenciaSemanal!;
      const pillarContents = weekContents.filter(content => content.pilarId === pilar.id);
      const count = pillarContents.length;

      if (count > target) {
        violations.push({
          ruleId: `pilar-${pilar.id}-frequency`,
          type: 'warning',
          message: `${pilar.nome}: ${count} posts esta semana, acima da frequência de ${target}.`,
          affectedContentIds: pillarContents.map(content => content.id),
        });
      }
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
): Violation[] {
  const activePilares = pilares.filter(pilar => pilar.ativo);
  if (activePilares.length === 0) return [];

  const weekContents = publishedThisWeek(contents, weekStart);
  const violations: Violation[] = [];

  validatePilarFrequency(activePilares, weekContents, violations);
  validatePlatformSchedule(activePilares, platforms, weekContents, violations);

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
): Violation[] {
  const weekStart = startOfWeek(parseISO(dayKey), {weekStartsOn: 1});
  return validateWeeklyContent(nextContents, weekStart, pilares, platforms);
}
