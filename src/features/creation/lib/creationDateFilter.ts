import {addMonths, addWeeks, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import type {FiltroData} from '../../editorial/lib/datasNaGrade.ts';

/** Chaves da URL: `data=sem`, ou `de` e `ate` no formato aaaa-mm-dd. */
export const DATE_FILTER_QUERY_KEYS = ['data', 'de', 'ate'] as const;

const DIA = /^\d{4}-\d{2}-\d{2}$/;
const SEPARADOR = '~';

export function lerFiltroData(params: URLSearchParams): FiltroData | null {
  if (params.get('data') === 'sem') return {modo: 'sem-data'};
  const inicio = params.get('de') ?? '';
  const fim = params.get('ate') ?? '';
  if (DIA.test(inicio) && DIA.test(fim) && inicio <= fim) return {modo: 'intervalo', inicio, fim};
  return null;
}

/** O valor do seletor: '' (qualquer data), 'sem' ou 'aaaa-mm-dd~aaaa-mm-dd'. */
export function valorDoFiltroData(filtro: FiltroData | null): string {
  if (!filtro) return '';
  if (filtro.modo === 'sem-data') return 'sem';
  return `${filtro.inicio}${SEPARADOR}${filtro.fim}`;
}

/** Troca só as chaves de data. A página volta para a primeira. */
export function aplicarFiltroData(previous: URLSearchParams, valor: string): URLSearchParams {
  const next = new URLSearchParams(previous);
  DATE_FILTER_QUERY_KEYS.forEach(key => next.delete(key));
  next.delete('page');
  if (valor === 'sem') {
    next.set('data', 'sem');
    return next;
  }
  const [inicio, fim] = valor.split(SEPARADOR);
  if (inicio && fim && DIA.test(inicio) && DIA.test(fim)) {
    next.set('de', inicio);
    next.set('ate', fim);
  }
  return next;
}

function dia(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function intervalo(inicio: Date, fim: Date): string {
  return `${dia(inicio)}${SEPARADOR}${dia(fim)}`;
}

/** "5 a 11 de out." ou "5 de out." */
export function rotuloDoIntervalo(inicio: string, fim: string): string {
  const de = parseISO(inicio);
  const ate = parseISO(fim);
  if (inicio === fim) return format(de, "d 'de' MMM", {locale: ptBR});
  if (format(de, 'yyyy-MM') === format(ate, 'yyyy-MM')) {
    return `${format(de, 'd')} a ${format(ate, "d 'de' MMM", {locale: ptBR})}`;
  }
  return `${format(de, "d 'de' MMM", {locale: ptBR})} a ${format(ate, "d 'de' MMM", {locale: ptBR})}`;
}

/**
 * Opções do filtro de data. A semana vai de domingo a sábado, como no resto do app.
 * Um intervalo vindo de um link (o Editorial manda o período) aparece como opção própria.
 */
export function opcoesDoFiltroData(hoje: Date, atual: FiltroData | null): {label: string; value: string}[] {
  const semana = {weekStartsOn: 0} as const;
  const opcoes = [
    {label: 'Qualquer data', value: ''},
    {label: 'Sem data', value: 'sem'},
    {label: 'Esta semana', value: intervalo(startOfWeek(hoje, semana), endOfWeek(hoje, semana))},
    {label: 'Próxima semana', value: intervalo(startOfWeek(addWeeks(hoje, 1), semana), endOfWeek(addWeeks(hoje, 1), semana))},
    {label: 'Este mês', value: intervalo(startOfMonth(hoje), endOfMonth(hoje))},
    {label: 'Próximo mês', value: intervalo(startOfMonth(addMonths(hoje, 1)), endOfMonth(addMonths(hoje, 1)))},
  ];
  const valor = valorDoFiltroData(atual);
  if (atual?.modo === 'intervalo' && !opcoes.some(opcao => opcao.value === valor)) {
    opcoes.push({label: rotuloDoIntervalo(atual.inicio, atual.fim), value: valor});
  }
  return opcoes;
}
