import { addDays, format, parseISO } from 'date-fns';
import type { AjusteSemana, DecisaoPeriodo, MetasPeriodo, VigenciaEditorial } from './editorialSettings.ts';
import { metaDoPeriodo, resolverPausa } from './metaDoPeriodo.ts';
import { diasDePausa, type PausaEditorial } from './pausas.ts';
import { metasDoPeriodo, type MetaDoObjetivo, type ProporcaoFuncoes } from './proporcaoObjetivos.ts';
import type { FuncaoEditorial } from '../../../lib/database.ts';

/**
 * O trecho do calendário (o mês ou a semana na tela) separado do plano escolhido no Editorial.
 * Abrir uma semana não cria decisão, não apaga ajuste e não exige um plano com aquelas datas:
 * cada dia usa a decisão do plano que o contém (a mais específica), e só dentro das datas dela.
 * Fora de qualquer plano valem as regras gerais. Meta absoluta de um plano só vale quando o
 * trecho cobre o plano inteiro; senão aparece como referência, nunca como obrigação do trecho.
 */

type Intervalo = { inicio: string; fim: string };

const FORMATO = 'yyyy-MM-dd';

function diasDe(intervalo: Intervalo): string[] {
  const dias: string[] = [];
  let cursor = parseISO(intervalo.inicio);
  const termo = parseISO(intervalo.fim);
  while (cursor <= termo && dias.length < 800) {
    dias.push(format(cursor, FORMATO));
    cursor = addDays(cursor, 1);
  }
  return dias;
}

function duracao(intervalo: Intervalo): number {
  return diasDe(intervalo).length;
}

/** A decisão que vale num dia: a do plano mais curto que contém o dia (a mais específica). */
export function decisaoDoDia(decisoes: readonly DecisaoPeriodo[], dia: string): DecisaoPeriodo | null {
  let escolhida: DecisaoPeriodo | null = null;
  for (const decisao of decisoes) {
    if (dia < decisao.inicio || dia > decisao.fim) continue;
    if (!escolhida || duracao(decisao) < duracao(escolhida)) escolhida = decisao;
  }
  return escolhida;
}

export type SegmentoDoTrecho = Intervalo & {
  /** O plano que vale nestes dias, ou null = regras gerais, sem ajuste específico. */
  decisao: Intervalo | null;
  /** A meta absoluta do plano entrou inteira: o trecho cobre o plano todo. */
  absolutaAplicada: boolean;
  /** Antes de arredondar (o total arredonda uma vez). Null = sem meta nestes dias. */
  bruto: number | null;
  diasDePausa: number;
};

export type ReferenciaDeMeta = Intervalo & { valor: number };

export type MetaDoTrecho = {
  valor: number | null;
  segmentos: SegmentoDoTrecho[];
  /** Metas absolutas de planos que o trecho só cruza: referência, não obrigação. */
  referencias: ReferenciaDeMeta[];
  /** Algum dia do trecho fica fora de qualquer plano: vale a regra geral, sem ajuste específico. */
  semAjusteEspecifico: boolean;
  diasDePausa: number;
  pendenciasDePausa: string[];
};

function chave(decisao: DecisaoPeriodo | null): string {
  return decisao ? `${decisao.inicio}|${decisao.fim}` : 'geral';
}

/** Ajustes de semana do plano cuja parcela (semana ∩ plano) cabe inteira no segmento. */
function ajustesQueCabem(decisao: DecisaoPeriodo, segmento: Intervalo): AjusteSemana[] {
  return decisao.ajustesSemana.filter(ajuste => {
    const inicio = ajuste.inicio > decisao.inicio ? ajuste.inicio : decisao.inicio;
    const fim = ajuste.fim < decisao.fim ? ajuste.fim : decisao.fim;
    return inicio >= segmento.inicio && fim <= segmento.fim;
  });
}

/** Meta de publicação (conteúdos) do trecho, plano a plano. */
export function metaDoTrecho(input: {
  trecho: Intervalo;
  decisoes: readonly DecisaoPeriodo[];
  limiteSemanal: number | null;
  vigencias?: readonly VigenciaEditorial[] | null;
  pausas?: readonly PausaEditorial[];
  hoje?: string;
}): MetaDoTrecho {
  const dias = diasDe(input.trecho);
  const blocos: Array<{ decisao: DecisaoPeriodo | null; dias: string[] }> = [];
  for (const dia of dias) {
    const decisao = decisaoDoDia(input.decisoes, dia);
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && chave(ultimo.decisao) === chave(decisao)) ultimo.dias.push(dia);
    else blocos.push({ decisao, dias: [dia] });
  }

  const segmentos: SegmentoDoTrecho[] = [];
  const referencias = new Map<string, ReferenciaDeMeta>();
  const pendencias = new Set<string>();
  let diasPausados = 0;

  for (const bloco of blocos) {
    const segmento = { inicio: bloco.dias[0], fim: bloco.dias[bloco.dias.length - 1] };
    const decisao = bloco.decisao;
    const escrita = decisao?.metasPublicacao;
    const absoluta = typeof escrita === 'number' && Number.isFinite(escrita) && escrita >= 0 ? escrita : null;
    const planoInteiro = Boolean(decisao && segmento.inicio === decisao.inicio && segmento.fim === decisao.fim);

    // A pausa escrita foi pensada para as datas do plano: lida com elas, depois cortada no segmento.
    const pausaEscrita = decisao ? resolverPausa(decisao.pausaEditorial, decisao) : { dias: [], pendencia: null };
    if (pausaEscrita.pendencia) pendencias.add(pausaEscrita.pendencia);
    const pausados = new Set([
      ...pausaEscrita.dias.filter(dia => dia >= segmento.inicio && dia <= segmento.fim),
      ...diasDePausa(input.pausas ?? [], { tipo: 'publicacao' }, segmento),
    ]);
    diasPausados += pausados.size;

    if (decisao && absoluta != null && planoInteiro) {
      segmentos.push({ ...segmento, decisao: { inicio: decisao.inicio, fim: decisao.fim }, absolutaAplicada: true, bruto: absoluta, diasDePausa: pausados.size });
      continue;
    }
    if (decisao && absoluta != null) {
      referencias.set(chave(decisao), { inicio: decisao.inicio, fim: decisao.fim, valor: absoluta });
    }
    const meta = metaDoPeriodo({
      periodo: segmento,
      limiteSemanal: input.limiteSemanal,
      vigencias: input.vigencias,
      ajustesSemana: decisao ? ajustesQueCabem(decisao, segmento) : [],
      hoje: input.hoje,
      diasPausados: [...pausados],
    });
    segmentos.push({
      ...segmento,
      decisao: decisao ? { inicio: decisao.inicio, fim: decisao.fim } : null,
      absolutaAplicada: false,
      bruto: meta.bruto,
      diasDePausa: pausados.size,
    });
  }

  const semMeta = segmentos.some(segmento => segmento.bruto == null);
  const soma = segmentos.reduce((total, segmento) => total + (segmento.bruto ?? 0), 0);
  return {
    valor: semMeta || segmentos.length === 0 ? null : Math.round(soma),
    segmentos,
    referencias: [...referencias.values()],
    semAjusteEspecifico: segmentos.some(segmento => segmento.decisao == null),
    diasDePausa: diasPausados,
    pendenciasDePausa: [...pendencias],
  };
}

export type MetasPorObjetivoDoTrecho = {
  metas: Record<FuncaoEditorial, MetaDoObjetivo>;
  /** Quantidades por objetivo de planos que o trecho só cruza: composição de referência. */
  referencias: Array<Intervalo & { metas: MetasPeriodo }>;
};

/**
 * Metas por objetivo no trecho. As quantidades escritas num plano valem quando o trecho é o plano;
 * num pedaço dele (uma semana de um mês), a proporção vale sobre a meta do trecho e as quantidades
 * do plano aparecem como referência, sem virar exigência para a semana.
 */
export function metasPorObjetivoDoTrecho(input: {
  trecho: Intervalo;
  meta: MetaDoTrecho;
  decisoes: readonly DecisaoPeriodo[];
  proporcao: ProporcaoFuncoes | null;
}): MetasPorObjetivoDoTrecho {
  const exata = input.decisoes.find(decisao => decisao.inicio === input.trecho.inicio && decisao.fim === input.trecho.fim) ?? null;
  const cruzadas = input.decisoes.filter(decisao => (
    decisao !== exata
    && decisao.inicio <= input.trecho.fim
    && decisao.fim >= input.trecho.inicio
    && Object.keys(decisao.metas ?? {}).length > 0
  ));
  return {
    metas: metasDoPeriodo({ limite: input.meta.valor, proporcao: input.proporcao, ajustes: exata?.metas }),
    referencias: cruzadas.map(decisao => ({ inicio: decisao.inicio, fim: decisao.fim, metas: decisao.metas })),
  };
}
