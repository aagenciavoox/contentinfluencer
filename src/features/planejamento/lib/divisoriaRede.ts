import type {PostingTimeEntry, RedeSocial} from '../../../lib/database.ts';
import {redeDaConta, type ContaRef, type RedeDoFiltro} from '../../contas/lib/contas.ts';

/**
 * Divisória do dia por rede. Regra: só a conta com horário PRÓPRIO naquele dia da
 * semana (posting_times com platform_id da conta) marca o dia. O horário geral
 * (platform_id null) vale para todas as contas e por isso não marca nenhum dia.
 */
export function diaDaRede(input: {
  weekday: number;
  rede: RedeSocial;
  horarios: readonly Pick<PostingTimeEntry, 'platformId' | 'weekday'>[];
  contas: readonly ContaRef[];
}): boolean {
  const contasDaRede = new Set(
    input.contas.filter(conta => conta.ativo !== false && redeDaConta(conta) === input.rede).map(conta => conta.id),
  );
  if (contasDaRede.size === 0) return false;
  return input.horarios.some(h => h.platformId !== null && h.weekday === input.weekday && contasDaRede.has(h.platformId));
}

/** 0 = domingo … 6 = sábado, a partir de "yyyy-MM-dd" sem fuso. */
export function weekdayDaData(dateKey: string): number {
  const [ano, mes, dia] = dateKey.slice(0, 10).split('-').map(Number);
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1).getDay();
}

/** O cartão vai para baixo da linha só quando todas as redes dele são a rede da divisória. */
export function soDaRede(redes: readonly RedeDoFiltro[], rede: RedeSocial): boolean {
  return redes.length > 0 && redes.every(r =>
    r === rede
    || (rede === 'youtube' && r === 'youtube-shorts')
    || (rede === 'instagram' && (r === 'instagram-video' || r === 'instagram-carrossel'))
    || (rede === 'tiktok' && (r === 'tiktok-video' || r === 'tiktok-carrossel'))
  );
}

export function dividirPorRede<T>(itens: readonly T[], redesDe: (item: T) => readonly RedeDoFiltro[], rede: RedeSocial): {acima: T[]; abaixo: T[]} {
  const acima: T[] = [];
  const abaixo: T[] = [];
  for (const item of itens) (soDaRede(redesDe(item), rede) ? abaixo : acima).push(item);
  return {acima, abaixo};
}