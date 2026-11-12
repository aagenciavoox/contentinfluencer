import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { ProgressoDaOnda } from './episodioNaTemporada.ts';
import type { FuncaoEditorial } from '../../../lib/database.ts';
import {
  apurarSerie,
  ehReserva,
  situacaoDaFrequencia,
  TEXTO_SEM_ANCORA,
  textoFrequencia,
  type ItemDaApuracao,
  type JanelaApurada,
  type SerieDaApuracao,
} from '../../editorial/lib/apuracaoSerie.ts';
import { exclusaoDeMetaPropria } from '../../editorial/lib/metaPropria.ts';
import { ehFamiliaNaArvore, tipoNaArvore, unidadesDaRegraDeOuro } from '../../editorial/lib/regraDeOuro.ts';
import { acompanhamentoGeral, acompanhaNoGeral, coberturaNoGeral, idsComAncestrais, serieAcompanhada } from '../../editorial/lib/acompanhamento.ts';
import {
  diasSeguidosDosItens,
  distanciasExcessivas,
  type DiasSeguidos,
  type DistanciaExcessiva,
} from '../../editorial/lib/continuidadeEscopo.ts';
import { diasDePausa, type PausaEditorial } from '../../editorial/lib/pausas.ts';
import { FUNCAO_LABELS, FUNCOES, isFuncaoEditorial } from '../../editorial/lib/funcoes.ts';
import { objetivoDoConteudo, type ConteudoHeranca, type SerieClassificacao } from '../../editorial/lib/herancaSerie.ts';
import type { MetaDoObjetivo, ProporcaoFuncoes } from '../../editorial/lib/proporcaoObjetivos.ts';
import type { VigenciaEditorial } from '../../editorial/lib/editorialSettings.ts';
import { proporcaoDoPeriodo } from '../../editorial/lib/vigencias.ts';

export { intervalosDaFrequencia, janelaDaContinuidade, situacaoDaFrequencia } from '../../editorial/lib/apuracaoSerie.ts';
export type { SituacaoFrequencia } from '../../editorial/lib/apuracaoSerie.ts';

/**
 * Os três indicadores da Saúde: objetivos, continuidade das séries e pilares.
 * Só lê e calcula: não muda objetivo de conteúdo nem proporção salva.
 */

type Intervalo = { inicio: string; fim: string };

/** O mínimo de um item do período (GradeEntry serve). */
export type ItemSaude = ItemDaApuracao & {
  pilarId: string | null;
  funcao: FuncaoEditorial | null;
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
 * Objetivo do item, com a mesma regra da ficha e do Editorial (`objetivoDoConteudo`):
 * post-it sem conteúdo usa o objetivo do próprio item. Nada é preenchido.
 */
export function objetivoEfetivo(
  item: ItemSaude,
  contentById: ReadonlyMap<string, ConteudoDaSaude>,
  series: readonly SerieClassificacao[],
): FuncaoEditorial | null {
  const content = contentById.get(item.contentId);
  if (content) {
    return objetivoDoConteudo({ ...content, seriesId: content.seriesId ?? item.serieId }, series);
  }
  return isFuncaoEditorial(item.funcao) ? item.funcao : null;
}

/**
 * Proporção desejada do período, igual à usada nas metas do Editorial:
 * período vigente usa a atual (e a agendada nas semanas futuras); encerrado pesa cada semana pela vigência dela.
 */
export function proporcaoDesejadaDoPeriodo(input: {
  periodo: Intervalo;
  limiteSemanal: number | null;
  proporcaoFuncoes: ProporcaoFuncoes | null;
  vigencias?: readonly VigenciaEditorial[] | null;
  hoje?: string;
}): ProporcaoFuncoes | null {
  return proporcaoDoPeriodo({
    periodo: input.periodo,
    limiteSemanal: input.limiteSemanal,
    proporcaoAtual: input.proporcaoFuncoes,
    vigencias: input.vigencias,
    hoje: input.hoje ?? format(new Date(), FORMATO),
  });
}

export type LinhaObjetivoSaude<T> = {
  funcao: FuncaoEditorial;
  rotulo: string;
  quantidade: number;
  /** Sobre todos os itens do período, "sem objetivo" incluído. */
  previstoPct: number;
  desejadoPct: number | null;
  /** Meta em número do período: a digitada no editor ou a proporção × meta do período. */
  metaQuantidade: number | null;
  /** O número foi digitado para este período. */
  metaAjustada: boolean;
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
  series: readonly SerieClassificacao[];
  proporcao: ProporcaoFuncoes | null;
  /** Metas do período por objetivo (as mesmas do editor do Editorial). */
  metas?: Partial<Record<FuncaoEditorial, Pick<MetaDoObjetivo, 'meta' | 'origem'>>> | null;
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
      const meta = input.metas?.[funcao];
      return {
        funcao,
        rotulo: FUNCAO_LABELS[funcao],
        quantidade: itens.length,
        previstoPct: pct(itens.length, total),
        desejadoPct: desejado == null ? null : Math.round(desejado),
        metaQuantidade: meta?.meta ?? null,
        metaAjustada: meta?.origem === 'ajustada',
        itens,
      };
    })
    .filter(linha => linha.quantidade > 0 || linha.desejadoPct != null || linha.metaQuantidade != null);
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

export type SerieDaSaude = SerieDaApuracao;

export type IntervaloAvaliado = JanelaApurada & {
  /** Compatível com a leitura antiga: episódios + reservas. */
  quantidade: number;
  /** Falta mesmo contando reservas. */
  abaixo: boolean;
  /** O intervalo inteiro está em pausa (publicação ou da série): aparece como pausa, nunca como falta. */
  pausada?: boolean;
  /** Cortado pelo início ou término do acompanhamento, ou com alguns dias de pausa: não vira falta inteira. */
  parcial?: boolean;
};

export type LinhaContinuidade<T> = {
  /** Chave estável da linha: o id da série, ou `t:` + id da temporada. */
  chave: string;
  serieId: string;
  /** Preenchido quando a linha é a wave de uma temporada, não a série inteira. */
  temporadaId?: string | null;
  nome: string;
  tipo: 'serie' | 'quadro' | 'temporada';
  /** Linha de uma família com ritmo (soma os episódios únicos das séries dela). */
  familia?: boolean;
  paiNome: string | null;
  frequencia: string;
  intervalos: IntervaloAvaliado[];
  /** Janelas com falta, mesmo contando reservas. */
  abaixo: IntervaloAvaliado[];
  /** Janelas inteiras em pausa: no lugar de "falta". */
  pausadas?: IntervaloAvaliado[];
  /** Janelas parciais (início, término ou pausa de parte dos dias): não cobradas. */
  parciais?: IntervaloAvaliado[];
  /** Distância máxima sem episódio, quando definida no acompanhamento geral. */
  distancias?: DistanciaExcessiva[];
  /** Episódios em dias seguidos, quando a regra está ligada. */
  diasSeguidos?: DiasSeguidos[];
  /** Só na wave: "Wave 3/12" e há quantos dias está parada. */
  progresso?: (ProgressoDaOnda & { limiteDias: number | null }) | null;
  /** Janelas que só chegam à meta por post-it: reservadas, conteúdo a desenvolver. */
  reservadas: IntervaloAvaliado[];
  /** Mais que a meta num intervalo enquanto outro ficou vazio. */
  concentrada: boolean;
  /** Nenhum episódio nem reserva em nenhum intervalo avaliado: aparece como "Sem episódios no período". */
  semEpisodios: boolean;
  /** Episódios e reservas fora do período que ajudaram alguma janela. */
  foraDoPeriodo: number;
  precisaAtencao: boolean;
  itens: T[];
};

export type PendenciaFrequencia = {
  serieId: string;
  nome: string;
  tipo: 'serie' | 'quadro' | 'temporada';
  /** Wave da temporada, quando a pendência é dela e não da série. */
  temporadaId?: string | null;
  motivo: 'sem-frequencia' | 'incompleta' | 'sem-ancora';
  texto: string;
};

export type NaoAvaliada = {
  serieId: string;
  nome: string;
  motivo: 'sob-demanda' | 'inicio-futuro' | 'encerrado';
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

function tipoDe(serie: SerieDaSaude): 'serie' | 'quadro' | 'familia' {
  if (serie.tipoAgrupamento === 'familia') return 'familia';
  if (serie.tipoAgrupamento === 'quadro') return 'quadro';
  if (serie.tipoAgrupamento === 'serie') return 'serie';
  return serie.parentId ? 'quadro' : 'serie';
}

function avaliado(janela: JanelaApurada): IntervaloAvaliado {
  return {
    ...janela,
    quantidade: janela.episodios + janela.reservas,
    abaixo: janela.estado === 'abaixo' || janela.estado === 'vazia',
  };
}

/**
 * Continuidade: cada série marcada, conferida janela a janela
 * pela apuração comum (`apurarSerie`). Família é pasta visual: não tem linha nem meta.
 * Quadro é sob demanda: não tem linha e não conta na série;
 * wave com ritmo próprio conta só na linha dela. Regra de Ouro: até 1 episódio por semana por série.
 * Repost não é episódio novo. Post-it é reserva. Sobra não compensa falta.
 * `itens` pode ir além do período: os intervalos das pontas são avaliados inteiros.
 */
export type TemporadaDaSaude = {
  id: string;
  serieId: string;
  nome: string;
  acompanhar?: boolean;
  /** Com meta, os episódios saem da conta da série (padrão ligado). */
  ritmoProprio?: boolean | null;
  frequenciaVezes?: number | null;
  frequenciaUnidade?: string | null;
  frequenciaAPartirDe?: string | null;
  frequenciaAncora?: string | null;
  /** Rascunho não vira linha. Arquivada só nos períodos antes do dia do arquivo. */
  status?: 'rascunho' | 'ativa' | 'arquivada';
  /** Dia do arquivo: a linha da wave termina na véspera; sem data, arquivada não vira linha. */
  arquivadaEm?: string | null;
  /** Janela e regras do acompanhamento da wave. */
  acompanhamentoInicio?: string | null;
  acompanhamentoTermino?: string | null;
  distanciaMaxDias?: number | null;
  evitarDiasSeguidos?: boolean;
};


function vesperaDoArquivo(arquivadaEm: string | null | undefined): string | null {
  if (!arquivadaEm) return null;
  return format(addDays(parseISO(arquivadaEm.slice(0, 10)), -1), 'yyyy-MM-dd');
}

export function continuidadeDasSeries<T extends ItemSaude>(input: {
  series: readonly SerieDaSaude[];
  itens: readonly T[];
  periodo: Intervalo;
  /** Pausas com data: janela inteira em pausa aparece como pausa; com parte dos dias, é parcial. */
  pausas?: readonly PausaEditorial[];
  /** yyyy-MM-dd; padrão, hoje. Para a distância que ainda pode ser coberta. */
  hoje?: string;
  /** Waves com acompanhamento próprio. Só entram as marcadas. */
  temporadas?: readonly TemporadaDaSaude[];
  /** Andamento de cada wave, pelo id da temporada (ver progressoDasOndas). */
  progressoDasOndas?: ReadonlyMap<string, ProgressoDaOnda>;
}): Continuidade<T> {
  const { series, itens, periodo } = input;
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const linhas: LinhaContinuidade<T>[] = [];
  const pendencias: PendenciaFrequencia[] = [];
  const naoAvaliadas: NaoAvaliada[] = [];

  let acompanhadas = 0;
  for (const serie of series) {
    // Rascunho organiza sem cobrar; arquivada já saiu.
    if (serie.ativa === false || serie.status === 'rascunho') continue;
    // Quadro é sob demanda; família é pasta visual: sem meta, sem linha e sem pendência.
    if (tipoNaArvore(serie.id, series) === 'quadro' || ehFamiliaNaArvore(serie.id, series)) continue;
    // Só entra quem foi marcado para acompanhar; as outras nem aparecem como pendência.
    if (!acompanhaNoGeral(serie)) {
      // Acompanhada só por conta ou formato: conta como acompanhada; a linha vem da continuidade por escopo.
      if (serieAcompanhada(serie)) acompanhadas += 1;
      continue;
    }
    acompanhadas += 1;
    const tipo = tipoDe(serie);
    const nome = serie.name?.trim() || (tipo === 'quadro' ? 'Quadro' : 'Série');
    // Início e término do acompanhamento geral: antes do início não há cobrança nem pendência.
    const geral = acompanhamentoGeral(serie);
    if (geral?.inicio && geral.inicio > periodo.fim) {
      naoAvaliadas.push({ serieId: serie.id, nome, motivo: 'inicio-futuro', texto: `Acompanhamento começa em ${format(parseISO(geral.inicio), 'dd/MM/yyyy')}: ainda não avaliado` });
      continue;
    }
    if (geral?.termino && geral.termino < periodo.inicio) {
      naoAvaliadas.push({ serieId: serie.id, nome, motivo: 'encerrado', texto: `Acompanhamento terminou em ${format(parseISO(geral.termino), 'dd/MM/yyyy')}: não avaliado` });
      continue;
    }
    const tipoLinha = tipo === 'quadro' ? 'quadro' : 'serie';
    // Regra de Ouro: até 1 por semana por série.
    const situacao = situacaoDaFrequencia(serie, unidadesDaRegraDeOuro(serie.id, series));
    if (situacao.tipo === 'incompleta') {
      pendencias.push({ serieId: serie.id, nome, tipo: tipoLinha, motivo: 'incompleta', texto: 'Frequência incompleta: escolha a unidade' });
      continue;
    }
    if (situacao.tipo === 'sem-frequencia') {
      // Marcada para acompanhar e sem frequência: pendência de configuração, nunca "abaixo".
      pendencias.push({ serieId: serie.id, nome, tipo: tipoLinha, motivo: 'sem-frequencia', texto: 'Sem frequência definida' });
      continue;
    }
    if (situacao.tipo === 'sem-ancora') {
      // Só a avaliação desta frequência fica suspensa; os conteúdos seguem nas outras contagens.
      pendencias.push({ serieId: serie.id, nome, tipo: tipoLinha, motivo: 'sem-ancora', texto: TEXTO_SEM_ANCORA });
      continue;
    }
    if (situacao.tipo === 'sob-demanda') {
      naoAvaliadas.push({ serieId: serie.id, nome, motivo: 'sob-demanda', texto: 'Sob demanda: não avaliada' });
      continue;
    }

    const apuracao = apurarSerie({
      serie,
      series,
      itens,
      periodo,
      excluir: exclusaoDeMetaPropria(serie, series, input.temporadas ?? []),
    });
    if (apuracao.inicioFuturo) {
      naoAvaliadas.push({
        serieId: serie.id,
        nome,
        motivo: 'inicio-futuro',
        texto: `Meta começa em ${format(parseISO(apuracao.inicioFuturo), 'dd/MM/yyyy')}: ainda não avaliada`,
      });
      continue;
    }

    // Mesma regra dos escopos: fora do acompanhamento não entra; parcial e pausada não viram falta.
    const pausas = input.pausas ?? [];
    const serieIds = idsComAncestrais(serie.id, series);
    const intervalos = apuracao.janelas.flatMap(janela => {
      const cobertura = coberturaNoGeral(janela, geral, pausas, serieIds);
      if (cobertura === 'fora') return [];
      const item = avaliado(janela);
      if (cobertura === 'pausada') return [{ ...item, abaixo: false, pausada: true }];
      if (cobertura === 'parcial') return [{ ...item, abaixo: false, parcial: true }];
      return [item];
    });
    const cobrados = intervalos.filter(intervalo => !intervalo.pausada && !intervalo.parcial);
    const abaixo = intervalos.filter(intervalo => intervalo.abaixo);
    const pausadas = intervalos.filter(intervalo => intervalo.pausada);
    const parciais = intervalos.filter(intervalo => intervalo.parcial);
    const hoje = input.hoje ?? format(new Date(), 'yyyy-MM-dd');
    const datas = apuracao.itens.flatMap(item => (item.data ? [item.data.slice(0, 10)] : []));
    const distancias = geral?.distanciaMaxDias
      ? distanciasExcessivas({
        datas,
        periodo,
        limiteDias: geral.distanciaMaxDias,
        inicioAcompanhamento: geral.inicio,
        terminoAcompanhamento: geral.termino,
        diasPausados: new Set(diasDePausa(pausas, { tipo: 'serie', serieIds }, {
          inicio: format(addDays(parseISO(periodo.inicio), -400), 'yyyy-MM-dd'),
          fim: periodo.fim,
        })),
        hoje,
      })
      : [];
    const diasSeguidos = geral?.evitarDiasSeguidos ? diasSeguidosDosItens(apuracao.itens, periodo) : [];
    const pai = serie.parentId ? porId.get(serie.parentId) : undefined;
    linhas.push({
      chave: serie.id,
      serieId: serie.id,
      temporadaId: null,
      nome,
      tipo: tipoLinha,
      paiNome: pai?.name?.trim() || null,
      frequencia: textoFrequencia(situacao.freq),
      intervalos,
      abaixo,
      pausadas,
      parciais,
      distancias,
      diasSeguidos,
      reservadas: cobrados.filter(intervalo => intervalo.estado === 'reservada'),
      concentrada: apuracao.concentrada,
      semEpisodios: cobrados.length > 0 && cobrados.every(intervalo => intervalo.estado === 'vazia'),
      foraDoPeriodo: apuracao.foraDoPeriodo,
      precisaAtencao: abaixo.length > 0 || apuracao.concentrada || cobrados.some(intervalo => intervalo.estado === 'reservada')
        || distancias.length > 0 || diasSeguidos.length > 0,
      itens: apuracao.itens,
    });
  }

  // Cada temporada marcada é uma wave: só os episódios dela, com a meta dela.
  for (const temporada of input.temporadas ?? []) {
    if (temporada.acompanhar !== true) continue;
    if (temporada.status === 'rascunho') continue;
    // Arquivada: só os períodos antes do arquivo mantêm a linha, que termina na véspera.
    const fimDoArquivo = temporada.status === 'arquivada' ? vesperaDoArquivo(temporada.arquivadaEm) : null;
    if (temporada.status === 'arquivada' && (!fimDoArquivo || fimDoArquivo < periodo.inicio)) continue;
    const dona = porId.get(temporada.serieId);
    if (!dona || dona.ativa === false || dona.status === 'rascunho') continue;
    const nome = temporada.nome.trim() || 'Temporada';
    const sintetica: SerieDaSaude = {
      ...dona,
      name: nome,
      frequenciaRecomendada: null,
      frequenciaVezes: temporada.frequenciaVezes ?? null,
      frequenciaUnidade: temporada.frequenciaUnidade ?? null,
      frequenciaAPartirDe: temporada.frequenciaAPartirDe ?? null,
      // A âncora é da meta da wave, não da série dona.
      frequenciaAncora: temporada.frequenciaAncora ?? null,
    };
    const situacao = situacaoDaFrequencia(sintetica);
    if (situacao.tipo === 'incompleta' || situacao.tipo === 'sem-frequencia' || situacao.tipo === 'sem-ancora') {
      const motivo = situacao.tipo === 'incompleta' ? 'incompleta' : situacao.tipo === 'sem-ancora' ? 'sem-ancora' : 'sem-frequencia';
      const texto = motivo === 'incompleta' ? 'Frequência incompleta: escolha a unidade'
        : motivo === 'sem-ancora' ? TEXTO_SEM_ANCORA
          : 'Sem frequência definida';
      acompanhadas += 1;
      pendencias.push({ serieId: dona.id, temporadaId: temporada.id, nome, tipo: 'temporada', motivo, texto });
      continue;
    }
    if (situacao.tipo === 'sob-demanda') {
      naoAvaliadas.push({ serieId: dona.id, nome, motivo: 'sob-demanda', texto: 'Sob demanda: não avaliada' });
      continue;
    }
    // Início e término do acompanhamento da wave, como no geral da série.
    const terminoDaOnda = fimDoArquivo && (!temporada.acompanhamentoTermino || fimDoArquivo < temporada.acompanhamentoTermino)
      ? fimDoArquivo
      : temporada.acompanhamentoTermino ?? null;
    const janelaDaOnda = { inicio: temporada.acompanhamentoInicio ?? null, termino: terminoDaOnda };
    if (janelaDaOnda.inicio && janelaDaOnda.inicio > periodo.fim) {
      acompanhadas += 1;
      naoAvaliadas.push({ serieId: dona.id, nome, motivo: 'inicio-futuro', texto: `Acompanhamento começa em ${format(parseISO(janelaDaOnda.inicio), 'dd/MM/yyyy')}: ainda não avaliado` });
      continue;
    }
    if (janelaDaOnda.termino && janelaDaOnda.termino < periodo.inicio) {
      acompanhadas += 1;
      naoAvaliadas.push({ serieId: dona.id, nome, motivo: 'encerrado', texto: `Acompanhamento terminou em ${format(parseISO(janelaDaOnda.termino), 'dd/MM/yyyy')}: não avaliado` });
      continue;
    }
    // Sob demanda não entra na contagem de acompanhadas; com meta (ou pendência de meta), entra.
    acompanhadas += 1;
    const daOnda = itens.filter(item => item.temporadaId === temporada.id);
    const apuracao = apurarSerie({ serie: sintetica, series, itens: daOnda, periodo });
    if (apuracao.inicioFuturo) {
      naoAvaliadas.push({
        serieId: dona.id,
        nome,
        motivo: 'inicio-futuro',
        texto: `Meta começa em ${format(parseISO(apuracao.inicioFuturo), 'dd/MM/yyyy')}: ainda não avaliada`,
      });
      continue;
    }
    const pausas = input.pausas ?? [];
    const serieIds = idsComAncestrais(dona.id, series);
    const intervalos = apuracao.janelas.flatMap(janela => {
      const cobertura = coberturaNoGeral(janela, janelaDaOnda, pausas, serieIds);
      if (cobertura === 'fora') return [];
      const item = avaliado(janela);
      if (cobertura === 'pausada') return [{ ...item, abaixo: false, pausada: true }];
      if (cobertura === 'parcial') return [{ ...item, abaixo: false, parcial: true }];
      return [item];
    });
    const cobrados = intervalos.filter(intervalo => !intervalo.pausada && !intervalo.parcial);
    const abaixo = intervalos.filter(intervalo => intervalo.abaixo);
    const hojeDaOnda = input.hoje ?? format(new Date(), 'yyyy-MM-dd');
    const datasDaOnda = apuracao.itens.flatMap(item => (item.data ? [item.data.slice(0, 10)] : []));
    const distanciasDaOnda = temporada.distanciaMaxDias
      ? distanciasExcessivas({
        datas: datasDaOnda,
        periodo,
        limiteDias: temporada.distanciaMaxDias,
        inicioAcompanhamento: janelaDaOnda.inicio,
        terminoAcompanhamento: janelaDaOnda.termino,
        diasPausados: new Set(diasDePausa(pausas, { tipo: 'serie', serieIds }, {
          inicio: format(addDays(parseISO(periodo.inicio), -400), 'yyyy-MM-dd'),
          fim: periodo.fim,
        })),
        hoje: hojeDaOnda,
      })
      : [];
    const diasSeguidosDaOnda = temporada.evitarDiasSeguidos ? diasSeguidosDosItens(apuracao.itens, periodo) : [];
    linhas.push({
      chave: `t:${temporada.id}`,
      serieId: dona.id,
      temporadaId: temporada.id,
      nome,
      tipo: 'temporada',
      paiNome: dona.name?.trim() || null,
      frequencia: textoFrequencia(situacao.freq),
      intervalos,
      abaixo,
      pausadas: intervalos.filter(intervalo => intervalo.pausada),
      parciais: intervalos.filter(intervalo => intervalo.parcial),
      distancias: distanciasDaOnda,
      diasSeguidos: diasSeguidosDaOnda,
      progresso: (() => {
        const andamento = input.progressoDasOndas?.get(temporada.id);
        return andamento ? { ...andamento, limiteDias: temporada.distanciaMaxDias ?? null } : null;
      })(),
      reservadas: cobrados.filter(intervalo => intervalo.estado === 'reservada'),
      concentrada: apuracao.concentrada,
      semEpisodios: cobrados.length > 0 && cobrados.every(intervalo => intervalo.estado === 'vazia'),
      foraDoPeriodo: apuracao.foraDoPeriodo,
      precisaAtencao: abaixo.length > 0 || apuracao.concentrada || cobrados.some(intervalo => intervalo.estado === 'reservada')
        || distanciasDaOnda.length > 0 || diasSeguidosDaOnda.length > 0,
      itens: apuracao.itens,
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
      : `${plural(pendencias.length, 'configuração em aberto', 'configurações em aberto')} (não entram na leitura do ritmo)`,
  };
}

type LinhaResumo = Pick<LinhaContinuidade<unknown>, 'tipo' | 'precisaAtencao' | 'semEpisodios' | 'abaixo' | 'concentrada'>
  & Partial<Pick<LinhaContinuidade<unknown>, 'reservadas'>>;

function seriesEQuadros(linhas: readonly Pick<LinhaResumo, 'tipo'>[]): { texto: string; total: number } {
  const series = linhas.filter(l => l.tipo === 'serie').length;
  const quadros = linhas.filter(l => l.tipo === 'quadro').length;
  const temporadas = linhas.filter(l => l.tipo === 'temporada').length;
  const partes = [
    series > 0 ? plural(series, 'série', 'séries') : null,
    quadros > 0 ? plural(quadros, 'quadro', 'quadros') : null,
    temporadas > 0 ? plural(temporadas, 'temporada', 'temporadas') : null,
  ].filter(Boolean);
  const texto = partes.length <= 1 ? (partes[0] ?? '') : `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}`;
  return { texto, total: series + quadros + temporadas };
}

/** "2 séries e 1 quadro": conta cada tipo à parte (série, quadro, temporada). Vazio quando não há nenhum. */
export function textoPorTipo(linhas: readonly Pick<LinhaResumo, 'tipo'>[]): string {
  return seriesEQuadros(linhas).texto;
}

/**
 * "1 série abaixo do ritmo · 2 quadros acima da meta": só as partes não-zero. Vazio quando as duas são zero.
 * Quem decide "abaixo" e "acima" é a Saúde (intervalos ainda abertos); aqui só se monta o texto.
 */
export function resumoDosDesvios(
  abaixo: readonly Pick<LinhaResumo, 'tipo'>[],
  acima: readonly Pick<LinhaResumo, 'tipo'>[],
): string {
  return [
    abaixo.length > 0 ? `${textoPorTipo(abaixo)} abaixo do ritmo` : null,
    acima.length > 0 ? `${textoPorTipo(acima)} acima da meta` : null,
  ].filter(Boolean).join(' · ');
}

/** Mensagem neutra para quem está acompanhado sem ritmo: não conta como em dia nem como abaixo. */
export const TEXTO_ACOMPANHADA_SEM_RITMO = 'Acompanhamento ligado, mas sem ritmo definido. Defina um ritmo ou desligue o acompanhamento.';

/**
 * Acompanhadas sem frequência definida (pendência "sem-frequencia" e acompanhamento por conta ou formato sem meta),
 * uma vez por série, quadro ou temporada: "1 série e 1 quadro sem frequência definida". Null quando não há.
 */
export function resumoSemFrequencia(
  itens: readonly { serieId: string; temporadaId?: string | null; tipo: LinhaResumo['tipo'] }[],
): { texto: string; total: number } | null {
  const unicos = new Map<string, { tipo: LinhaResumo['tipo'] }>();
  for (const item of itens) unicos.set(item.temporadaId ? `t:${item.temporadaId}` : `s:${item.serieId}`, { tipo: item.tipo });
  if (unicos.size === 0) return null;
  const grupo = seriesEQuadros([...unicos.values()]);
  return { texto: `${grupo.texto} sem frequência definida`, total: grupo.total };
}

/** "1 série com ritmo em aberto · 2 sem episódios no período". Cada grupo conta à parte. */
export function resumoDaContinuidade(linhas: readonly LinhaResumo[]): string {
  const atencao = linhas.filter(l => l.precisaAtencao);
  if (atencao.length === 0) {
    if (linhas.length === 0) return 'Nenhuma série com frequência para conferir';
    return linhas.some(linha => linha.tipo === 'temporada')
      ? 'Todas as séries, quadros e temporadas acompanhados dentro da frequência'
      : 'Todas as séries e quadros acompanhados dentro da frequência';
  }
  const semEpisodios = seriesEQuadros(atencao.filter(l => l.semEpisodios));
  const abaixo = seriesEQuadros(atencao.filter(l => !l.semEpisodios && l.abaixo.length > 0));
  const concentradas = seriesEQuadros(atencao.filter(l => !l.semEpisodios && l.abaixo.length === 0 && l.concentrada));
  const reservadas = seriesEQuadros(atencao.filter(l => !l.semEpisodios && l.abaixo.length === 0 && !l.concentrada && (l.reservadas?.length ?? 0) > 0));
  return [
    abaixo.total > 0 ? `${abaixo.texto} com ritmo em aberto` : null,
    concentradas.total > 0 ? `${concentradas.texto} com episódios concentrados` : null,
    reservadas.total > 0 ? `${reservadas.texto} só com reserva em post-it, conteúdo a desenvolver` : null,
    semEpisodios.total > 0 ? `${semEpisodios.texto} sem episódios no período` : null,
  ].filter(Boolean).join(' · ');
}

export function rotuloIntervalo(intervalo: Intervalo): string {
  return `${curta(intervalo.inicio)}–${curta(intervalo.fim)}`;
}

/** "mais N pra fechar a semana|a quinzena|o mês", conforme a duração do intervalo. */
export function textoMaisPraFechar(faltam: number, intervalo: Intervalo): string {
  const dias = differenceInCalendarDays(parseISO(intervalo.fim), parseISO(intervalo.inicio)) + 1;
  const ciclo = dias <= 7 ? 'a semana' : dias <= 14 ? 'a quinzena' : 'o mês';
  return `mais ${faltam} pra fechar ${ciclo}`;
}

/** Ritmo abaixo da meta: ainda no prazo, ou já encerrou. Compara a data de fim (yyyy-MM-dd) com hoje. */
export function textoRitmoAbaixo(fimDoPeriodo: string, hoje: string): string {
  return fimDoPeriodo >= hoje ? 'ainda dá tempo' : 'ficou pro próximo período';
}

/** Reserva em post-it entre os itens: para a lista mostrar "post-it" e não episódio. */
export { ehReserva };
