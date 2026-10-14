import {endOfMonth, format, startOfMonth} from 'date-fns';
import type {Content, Pilar, Serie} from '../../../lib/database.ts';
import {buildGradeEntries, type GradeEntry} from '../../editorial/lib/gradeEntries.ts';
import {countGrade, distribuicaoFecha, type GradeCounts, type PeriodoGrade} from '../../editorial/lib/gradeCounts.ts';
import type {EditorialSettings} from '../../editorial/lib/editorialSettings.ts';
import {FUNCAO_CURTA, funcaoHerdavelDaSerie, resolveFuncao} from '../../editorial/lib/funcoes.ts';
import {pilarPrincipalDaSerie} from '../../editorial/lib/pilarDaSerie.ts';
import {type DestinoPlataforma, mesmoDestino, resolverRedeReferencia} from '../../editorial/lib/destinations.ts';
import type {PlanejamentoPostIt} from './postIt.ts';

export function periodoDoMes(anchor: Date): PeriodoGrade {
  return {
    inicio: format(startOfMonth(anchor), 'yyyy-MM-dd'),
    fim: format(endOfMonth(anchor), 'yyyy-MM-dd'),
  };
}

function noPeriodo(data: string | null, periodo: PeriodoGrade): boolean {
  return Boolean(data && data >= periodo.inicio && data <= periodo.fim);
}

/**
 * O mês do planejamento junta o que ainda é post-it com o que já tem data oficial.
 * O post-it no mês vale no lugar do original, para não contar o mesmo roteiro duas vezes.
 */
export function entriesDaSaudeDoMes({
  postIts,
  contents,
  series,
  settings,
  periodo,
  platforms = [],
}: {
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  settings: Pick<EditorialSettings, 'redeReferenciaId'>;
  periodo: PeriodoGrade;
  platforms?: readonly DestinoPlataforma[];
}): GradeEntry[] {
  const contentById = new Map(contents.map(content => [content.id, content]));
  const serieById = new Map(series.map(serie => [serie.id, serie]));
  const covered = new Set<string>();
  const entries: GradeEntry[] = [];

  for (const postIt of postIts) {
    if (!postIt.contentId || !noPeriodo(postIt.date, periodo)) continue;
    const content = contentById.get(postIt.contentId);
    if (!content || content.deletedAt || content.archivedAt) continue;
    const serie = content.seriesId ? serieById.get(content.seriesId) : undefined;
    const resolved = resolveFuncao(content, serie);
    const funcao = resolved.funcao ?? (resolved.estado === 'indefinida' ? funcaoHerdavelDaSerie(serie) : null);
    covered.add(content.id);
    entries.push({
      id: `post-it:${postIt.id}`,
      contentId: content.id,
      tipo: 'original',
      data: postIt.date,
      hora: null,
      contaNaGrade: content.contaNaGrade !== false,
      pilarId: content.pilarId || pilarPrincipalDaSerie(serie),
      serieId: content.seriesId ?? null,
      funcao,
      realizada: false,
      realizadaEm: null,
    });
  }

  const oficiais = buildGradeEntries({
    contents,
    series,
    settings: {redeReferenciaId: settings.redeReferenciaId},
    platforms,
  });
  for (const entry of oficiais) {
    if (!noPeriodo(entry.data, periodo)) continue;
    if (entry.tipo === 'original' && covered.has(entry.contentId)) continue;
    entries.push(entry);
  }
  return entries;
}

export type ForaDaConta = {
  semPilar: number;
  foraDaGrade: number;
  pilarSemEspaco: number;
  /** Publicadas ou marcadas só em redes que não são a de referência: pela regra da grade, são extras. */
  outrasRedes: number;
};

/** Conteúdos com publicação no mês só fora da rede de referência. Não viram entrada na grade. */
export function publicacoesEmOutrasRedes({
  contents,
  settings,
  periodo,
  platforms = [],
}: {
  contents: readonly Content[];
  settings: Pick<EditorialSettings, 'redeReferenciaId'>;
  periodo: PeriodoGrade;
  platforms?: readonly DestinoPlataforma[];
}): number {
  const rede = resolverRedeReferencia(settings.redeReferenciaId, platforms);
  let total = 0;
  for (const content of contents) {
    if (content.deletedAt || content.archivedAt) continue;
    const publicacoes = content.plataformas ?? [];
    if (publicacoes.length === 0) continue;
    if (rede && publicacoes.some(publicacao => mesmoDestino(publicacao.platformId, rede))) continue;
    const noMes = publicacoes.some(publicacao => noPeriodo(publicacao.publishDate?.slice(0, 10) ?? null, periodo))
      || noPeriodo(content.publishDate?.slice(0, 10) ?? null, periodo);
    if (noMes) total += 1;
  }
  return total;
}

/**
 * O que tem data no mês mas não entrou nos números da saúde. Sem isso, um mês com
 * publicações no calendário aparece como "0 de 30" e parece erro.
 */
export function foraDaContaDoMes(
  counts: Pick<GradeCounts, 'pilares' | 'periodo'>,
  entries: readonly GradeEntry[],
  outrasRedes = 0,
): ForaDaConta {
  const pilaresContados = new Set(counts.pilares.map(linha => linha.id));
  const resultado: ForaDaConta = {semPilar: 0, foraDaGrade: 0, pilarSemEspaco: 0, outrasRedes};
  for (const entry of entries) {
    if (!noPeriodo(entry.data, counts.periodo)) continue;
    if (!entry.contaNaGrade) resultado.foraDaGrade += 1;
    else if (!entry.pilarId) resultado.semPilar += 1;
    else if (!pilaresContados.has(entry.pilarId)) resultado.pilarSemEspaco += 1;
  }
  return resultado;
}

export function textoForaDaConta(fora: ForaDaConta): string | null {
  const partes: string[] = [];
  if (fora.semPilar > 0) partes.push(`${fora.semPilar} sem pilar`);
  if (fora.pilarSemEspaco > 0) partes.push(`${fora.pilarSemEspaco} em pilar sem espaço por semana`);
  if (fora.foraDaGrade > 0) partes.push(`${fora.foraDaGrade} marcados fora da grade`);
  if (fora.outrasRedes > 0) partes.push(`${fora.outrasRedes} só em redes fora da rede de referência`);
  const total = fora.semPilar + fora.pilarSemEspaco + fora.foraDaGrade + fora.outrasRedes;
  if (total === 0) return null;
  const sujeito = total === 1 ? '1 item com data neste mês não entra' : `${total} itens com data neste mês não entram`;
  return `${sujeito} na conta: ${partes.join(', ')}.`;
}

export type SaudeDoMes = GradeCounts & {
  entries: readonly GradeEntry[];
  outrasRedes: number;
};

export type SerieNoPilar = {
  id: string;
  nome: string;
  cor: string | null;
  quantidade: number;
};

/** Séries do pilar e quantas vezes cada uma entrou na saúde deste mês. */
export function seriesDoPilarNoMes(
  pilarId: string,
  series: readonly Serie[],
  entries: readonly GradeEntry[],
): SerieNoPilar[] {
  const quantidade = new Map<string, number>();
  let semSerie = 0;
  for (const entry of entries) {
    if (!entry.contaNaGrade || entry.pilarId !== pilarId) continue;
    if (!entry.serieId) {
      semSerie += 1;
      continue;
    }
    quantidade.set(entry.serieId, (quantidade.get(entry.serieId) ?? 0) + 1);
  }

  const linhas: SerieNoPilar[] = [];
  for (const serie of series) {
    const contagem = quantidade.get(serie.id) ?? 0;
    const dentro = pilarPrincipalDaSerie(serie) === pilarId;
    if (!dentro && contagem === 0) continue;
    if (serie.ativa === false && contagem === 0) continue;
    linhas.push({
      id: serie.id,
      nome: serie.name?.trim() || 'Sem nome',
      cor: serie.cor?.trim() || null,
      quantidade: contagem,
    });
    quantidade.delete(serie.id);
  }

  linhas.sort((left, right) => right.quantidade - left.quantidade || left.nome.localeCompare(right.nome, 'pt-BR'));

  if (semSerie > 0) {
    linhas.push({id: 'sem-serie', nome: 'Sem série', cor: null, quantidade: semSerie});
  }
  return linhas;
}

export type TomDaSaude = 'vazio' | 'metade' | 'completo' | 'passou';

/** Nenhum ou abaixo da metade fica vermelho. Da metade até a meta, amarelo. Na meta, verde. */
export function tomDaSaude(planejado: number, meta: number): TomDaSaude {
  if (meta <= 0) return planejado > 0 ? 'passou' : 'vazio';
  if (planejado > meta) return 'passou';
  if (planejado === meta) return 'completo';
  if (planejado * 2 >= meta) return 'metade';
  return 'vazio';
}

export type ExcessoMes = {
  nome: string;
  planejado: number;
  meta: number;
};

export function periodoDaData(date: string): PeriodoGrade {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return {inicio: date, fim: date};
  const last = new Date(Number(match[1]), Number(match[2]), 0).getDate();
  const prefix = `${match[1]}-${match[2]}`;
  return {inicio: `${prefix}-01`, fim: `${prefix}-${String(last).padStart(2, '0')}`};
}

/**
 * Avisa quando este conteúdo ainda não está no mês e o próximo espaço passa da meta do pilar ou da função.
 */
export function excessosAoAcrescentar({
  content,
  date,
  postIts,
  contents,
  series,
  pilares,
  settings,
  platforms = [],
}: {
  content: Content | null;
  date: string | null;
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  pilares: readonly Pilar[];
  settings: Pick<EditorialSettings, 'redeReferenciaId' | 'distribuicaoFuncoes'>;
  platforms?: readonly DestinoPlataforma[];
}): ExcessoMes[] {
  if (!content || !date || content.contaNaGrade === false || content.deletedAt || content.archivedAt) return [];
  const saude = saudeDoMes({
    postIts,
    contents,
    series,
    pilares,
    settings,
    periodo: periodoDaData(date),
    platforms,
  });
  const jaConta = saude.entries.some(entry =>
    entry.tipo === 'original' && entry.contaNaGrade && entry.contentId === content.id,
  );
  if (jaConta) return [];

  const serie = content.seriesId ? series.find(item => item.id === content.seriesId) : undefined;
  const resolved = resolveFuncao(content, serie);
  const funcao = resolved.funcao ?? (resolved.estado === 'indefinida' ? funcaoHerdavelDaSerie(serie) : null);
  const pilarId = content.pilarId || pilarPrincipalDaSerie(serie);
  const excessos: ExcessoMes[] = [];

  if (pilarId) {
    const linha = saude.pilares.find(item => item.id === pilarId);
    if (linha && linha.meta > 0 && linha.planejado >= linha.meta) {
      excessos.push({nome: linha.rotulo, planejado: linha.planejado, meta: linha.meta});
    }
  }

  if (funcao && distribuicaoFecha(settings.distribuicaoFuncoes)) {
    const linha = saude.funcoes.find(item => item.id === funcao);
    const meta = linha?.meta ?? 0;
    const planejado = linha?.planejado ?? 0;
    if (meta > 0 && planejado >= meta) {
      excessos.push({nome: FUNCAO_CURTA[funcao], planejado, meta});
    }
  }

  return excessos;
}

export function saudeDoMes({
  postIts,
  contents,
  series,
  pilares,
  settings,
  periodo,
  platforms = [],
}: {
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  pilares: readonly Pilar[];
  settings: Pick<EditorialSettings, 'redeReferenciaId' | 'distribuicaoFuncoes'>;
  periodo: PeriodoGrade;
  platforms?: readonly DestinoPlataforma[];
}): SaudeDoMes {
  const entries = entriesDaSaudeDoMes({postIts, contents, series, settings, periodo, platforms});
  return {
    ...countGrade({
      entries,
      pilares,
      settings: {distribuicaoFuncoes: settings.distribuicaoFuncoes},
      periodo,
    }),
    entries,
    outrasRedes: publicacoesEmOutrasRedes({contents, settings, periodo, platforms}),
  };
}
