import { addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import type { FuncaoEditorial, Serie } from '../../../lib/database.ts';
import { FUNCAO_LABELS, FUNCOES, isFuncaoEditorial } from '../../editorial/lib/funcoes.ts';
import { resolverFuncaoHerdada, type ConteudoHeranca, type SerieHeranca } from '../../editorial/lib/herancaSerie.ts';
import { lerFrequencia, type FrequenciaSerie } from '../../editorial/lib/frequenciaSerie.ts';
import { semanaDe, semanasNoIntervalo } from '../../editorial/lib/periodoEditorial.ts';
import type { ProporcaoFuncoes } from '../../editorial/lib/proporcaoObjetivos.ts';
import { idsDaSubarvore } from '../../editorial/lib/serieArvore.ts';
import type { VigenciaEditorial } from '../../editorial/lib/editorialSettings.ts';
import { limiteSemanalNaSemana, periodoVigente, proporcaoDoIntervalo } from '../../editorial/lib/vigencias.ts';

/**
 * Os três indicadores da Saúde: objetivos, continuidade das séries e pilares.
 * Só lê e calcula: não muda objetivo de conteúdo nem proporção salva.
 */

type Intervalo = { inicio: string; fim: string };

/** O mínimo de um item do período (GradeEntry serve). */
export type ItemSaude = {
  id: string;
  contentId: string;
  data: string | null;
  serieId: string | null;
  pilarId: string | null;
  funcao: FuncaoEditorial | null;
  postItId?: string | null;
};

export type ConteudoDaSaude = ConteudoHeranca & { id: string };

const FORMATO = 'yyyy-MM-dd';

function curta(data: string): string {
  return format(parseISO(data), 'dd/MM');
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

// ---------------------------------------------------------------- Objetivos

/**
 * Objetivo do item: o do conteúdo (escolhido ou herdado da série, subindo a árvore);
 * post-it sem conteúdo usa o objetivo do post-it. Nada é preenchido.
 */
export function objetivoEfetivo(
  item: ItemSaude,
  contentById: ReadonlyMap<string, ConteudoDaSaude>,
  series: readonly SerieHeranca[],
): FuncaoEditorial | null {
  const content = contentById.get(item.contentId);
  if (content) {
    return resolverFuncaoHerdada({ ...content, seriesId: content.seriesId ?? item.serieId }, series).funcao;
  }
  return isFuncaoEditorial(item.funcao) ? item.funcao : null;
}

/**
 * Proporção desejada do período, igual à usada nas metas do Editorial:
 * período vigente usa a atual; período encerrado pesa cada semana pela vigência dela.
 */
export function proporcaoDesejadaDoPeriodo(input: {
  periodo: Intervalo;
  limiteSemanal: number | null;
  proporcaoFuncoes: ProporcaoFuncoes | null;
  vigencias?: readonly VigenciaEditorial[] | null;
  hoje?: string;
}): ProporcaoFuncoes | null {
  const { periodo, limiteSemanal, proporcaoFuncoes, vigencias } = input;
  const hoje = input.hoje ?? format(new Date(), FORMATO);
  const temVigencias = (vigencias?.length ?? 0) > 0 && !periodoVigente(periodo, hoje);
  return proporcaoDoIntervalo({
    semanas: temVigencias
      ? semanasNoIntervalo(periodo.inicio, periodo.fim).map(semana => ({
        inicio: semana.inicio,
        limite: limiteSemanalNaSemana({ limiteSemanal, vigencias }, semana.inicio),
      }))
      : [],
    proporcaoAtual: proporcaoFuncoes,
    vigencias,
  });
}

export type LinhaObjetivoSaude<T> = {
  funcao: FuncaoEditorial;
  rotulo: string;
  quantidade: number;
  /** Sobre todos os itens do período, "sem objetivo" incluído. */
  previstoPct: number;
  desejadoPct: number | null;
  itens: T[];
};

export type DistribuicaoObjetivos<T> = {
  total: number;
  linhas: LinhaObjetivoSaude<T>[];
  semObjetivo: T[];
  semObjetivoPct: number;
  incompleta: boolean;
  temProporcao: boolean;
};

function pct(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

export function distribuicaoPorObjetivo<T extends ItemSaude>(input: {
  itens: readonly T[];
  contents: readonly ConteudoDaSaude[];
  series: readonly SerieHeranca[];
  proporcao: ProporcaoFuncoes | null;
}): DistribuicaoObjetivos<T> {
  const contentById = new Map(input.contents.map(content => [content.id, content]));
  const grupos = new Map<FuncaoEditorial, T[]>();
  const semObjetivo: T[] = [];
  for (const item of input.itens) {
    const funcao = objetivoEfetivo(item, contentById, input.series);
    if (!funcao) { semObjetivo.push(item); continue; }
    grupos.set(funcao, [...(grupos.get(funcao) ?? []), item]);
  }
  const total = input.itens.length;
  const linhas = FUNCOES
    .map(funcao => {
      const itens = grupos.get(funcao) ?? [];
      const desejado = input.proporcao?.[funcao];
      return {
        funcao,
        rotulo: FUNCAO_LABELS[funcao],
        quantidade: itens.length,
        previstoPct: pct(itens.length, total),
        desejadoPct: desejado == null ? null : Math.round(desejado),
        itens,
      };
    })
    .filter(linha => linha.quantidade > 0 || linha.desejadoPct != null);
  return {
    total,
    linhas,
    semObjetivo,
    semObjetivoPct: pct(semObjetivo.length, total),
    incompleta: semObjetivo.length > 0,
    temProporcao: input.proporcao != null,
  };
}

export function textoSemObjetivo(dist: Pick<DistribuicaoObjetivos<unknown>, 'total' | 'semObjetivo'>): string | null {
  if (dist.semObjetivo.length === 0) return null;
  return `${dist.semObjetivo.length} de ${plural(dist.total, 'conteúdo', 'conteúdos')} sem objetivo`;
}

// ------------------------------------------------------------- Continuidade

export type SerieDaSaude = Pick<
  Serie,
  'id' | 'name' | 'parentId' | 'frequenciaRecomendada' | 'frequenciaVezes' | 'frequenciaUnidade' | 'frequenciaAPartirDe'
> & Partial<Pick<Serie, 'tipoAgrupamento' | 'ativa' | 'acompanharContinuidade'>>;

export type SituacaoFrequencia =
  | { tipo: 'definida'; freq: FrequenciaSerie & { unidade: 'semana' | 'quinzena' | 'mes' } }
  | { tipo: 'sem-frequencia' }
  | { tipo: 'incompleta' }
  | { tipo: 'sob-demanda' };

function chave(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

const UNIDADES = new Set(['semana', 'semanal', 'quinzena', 'quinzenal', 'mes', 'mensal', 'sob demanda']);

/**
 * Lê a frequência como lerFrequencia, mas separa o que falta configurar:
 * número sem unidade é "incompleta"; nada cadastrado é "sem frequência".
 */
export function situacaoDaFrequencia(serie: SerieDaSaude): SituacaoFrequencia {
  const unidade = chave(serie.frequenciaUnidade);
  const vezes = serie.frequenciaVezes;
  const temVezes = typeof vezes === 'number' && Number.isFinite(vezes) && vezes > 0;
  if (temVezes && !UNIDADES.has(unidade)) return { tipo: 'incompleta' };
  const legado = chave(serie.frequenciaRecomendada);
  if (unidade === 'sob demanda' || (!unidade && legado === 'sob demanda')) return { tipo: 'sob-demanda' };
  const freq = lerFrequencia({
    frequenciaRecomendada: serie.frequenciaRecomendada,
    vezes: serie.frequenciaVezes,
    unidade: serie.frequenciaUnidade,
    aPartirDe: serie.frequenciaAPartirDe,
  });
  if (freq.unidade === 'sob-demanda') return { tipo: 'sem-frequencia' };
  return { tipo: 'definida', freq: freq as FrequenciaSerie & { unidade: 'semana' | 'quinzena' | 'mes' } };
}

export type IntervaloAvaliado = {
  inicio: string;
  fim: string;
  quantidade: number;
  meta: number;
  abaixo: boolean;
  /** "semana 28/09–04/10 avaliada inteira (começa antes do período)". */
  nota: string | null;
};

const NOME_UNIDADE = { semana: 'semana', quinzena: 'quinzena', mes: 'mês' } as const;

function notaDoIntervalo(unidade: 'semana' | 'quinzena' | 'mes', intervalo: Intervalo, periodo: Intervalo): string | null {
  const motivos: string[] = [];
  if (intervalo.inicio < periodo.inicio) motivos.push('começa antes do período');
  if (intervalo.fim > periodo.fim) motivos.push('termina depois do período');
  if (unidade !== 'mes' && intervalo.inicio.slice(0, 7) !== intervalo.fim.slice(0, 7)) motivos.push('atravessa dois meses');
  if (motivos.length === 0) return null;
  const inteira = unidade === 'mes' ? 'avaliado inteiro' : 'avaliada inteira';
  return `${NOME_UNIDADE[unidade]} ${curta(intervalo.inicio)}–${curta(intervalo.fim)} ${inteira} (${motivos.join(', ')})`;
}

/**
 * Intervalos inteiros que tocam o período: semanas domingo-sábado, meses do calendário,
 * quinzenas de 14 dias a partir do início da meta (ou do período). Antes do início da meta, nada.
 */
export function intervalosDaFrequencia(freq: SituacaoFrequencia & { tipo: 'definida' }, periodo: Intervalo): Intervalo[] {
  const aPartirDe = freq.freq.aPartirDe;
  const inicio = aPartirDe && aPartirDe > periodo.inicio ? aPartirDe : periodo.inicio;
  const fim = periodo.fim;
  if (inicio > fim) return [];
  let lista: Intervalo[] = [];
  if (freq.freq.unidade === 'semana') {
    lista = semanasNoIntervalo(inicio, fim).map(semana => ({ inicio: semana.inicio, fim: semana.fim }));
  } else if (freq.freq.unidade === 'mes') {
    let cursor = startOfMonth(parseISO(inicio));
    while (format(cursor, FORMATO) <= fim) {
      lista.push({ inicio: format(cursor, FORMATO), fim: format(endOfMonth(cursor), FORMATO) });
      cursor = addDays(endOfMonth(cursor), 1);
    }
  } else {
    const ancora = parseISO(aPartirDe ?? periodo.inicio);
    const passos = Math.floor(differenceInCalendarDays(parseISO(inicio), ancora) / 14);
    let cursor = addDays(ancora, passos * 14);
    while (format(cursor, FORMATO) <= fim) {
      lista.push({ inicio: format(cursor, FORMATO), fim: format(addDays(cursor, 13), FORMATO) });
      cursor = addDays(cursor, 14);
    }
  }
  return aPartirDe ? lista.filter(intervalo => intervalo.inicio >= aPartirDe) : lista;
}

/** Janela de datas que os intervalos inteiros podem alcançar: buscar os itens nela. */
export function janelaDaContinuidade(periodo: Intervalo): Intervalo {
  const ini = [semanaDe(periodo.inicio).inicio, format(startOfMonth(parseISO(periodo.inicio)), FORMATO),
    format(addDays(parseISO(periodo.inicio), -13), FORMATO)].sort()[0];
  const fim = [semanaDe(periodo.fim).fim, format(endOfMonth(parseISO(periodo.fim)), FORMATO),
    format(addDays(parseISO(periodo.fim), 13), FORMATO)].sort().reverse()[0];
  return { inicio: ini, fim };
}

export type LinhaContinuidade<T> = {
  serieId: string;
  nome: string;
  tipo: 'serie' | 'quadro';
  paiNome: string | null;
  frequencia: string;
  intervalos: IntervaloAvaliado[];
  abaixo: IntervaloAvaliado[];
  /** Mais que a meta num intervalo enquanto outro ficou vazio. */
  concentrada: boolean;
  /** Nenhum episódio em nenhum intervalo avaliado: aparece como "Sem episódios no período". */
  semEpisodios: boolean;
  precisaAtencao: boolean;
  itens: T[];
};

export type PendenciaFrequencia = {
  serieId: string;
  nome: string;
  tipo: 'serie' | 'quadro';
  motivo: 'sem-frequencia' | 'incompleta';
  texto: string;
};

export type NaoAvaliada = {
  serieId: string;
  nome: string;
  motivo: 'sob-demanda' | 'inicio-futuro';
  texto: string;
};

export type Continuidade<T> = {
  linhas: LinhaContinuidade<T>[];
  pendencias: PendenciaFrequencia[];
  naoAvaliadas: NaoAvaliada[];
  resumo: string;
  resumoPendencias: string | null;
  /** Nenhuma série ou quadro marcado para acompanhar. */
  nenhumaAcompanhada: boolean;
};

function textoFrequencia(freq: FrequenciaSerie): string {
  const vezes = freq.vezes ?? 1;
  const nome = freq.unidade === 'semana' ? 'semana' : freq.unidade === 'quinzena' ? 'quinzena' : 'mês';
  return `${vezes}× por ${nome}`;
}

function tipoDe(serie: SerieDaSaude): 'serie' | 'quadro' | 'familia' {
  if (serie.tipoAgrupamento === 'familia') return 'familia';
  if (serie.tipoAgrupamento === 'quadro') return 'quadro';
  if (serie.tipoAgrupamento === 'serie') return 'serie';
  return serie.parentId ? 'quadro' : 'serie';
}

/**
 * Continuidade: cada série (e quadro com meta própria) conferida intervalo a intervalo.
 * Episódio de quadro conta para a série acima, uma vez só. Sobra não compensa falta.
 * `itens` pode ir além do período: os intervalos das pontas são avaliados inteiros.
 */
export function continuidadeDasSeries<T extends ItemSaude>(input: {
  series: readonly SerieDaSaude[];
  itens: readonly T[];
  periodo: Intervalo;
}): Continuidade<T> {
  const { series, itens, periodo } = input;
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const linhas: LinhaContinuidade<T>[] = [];
  const pendencias: PendenciaFrequencia[] = [];
  const naoAvaliadas: NaoAvaliada[] = [];

  let acompanhadas = 0;
  for (const serie of series) {
    if (serie.ativa === false) continue;
    // Só entra quem foi marcado para acompanhar; as outras nem aparecem como pendência.
    if (serie.acompanharContinuidade !== true) continue;
    acompanhadas += 1;
    const tipo = tipoDe(serie);
    const nome = serie.name?.trim() || (tipo === 'quadro' ? 'Quadro' : 'Série');
    const situacao = situacaoDaFrequencia(serie);
    const tipoLinha = tipo === 'quadro' ? 'quadro' : 'serie';
    if (situacao.tipo === 'incompleta') {
      pendencias.push({ serieId: serie.id, nome, tipo: tipoLinha, motivo: 'incompleta', texto: 'Frequência incompleta: escolha a unidade' });
      continue;
    }
    if (situacao.tipo === 'sem-frequencia') {
      // Marcada para acompanhar e sem frequência: pendência de configuração, nunca "abaixo".
      pendencias.push({ serieId: serie.id, nome, tipo: tipoLinha, motivo: 'sem-frequencia', texto: 'Sem frequência definida' });
      continue;
    }
    if (situacao.tipo === 'sob-demanda') {
      naoAvaliadas.push({ serieId: serie.id, nome, motivo: 'sob-demanda', texto: 'Sob demanda: não avaliada' });
      continue;
    }
    const aPartirDe = situacao.freq.aPartirDe;
    if (aPartirDe && aPartirDe > periodo.fim) {
      naoAvaliadas.push({ serieId: serie.id, nome, motivo: 'inicio-futuro', texto: `Meta começa em ${format(parseISO(aPartirDe), 'dd/MM/yyyy')}: ainda não avaliada` });
      continue;
    }

    const ids = idsDaSubarvore(serie.id, series);
    ids.add(serie.id);
    const daSerie = new Map<string, T>();
    for (const item of itens) {
      if (item.serieId && ids.has(item.serieId) && item.data) daSerie.set(item.id, item);
    }
    const meta = situacao.freq.vezes ?? 1;
    const intervalos: IntervaloAvaliado[] = intervalosDaFrequencia(situacao, periodo).map(intervalo => {
      let quantidade = 0;
      for (const item of daSerie.values()) {
        const data = item.data!.slice(0, 10);
        if (data >= intervalo.inicio && data <= intervalo.fim) quantidade += 1;
      }
      return {
        ...intervalo,
        quantidade,
        meta,
        abaixo: quantidade < meta,
        nota: notaDoIntervalo(situacao.freq.unidade, intervalo, periodo),
      };
    });
    const abaixo = intervalos.filter(intervalo => intervalo.abaixo);
    const semEpisodios = intervalos.length > 0 && intervalos.every(i => i.quantidade === 0);
    const concentrada = intervalos.some(i => i.quantidade > meta) && intervalos.some(i => i.quantidade === 0);
    const pai = serie.parentId ? porId.get(serie.parentId) : undefined;
    const doPeriodo = [...daSerie.values()].filter(item => {
      const data = item.data!.slice(0, 10);
      return intervalos.some(i => data >= i.inicio && data <= i.fim);
    });
    linhas.push({
      serieId: serie.id,
      nome,
      tipo: tipoLinha,
      paiNome: pai?.name?.trim() || null,
      frequencia: textoFrequencia(situacao.freq),
      intervalos,
      abaixo,
      concentrada,
      semEpisodios,
      precisaAtencao: abaixo.length > 0 || concentrada,
      itens: doPeriodo.sort((a, b) => (a.data ?? '').localeCompare(b.data ?? '')),
    });
  }

  const ordem = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, 'pt-BR');
  linhas.sort((a, b) => Number(b.precisaAtencao) - Number(a.precisaAtencao) || ordem(a, b));
  pendencias.sort(ordem);
  naoAvaliadas.sort(ordem);
  return {
    linhas,
    pendencias,
    naoAvaliadas,
    resumo: acompanhadas === 0 ? 'Nenhuma série acompanhada' : resumoDaContinuidade(linhas),
    nenhumaAcompanhada: acompanhadas === 0,
    resumoPendencias: pendencias.length === 0 ? null
      : `${plural(pendencias.length, 'configuração pendente', 'configurações pendentes')} (não contam como abaixo da meta)`,
  };
}

type LinhaResumo = Pick<LinhaContinuidade<unknown>, 'tipo' | 'precisaAtencao' | 'semEpisodios' | 'abaixo'>;

function seriesEQuadros(linhas: readonly LinhaResumo[]): { texto: string; total: number } {
  const series = linhas.filter(l => l.tipo === 'serie').length;
  const quadros = linhas.filter(l => l.tipo === 'quadro').length;
  const texto = [
    series > 0 ? plural(series, 'série', 'séries') : null,
    quadros > 0 ? plural(quadros, 'quadro', 'quadros') : null,
  ].filter(Boolean).join(' e ');
  return { texto, total: series + quadros };
}

/** "1 série abaixo da frequência · 2 sem episódios no período". Cada grupo conta à parte. */
export function resumoDaContinuidade(linhas: readonly LinhaResumo[]): string {
  const atencao = linhas.filter(l => l.precisaAtencao);
  if (atencao.length === 0) {
    return linhas.length === 0 ? 'Nenhuma série com frequência para conferir' : 'Todas as séries e quadros acompanhados dentro da frequência';
  }
  const semEpisodios = seriesEQuadros(atencao.filter(l => l.semEpisodios));
  const abaixo = seriesEQuadros(atencao.filter(l => !l.semEpisodios && l.abaixo.length > 0));
  const concentradas = seriesEQuadros(atencao.filter(l => !l.semEpisodios && l.abaixo.length === 0));
  return [
    abaixo.total > 0 ? `${abaixo.texto} abaixo da frequência` : null,
    concentradas.total > 0 ? `${concentradas.texto} com episódios concentrados` : null,
    semEpisodios.total > 0 ? `${semEpisodios.texto} sem episódios no período` : null,
  ].filter(Boolean).join(' · ');
}

export function rotuloIntervalo(intervalo: Intervalo): string {
  return `${curta(intervalo.inicio)}–${curta(intervalo.fim)}`;
}
