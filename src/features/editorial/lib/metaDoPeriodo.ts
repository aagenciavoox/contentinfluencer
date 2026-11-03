import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { AjusteSemana, DecisaoPeriodo, VigenciaEditorial } from './editorialSettings.ts';
import { semanasNoIntervalo } from './periodoEditorial.ts';
import { limiteSemanalNaSemana, periodoVigente } from './vigencias.ts';

/**
 * Meta de publicação do período: uma conta só para o Editorial, a Saúde e o painel do Planejamento.
 * Ordem: meta absoluta do período → ajustes das semanas → ritmo vigente nos dias elegíveis.
 * Arredonda uma vez, no total.
 */

const FORMATO = 'yyyy-MM-dd';

type Intervalo = { inicio: string; fim: string };

function diaIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const data = parseISO(value);
  return !Number.isNaN(data.getTime()) && format(data, FORMATO) === value;
}

// ------------------------------------------------------------------ Pausa

export type PausaResolvida = {
  /** Dias de pausa dentro do período, sem repetição. */
  dias: string[];
  /** Trecho do texto que não deu para transformar em datas com segurança. Não é descontado. */
  pendencia: string | null;
};

const MESES: Record<string, number> = {
  janeiro: 1, jan: 1, fevereiro: 2, fev: 2, marco: 3, mar: 3, abril: 4, abr: 4, maio: 5, mai: 5,
  junho: 6, jun: 6, julho: 7, jul: 7, agosto: 8, ago: 8, setembro: 9, set: 9, outubro: 10, out: 10,
  novembro: 11, nov: 11, dezembro: 12, dez: 12,
};

const NOME_MES = Object.keys(MESES).sort((a, b) => b.length - a.length).join('|');
const ATE = '\\s*(?:a|até|ate|-|–|—)\\s*';

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function iso(ano: number, mes: number, dia: number): string | null {
  const valor = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  return diaIso(valor) ? valor : null;
}

function anoCompleto(ano: string | undefined): number | null {
  if (!ano) return null;
  const n = Number(ano);
  return ano.length === 2 ? 2000 + n : n;
}

function diasEntre(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  let cursor = parseISO(inicio);
  const termo = parseISO(fim);
  while (cursor <= termo && dias.length < 400) {
    dias.push(format(cursor, FORMATO));
    cursor = addDays(cursor, 1);
  }
  return dias;
}

function cruza(trecho: Intervalo, periodo: Intervalo): boolean {
  return trecho.inicio <= periodo.fim && trecho.fim >= periodo.inicio;
}

/**
 * Ano de um trecho escrito sem ano: o do período que ele cruza.
 * Os dois anos do período servindo, ou nenhum, a data não é inequívoca.
 */
function trechoSemAno(
  periodo: Intervalo,
  montar: (ano: number) => Intervalo | null,
): { trecho: Intervalo | null; ambiguo: boolean } {
  const anos = [...new Set([Number(periodo.inicio.slice(0, 4)), Number(periodo.fim.slice(0, 4))])];
  const candidatos = anos.map(montar).filter((t): t is Intervalo => Boolean(t));
  const cruzam = candidatos.filter(t => cruza(t, periodo));
  if (cruzam.length === 1) return { trecho: cruzam[0], ambiguo: false };
  if (cruzam.length === 0 && candidatos.length > 0) return { trecho: null, ambiguo: false };
  return { trecho: null, ambiguo: true };
}

/**
 * Lê o texto de "Pausas & Exceções" e devolve só os dias com data inequívoca.
 * "24/12 a 26/12", "24/12/2026", "20 a 31 de dezembro" e "1 de dez a 3 de jan" viram dias.
 * "10 a 15" só vale quando o período fica dentro de um mês. "5 dias" ou texto sem data
 * não é descontado: vira pendência para revisão.
 */
export function resolverPausa(texto: string | null | undefined, periodo: Intervalo): PausaResolvida {
  const original = texto?.trim() ?? '';
  if (!original || /^(sem pausa|nenhuma|nao|-|—)\.?$/.test(normalizar(original))) return { dias: [], pendencia: null };
  let resto = normalizar(original);
  const trechos: Intervalo[] = [];
  let ambiguo = false;
  // Trechos lidos com data certa, dentro ou fora do período.
  let reconhecidos = 0;

  const consumir = (regex: RegExp, ler: (m: string[]) => void) => {
    resto = resto.replace(regex, (...args: unknown[]) => {
      ler(args.slice(0, -2).map(valor => (typeof valor === 'string' ? valor : '')));
      return ' ';
    });
  };

  const guardar = (trecho: Intervalo | null) => {
    if (!trecho) {
      ambiguo = true;
      return;
    }
    reconhecidos += 1;
    trechos.push(trecho);
  };

  const guardarSemAno = (resultado: { trecho: Intervalo | null; ambiguo: boolean }) => {
    if (resultado.ambiguo) {
      ambiguo = true;
      return;
    }
    reconhecidos += 1;
    if (resultado.trecho) trechos.push(resultado.trecho);
  };

  const intervalo = (ini: string | null, fim: string | null): Intervalo | null => (
    ini && fim && ini <= fim ? { inicio: ini, fim } : null
  );

  // 24/12/2026 a 26/12/2026, 24/12 a 26/12
  consumir(new RegExp(`(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?${ATE}(\\d{1,2})/(\\d{1,2})(?:/(\\d{2,4}))?`, 'g'), m => {
    const [, d1, m1, a1, d2, m2, a2] = m;
    const anoIni = anoCompleto(a1 || undefined);
    const anoFim = anoCompleto(a2 || undefined) ?? anoIni;
    if (anoIni != null && anoFim != null) {
      guardar(intervalo(iso(anoIni, Number(m1), Number(d1)), iso(anoFim, Number(m2), Number(d2))));
      return;
    }
    guardarSemAno(trechoSemAno(periodo, ano => intervalo(
      iso(ano, Number(m1), Number(d1)),
      iso(Number(m2) < Number(m1) ? ano + 1 : ano, Number(m2), Number(d2)),
    )));
  });

  // 1 de dezembro a 3 de janeiro (de 2027)
  consumir(new RegExp(`(\\d{1,2})\\s*de\\s*(${NOME_MES})\\b${ATE}(\\d{1,2})\\s*de\\s*(${NOME_MES})\\b(?:\\s*de\\s*(\\d{4}))?`, 'g'), m => {
    const [, d1, n1, d2, n2, a] = m;
    const m1 = MESES[n1];
    const m2 = MESES[n2];
    const vira = m2 < m1;
    const montar = (ano: number) => intervalo(iso(ano, m1, Number(d1)), iso(vira ? ano + 1 : ano, m2, Number(d2)));
    const ano = anoCompleto(a || undefined);
    // O ano escrito no fim é o do último dia.
    if (ano != null) guardar(montar(vira ? ano - 1 : ano));
    else guardarSemAno(trechoSemAno(periodo, montar));
  });

  // 20 a 31 de dezembro (de 2026)
  consumir(new RegExp(`(\\d{1,2})${ATE}(\\d{1,2})\\s*de\\s*(${NOME_MES})\\b(?:\\s*de\\s*(\\d{4}))?`, 'g'), m => {
    const [, d1, d2, nome, a] = m;
    const mes = MESES[nome];
    const montar = (ano: number) => intervalo(iso(ano, mes, Number(d1)), iso(ano, mes, Number(d2)));
    const ano = anoCompleto(a || undefined);
    if (ano != null) guardar(montar(ano));
    else guardarSemAno(trechoSemAno(periodo, montar));
  });

  // 24/12/2026 ou 24/12 sozinho
  consumir(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g, m => {
    const [, d, mes, a] = m;
    const ano = anoCompleto(a || undefined);
    const umDia = (y: number) => {
      const dia = iso(y, Number(mes), Number(d));
      return dia ? { inicio: dia, fim: dia } : null;
    };
    if (ano != null) guardar(umDia(ano));
    else guardarSemAno(trechoSemAno(periodo, umDia));
  });

  // 10 a 15, sem mês: só quando o período fica dentro de um mês.
  consumir(new RegExp(`(\\d{1,2})${ATE}(\\d{1,2})(?!\\s*dias?\\b)`, 'g'), m => {
    const [, d1, d2] = m;
    if (periodo.inicio.slice(0, 7) !== periodo.fim.slice(0, 7)) {
      ambiguo = true;
      return;
    }
    const ano = Number(periodo.inicio.slice(0, 4));
    const mes = Number(periodo.inicio.slice(5, 7));
    guardar(intervalo(iso(ano, mes, Number(d1)), iso(ano, mes, Number(d2))));
  });

  const sobraComNumero = /\d/.test(resto);
  const nenhumaData = reconhecidos === 0;
  const dias = new Set<string>();
  for (const trecho of trechos) {
    const ini = trecho.inicio < periodo.inicio ? periodo.inicio : trecho.inicio;
    const fim = trecho.fim > periodo.fim ? periodo.fim : trecho.fim;
    if (ini > fim) continue;
    for (const dia of diasEntre(ini, fim)) dias.add(dia);
  }

  const precisaRevisar = ambiguo || sobraComNumero || nenhumaData;
  return {
    dias: [...dias].sort(),
    pendencia: precisaRevisar
      ? 'Pausa sem datas reconhecíveis: não foi descontada. Escreva as datas, por exemplo 24/12 a 26/12.'
      : null,
  };
}

// ------------------------------------------------------------------ Meta

export type OrigemDaMetaDoPeriodo = 'absoluta' | 'ritmo' | null;

export type MetaDoPeriodo = {
  /** O número que vale. Null é "Meta não definida", nunca zero. */
  valor: number | null;
  /** Pelo ritmo e pelos ajustes das semanas, sem a meta absoluta. */
  calculada: number | null;
  origem: OrigemDaMetaDoPeriodo;
  /** Dias descontados por pausa com data inequívoca. */
  diasDePausa: number;
  pendenciaDePausa: string | null;
  /** Semanas que entraram com o número ajustado. */
  semanasAjustadas: number;
  /** Dias do período menos os dias de pausa. */
  diasElegiveis: number;
};

function ajusteDaSemana(ajustes: readonly AjusteSemana[], inicio: string, fim: string): AjusteSemana | null {
  let encontrado: AjusteSemana | null = null;
  for (const ajuste of ajustes) {
    if (ajuste.inicio === inicio && ajuste.fim === fim) encontrado = ajuste;
  }
  return encontrado;
}

export function metaDoPeriodo(input: {
  periodo: Intervalo;
  /** Ritmo de hoje (Ajustes). */
  limiteSemanal: number | null;
  vigencias?: readonly VigenciaEditorial[] | null;
  ajustesSemana?: readonly AjusteSemana[];
  /** Decisão gravada para este início e fim. */
  decisao?: Pick<DecisaoPeriodo, 'metasPublicacao' | 'pausaEditorial'> | null;
  hoje?: string;
  /**
   * Ritmo de cada semana, quando quem chama tem a própria vigência (a meta de uma conta).
   * Null numa semana = sem meta naquela semana, e o período fica sem meta calculada.
   */
  limiteDaSemana?: (inicioSemana: string) => number | null;
}): MetaDoPeriodo {
  const { periodo } = input;
  const vazio: MetaDoPeriodo = {
    valor: null, calculada: null, origem: null, diasDePausa: 0, pendenciaDePausa: null, semanasAjustadas: 0, diasElegiveis: 0,
  };
  if (!diaIso(periodo.inicio) || !diaIso(periodo.fim) || periodo.fim < periodo.inicio) return vazio;

  const pausa = resolverPausa(input.decisao?.pausaEditorial, periodo);
  const pausados = new Set(pausa.dias);
  const totalDias = differenceInCalendarDays(parseISO(periodo.fim), parseISO(periodo.inicio)) + 1;
  // Período vigente usa o ritmo atual em todas as semanas; encerrado, o que valia em cada semana.
  const porSemana = (input.vigencias?.length ?? 0) > 0 && !periodoVigente(periodo, input.hoje);
  const ajustes = input.ajustesSemana ?? [];

  let bruto: number | null = 0;
  let semanasAjustadas = 0;
  for (const semana of semanasNoIntervalo(periodo.inicio, periodo.fim)) {
    const ajuste = ajusteDaSemana(ajustes, semana.inicio, semana.fim);
    if (ajuste) {
      // A parcela ajustada vale como está: sem proporção nem desconto de pausa.
      semanasAjustadas += 1;
      if (bruto != null) bruto += ajuste.limite;
      continue;
    }
    const limite = input.limiteDaSemana
      ? input.limiteDaSemana(semana.inicio)
      : porSemana
        ? limiteSemanalNaSemana({ limiteSemanal: input.limiteSemanal, vigencias: input.vigencias }, semana.inicio)
        : input.limiteSemanal;
    if (limite == null) {
      bruto = null;
      continue;
    }
    const ini = semana.inicio < periodo.inicio ? periodo.inicio : semana.inicio;
    const fim = semana.fim > periodo.fim ? periodo.fim : semana.fim;
    const elegiveis = diasEntre(ini, fim).filter(dia => !pausados.has(dia)).length;
    if (bruto != null) bruto += (limite * elegiveis) / 7;
  }

  const calculada = bruto == null ? null : Math.round(bruto);
  const absoluta = input.decisao?.metasPublicacao;
  const temAbsoluta = typeof absoluta === 'number' && Number.isFinite(absoluta) && absoluta >= 0;
  return {
    valor: temAbsoluta ? absoluta : calculada,
    calculada,
    origem: temAbsoluta ? 'absoluta' : calculada != null ? 'ritmo' : null,
    diasDePausa: pausa.dias.length,
    pendenciaDePausa: pausa.pendencia,
    semanasAjustadas,
    diasElegiveis: totalDias - pausa.dias.length,
  };
}
