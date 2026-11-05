import {SEMANA} from '../../../lib/semana.ts';
import {endOfWeek, format, parseISO, startOfWeek} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import type {PeriodoGrade} from '../../editorial/lib/gradeCounts.ts';
import {periodoDoMes} from './monthHealth.ts';

// Segunda a domingo, a mesma semana da apuração editorial (src/lib/semana.ts).

export function fimDeSemana(day: Date): boolean {
  const dia = day.getDay();
  return dia === 0 || dia === 6;
}

export type VistaPlanejamento = 'semana' | 'mes';

export function periodoDaSemana(anchor: Date): PeriodoGrade {
  return {
    inicio: format(startOfWeek(anchor, SEMANA), 'yyyy-MM-dd'),
    fim: format(endOfWeek(anchor, SEMANA), 'yyyy-MM-dd'),
  };
}

export function periodoDaVista(anchor: Date, vista: VistaPlanejamento): PeriodoGrade {
  return vista === 'semana' ? periodoDaSemana(anchor) : periodoDoMes(anchor);
}

/** "na semana de 02/11 a 08/11" ou "em novembro de 2026", para completar a frase do resumo. */
export function rotuloDoPeriodo(periodo: PeriodoGrade, vista: VistaPlanejamento): string {
  const inicio = parseISO(periodo.inicio);
  const fim = parseISO(periodo.fim);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return 'no período';
  if (vista === 'semana') return `na semana de ${format(inicio, 'dd/MM')} a ${format(fim, 'dd/MM')}`;
  const mesmoMes = format(inicio, 'yyyy-MM') === format(fim, 'yyyy-MM');
  if (!mesmoMes) return `de ${format(inicio, 'dd/MM')} a ${format(fim, 'dd/MM')}`;
  return `em ${format(inicio, "MMMM 'de' yyyy", {locale: ptBR})}`;
}
