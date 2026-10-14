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

/** Recorrência usada só para comparar. Não escolhe dia nem cria post-it. */
export type FrequenciaSerie = {
  vezes: number | null;
  unidade: 'semana' | 'quinzena' | 'mes' | 'sob-demanda';
  aPartirDe: string | null;
};

const SEMANA = { weekStartsOn: 0 as const };
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

/** Passos de 14 dias ancorados em aPartirDe. Conta o bloco inteiro dentro do recorte, sem eleger um dia. */
function expectativaQuinzena(vezes: number, ancoraIso: string, inicio: string, fim: string): number {
  const ancora = parseISO(ancoraIso);
  const diasAteORecorte = differenceInCalendarDays(parseISO(inicio), ancora);
  let indice = Math.max(0, Math.ceil(diasAteORecorte / DIAS_QUINZENA));
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

function expectativaMes(vezes: number, inicio: string, fim: string): number {
  let cursor = startOfMonth(parseISO(inicio));
  let total = 0;

  while (iso(cursor) <= fim) {
    const comeco = iso(cursor);
    const termo = iso(endOfMonth(cursor));
    if (comeco >= inicio && termo <= fim) total += vezes;
    cursor = addDays(endOfMonth(cursor), 1);
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
    return expectativaQuinzena(vezes, partida ?? inicioValido, recorte, fimValido);
  }
  return expectativaMes(vezes, recorte, fimValido);
}
