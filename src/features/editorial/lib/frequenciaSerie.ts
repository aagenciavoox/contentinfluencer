import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  setMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { SEMANA } from '../../../lib/semana.ts';
import type { UnidadeDaMeta } from './metaDaOnda.ts';

/** Recorrência usada só para comparar. Não escolhe dia nem cria post-it. */
export type FrequenciaSerie = {
  vezes: number | null;
  unidade: UnidadeDaMeta | 'sob-demanda';
  aPartirDe: string | null;
  /**
   * Referência fixa dos ciclos de 14 dias quando não há data de início: a segunda-feira da semana
   * em que a meta foi ativada pela primeira vez. Não corta o que vem antes, só ancora os ciclos.
   */
  ancora?: string | null;
};

/** Meses de cada bloco fechado do calendário, sempre alinhado a janeiro. */
export const MESES_DO_BLOCO = { mes: 1, bimestre: 2, trimestre: 3, semestre: 6 } as const;
const DIAS_QUINZENA = 14;

function texto(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function diaIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const candidato = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidato)) return null;
  const data = parseISO(candidato);
  if (Number.isNaN(data.getTime())) return null;
  return format(data, 'yyyy-MM-dd') === candidato ? candidato : null;
}

function iso(data: Date): string {
  return format(data, 'yyyy-MM-dd');
}

function unidadeDe(value: string | null | undefined): FrequenciaSerie['unidade'] | null {
  if (!value?.trim()) return null;
  const chave = texto(value);
  if (chave === 'semana' || chave === 'semanal') return 'semana';
  if (chave === 'quinzena' || chave === 'quinzenal') return 'quinzena';
  if (chave === 'mes' || chave === 'mensal') return 'mes';
  if (chave === 'bimestre' || chave === 'bimestral') return 'bimestre';
  if (chave === 'trimestre' || chave === 'trimestral') return 'trimestre';
  if (chave === 'semestre' || chave === 'semestral') return 'semestre';
  if (chave === 'sob demanda') return 'sob-demanda';
  return null;
}

function vezesDe(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

function vezesContaveis(vezes: number | null): number {
  return vezes === null ? 1 : vezes;
}

/**
 * Lê a recorrência estruturada quando vezes e unidade existem.
 * Sem isso, cai na frase antiga: Semanal, Quinzenal, Mensal ou sob demanda.
 * `vezes: 2` com unidade semana vale duas por semana e ganha de "Semanal".
 */
export function lerFrequencia(input: {
  frequenciaRecomendada?: string | null;
  vezes?: number | null;
  unidade?: string | null;
  aPartirDe?: string | null;
  ancora?: string | null;
}): FrequenciaSerie {
  const lida = lerFrequenciaSemAncora(input);
  const ancora = diaIso(input.ancora);
  return ancora ? { ...lida, ancora } : lida;
}

function lerFrequenciaSemAncora(input: {
  frequenciaRecomendada?: string | null;
  vezes?: number | null;
  unidade?: string | null;
  aPartirDe?: string | null;
}): FrequenciaSerie {
  const aPartirDe = diaIso(input.aPartirDe);
  const unidade = unidadeDe(input.unidade);
  const vezes = vezesDe(input.vezes);

  if (unidade === 'sob-demanda' || (unidade && vezes !== null)) {
    return {
      vezes: unidade === 'sob-demanda' ? null : vezes,
      unidade,
      aPartirDe,
    };
  }

  const legado = texto(input.frequenciaRecomendada ?? '');
  if (legado === 'semanal') return { vezes: 1, unidade: 'semana', aPartirDe };
  if (legado === 'quinzenal') return { vezes: 1, unidade: 'quinzena', aPartirDe };
  if (legado === 'mensal') return { vezes: 1, unidade: 'mes', aPartirDe };
  if (legado === 'bimestral') return { vezes: 1, unidade: 'bimestre', aPartirDe };
  if (legado === 'trimestral') return { vezes: 1, unidade: 'trimestre', aPartirDe };
  if (legado === 'semestral') return { vezes: 1, unidade: 'semestre', aPartirDe };
  return { vezes: null, unidade: 'sob-demanda', aPartirDe };
}

function expectativaSemana(vezes: number, inicio: string, fim: string): number {
  let cursor = startOfWeek(parseISO(inicio), SEMANA);
  let total = 0;

  while (iso(cursor) <= fim) {
    const fimDaSemana = endOfWeek(cursor, SEMANA);
    const comeco = iso(cursor) > inicio ? iso(cursor) : inicio;
    const termo = iso(fimDaSemana) < fim ? iso(fimDaSemana) : fim;
    const dias = differenceInCalendarDays(parseISO(termo), parseISO(comeco)) + 1;
    total += dias >= 7 ? vezes : Math.round((vezes * dias) / 7);
    cursor = addDays(fimDaSemana, 1);
  }

  return total;
}

/**
 * Passos de 14 dias ancorados em aPartirDe. Conta o bloco inteiro dentro do recorte, sem eleger um dia.
 * Com `antesDaAncora`, a âncora só marca o passo (âncora da primeira ativação) e os ciclos anteriores também contam.
 */
function expectativaQuinzena(vezes: number, ancoraIso: string, inicio: string, fim: string, antesDaAncora = false): number {
  const ancora = parseISO(ancoraIso);
  const diasAteORecorte = differenceInCalendarDays(parseISO(inicio), ancora);
  const passo = Math.ceil(diasAteORecorte / DIAS_QUINZENA);
  let indice = antesDaAncora ? passo : Math.max(0, passo);
  let total = 0;

  while (indice < 10000) {
    const comeco = addDays(ancora, indice * DIAS_QUINZENA);
    const comecoIso = iso(comeco);
    if (comecoIso > fim) break;
    const termoIso = iso(addDays(comeco, DIAS_QUINZENA - 1));
    if (comecoIso >= inicio && termoIso <= fim) total += vezes;
    indice += 1;
  }

  return total;
}

export function mesesDoBloco(unidade: string): number | null {
  return unidade in MESES_DO_BLOCO ? MESES_DO_BLOCO[unidade as keyof typeof MESES_DO_BLOCO] : null;
}

/** Primeiro dia do bloco de calendário que contém `data` (janeiro é o marco). */
function inicioDoBloco(data: Date, meses: number): Date {
  const base = startOfMonth(data);
  return setMonth(base, Math.floor(base.getMonth() / meses) * meses);
}

/** Blocos inteiros (mês, bimestre, trimestre, semestre) que tocam o recorte. */
export function blocosNoIntervalo(inicio: string, fim: string, meses: number): { inicio: string; fim: string }[] {
  let cursor = inicioDoBloco(parseISO(inicio), meses);
  const lista: { inicio: string; fim: string }[] = [];
  while (iso(cursor) <= fim) {
    lista.push({ inicio: iso(cursor), fim: iso(endOfMonth(addMonths(cursor, meses - 1))) });
    cursor = addMonths(cursor, meses);
  }
  return lista;
}

/** Início e fim do bloco de `meses` que contém o dia. A busca da Saúde usa o semestre. */
export function blocoQueContem(dia: string, meses: number): { inicio: string; fim: string } {
  const inicio = inicioDoBloco(parseISO(dia), meses);
  return { inicio: iso(inicio), fim: iso(endOfMonth(addMonths(inicio, meses - 1))) };
}

/** Conta só o bloco inteiro dentro do recorte. Um pedaço de trimestre não vira meta. */
function expectativaBloco(vezes: number, inicio: string, fim: string, meses: number): number {
  let total = 0;
  for (const bloco of blocosNoIntervalo(inicio, fim, meses)) {
    if (bloco.inicio >= inicio && bloco.fim <= fim) total += vezes;
  }
  return total;
}

/**
 * Quantos itens a recorrência pede entre `inicio` e `fim`, inclusive.
 * Sob demanda não tem número. O resultado só serve para comparar.
 */
export function expectativaNoIntervalo(freq: FrequenciaSerie, inicio: string, fim: string): number | null {
  if (freq.unidade === 'sob-demanda') return null;

  const inicioValido = diaIso(inicio);
  const fimValido = diaIso(fim);
  if (!inicioValido || !fimValido || inicioValido > fimValido) return 0;

  const partida = diaIso(freq.aPartirDe);
  if (partida && partida > fimValido) return 0;

  const recorte = partida && partida > inicioValido ? partida : inicioValido;
  const vezes = vezesContaveis(freq.vezes);

  if (freq.unidade === 'semana') return expectativaSemana(vezes, recorte, fimValido);
  if (freq.unidade === 'quinzena') {
    const ancora = diaIso(freq.ancora);
    if (!partida && ancora) return expectativaQuinzena(vezes, ancora, recorte, fimValido, true);
    return expectativaQuinzena(vezes, partida ?? inicioValido, recorte, fimValido);
  }
  const meses = mesesDoBloco(freq.unidade);
  return meses ? expectativaBloco(vezes, recorte, fimValido, meses) : 0;
}
