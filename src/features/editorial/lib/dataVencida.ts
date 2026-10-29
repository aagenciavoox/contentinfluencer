import { isBefore, startOfDay } from 'date-fns';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';

export type AcaoDataVencida = 'reagendar' | 'registrar' | 'retirar';

/** Data prevista já passou e o conteúdo ainda não está Publicado. */
export function dataPrevistaVencida(
  content: Pick<{ publishDate: string | null; status: string; postedAt?: string | null }, 'publishDate' | 'status' | 'postedAt'>,
  hoje = new Date(),
): boolean {
  if (!content.publishDate) return false;
  if (normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO || content.postedAt) {
    return false;
  }
  const publishDay = startOfDay(new Date(content.publishDate));
  if (Number.isNaN(publishDay.getTime())) return false;
  return isBefore(publishDay, startOfDay(hoje));
}

/** Retira a previsão sem registrar publicação nem inventar etapa. */
export function retirarPrevisao<T extends { publishDate: string | null; publishDateEnabled?: boolean; plataformas: Array<{ publishDate: string | null; publishDateEnabled?: boolean }> }>(
  draft: T,
): T {
  return {
    ...draft,
    publishDate: null,
    publishDateEnabled: false,
    plataformas: draft.plataformas.map(plataforma => ({
      ...plataforma,
      publishDate: null,
      publishDateEnabled: false,
    })),
  };
}
