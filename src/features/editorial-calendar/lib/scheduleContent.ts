import type {Content} from '../../../lib/database.ts';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline.ts';

function earliestPlatformDate(content: Content): string | null {
  const dates = content.plataformas
    .map(plataforma => plataforma.publishDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates[0] ?? null;
}

/**
 * Coloca a data de publicação na plataforma indicada.
 * A data principal fica a mais cedo entre as plataformas. O status não muda.
 */
export function applyScheduleToContent(
  content: Content,
  platformId: string | null,
  dateStr: string,
  time: string | null,
): Content {
  const day = dateStr.slice(0, 10);
  const isoDate = `${day}T12:00:00.000Z`;

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

/** Marca o dia em todas as redes do roteiro. O status canônico permanece. */
export function placeContentOnDay(content: Content, dayKey: string): Content {
  const time = content.publishTime ?? null;
  if (content.plataformas.length === 0) {
    return applyScheduleToContent(content, null, dayKey, time);
  }
  return content.plataformas.reduce(
    (current, plataforma) =>
      applyScheduleToContent(
        current,
        plataforma.platformId,
        dayKey,
        plataforma.publishTime ?? time,
      ),
    content,
  );
}

/** Roteiro ou produção ainda sem data de publicação. Ideia não entra nesta pilha. */
export function isUndatedRoteiro(content: Content): boolean {
  if (content.deletedAt || content.archivedAt) return false;
  const status = normalizeContentStatus(content.status);
  if (status !== CONTENT_STATUS.ROTEIRO && status !== CONTENT_STATUS.PRODUCAO) return false;
  if (content.publishDate) return false;
  return !content.plataformas.some(plataforma => plataforma.publishDate);
}

export function listUndatedRoteiros(contents: readonly Content[]): Content[] {
  return contents
    .filter(isUndatedRoteiro)
    .sort((left, right) => (left.title || '').localeCompare(right.title || '', 'pt-BR'));
}
