/**
 * Início da semana no app inteiro: segunda-feira (decisão do Bryan).
 * Grade do mês, semana do planejamento e apuração das metas usam esta constante.
 */
export const INICIO_DA_SEMANA = 1 as const;

/** Opção do date-fns (startOfWeek, endOfWeek, eachWeekOfInterval...). */
export const SEMANA = { weekStartsOn: INICIO_DA_SEMANA } as const;
