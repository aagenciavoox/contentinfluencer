import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { AjusteSemana, DecisaoPeriodo } from './editorialSettings.ts';

const FORMATO = 'yyyy-MM-dd';
const SEMANA = { weekStartsOn: 0 as const };

export type ModoPeriodo = 'semana' | 'mes' | 'intervalo';

export type PeriodoSelecionado = {
  modo: ModoPeriodo;
  inicio: string;
  fim: string;
};

/** Nome antigo da janela. A gravação atual é a linha `editorial_visao`. */
export const PERIODO_EDITORIAL_PREFERENCE_KEY = 'editorial_periodo';

/**
 * Contas de período, sem React.
 * A semana corre de domingo a sábado. A decisão de um mês não vale
 * para a semana que está dentro dele: a busca é o intervalo exato.
 */

export function semanaDe(data: string): { inicio: string; fim: string } {
  const dia = parseISO(data);
  return {
    inicio: format(startOfWeek(dia, SEMANA), FORMATO),
    fim: format(endOfWeek(dia, SEMANA), FORMATO),
  };
}

/** Parte da semana que cabe no intervalo. 3 dias de um limite 14 viram 6. */
export function limiteProporcional(limiteSemanal: number, dias: number): number {
  return Math.round(limiteSemanal * dias / 7);
}

function diaIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const data = parseISO(value);
  if (Number.isNaN(data.getTime())) return false;
  return format(data, FORMATO) === value;
}

interface TrechoSemana {
  inicio: string;
  fim: string;
  dias: number;
}

/** Corta o intervalo nas semanas domingo–sábado que ele atravessa. */
export function semanasNoIntervalo(inicio: string, fim: string): TrechoSemana[] {
  const semanas: TrechoSemana[] = [];
  let cursor = inicio;

  while (cursor <= fim) {
    const semana = semanaDe(cursor);
    const trechoFim = semana.fim < fim ? semana.fim : fim;
    const dias = differenceInCalendarDays(parseISO(trechoFim), parseISO(cursor)) + 1;
    semanas.push({ inicio: semana.inicio, fim: semana.fim, dias });
    const proximo = format(addDays(parseISO(semana.fim), 1), FORMATO);
    if (proximo <= cursor) break;
    cursor = proximo;
  }

  return semanas;
}

function ajusteDaSemana(
  ajustes: readonly AjusteSemana[],
  inicio: string,
  fim: string,
): AjusteSemana | null {
  let encontrado: AjusteSemana | null = null;
  for (const ajuste of ajustes) {
    if (ajuste.inicio === inicio && ajuste.fim === fim) encontrado = ajuste;
  }
  return encontrado;
}

/**
 * Soma o limite do intervalo.
 * Semana inteira entra com o limite semanal, ou com o ajuste daquela semana.
 * Semana cortada entra proporcional (limite × dias ÷ 7, arredondado).
 * Se a semana tem ajuste, o número do ajuste substitui o proporcional.
 * Sem limite semanal, só há conta quando cada semana do intervalo tem ajuste.
 * Senão devolve null: ausência não vira zero.
 * Com `limiteDaSemana`, cada semana usa o limite que valia nela (vigência).
 */
export function limiteDoIntervalo(input: {
  limiteSemanal: number | null;
  inicio: string;
  fim: string;
  ajustesSemana?: readonly AjusteSemana[];
  limiteDaSemana?: (inicioSemana: string) => number | null;
}): number | null {
  const { limiteSemanal, inicio, fim } = input;
  if (!diaIso(inicio) || !diaIso(fim) || fim < inicio) return null;

  const ajustes = input.ajustesSemana ?? [];
  let soma = 0;

  for (const semana of semanasNoIntervalo(inicio, fim)) {
    const ajuste = ajusteDaSemana(ajustes, semana.inicio, semana.fim);
    if (ajuste) {
      soma += ajuste.limite;
      continue;
    }
    const limite = input.limiteDaSemana ? input.limiteDaSemana(semana.inicio) : limiteSemanal;
    if (limite == null) return null;
    soma += semana.dias === 7 ? limite : limiteProporcional(limite, semana.dias);
  }

  return soma;
}

/** Casa inicio e fim exatos. Semana dentro do mês não herda a meta do mês. */
export function decisaoDoPeriodo(
  periodos: readonly DecisaoPeriodo[],
  inicio: string,
  fim: string,
): DecisaoPeriodo | null {
  let encontrada: DecisaoPeriodo | null = null;
  for (const periodo of periodos) {
    if (periodo.inicio === inicio && periodo.fim === fim) encontrada = periodo;
  }
  return encontrada;
}

/**
 * Lê a janela gravada em `editorial_visao`.
 * Semana volta a ser domingo–sábado e mês volta a ser o mês inteiro do início salvo.
 * Valor ausente ou quebrado devolve null: quem chama abre na semana de hoje.
 */
export function lerPeriodoSalvo(value: unknown): PeriodoSelecionado | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const { modo, inicio, fim } = raw;
  if (typeof inicio !== 'string' || typeof fim !== 'string') return null;
  if (!diaIso(inicio) || !diaIso(fim)) return null;

  if (modo === 'semana') return { modo, ...semanaDe(inicio) };
  if (modo === 'mes') {
    const dia = parseISO(inicio);
    return {
      modo,
      inicio: format(startOfMonth(dia), FORMATO),
      fim: format(endOfMonth(dia), FORMATO),
    };
  }
  if (modo === 'intervalo' && inicio <= fim) return { modo, inicio, fim };
  return null;
}
