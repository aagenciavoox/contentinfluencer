import type { Content } from '../../../lib/database.ts';
import { retirarPrevisao } from '../../editorial/lib/dataVencida.ts';
import { salvarRoteiroNoCalendario, tirarRoteiroDoCalendario } from '../../planejamento/lib/salvarNoCalendario.ts';

/** Rascunho da tela do roteiro: o mínimo para mover a data pelas contas. */
export type RascunhoDaData = Pick<Content, 'publishDate' | 'plataformas'>
  & Partial<Omit<Content, 'publishDate' | 'plataformas'>>;

export type MudancaDaData = Pick<Content, 'publishDate' | 'publishDateEnabled' | 'publishTime' | 'plataformas'>;

function comoConteudo(draft: RascunhoDaData, contentId: string): Content {
  return {
    ...draft,
    id: contentId || draft.id || 'draft',
    deletedAt: null,
    archivedAt: null,
    postedAt: draft.postedAt ?? null,
    publishTime: draft.publishTime ?? null,
  } as Content;
}

function mudanca(content: Content): MudancaDaData {
  return {
    publishDate: content.publishDate,
    publishDateEnabled: content.publishDateEnabled,
    publishTime: content.publishTime ?? null,
    plataformas: content.plataformas,
  };
}

/**
 * Data principal pelo mesmo caminho do Calendário (salvarRoteiroNoCalendario):
 * as contas previstas ou programadas acompanham; publicada não muda.
 * Dia vazio tira do Calendário. Null: nada muda (mesmo dia ou roteiro publicado).
 */
export function mudarDataPrincipal(draft: RascunhoDaData, dia: string | null, contentId = ''): MudancaDaData | null {
  const base = comoConteudo(draft, contentId);
  if (!dia) return mudanca(tirarRoteiroDoCalendario(base) ?? retirarPrevisao(base));
  const movido = salvarRoteiroNoCalendario(base, { modo: 'mesmo', date: dia });
  return movido ? mudanca(movido) : null;
}

/**
 * Hora da publicação. Sem data, fica só no roteiro e entra quando a data for escolhida.
 * Com data, vai para as contas previstas ou programadas, como no Calendário.
 * Hora vazia não apaga o horário próprio de cada conta.
 */
export function mudarHoraPrincipal(draft: RascunhoDaData, hora: string | null, contentId = ''): Partial<MudancaDaData> {
  const dia = draft.publishDate ? draft.publishDate.slice(0, 10) : null;
  if (!dia || !hora) return { publishTime: hora };
  const movido = salvarRoteiroNoCalendario(comoConteudo(draft, contentId), { modo: 'mesmo', date: dia, time: hora });
  return movido ? { ...mudanca(movido), publishTime: hora } : { publishTime: hora };
}