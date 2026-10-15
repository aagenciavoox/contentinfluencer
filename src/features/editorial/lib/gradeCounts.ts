import type { FuncaoEditorial } from '../../../lib/database.ts';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { AjusteSemana, DecisaoPeriodo, PreferenciasGerais } from './editorialSettings.ts';
import type { GradeEntry } from './gradeEntries.ts';
import { percentuaisFechamEm100, percentuaisNaOrdem } from './distribuirEspacos.ts';
import { contagemPorEtapaVazia, type ContagemPorEtapa, type Etapa } from './etapas.ts';
import { FUNCAO_LABELS, FUNCOES, isFuncaoEditorial } from './funcoes.ts';
import { postItTemPauta } from './pautaConteudo.ts';
import { decisaoDoPeriodo, limiteDoIntervalo } from './periodoEditorial.ts';

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

export type PostItContagem = {
  id: string;
  date: string | null;
  texto: string;
  contentId: string | null;
  serieId?: string | null;
  pilarId?: string | null;
  objetivo?: FuncaoEditorial | string | null;
};

/** O percentual antigo pode vir no objeto. A conta não lê esse campo. */
export type GradeCountSettings = {
  distribuicaoFuncoes?: Partial<Record<FuncaoEditorial, number>> | null;
  preferencias?: Pick<
    PreferenciasGerais,
    'limiteSemanal' | 'reservaForaSeriesSemanal' | 'redeReferenciaId' | 'reservaProntos'
  > | null;
  periodos?: readonly DecisaoPeriodo[];
  limiteSemanal?: number | null;
  reservaForaSeriesSemanal?: number | null;
  ajustesSemana?: readonly AjusteSemana[];
};

export type LinhaContagem = {
  id: string;
  rotulo: string;
  planejado: number;
  realizado: number;
  meta: number | null;
  previsto: number;
  comPauta: number;
  publicado: number;
};

export type ContagemObjetivo = {
  id: FuncaoEditorial;
  rotulo: string;
  meta: number | null;
  previsto: number;
  comPauta: number;
  publicado: number;
  /** Os previstos separados pela etapa de cada item. A soma é `previsto`. */
  porEtapa: ContagemPorEtapa;
};

export type GradeCounts = {
  semanas: number;
  /** Limite semanal declarado. Não é a meta do período. */
  espacosPorSemana: number;
  /** Limite do intervalo. Null quando não há limite — não vira 0. */
  totalMeta: number | null;
  limite: number | null;
  /** A janela de 4 semanas saiu da conta. Fica falso para quem ainda lê o campo. */
  gradePequena: boolean;
  periodo: PeriodoGrade;
  pilares: LinhaContagem[];
  funcoes: LinhaContagem[];
  objetivos: ContagemObjetivo[];
  somaPlanejado: number;
  previsto: number;
  comPauta: number;
  publicado: number;
  espacosLivres: number;
  /** Conteúdos (de Ideia em diante) sem objetivo. Post-it sem conteúdo não entra. */
  semObjetivo: number;
  /** Todos os previstos por etapa. */
  porEtapa: ContagemPorEtapa;
  /** Previstos sem objetivo, por etapa, incluindo post-it sem conteúdo. */
  semObjetivoPorEtapa: ContagemPorEtapa;
  /** Itens datados sem série. A reserva semanal não preenche vaga. */
  semSerie: number;
  reservaForaSeriesSemanal: number | null;
  /** Passou do limite. Os itens continuam na conta. Null se não há limite. */
  excesso: number | null;
  notaSoma: string | null;
  itens: GradeEntry[];
};

function diaValido(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

function diasInclusivos(periodo: PeriodoGrade): number {
  if (!diaValido(periodo.inicio) || !diaValido(periodo.fim)) return 7;
  const dias = differenceInCalendarDays(parseISO(periodo.fim), parseISO(periodo.inicio)) + 1;
  return dias > 0 ? dias : 7;
}

export function distribuicaoFecha(
  distribuicao: Partial<Record<FuncaoEditorial, number>> | null | undefined,
): boolean {
  if (!distribuicao) return false;
  return percentuaisFechamEm100(percentuaisNaOrdem(distribuicao));
}

function dia(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? null;
}

function noPeriodo(data: string | null, periodo: PeriodoGrade): boolean {
  return Boolean(data && data >= periodo.inicio && data <= periodo.fim);
}

function numeroOuNull(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
}

function limiteSemanalDe(settings: GradeCountSettings): number | null {
  if (settings.preferencias && 'limiteSemanal' in settings.preferencias) {
    return numeroOuNull(settings.preferencias.limiteSemanal);
  }
  if ('limiteSemanal' in settings) return numeroOuNull(settings.limiteSemanal);
  return null;
}

function reservaForaDe(settings: GradeCountSettings): number | null {
  if (settings.preferencias && 'reservaForaSeriesSemanal' in settings.preferencias) {
    return numeroOuNull(settings.preferencias.reservaForaSeriesSemanal);
  }
  if ('reservaForaSeriesSemanal' in settings) return numeroOuNull(settings.reservaForaSeriesSemanal);
  return null;
}

function ajustesDe(settings: GradeCountSettings): AjusteSemana[] {
  const dosPeriodos = (settings.periodos ?? []).flatMap(periodo => periodo.ajustesSemana ?? []);
  return [...dosPeriodos, ...(settings.ajustesSemana ?? [])];
}

function objetivoDe(valor: FuncaoEditorial | string | null | undefined): FuncaoEditorial | null {
  return isFuncaoEditorial(valor) ? valor : null;
}

type ItemContado = {
  entry: GradeEntry;
  temPauta: boolean;
  publicado: boolean;
};

function itemDeEntrada(entry: GradeEntry, temPauta: boolean): ItemContado {
  return {
    entry: { ...entry, temPauta },
    temPauta,
    publicado: entry.realizada,
  };
}

/**
 * Originais datados no período, uma vez por roteiro.
 * Post-it ligado a um desses roteiros não vira segundo item.
 * Post-it sem data não entra. Repost não entra.
 */
function montarItens(
  entries: readonly GradeEntry[],
  postIts: readonly PostItContagem[],
  periodo: PeriodoGrade,
): ItemContado[] {
  const originais = entries.filter(entry => entry.tipo === 'original');
  const porConteudo = new Map<string, GradeEntry>();
  for (const entry of originais) {
    if (!porConteudo.has(entry.contentId)) porConteudo.set(entry.contentId, entry);
  }

  const contados = new Set<string>();
  const itens: ItemContado[] = [];

  for (const entry of originais) {
    if (!entry.contaNaGrade || !noPeriodo(entry.data, periodo)) continue;
    if (contados.has(entry.contentId)) continue;
    contados.add(entry.contentId);
    itens.push(itemDeEntrada(entry, entry.temPauta === true));
  }

  for (const postIt of postIts) {
    if (!postIt.contentId || !contados.has(postIt.contentId)) continue;
    if (!postItTemPauta(postIt.texto)) continue;
    const item = itens.find(atual => atual.entry.contentId === postIt.contentId);
    if (!item) continue;
    item.temPauta = true;
    item.entry = { ...item.entry, temPauta: true };
  }

  const ligadosFora = new Map<string, PostItContagem[]>();
  const soltos: PostItContagem[] = [];
  for (const postIt of postIts) {
    const data = dia(postIt.date);
    if (!data || !noPeriodo(data, periodo)) continue;
    if (postIt.contentId && contados.has(postIt.contentId)) continue;
    if (postIt.contentId) {
      const lista = ligadosFora.get(postIt.contentId) ?? [];
      lista.push({ ...postIt, date: data });
      ligadosFora.set(postIt.contentId, lista);
    } else {
      soltos.push({ ...postIt, date: data });
    }
  }

  for (const [contentId, lista] of ligadosFora) {
    const ordenados = [...lista].sort((esquerda, direita) => {
      const dataEsquerda = esquerda.date ?? '';
      const dataDireita = direita.date ?? '';
      if (dataEsquerda !== dataDireita) return dataEsquerda < dataDireita ? -1 : 1;
      return esquerda.id < direita.id ? -1 : esquerda.id > direita.id ? 1 : 0;
    });
    const escolhido = ordenados[0];
    const entry = porConteudo.get(contentId);
    if (entry && !entry.contaNaGrade) continue;
    const temPauta = ordenados.some(nota => postItTemPauta(nota.texto)) || entry?.temPauta === true;
    const publicado = Boolean(entry?.realizada && noPeriodo(entry.data, periodo));
    // Conteúdo que sumiu da lista: o post-it volta a ser só planejamento.
    const etapa: Etapa = !entry ? 'planejamento' : publicado ? 'postado' : entry.etapa ?? 'roteiro';
    const sintetico: GradeEntry = {
      id: `post-it:${escolhido.id}`,
      contentId,
      tipo: 'original',
      data: escolhido.date,
      hora: null,
      contaNaGrade: true,
      // Com conteúdo ligado, vale a classificação do conteúdo, mesmo vazia.
      // A do post-it só vale enquanto ele é planejamento (conteúdo que sumiu da lista).
      pilarId: entry ? entry.pilarId : escolhido.pilarId ?? null,
      serieId: entry ? entry.serieId : escolhido.serieId ?? null,
      funcao: entry ? entry.funcao : objetivoDe(escolhido.objetivo),
      realizada: publicado,
      realizadaEm: publicado ? entry?.realizadaEm ?? null : null,
      temPauta,
      etapa,
      postItId: escolhido.id,
    };
    itens.push(itemDeEntrada(sintetico, temPauta));
  }

  for (const postIt of soltos) {
    const temPauta = postItTemPauta(postIt.texto);
    const sintetico: GradeEntry = {
      id: `post-it:${postIt.id}`,
      contentId: postIt.id,
      tipo: 'original',
      data: postIt.date,
      hora: null,
      contaNaGrade: true,
      pilarId: postIt.pilarId ?? null,
      serieId: postIt.serieId ?? null,
      funcao: objetivoDe(postIt.objetivo),
      realizada: false,
      realizadaEm: null,
      temPauta,
      etapa: 'planejamento',
      postItId: postIt.id,
    };
    itens.push(itemDeEntrada(sintetico, temPauta));
  }

  return itens;
}

function linhaDe(id: string, rotulo: string, grupo: readonly ItemContado[], meta: number | null): LinhaContagem {
  let comPauta = 0;
  let publicado = 0;
  for (const item of grupo) {
    if (item.temPauta || item.publicado) comPauta += 1;
    if (item.publicado) publicado += 1;
  }
  return {
    id,
    rotulo,
    planejado: grupo.length,
    realizado: publicado,
    meta,
    previsto: grupo.length,
    comPauta,
    publicado,
  };
}

/** Publicado no período manda; sem etapa gravada, o item é um conteúdo em Roteiro. */
export function etapaDoItem(item: Pick<GradeEntry, 'etapa' | 'realizada'>): Etapa {
  if (item.realizada) return 'postado';
  return item.etapa ?? 'roteiro';
}

function contaGrupo(grupo: readonly ItemContado[]): {
  previsto: number;
  comPauta: number;
  publicado: number;
  porEtapa: ContagemPorEtapa;
} {
  let comPauta = 0;
  let publicado = 0;
  const porEtapa = contagemPorEtapaVazia();
  for (const item of grupo) {
    if (item.temPauta || item.publicado) comPauta += 1;
    if (item.publicado) publicado += 1;
    porEtapa[etapaDoItem(item.entry)] += 1;
  }
  return { previsto: grupo.length, comPauta, publicado, porEtapa };
}

/**
 * Conta o intervalo uma vez.
 * O limite vem de `limiteDoIntervalo`. Null continua null.
 * A frequência do pilar e o percentual antigo não entram na conta.
 * Excesso fica registrado e não apaga item.
 */
export function contarPeriodo({
  entries,
  pilares,
  settings,
  periodo,
  postIts = [],
}: {
  entries: readonly GradeEntry[];
  pilares: readonly PilarContagem[];
  settings: GradeCountSettings;
  periodo: PeriodoGrade;
  postIts?: readonly PostItContagem[];
}): GradeCounts {
  const limiteSemanal = limiteSemanalDe(settings);
  const ajustesSemana = ajustesDe(settings);
  const limite = limiteDoIntervalo({
    limiteSemanal,
    inicio: periodo.inicio,
    fim: periodo.fim,
    ajustesSemana,
  });
  const decisao = decisaoDoPeriodo(settings.periodos ?? [], periodo.inicio, periodo.fim);
  const itens = montarItens(entries, postIts, periodo);

  let comPauta = 0;
  let publicado = 0;
  let espacosLivres = 0;
  let semObjetivo = 0;
  let semSerie = 0;
  const porEtapa = contagemPorEtapaVazia();
  const semObjetivoPorEtapa = contagemPorEtapaVazia();
  for (const item of itens) {
    const entraComPauta = item.temPauta || item.publicado;
    const etapa = etapaDoItem(item.entry);
    if (entraComPauta) comPauta += 1;
    if (item.publicado) publicado += 1;
    if (!item.temPauta && !item.publicado) espacosLivres += 1;
    porEtapa[etapa] += 1;
    if (!item.entry.funcao) {
      semObjetivoPorEtapa[etapa] += 1;
      if (etapa !== 'planejamento') semObjetivo += 1;
    }
    if (!item.entry.serieId) semSerie += 1;
  }

  const previsto = itens.length;
  const excesso = limite == null ? null : Math.max(0, previsto - limite);

  const objetivos: ContagemObjetivo[] = FUNCOES.map(funcao => {
    const bruto = decisao?.metas?.[funcao];
    const meta = typeof bruto === 'number' ? bruto : null;
    const grupo = itens.filter(item => item.entry.funcao === funcao);
    const contagem = contaGrupo(grupo);
    return {
      id: funcao,
      rotulo: FUNCAO_LABELS[funcao],
      meta,
      ...contagem,
    };
  });

  const porPilar = new Map<string, ItemContado[]>();
  for (const item of itens) {
    if (!item.entry.pilarId) continue;
    const lista = porPilar.get(item.entry.pilarId) ?? [];
    lista.push(item);
    porPilar.set(item.entry.pilarId, lista);
  }

  const pilaresContados = new Set<string>();
  const linhasPilar: LinhaContagem[] = pilares.map(pilar => {
    pilaresContados.add(pilar.id);
    return linhaDe(pilar.id, pilar.nome, porPilar.get(pilar.id) ?? [], null);
  });
  for (const [id, grupo] of porPilar) {
    if (pilaresContados.has(id)) continue;
    linhasPilar.push(linhaDe(id, id, grupo, null));
  }

  const dias = diasInclusivos(periodo);
  return {
    semanas: Math.max(1, dias / 7),
    espacosPorSemana: limiteSemanal ?? 0,
    totalMeta: limite,
    limite,
    gradePequena: false,
    periodo: { inicio: periodo.inicio, fim: periodo.fim },
    pilares: linhasPilar,
    funcoes: objetivos.map(objetivo => ({
      id: objetivo.id,
      rotulo: objetivo.rotulo,
      planejado: objetivo.previsto,
      realizado: objetivo.publicado,
      meta: objetivo.meta,
      previsto: objetivo.previsto,
      comPauta: objetivo.comPauta,
      publicado: objetivo.publicado,
    })),
    objetivos,
    somaPlanejado: previsto,
    previsto,
    comPauta,
    publicado,
    espacosLivres,
    semObjetivo,
    porEtapa,
    semObjetivoPorEtapa,
    semSerie,
    reservaForaSeriesSemanal: reservaForaDe(settings),
    excesso,
    notaSoma: excesso != null && excesso > 0
      ? `O período tem ${previsto} e o limite é ${limite}.`
      : null,
    itens: itens.map(item => item.entry),
  };
}

export const countGrade = contarPeriodo;
