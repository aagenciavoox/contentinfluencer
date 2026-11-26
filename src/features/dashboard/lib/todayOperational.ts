import { addDays, format, parseISO } from 'date-fns';
import type { Content, Platform, RecordingBlock, Serie } from '../../../lib/database.ts';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute.ts';
import {
  CONTENT_STATUS,
  getDisplayStatus,
  isReadyToPublish,
  normalizeContentStatus,
} from '../../contents/lib/contentPipeline.ts';
import { isActiveCreation, isPostedContent } from '../../contents/lib/contentWorkflow.ts';
import { buildPublishCalendarItems, publishItemStatus } from '../../editorial-calendar/lib/publishCalendarItems.ts';
import { semanaDe } from '../../editorial/lib/periodoEditorial.ts';
import { isBlockContentComplete } from '../../recording/lib/recordingWorkflow.ts';
import { formatWeekdayShort, localDateKey } from './dayPulse.ts';

type CalendarInput = Parameters<typeof buildPublishCalendarItems>[0];

export type EditorialFocusStage = 'roteiro' | 'gravacao' | 'edicao';

export interface EditorialFocusItem {
  id: string;
  contentId: string;
  stage: EditorialFocusStage;
  stageLabel: string;
  badgeStatus: string;
  accentColorVar: string;
  seriesName: string | null;
  platformNames: string[];
  title: string;
  excerpt: string;
  nextAction: string;
  ctaLabel: string;
  to: string;
}

export interface UpcomingPublicationGroup {
  key: string;
  contentId: string;
  content: Content;
  date: string;
  dayBadge: string;
  isToday: boolean;
  time: string | null;
  platforms: string[];
  status: string;
  statusLabel: string;
  subtitleNote: string;
}

export interface WeeklyPaceDay {
  dayKey: string;
  label: string;
  count: number;
  isToday: boolean;
  isPastOrToday: boolean;
}

export interface WeeklyPaceSummary {
  weekCount: number;
  postedCount: number;
  target: number | null;
  summaryText: string;
  days: WeeklyPaceDay[];
}

const WEEKDAY_SHORT_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

export function resolveTimeGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function buildOperationalSubtitle({
  inProductionCount,
  todayPublicationsCount,
  showCounts,
  dataReady,
  pauseMode,
}: {
  inProductionCount: number;
  todayPublicationsCount: number;
  showCounts: boolean;
  dataReady: boolean;
  pauseMode: boolean;
}): string {
  if (pauseMode) {
    return 'Modo pausa ativo — sugestões ficam de lado enquanto você cria no seu ritmo.';
  }
  if (!dataReady) {
    return 'Reunindo seus conteúdos em andamento e as próximas publicações.';
  }
  if (!showCounts) {
    return 'Seus conteúdos em andamento e as próximas publicações em um só lugar.';
  }
  const prodLabel =
    inProductionCount === 1
      ? '1 conteúdo em produção'
      : `${inProductionCount} conteúdos em produção`;
  const pubLabel =
    todayPublicationsCount === 1
      ? '1 publicação prevista para hoje'
      : `${todayPublicationsCount} publicações previstas para hoje`;

  if (inProductionCount > 0 && todayPublicationsCount > 0) {
    return `${prodLabel} e ${pubLabel}.`;
  }
  if (inProductionCount > 0) {
    return `${prodLabel} no fluxo editorial.`;
  }
  if (todayPublicationsCount > 0) {
    return `${pubLabel}.`;
  }
  return 'Fluxo tranquilo por aqui — ótimo momento para anotar uma nova ideia.';
}

function stripMarkup(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  const base = lastSpace > maxLength * 0.6 ? sliced.slice(0, lastSpace) : sliced;
  return `${base.trimEnd()}…`;
}

function resolvePlatformNames(content: Content, platforms: readonly { id: string; nome: string }[]): string[] {
  const byId = new Map(platforms.map(platform => [platform.id, platform.nome]));
  const names: string[] = [];
  for (const item of content.plataformas ?? []) {
    if (item.status === 'removida' || item.status === 'nao_publicada') continue;
    const label = byId.get(item.platformId) ?? item.platformId;
    if (label && !names.includes(label)) names.push(label);
  }
  return names;
}

function resolveExcerpt(content: Content, stage: EditorialFocusStage): string {
  const notes = stripMarkup(content.notes);
  if (notes) return truncateText(notes, 150);
  const script = stripMarkup(content.script);
  if (script) return truncateText(script, 150);
  if (stage === 'gravacao') {
    return 'Roteiro pronto para entrar no modo teleprompter e gravar os takes.';
  }
  if (stage === 'edicao') {
    return 'Material em edição aguardando revisão final e conferência de legenda.';
  }
  return 'Rascunho aberto pronto para desenvolver gancho, estrutura e fechamento.';
}

function hasPendingCaption(content: Content): boolean {
  const active = (content.plataformas ?? []).filter(
    item => item.status !== 'removida' && item.status !== 'nao_publicada',
  );
  if (active.length === 0) return false;
  return active.some(item => !item.legenda?.trim());
}

function resolveStageForContent(
  content: Content,
  recordingEnabled: boolean,
): EditorialFocusStage | null {
  const status = normalizeContentStatus(content.status);
  if (status === CONTENT_STATUS.ROTEIRO) return 'roteiro';
  if (status === CONTENT_STATUS.PRODUCAO) return recordingEnabled ? 'gravacao' : 'roteiro';
  if (status === CONTENT_STATUS.EDICAO && !content.edicaoConcluidaEm) return 'edicao';
  return null;
}

function buildFocusItem(
  content: Content,
  stage: EditorialFocusStage,
  seriesById: Map<string, Serie>,
  platforms: readonly Platform[],
  blockByContentId: Map<string, RecordingBlock>,
): EditorialFocusItem {
  const seriesName = content.seriesId ? (seriesById.get(content.seriesId)?.name ?? null) : null;
  const platformNames = resolvePlatformNames(content, platforms);
  const title = content.title.trim() || 'Sem título';
  const excerpt = resolveExcerpt(content, stage);
  const block = blockByContentId.get(content.id);

  if (stage === 'gravacao') {
    const nextAction = block
      ? `Gravar na sessão "${block.name.trim() || 'Sessão de gravação'}" em modo teleprompter`
      : 'Gravar takes no modo teleprompter';
    return {
      id: content.id,
      contentId: content.id,
      stage,
      stageLabel: 'Gravação pronta',
      badgeStatus: 'Pronto para Gravar',
      accentColorVar: 'var(--status-ready)',
      seriesName,
      platformNames,
      title,
      excerpt,
      nextAction,
      ctaLabel: 'Gravar agora',
      to: block ? `/gravacao/${block.id}?burst=1` : buildContentDetailRoute(content.id, 'gravacao'),
    };
  }

  if (stage === 'edicao') {
    const captionMissing = hasPendingCaption(content);
    return {
      id: content.id,
      contentId: content.id,
      stage,
      stageLabel: 'Em edição',
      badgeStatus: 'Em edição',
      accentColorVar: 'var(--status-editing)',
      seriesName,
      platformNames,
      title,
      excerpt,
      nextAction: captionMissing
        ? 'Revisar corte final e completar a legenda'
        : 'Revisar corte final e confirmar publicação',
      ctaLabel: 'Revisar',
      to: buildContentDetailRoute(content.id, 'publicacao'),
    };
  }

  const hasScriptBody = stripMarkup(content.script).length > 0;
  return {
    id: content.id,
    contentId: content.id,
    stage: 'roteiro',
    stageLabel: 'Roteiro em andamento',
    badgeStatus: 'Roteiro',
    accentColorVar: 'var(--brand-accent-strong)',
    seriesName,
    platformNames,
    title,
    excerpt,
    nextAction: hasScriptBody
      ? 'Revisar o roteiro e avançar para gravação'
      : 'Escrever gancho de abertura e estruturar o roteiro',
    ctaLabel: 'Abrir roteiro',
    to: buildContentDetailRoute(content.id, 'roteiro'),
  };
}

/**
 * Seleciona até 3 conteúdos ativos em produção para a coluna "Trabalhar hoje",
 * equilibrando Roteiro, Gravação pronta e Edição antes de completar com o restante.
 */
export function getTodayEditorialFocus({
  contents,
  recordingBlocks,
  series,
  platforms,
  recordingEnabled,
  limit = 3,
}: {
  contents: readonly Content[];
  recordingBlocks: readonly RecordingBlock[];
  series: readonly Serie[];
  platforms: readonly Platform[];
  recordingEnabled: boolean;
  limit?: number;
}): EditorialFocusItem[] {
  const active = contents.filter(content => isActiveCreation(content) && !isPostedContent(content));
  const seriesById = new Map(series.map(serie => [serie.id, serie]));

  const blockByContentId = new Map<string, RecordingBlock>();
  if (recordingEnabled) {
    const activeById = new Map(active.map(content => [content.id, content]));
    const sortedBlocks = [...recordingBlocks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    for (const block of sortedBlocks) {
      for (const item of block.contents) {
        const content = activeById.get(item.contentId);
        if (content && !isBlockContentComplete(item, content) && !blockByContentId.has(content.id)) {
          blockByContentId.set(content.id, block);
        }
      }
    }
  }

  const sorted = [...active].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const buckets: Record<EditorialFocusStage, Content[]> = {
    roteiro: [],
    gravacao: [],
    edicao: [],
  };

  for (const content of sorted) {
    const stage = resolveStageForContent(content, recordingEnabled);
    if (!stage) continue;
    buckets[stage].push(content);
  }

  const selected: Array<{ content: Content; stage: EditorialFocusStage }> = [];
  const usedIds = new Set<string>();

  for (const stage of ['roteiro', 'gravacao', 'edicao'] as const) {
    const candidate = buckets[stage][0];
    if (candidate && selected.length < limit) {
      selected.push({ content: candidate, stage });
      usedIds.add(candidate.id);
    }
  }

  if (selected.length < limit) {
    for (const content of sorted) {
      if (selected.length >= limit) break;
      if (usedIds.has(content.id)) continue;
      const stage = resolveStageForContent(content, recordingEnabled);
      if (!stage) continue;
      selected.push({ content, stage });
      usedIds.add(content.id);
    }
  }

  return selected.map(({ content, stage }) =>
    buildFocusItem(content, stage, seriesById, platforms, blockByContentId),
  );
}

function resolvePublicationStatusChip({
  allPosted,
  anyScheduled,
  content,
}: {
  allPosted: boolean;
  anyScheduled: boolean;
  content: Content;
}): { status: string; statusLabel: string; subtitleNote: string } {
  const captionMissing = hasPendingCaption(content);
  if (allPosted || isPostedContent(content)) {
    return { status: 'Postado', statusLabel: 'Publicado', subtitleNote: 'Publicação concluída' };
  }
  if (anyScheduled) {
    return {
      status: 'Agendado',
      statusLabel: 'Agendado',
      subtitleNote: captionMissing ? 'Agendado · falta legenda' : 'Upload programado',
    };
  }
  if (isReadyToPublish(content)) {
    return {
      status: 'Pronto para Gravar',
      statusLabel: 'Pronto para postar',
      subtitleNote: captionMissing ? 'Falta revisar legenda' : 'Pronto com legenda',
    };
  }
  const display = getDisplayStatus(content);
  if (display === 'Roteiro' || normalizeContentStatus(content.status) === CONTENT_STATUS.ROTEIRO) {
    return {
      status: 'Roteiro',
      statusLabel: 'Em roteiro',
      subtitleNote: 'Roteiro em andamento',
    };
  }
  if (display === 'Edição' || normalizeContentStatus(content.status) === CONTENT_STATUS.EDICAO) {
    return {
      status: 'Em edição',
      statusLabel: captionMissing ? 'Revisando legenda' : 'Em edição',
      subtitleNote: captionMissing ? 'Aguardando revisão de legenda' : 'Em etapa de edição',
    };
  }
  return {
    status: 'Material em produção',
    statusLabel: 'Em produção',
    subtitleNote: 'Material em produção',
  };
}

function formatDayBadge(dateKey: string, todayKey: string, tomorrowKey: string): string {
  if (dateKey === todayKey) return 'Hoje';
  if (dateKey === tomorrowKey) return 'Amanhã';
  return formatWeekdayShort(parseISO(dateKey));
}

/**
 * Publicações previstas nos próximos N dias (padrão: hoje + 2 dias = próximos 3 dias),
 * agrupadas por conteúdo e data para a lista operacional do Hoje.
 */
export function getUpcomingPublicationsWindow(
  input: CalendarInput,
  today: Date,
  days = 3,
): UpcomingPublicationGroup[] {
  const todayKey = localDateKey(today);
  const tomorrowKey = localDateKey(addDays(today, 1));
  const endKey = localDateKey(addDays(today, Math.max(0, days - 1)));

  const perItem = new Map<string, ReturnType<typeof buildPublishCalendarItems>[number] & { content: Content }>();
  for (const content of input.contents) {
    const refs = [...new Set(content.plataformas.map(item => item.platformId))];
    for (const platformFilter of refs.length ? refs : ['todas']) {
      const items = buildPublishCalendarItems({ ...input, contents: [content], platformFilter });
      for (const item of items) {
        if (!item.cancelled && item.date >= todayKey && item.date <= endKey) {
          perItem.set(item.id, { ...item, content });
        }
      }
    }
  }

  const groups = new Map<
    string,
    {
      key: string;
      contentId: string;
      content: Content;
      date: string;
      time: string | null;
      platforms: string[];
      allPosted: boolean;
      anyScheduled: boolean;
    }
  >();

  for (const item of perItem.values()) {
    const key = `${item.date}:${item.contentId}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        contentId: item.contentId,
        content: item.content,
        date: item.date,
        time: item.time,
        platforms: [],
        allPosted: true,
        anyScheduled: false,
      };
      groups.set(key, group);
    }
    if (item.time && (!group.time || item.time < group.time)) {
      group.time = item.time;
    }
    for (const name of item.platformNames) {
      if (name && !group.platforms.includes(name)) group.platforms.push(name);
    }
    if (!item.posted) group.allPosted = false;
    const st = publishItemStatus(item.content, item);
    if (item.programada || st === 'Programada' || st === 'Programado') {
      group.anyScheduled = true;
    }
  }

  for (const group of groups.values()) {
    if (group.platforms.length === 0) {
      group.platforms = resolvePlatformNames(group.content, input.platforms);
    }
  }

  return [...groups.values()]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        Number(a.allPosted) - Number(b.allPosted) ||
        (a.time || '99:99').localeCompare(b.time || '99:99') ||
        a.content.title.localeCompare(b.content.title),
    )
    .map(group => {
      const chip = resolvePublicationStatusChip(group);
      return {
        key: group.key,
        contentId: group.contentId,
        content: group.content,
        date: group.date,
        dayBadge: formatDayBadge(group.date, todayKey, tomorrowKey),
        isToday: group.date === todayKey,
        time: group.time,
        platforms: group.platforms,
        status: chip.status,
        statusLabel: chip.statusLabel,
        subtitleNote: chip.subtitleNote,
      };
    });
}

/**
 * Ritmo semanal real (segunda a domingo) baseado nos conteúdos com publicação prevista ou realizada na semana.
 */
export function getWeeklyPublishingPace({
  contents,
  platforms,
  series,
  redeReferenciaId,
  limiteSemanal,
  minimoSemanal,
  today,
}: {
  contents: Content[];
  platforms: Platform[];
  series: Serie[];
  redeReferenciaId: string | null;
  limiteSemanal: number | null;
  minimoSemanal: number | null;
  today: Date;
}): WeeklyPaceSummary {
  const todayKey = localDateKey(today);
  const week = semanaDe(todayKey);
  const weekStart = parseISO(week.inicio);

  const dayContentIds = new Map<string, Set<string>>();
  const uniqueWeekContents = new Set<string>();
  const uniquePostedContents = new Set<string>();

  for (const content of contents) {
    const refs = [...new Set(content.plataformas.map(item => item.platformId))];
    for (const platformFilter of refs.length ? refs : ['todas']) {
      const items = buildPublishCalendarItems({
        contents: [content],
        platforms,
        series,
        redeReferenciaId,
        platformFilter,
      });
      for (const item of items) {
        if (item.cancelled) continue;
        if (item.date < week.inicio || item.date > week.fim) continue;
        uniqueWeekContents.add(content.id);
        if (item.posted) uniquePostedContents.add(content.id);
        const bucket = dayContentIds.get(item.date) ?? new Set<string>();
        bucket.add(content.id);
        dayContentIds.set(item.date, bucket);
      }
    }
  }

  const days: WeeklyPaceDay[] = WEEKDAY_SHORT_LABELS.map((label, index) => {
    const dayKey = format(addDays(weekStart, index), 'yyyy-MM-dd');
    return {
      dayKey,
      label,
      count: dayContentIds.get(dayKey)?.size ?? 0,
      isToday: dayKey === todayKey,
      isPastOrToday: dayKey <= todayKey,
    };
  });

  const weekCount = uniqueWeekContents.size;
  const postedCount = uniquePostedContents.size;
  const target = limiteSemanal ?? minimoSemanal ?? null;

  let summaryText: string;
  if (target && target > 0) {
    summaryText = `${weekCount} de ${target} na semana`;
  } else if (weekCount === 0) {
    summaryText = 'Nenhuma publicação planejada esta semana';
  } else if (weekCount === 1) {
    summaryText = '1 publicação prevista esta semana';
  } else {
    summaryText = `${weekCount} publicações previstas esta semana`;
  }

  return {
    weekCount,
    postedCount,
    target,
    summaryText,
    days,
  };
}

export function countIdeasAwaitingTriage(contents: readonly Content[]): number {
  return contents.filter(
    content =>
      isActiveCreation(content) &&
      normalizeContentStatus(content.status) === CONTENT_STATUS.IDEIA,
  ).length;
}
