import type {Content, FuncaoEditorial, Pilar, Platform, PostingTimeEntry, Serie} from '../lib/database.ts';
import {buildGradeEntries, type GradeEntry} from '../features/editorial/lib/gradeEntries.ts';
import {countGrade, distribuicaoFecha, type GradeCounts} from '../features/editorial/lib/gradeCounts.ts';
import type {EditorialSettings} from '../features/editorial/lib/editorialSettings.ts';
import {FUNCAO_CURTA} from '../features/editorial/lib/funcoes.ts';
import {pilarPrincipalDaSerie} from '../features/editorial/lib/pilarDaSerie.ts';
import {
  getCrossedPostingTimesForPilarPlatform,
  hasPilarPlatformSchedule,
  isTimeWithinWindow,
  isWeekdayAllowed,
  resolvePlatformUuid,
  type PilarPlatformSchedule,
} from '../features/settings/lib/pilarPostingSchedule.ts';
import {
  getTimesForDay,
  getTimesForDayFromEntries,
  WEEKDAY_SHORT,
  type PostingTimesSettings,
  type Weekday,
} from '../features/settings/lib/postingTimes.ts';
import {isScriptWritten} from '../features/recommendations/contentStock.ts';
import {addDays, format, getDay, isWithinInterval, parseISO, startOfDay, startOfWeek} from 'date-fns';

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
  if (dayCount === 7) return 'nesta semana';
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
          message: `${pilar.nome}: ${count} posts nesta semana, acima da frequência de ${target}.`,
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
          message: `${pilar.nome}: ${count} de ${target} posts nesta semana.`,
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
          message: `${serie.name}: nenhum post ${period} (ritmo ${(serie.frequenciaRecomendada || '').toLowerCase()}).`,
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
    const room = deficit.missing === 1 ? 'cabe mais 1 post' : `cabem mais ${deficit.missing} posts`;
    const ready =
      backlog.count === 0
        ? 'ainda não há roteiro pronto'
        : backlog.count === 1
          ? 'há 1 roteiro pronto'
          : `há ${backlog.count} roteiros prontos`;
    const cover = needScripts === 1 ? 'Mais 1 cobriria o ciclo' : `Mais ${needScripts} cobririam o ciclo`;
    violations.push({
      ruleId: `${scope}-${deficit.id}-needs-scripts`,
      type: 'deficit',
      message: `${deficit.label}: ${room} e ${ready}. ${cover}.`,
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

const VIOLATION_TYPE_PRIORITY: Record<Violation['type'], number> = {
  deficit: 0,
  warning: 1,
  info: 2,
};

const FREQUENCY_UNDER = /^(.+?): (\d+) de (\d+) posts nesta semana/;

/** Sort by severity, then by deficit magnitude hinted in the message ("1 de 3 posts", "cabem mais N"). */
export function prioritizeViolations(violations: Violation[]): Violation[] {
  const missingFromMessage = (message: string) => {
    const ratio = message.match(FREQUENCY_UNDER);
    if (ratio) return Math.max(0, Number(ratio[3]) - Number(ratio[2]));
    const match = message.match(/cabem? mais\s+(\d+)/i);
    return match ? Number(match[1]) : 0;
  };

  return [...violations].sort((left, right) => {
    const typeDiff = VIOLATION_TYPE_PRIORITY[left.type] - VIOLATION_TYPE_PRIORITY[right.type];
    if (typeDiff !== 0) return typeDiff;
    const missingDiff = missingFromMessage(right.message) - missingFromMessage(left.message);
    if (missingDiff !== 0) return missingDiff;
    return left.message.localeCompare(right.message, 'pt-BR');
  });
}

export type DayRhythmTone = 'over' | 'open';

/** Paint a calendar day from the week's rhythm: over target, or empty while the week is still short. */
export function dayRhythmTone(dayContentIds: string[], violations: Violation[]): DayRhythmTone | null {
  const overIds = new Set<string>();
  let weekIsShort = false;
  for (const violation of violations) {
    if (violation.type === 'warning') {
      for (const id of violation.affectedContentIds) overIds.add(id);
    } else if (violation.type === 'deficit') {
      weekIsShort = true;
    }
  }
  if (dayContentIds.some(id => overIds.has(id))) return 'over';
  if (weekIsShort && dayContentIds.length === 0) return 'open';
  return null;
}

export function summarizeViolations(violations: Violation[], topN = 3): {
  top: Violation[];
  rest: Violation[];
} {
  const sorted = prioritizeViolations(violations);
  return {
    top: sorted.slice(0, topN),
    rest: sorted.slice(topN),
  };
}

export interface RhythmProgress {
  key: string;
  label: string;
  count: number;
  target: number;
  tone: 'deficit' | 'over';
}

export interface RhythmNote {
  key: string;
  label: string;
  tone: Violation['type'];
}

const FREQUENCY_OVER = /^(.+?): (\d+) posts nesta semana, acima da frequência de (\d+)/;
const SERIE_ZERO = /^(.+?): nenhum post .+\(ritmo /;
const NEEDS_SCRIPTS = /^(.+?): cabem? mais \d+ posts? e .+\. Mais (\d+) cobririam? o ciclo/;

function noteBucket(message: string): {key: string; label: string} | null {
  if (message.includes('dia fora')) return {key: 'day', label: 'Dia fora do pilar'};
  if (message.includes('horário fora')) return {key: 'time', label: 'Horário fora da janela'};
  if (message.includes('hashtags')) return {key: 'tags', label: 'Hashtags acima do padrão'};
  return null;
}

/** Compact bars ("Identidade 0/6") plus short notes, instead of full violation sentences. */
export function summarizeRhythmProgress(violations: Violation[]): {
  progress: RhythmProgress[];
  notes: RhythmNote[];
} {
  const progress: RhythmProgress[] = [];
  const notes: RhythmNote[] = [];
  const buckets = new Map<string, {label: string; tone: Violation['type']; count: number}>();
  let scriptGaps = 0;

  for (const violation of prioritizeViolations(violations)) {
    const under = violation.message.match(FREQUENCY_UNDER);
    if (under) {
      progress.push({
        key: violation.ruleId,
        label: under[1],
        count: Number(under[2]),
        target: Number(under[3]),
        tone: 'deficit',
      });
      continue;
    }

    const over = violation.message.match(FREQUENCY_OVER);
    if (over) {
      progress.push({
        key: violation.ruleId,
        label: over[1],
        count: Number(over[2]),
        target: Number(over[3]),
        tone: 'over',
      });
      continue;
    }

    const serie = violation.message.match(SERIE_ZERO);
    if (serie) {
      progress.push({
        key: violation.ruleId,
        label: serie[1],
        count: 0,
        target: 1,
        tone: 'deficit',
      });
      continue;
    }

    if (NEEDS_SCRIPTS.test(violation.message)) {
      scriptGaps += 1;
      continue;
    }

    const bucket = noteBucket(violation.message);
    if (bucket) {
      const current = buckets.get(bucket.key) ?? {label: bucket.label, tone: violation.type, count: 0};
      current.count += 1;
      buckets.set(bucket.key, current);
      continue;
    }

    const headline = violation.message.split('—')[0]?.trim() || violation.message;
    notes.push({
      key: violation.ruleId,
      label: headline.length > 72 ? `${headline.slice(0, 69)}…` : headline,
      tone: violation.type,
    });
  }

  if (scriptGaps > 0) {
    notes.push({
      key: 'scripts',
      label: scriptGaps === 1 ? '1 frente com espaço para roteiros' : `${scriptGaps} frentes com espaço para roteiros`,
      tone: 'deficit',
    });
  }

  buckets.forEach((value, key) => {
    notes.push({
      key,
      label: value.count > 1 ? `${value.label} · ${value.count}` : value.label,
      tone: value.tone,
    });
  });

  return {progress, notes};
}

export type RhythmQuotaTone = 'met' | 'deficit' | 'over';

export interface RhythmSlotSuggestion {
  platformId: string | null;
  platformName: string | null;
  dayKey: string;
  weekday: Weekday;
  time: string;
}

export interface WeekRhythmQuota {
  key: string;
  kind: 'pilar' | 'serie' | 'funcao' | 'soma';
  id: string;
  label: string;
  color: string | null;
  count: number;
  target: number;
  tone: RhythmQuotaTone;
  /** Série quinzenal ou mensal, ou a janela de 4 semanas da grade pequena. */
  windowTag: '14d' | '28d' | '4 sem' | null;
  suggestions: RhythmSlotSuggestion[];
}

export interface WeekRhythmInput {
  contents: Content[];
  weekStart: Date;
  pilares: Pilar[];
  series: Serie[];
  platforms: Platform[];
  postingTimeEntries: PostingTimeEntry[];
  /** Horários globais antigos, usados quando ainda não há horário por plataforma. */
  fallbackTimes?: PostingTimesSettings;
  /** Rede de referência e distribuição. Sem isso, a faixa conta o legado e não mostra função. */
  editorial?: Pick<EditorialSettings, 'redeReferenciaId' | 'distribuicaoFuncoes'>;
}

function quotaTone(count: number, target: number): RhythmQuotaTone {
  if (count > target) return 'over';
  if (count < target) return 'deficit';
  return 'met';
}

function toneRank(tone: RhythmQuotaTone): number {
  if (tone === 'deficit') return 0;
  if (tone === 'over') return 1;
  return 2;
}

function compareQuotas(left: WeekRhythmQuota, right: WeekRhythmQuota): number {
  const rankDiff = toneRank(left.tone) - toneRank(right.tone);
  if (rankDiff !== 0) return rankDiff;
  return left.label.localeCompare(right.label, 'pt-BR');
}

function clockTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? `${match[1]}:${match[2]}` : null;
}

function collectUsedTimes(contents: Content[], weekStart: Date): Map<string, Set<string>> {
  const interval = getWeekInterval(weekStart);
  const used = new Map<string, Set<string>>();

  const add = (rawDate: string | null | undefined, rawTime: string | null | undefined) => {
    const time = clockTime(rawTime);
    if (!rawDate || !time) return;
    const dayKey = rawDate.slice(0, 10);
    let day: Date;
    try {
      day = parseISO(dayKey);
    } catch {
      return;
    }
    if (!isWithinInterval(day, interval)) return;
    const set = used.get(dayKey) ?? new Set<string>();
    set.add(time);
    used.set(dayKey, set);
  };

  for (const content of contents) {
    if (content.deletedAt) continue;
    if (content.plataformas.length > 0) {
      for (const plataforma of content.plataformas) {
        add(plataforma.publishDate || content.publishDate, plataforma.publishTime || content.publishTime);
      }
      continue;
    }
    add(content.publishDate, content.publishTime);
  }

  return used;
}

function findPlatform(platforms: Platform[], platformRef: string): Platform | null {
  return platforms.find(platform => platform.ativo && (platform.id === platformRef || platform.nome === platformRef)) ?? null;
}

interface SlotSource {
  platform: Platform;
  schedule: PilarPlatformSchedule | null;
}

function timesForSource(
  source: SlotSource,
  entries: PostingTimeEntry[],
  weekday: Weekday,
  fallback: PostingTimesSettings | undefined,
): string[] {
  if (entries.length > 0) {
    if (source.schedule && hasPilarPlatformSchedule(source.schedule)) {
      return getCrossedPostingTimesForPilarPlatform(source.schedule, entries, source.platform.id, weekday);
    }
    return getTimesForDayFromEntries(entries, source.platform.id, weekday);
  }

  const globalTimes = fallback ? getTimesForDay(fallback, weekday) : [];
  if (!source.schedule || !hasPilarPlatformSchedule(source.schedule)) return globalTimes;
  if (!isWeekdayAllowed(weekday, source.schedule.melhoresDias)) return [];
  return globalTimes.filter(time =>
    isTimeWithinWindow(time, source.schedule?.janelaHorarioInicio ?? null, source.schedule?.janelaHorarioFim ?? null),
  );
}

function collectSlots(
  sources: SlotSource[],
  entries: PostingTimeEntry[],
  weekStart: Date,
  used: Map<string, Set<string>>,
  fallback: PostingTimesSettings | undefined,
): RhythmSlotSuggestion[] {
  const slots: RhythmSlotSuggestion[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const day = addDays(startOfDay(weekStart), offset);
    const weekday = getDay(day) as Weekday;
    const dayKey = format(day, 'yyyy-MM-dd');
    const taken = used.get(dayKey) ?? new Set<string>();
    for (const source of sources) {
      for (const time of timesForSource(source, entries, weekday, fallback)) {
        if (taken.has(time)) continue;
        slots.push({
          platformId: source.platform.id,
          platformName: source.platform.nome,
          dayKey,
          weekday,
          time,
        });
      }
    }
  }
  slots.sort(
    (left, right) =>
      left.dayKey.localeCompare(right.dayKey) ||
      left.time.localeCompare(right.time) ||
      (left.platformName ?? '').localeCompare(right.platformName ?? '', 'pt-BR'),
  );
  const seen = new Set<string>();
  return slots.filter(slot => {
    const key = `${slot.dayKey}|${slot.time}|${slot.platformId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pilarSources(pilar: Pilar, platforms: Platform[]): SlotSource[] {
  return pilar.plataformas.flatMap(config => {
    const platform = findPlatform(platforms, config.platformId);
    if (!platform) return [];
    return [{platform, schedule: config}];
  });
}

function serieSources(serie: Serie, pilares: Pilar[], platforms: Platform[]): SlotSource[] {
  const principalId = pilarPrincipalDaSerie(serie);
  const linked = principalId
    ? pilares.filter(pilar => pilar.ativo && pilar.id === principalId)
    : pilares.filter(pilar => pilar.ativo && serie.pilarIds.includes(pilar.id));
  if (linked.length > 0) {
    return linked.flatMap(pilar => pilarSources(pilar, platforms));
  }
  return serie.plataformas.flatMap(config => {
    const platform = findPlatform(platforms, config.platformId);
    if (!platform) return [];
    return [{platform, schedule: null}];
  });
}

const PLATFORM_TAGS: Record<string, string> = {
  instagram: 'IG',
  tiktok: 'TT',
  youtube: 'YT',
  facebook: 'FB',
  linkedin: 'LI',
  twitter: 'TW',
  threads: 'TH',
  pinterest: 'PI',
};

function platformTag(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  const known = PLATFORM_TAGS[parts.join(' ').toLowerCase()];
  if (known) return known;
  if (parts.length >= 2) {
    return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
  }
  return (parts[0] ?? '').slice(0, 2).toUpperCase();
}

export function formatRhythmSlot(slot: RhythmSlotSuggestion): string {
  const day = WEEKDAY_SHORT[slot.weekday].toLowerCase();
  const tag = slot.platformName ? platformTag(slot.platformName) : '';
  return tag ? `${tag} ${day} ${slot.time}` : `${day} ${slot.time}`;
}

function entriesInInterval(entries: readonly GradeEntry[], interval: {start: Date; end: Date}): GradeEntry[] {
  return entries.filter(entry => {
    if (!entry.contaNaGrade || !entry.data) return false;
    try {
      return isWithinInterval(parseISO(entry.data), interval);
    } catch {
      return false;
    }
  });
}

function pilarQuotas(
  input: WeekRhythmInput,
  used: Map<string, Set<string>>,
  counts: GradeCounts,
): WeekRhythmQuota[] {
  const porId = new Map(counts.pilares.map(linha => [linha.id, linha]));
  const janela = counts.gradePequena ? '4 sem' as const : null;
  return input.pilares
    .filter(pilar => pilar.ativo && pilar.frequenciaSemanal != null)
    .map(pilar => {
      const linha = porId.get(pilar.id);
      const target = linha?.meta ?? 0;
      const count = linha?.planejado ?? 0;
      const tone = quotaTone(count, target);
      return {
        key: `pilar-${pilar.id}`,
        kind: 'pilar' as const,
        id: pilar.id,
        label: pilar.nome,
        color: pilar.cor,
        count,
        target,
        tone,
        windowTag: janela,
        suggestions:
          tone === 'deficit'
            ? collectSlots(pilarSources(pilar, input.platforms), input.postingTimeEntries, input.weekStart, used, input.fallbackTimes).slice(0, 2)
            : [],
      };
    });
}

function funcaoQuotas(counts: GradeCounts, mostrar: boolean): WeekRhythmQuota[] {
  if (!mostrar) return [];
  const janela = counts.gradePequena ? '4 sem' as const : null;
  return counts.funcoes
    .filter(linha => linha.meta > 0 || linha.planejado > 0)
    .map(linha => {
      const id = linha.id as FuncaoEditorial;
      return {
        key: `funcao-${linha.id}`,
        kind: 'funcao' as const,
        id: linha.id,
        label: FUNCAO_CURTA[id] ?? linha.rotulo,
        color: null,
        count: linha.planejado,
        target: linha.meta,
        tone: quotaTone(linha.planejado, linha.meta),
        windowTag: janela,
        suggestions: [],
      };
    });
}

function serieQuotas(input: WeekRhythmInput, used: Map<string, Set<string>>, entries: readonly GradeEntry[]): WeekRhythmQuota[] {
  const quotas: WeekRhythmQuota[] = [];
  for (const serie of input.series) {
    if (!serie.ativa) continue;
    const dayCount = serieWindowDays(serie.frequenciaRecomendada);
    if (dayCount == null) continue;
    const interval = dayCount === 7 ? getWeekInterval(input.weekStart) : getRollingIntervalEndingAtWeek(input.weekStart, dayCount);
    const count = entriesInInterval(entries, interval).filter(entry => entry.serieId === serie.id).length;
    const target = 1;
    const tone = quotaTone(count, target);
    if (dayCount !== 7 && tone !== 'deficit') continue;
    const principalId = pilarPrincipalDaSerie(serie);
    const linked = input.pilares.find(pilar => pilar.ativo && pilar.id === (principalId ?? serie.pilarIds[0]));
    quotas.push({
      key: `serie-${serie.id}`,
      kind: 'serie',
      id: serie.id,
      label: serie.name,
      color: serie.cor || linked?.cor || null,
      count,
      target,
      tone,
      windowTag: dayCount === 14 ? '14d' : dayCount === 28 ? '28d' : null,
      suggestions:
        tone === 'deficit'
          ? collectSlots(serieSources(serie, input.pilares, input.platforms), input.postingTimeEntries, input.weekStart, used, input.fallbackTimes).slice(0, 2)
          : [],
    });
  }
  return quotas;
}

/** Cotas da semana para a faixa de ritmo, lidas das entradas da grade. */
export function buildWeekRhythmQuotas(input: WeekRhythmInput): WeekRhythmQuota[] {
  const used = collectUsedTimes(input.contents, input.weekStart);
  const entries = buildGradeEntries({
    contents: input.contents,
    series: input.series,
    settings: {redeReferenciaId: input.editorial?.redeReferenciaId ?? null},
  });
  const inicio = format(startOfDay(input.weekStart), 'yyyy-MM-dd');
  const counts = countGrade({
    entries,
    pilares: input.pilares,
    settings: {distribuicaoFuncoes: input.editorial?.distribuicaoFuncoes ?? null},
    periodo: {inicio, fim: format(addDays(startOfDay(input.weekStart), 6), 'yyyy-MM-dd')},
  });
  const pillars = pilarQuotas(input, used, counts).sort(compareQuotas);
  const funcoes = funcaoQuotas(counts, distribuicaoFecha(input.editorial?.distribuicaoFuncoes)).sort(compareQuotas);
  const series = serieQuotas(input, used, entries).sort(compareQuotas);
  const soma: WeekRhythmQuota[] = counts.notaSoma
    ? [{
        key: 'soma-pilares',
        kind: 'soma',
        id: 'soma',
        label: counts.notaSoma,
        color: null,
        count: counts.somaPlanejado,
        target: counts.totalMeta,
        tone: 'met',
        windowTag: null,
        suggestions: [],
      }]
    : [];
  return [...pillars, ...funcoes, ...series, ...soma];
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
