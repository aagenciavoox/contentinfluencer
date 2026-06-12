import type {Content, Platform} from '../../../lib/database';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline';

export const SEM_PLATAFORMA = 'Sem plataforma';

/**
 * Um card de programação = um roteiro em uma plataforma.
 * Conteúdo com 2 legendas (ex.: Instagram + TikTok) gera 2 cards.
 */
export interface ProgramacaoCard {
  key: string;
  contentId: string;
  /** ContentPlataforma.platformId (id ou nome) — null quando o conteúdo não tem plataformas */
  platformId: string | null;
  /** Nome resolvido da plataforma, usado para cor e filtro */
  platformName: string;
  title: string;
  status: string;
  /** "yyyy-MM-dd" ou null (backlog) */
  date: string | null;
  time: string | null;
  legenda: string;
  hashtags: string;
}

const SCHEDULABLE_STATUSES = new Set<string>([
  CONTENT_STATUS.GRAVADO,
  CONTENT_STATUS.EDITADO,
  CONTENT_STATUS.PROGRAMADO,
  CONTENT_STATUS.POSTADO,
]);

const BACKLOG_STATUSES = new Set<string>([
  CONTENT_STATUS.GRAVADO,
  CONTENT_STATUS.EDITADO,
]);

/** Normaliza "HH:MM:SS" (banco) para "HH:MM" (exibição/comparação). */
function normalizeTime(time: string | null | undefined): string | null {
  if (!time) return null;
  return time.slice(0, 5);
}

export function resolvePlatformName(platformId: string | null, platforms: Platform[]): string {
  if (!platformId) return SEM_PLATAFORMA;
  return platforms.find(platform => platform.id === platformId)?.nome ?? platformId;
}

/** Paleta fixa por plataforma conhecida + fallback determinístico. */
const PLATFORM_COLOR_PRESETS: Record<string, PlatformColor> = {
  instagram: {chip: 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300', dot: '#db2777'},
  tiktok: {chip: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300', dot: '#0d9488'},
  youtube: {chip: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300', dot: '#dc2626'},
  blog: {chip: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300', dot: '#2563eb'},
};

const FALLBACK_COLORS: PlatformColor[] = [
  {chip: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300', dot: '#9333ea'},
  {chip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300', dot: '#d97706'},
  {chip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300', dot: '#059669'},
  {chip: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300', dot: '#0284c7'},
  {chip: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300', dot: '#e11d48'},
];

export interface PlatformColor {
  chip: string;
  dot: string;
}

export function getPlatformColor(platformName: string): PlatformColor {
  const preset = PLATFORM_COLOR_PRESETS[platformName.trim().toLowerCase()];
  if (preset) return preset;
  if (platformName === SEM_PLATAFORMA) {
    return {chip: 'border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-secondary)]', dot: '#9ca3af'};
  }
  let hash = 0;
  for (let i = 0; i < platformName.length; i++) {
    hash = (hash * 31 + platformName.charCodeAt(i)) | 0;
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

/** Gera os cards (1 por legenda/plataforma) dos conteúdos programáveis. */
export function buildProgramacaoCards(contents: Content[], platforms: Platform[]): ProgramacaoCard[] {
  const cards: ProgramacaoCard[] = [];

  contents.forEach(content => {
    if (content.deletedAt) return;
    if (!SCHEDULABLE_STATUSES.has(content.status)) return;

    if (content.plataformas.length > 0) {
      content.plataformas.forEach(plataforma => {
        const date = plataforma.publishDate || content.publishDate;
        cards.push({
          key: `${content.id}::${plataforma.platformId}`,
          contentId: content.id,
          platformId: plataforma.platformId,
          platformName: resolvePlatformName(plataforma.platformId, platforms),
          title: content.title || '(sem título)',
          status: content.status,
          date: date ? date.slice(0, 10) : null,
          time: normalizeTime(plataforma.publishTime || content.publishTime),
          legenda: plataforma.legenda || '',
          hashtags: plataforma.hashtags || '',
        });
      });
      return;
    }

    cards.push({
      key: content.id,
      contentId: content.id,
      platformId: null,
      platformName: SEM_PLATAFORMA,
      title: content.title || '(sem título)',
      status: content.status,
      date: content.publishDate ? content.publishDate.slice(0, 10) : null,
      time: normalizeTime(content.publishTime),
      legenda: '',
      hashtags: '',
    });
  });

  return cards;
}

export function isBacklogCard(card: ProgramacaoCard): boolean {
  return !card.date && BACKLOG_STATUSES.has(card.status);
}

export function isCardLocked(card: ProgramacaoCard): boolean {
  return card.status === CONTENT_STATUS.POSTADO;
}

function earliestPlatformDate(content: Content): string | null {
  const dates = content.plataformas
    .map(plataforma => plataforma.publishDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates[0] ?? null;
}

/**
 * Retorna o Content atualizado após agendar/reagendar um card.
 * Atualiza apenas a data daquela plataforma; a data principal vira a mais cedo
 * entre as plataformas (mantém status/visão mensal do calendário oficial coerentes).
 */
export function applyScheduleToContent(
  content: Content,
  platformId: string | null,
  dateStr: string,
  time: string | null,
): Content {
  const isoDate = `${dateStr}T12:00:00.000Z`;

  let next: Content;
  if (platformId && content.plataformas.length > 0) {
    const plataformas = content.plataformas.map(plataforma =>
      plataforma.platformId === platformId
        ? {...plataforma, publishDate: isoDate, publishTime: time, publishDateEnabled: true}
        : plataforma,
    );
    next = {...content, plataformas};
    const principal = earliestPlatformDate(next) ?? isoDate;
    next.publishDate = principal;
    next.publishDateEnabled = true;
    if (principal === isoDate) next.publishTime = time;
  } else {
    next = {...content, publishDate: isoDate, publishTime: time, publishDateEnabled: true};
  }

  // Gravado/Editado com data de hoje em diante vira Programado.
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (BACKLOG_STATUSES.has(next.status) && dateStr >= todayKey) {
    next.status = CONTENT_STATUS.PROGRAMADO;
  }

  return {...next, updatedAt: new Date().toISOString()};
}

/**
 * Remove o agendamento de um card (volta para "Prontos para programar").
 * Limpa só a data daquela plataforma; o status volta para Editado quando
 * nenhuma plataforma tem mais data.
 */
export function applyUnscheduleToContent(content: Content, platformId: string | null): Content {
  let next: Content;
  if (platformId && content.plataformas.length > 0) {
    const plataformas = content.plataformas.map(plataforma =>
      plataforma.platformId === platformId
        ? {...plataforma, publishDate: null, publishTime: null, publishDateEnabled: false}
        : plataforma,
    );
    next = {...content, plataformas};
    const principal = earliestPlatformDate(next);
    next.publishDate = principal;
    next.publishDateEnabled = Boolean(principal);
    if (!principal) next.publishTime = null;
  } else {
    next = {...content, publishDate: null, publishTime: null, publishDateEnabled: false};
  }

  if (next.status === CONTENT_STATUS.PROGRAMADO && !next.publishDate) {
    next.status = CONTENT_STATUS.EDITADO;
  }

  return {...next, updatedAt: new Date().toISOString()};
}
