import type { FuncaoEditorial } from '../../../lib/database.ts';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { GradeEntry } from './gradeEntries.ts';
import {
  distribuirEspacos,
  gradePequena,
  percentuaisFechamEm100,
  percentuaisNaOrdem,
  SEMANAS_GRADE_PEQUENA,
  somaEspacosSemana,
} from './distribuirEspacos.ts';
import { FUNCAO_LABELS, FUNCOES } from './funcoes.ts';

export type PeriodoGrade = {
  /** Inclusivo, `aaaa-mm-dd`. */
  inicio: string;
  /** Inclusivo, `aaaa-mm-dd`. */
  fim: string;
};

export type PilarContagem = {
  id: string;
  nome: string;
  ativo?: boolean;
  frequenciaSemanal?: number | null;
};

export type GradeCountSettings = {
  distribuicaoFuncoes?: Partial<Record<FuncaoEditorial, number>> | null;
};

export type LinhaContagem = {
  id: string;
  rotulo: string;
  planejado: number;
  realizado: number;
  meta: number;
};

export type GradeCounts = {
  semanas: number;
  espacosPorSemana: number;
  totalMeta: number;
  gradePequena: boolean;
  periodo: PeriodoGrade;
  pilares: LinhaContagem[];
  funcoes: LinhaContagem[];
  somaPlanejado: number;
  /** Quando dois ou mais pilares têm meta e a soma planejada difere dela. */
  notaSoma: string | null;
};

function diaValido(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

function diasInclusivos(periodo: PeriodoGrade): number {
  if (!diaValido(periodo.inicio) || !diaValido(periodo.fim)) return 7;
  const dias = differenceInCalendarDays(parseISO(periodo.fim), parseISO(periodo.inicio)) + 1;
  return dias > 0 ? dias : 7;
}

function periodoDe(inicio: string, semanas: number): PeriodoGrade {
  if (!diaValido(inicio) || semanas <= 1) {
    return { inicio, fim: inicio };
  }
  return {
    inicio,
    fim: format(addDays(parseISO(inicio), semanas * 7 - 1), 'yyyy-MM-dd'),
  };
}

export function distribuicaoFecha(
  distribuicao: Partial<Record<FuncaoEditorial, number>> | null | undefined,
): boolean {
  if (!distribuicao) return false;
  return percentuaisFechamEm100(percentuaisNaOrdem(distribuicao));
}

function noPeriodo(data: string | null, periodo: PeriodoGrade): boolean {
  return Boolean(data && data >= periodo.inicio && data <= periodo.fim);
}

function metaDoPilar(frequencia: number | null | undefined, semanas: number): number {
  if (typeof frequencia !== 'number' || !Number.isFinite(frequencia) || frequencia <= 0) return 0;
  return Math.floor(frequencia) * semanas;
}

/**
 * Planejado e realizado por pilar e por função, contra a meta em espaços.
 * Só entram linhas com `contaNaGrade`. Abaixo de 8 espaços por semana, um período
 * de até 7 dias passa a contar 4 semanas a partir do início.
 */
export function countGrade({
  entries,
  pilares,
  settings,
  periodo,
}: {
  entries: readonly GradeEntry[];
  pilares: readonly PilarContagem[];
  settings: GradeCountSettings;
  periodo: PeriodoGrade;
}): GradeCounts {
  const espacosPorSemana = somaEspacosSemana(pilares);
  const pequena = gradePequena(espacosPorSemana);
  const dias = diasInclusivos(periodo);
  const semanas = pequena && dias <= 7
    ? SEMANAS_GRADE_PEQUENA
    : Math.max(1, Math.ceil(dias / 7));
  const janela = pequena && dias <= 7
    ? periodoDe(periodo.inicio, semanas)
    : { inicio: periodo.inicio, fim: periodo.fim };

  const porPilar = new Map<string, { planejado: number; realizado: number }>();
  const porFuncao = new Map<FuncaoEditorial, { planejado: number; realizado: number }>();

  for (const entry of entries) {
    if (!entry.contaNaGrade || !noPeriodo(entry.data, janela)) continue;
    const realizada = entry.realizada ? 1 : 0;
    if (entry.pilarId) {
      const atual = porPilar.get(entry.pilarId) ?? { planejado: 0, realizado: 0 };
      atual.planejado += 1;
      atual.realizado += realizada;
      porPilar.set(entry.pilarId, atual);
    }
    if (entry.funcao) {
      const atual = porFuncao.get(entry.funcao) ?? { planejado: 0, realizado: 0 };
      atual.planejado += 1;
      atual.realizado += realizada;
      porFuncao.set(entry.funcao, atual);
    }
  }

  const linhasPilar: LinhaContagem[] = pilares
    .filter(pilar => pilar.ativo !== false && pilar.frequenciaSemanal != null)
    .map(pilar => {
      const contagem = porPilar.get(pilar.id) ?? { planejado: 0, realizado: 0 };
      return {
        id: pilar.id,
        rotulo: pilar.nome,
        planejado: contagem.planejado,
        realizado: contagem.realizado,
        meta: metaDoPilar(pilar.frequenciaSemanal, semanas),
      };
    });

  const totalMeta = linhasPilar.reduce((soma, linha) => soma + linha.meta, 0);
  const somaPlanejado = linhasPilar.reduce((soma, linha) => soma + linha.planejado, 0);
  const pilaresComMeta = linhasPilar.filter(linha => linha.meta > 0).length;
  const notaSoma = pilaresComMeta >= 2 && somaPlanejado !== totalMeta
    ? `Seus pilares somam ${somaPlanejado} de ${totalMeta}.`
    : null;

  const distribuicao = settings.distribuicaoFuncoes;
  const fecha = distribuicaoFecha(distribuicao);
  const metasFuncao = fecha
    ? distribuirEspacos(totalMeta, percentuaisNaOrdem(distribuicao))
    : FUNCOES.map(() => 0);

  const funcoes: LinhaContagem[] = FUNCOES.flatMap((funcao, index) => {
    const contagem = porFuncao.get(funcao) ?? { planejado: 0, realizado: 0 };
    const meta = metasFuncao[index] ?? 0;
    if (meta === 0 && contagem.planejado === 0) return [];
    return [{
      id: funcao,
      rotulo: FUNCAO_LABELS[funcao],
      planejado: contagem.planejado,
      realizado: contagem.realizado,
      meta,
    }];
  });

  return {
    semanas,
    espacosPorSemana,
    totalMeta,
    gradePequena: pequena,
    periodo: janela,
    pilares: linhasPilar,
    funcoes,
    somaPlanejado,
    notaSoma,
  };
}
