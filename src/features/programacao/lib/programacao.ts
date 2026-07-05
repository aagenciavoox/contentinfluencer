import type {AgendaItem, Content, Platform, Projeto, PublicationKind} from '../../../lib/database';
import {
  CONTENT_STATUS,
  DISPLAY_STATUS,
  getDisplayStatus,
  normalizeContentStatus,
} from '../../contents/lib/contentPipeline';

export const SEM_PLATAFORMA = 'Sem plataforma';

/** Evento de publicação cadastrado dentro de um projeto (agenda). Somente leitura na grade. */
export interface ProjetoPublicacaoMarker {
  key: string;
  agendaId: string;
  projetoId: string;
  projetoNome: string;
  title: string;
  /** yyyy-MM-dd */
  date: string;
  time: string | null;
}

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
  /** Display status (may be derived Programado). */
  status: string;
  /** Canonical persisted status. */
  canonicalStatus: string;
  /** "yyyy-MM-dd" ou null (backlog) */
  date: string | null;
  time: string | null;
  legenda: string;
  hashtags: string;
  publicationKind?: PublicationKind;
}

const SCHEDULABLE_STATUSES = new Set<string>([
  CONTENT_STATUS.IDEIA,
  CONTENT_STATUS.ROTEIRO,
  CONTENT_STATUS.PRODUCAO,
  CONTENT_STATUS.POSTADO,
]);

const BACKLOG_STATUSES = new Set<string>([
  CONTENT_STATUS.ROTEIRO,
  CONTENT_STATUS.PRODUCAO,
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
  instagram: {chip: 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-300', dot: 'var(--accent-pink)'},
  tiktok: {chip: 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300', dot: 'var(--accent-green)'},
  youtube: {chip: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300', dot: 'var(--danger)'},
  blog: {chip: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300', dot: 'var(--accent-blue)'},
};

const FALLBACK_COLORS: PlatformColor[] = [
  {chip: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300', dot: 'var(--accent-purple)'},
  {chip: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300', dot: 'var(--accent-orange)'},
  {chip: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300', dot: 'var(--accent-green)'},
  {chip: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300', dot: 'var(--info)'},
  {chip: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300', dot: 'var(--accent-pink)'},
];

export interface PlatformColor {
  chip: string;
  dot: string;
}

export function getPlatformColor(platformName: string): PlatformColor {
  const preset = PLATFORM_COLOR_PRESETS[platformName.trim().toLowerCase()];
  if (preset) return preset;
  if (platformName === SEM_PLATAFORMA) {
    return {chip: 'border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-secondary)]', dot: 'var(--text-tertiary)'};
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
    const canonicalStatus = normalizeContentStatus(content.status);
    if (!SCHEDULABLE_STATUSES.has(canonicalStatus)) return;

    const displayStatus = getDisplayStatus(content);

    if (content.plataformas.length > 0) {
      content.plataformas.forEach(plataforma => {
        const date = plataforma.publishDate || content.publishDate;
        cards.push({
          key: `${content.id}::${plataforma.platformId}`,
          contentId: content.id,
          platformId: plataforma.platformId,
          platformName: resolvePlatformName(plataforma.platformId, platforms),
          title: content.title || '(sem título)',
          status: displayStatus,
          canonicalStatus,
          date: date ? date.slice(0, 10) : null,
          time: normalizeTime(plataforma.publishTime || content.publishTime),
          legenda: plataforma.legenda || '',
          hashtags: plataforma.hashtags || '',
          publicationKind: plataforma.publicationKind === 'repost' ? 'repost' : 'post',
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
      status: displayStatus,
      canonicalStatus,
      date: content.publishDate ? content.publishDate.slice(0, 10) : null,
      time: normalizeTime(content.publishTime),
      legenda: '',
      hashtags: '',
    });
  });

  return cards;
}

/** Publicações de projeto (agenda tipo Publicação) agrupadas por dia. */
export function buildProjetoPublicacaoByDate(
  agendaItems: AgendaItem[],
  projetos: Projeto[],
): Map<string, ProjetoPublicacaoMarker[]> {
  const projetoById = new Map(
    projetos.filter(projeto => !projeto.deletedAt).map(projeto => [projeto.id, projeto]),
  );
  const map = new Map<string, ProjetoPublicacaoMarker[]>();

  agendaItems.forEach(item => {
    if (item.tipo !== 'Publicação' || !item.projetoId) return;
    const projeto = projetoById.get(item.projetoId);
    if (!projeto) return;

    const date = item.date.slice(0, 10);
    const marker: ProjetoPublicacaoMarker = {
      key: `agenda::${item.id}`,
      agendaId: item.id,
      projetoId: projeto.id,
      projetoNome: projeto.nome,
      title: item.title,
      date,
      time: item.time ? item.time.slice(0, 5) : null,
    };
    const list = map.get(date) || [];
    list.push(marker);
    map.set(date, list);
  });

  map.forEach(list =>
    list.sort(
      (a, b) =>
        (a.time || '99:99').localeCompare(b.time || '99:99') ||
        a.title.localeCompare(b.title, 'pt-BR'),
    ),
  );

  return map;
}

export function isCardLocked(card: ProgramacaoCard): boolean {
  return card.canonicalStatus === CONTENT_STATUS.POSTADO;
}

export function isBacklogCard(card: ProgramacaoCard): boolean {
  if (card.date) return false;
  if (isCardLocked(card)) return false;
  if (isIdeiaCard(card)) return false;
  return BACKLOG_STATUSES.has(card.canonicalStatus);
}

export function isIdeiaCard(card: ProgramacaoCard): boolean {
  return card.canonicalStatus === CONTENT_STATUS.IDEIA;
}

export function isPostadoCard(card: ProgramacaoCard): boolean {
  return card.canonicalStatus === CONTENT_STATUS.POSTADO;
}

export function canDragCard(card: ProgramacaoCard): boolean {
  return !isCardLocked(card);
}

export function promoteIdeiaToRoteiro(content: Content): Content {
  return {...content, status: CONTENT_STATUS.ROTEIRO, updatedAt: new Date().toISOString()};
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

  return {...next, updatedAt: new Date().toISOString()};
}

/**
 * Remove o agendamento de um card (volta para backlog).
 * Limpa só a data daquela plataforma; o status canônico não muda.
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

  return {...next, updatedAt: new Date().toISOString()};
}

export {DISPLAY_STATUS};
