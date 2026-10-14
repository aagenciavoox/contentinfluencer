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
import { FUNCAO_LABELS, FUNCOES_DA_GRADE } from './funcoes.ts';

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

/**
 * Planejado e realizado por pilar e por função, contra a meta em espaços.
 * Só entram linhas com `contaNaGrade`. A meta do período é proporcional aos
 * dias (espaços por semana × dias ÷ 7, arredondada), repartida entre os
 * pilares elegíveis com `distribuirEspacos`. Abaixo de 8 espaços por semana,
 * um período de até 7 dias passa a contar 4 semanas a partir do início.
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
  const usaJanelaPequena = pequena && dias <= 7;
  const semanas = usaJanelaPequena ? SEMANAS_GRADE_PEQUENA : Math.max(1, dias / 7);
  const janela = usaJanelaPequena
    ? periodoDe(periodo.inicio, SEMANAS_GRADE_PEQUENA)
    : { inicio: periodo.inicio, fim: periodo.fim };
  const totalMeta = usaJanelaPequena
    ? espacosPorSemana * SEMANAS_GRADE_PEQUENA
    : Math.round((espacosPorSemana * dias) / 7);

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

  const pilaresElegiveis = pilares.filter(
    pilar => pilar.ativo !== false && pilar.frequenciaSemanal != null,
  );
  const pesosPilares = pilaresElegiveis.map(pilar =>
    typeof pilar.frequenciaSemanal === 'number' && pilar.frequenciaSemanal > 0
      ? pilar.frequenciaSemanal
      : 0,
  );
  const metasPorPilar = distribuirEspacos(totalMeta, pesosPilares);

  const linhasPilarCompletas: LinhaContagem[] = pilaresElegiveis.map((pilar, index) => {
    const contagem = porPilar.get(pilar.id) ?? { planejado: 0, realizado: 0 };
    return {
      id: pilar.id,
      rotulo: pilar.nome,
      planejado: contagem.planejado,
      realizado: contagem.realizado,
      meta: metasPorPilar[index] ?? 0,
    };
  });

  // Pilar com meta 0 não ganha card; o que estiver nele entra na nota de
  // "em pilar sem espaço" (Fase 6), mas continua contado em somaPlanejado.
  const linhasPilar = linhasPilarCompletas.filter(linha => linha.meta > 0);
  const somaPlanejado = linhasPilarCompletas.reduce((soma, linha) => soma + linha.planejado, 0);
  const pilaresComMeta = linhasPilar.length;
  const notaSoma = pilaresComMeta >= 2 && somaPlanejado !== totalMeta
    ? `Seus pilares somam ${somaPlanejado} de ${totalMeta}.`
    : null;

  const distribuicao = settings.distribuicaoFuncoes;
  const fecha = distribuicaoFecha(distribuicao);
  const metasFuncao = fecha
    ? distribuirEspacos(totalMeta, percentuaisNaOrdem(distribuicao))
    : FUNCOES_DA_GRADE.map(() => 0);

  const funcoes: LinhaContagem[] = FUNCOES_DA_GRADE.flatMap((funcao, index) => {
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
