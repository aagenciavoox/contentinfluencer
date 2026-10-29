import {endOfWeek, format, startOfWeek} from 'date-fns';
import type {PeriodoGrade} from '../../editorial/lib/gradeCounts.ts';
import {periodoDoMes} from './monthHealth.ts';

const SEMANA = {weekStartsOn: 0 as const};

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

export function rotuloDoPeriodo(_periodo: PeriodoGrade, _vista: VistaPlanejamento): string {
  return 'no período';
}
