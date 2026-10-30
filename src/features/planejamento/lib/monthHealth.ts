import {endOfMonth, format, startOfMonth} from 'date-fns';
import type {Content, Pilar, Serie} from '../../../lib/database.ts';
import {buildGradeEntries, type GradeEntry} from '../../editorial/lib/gradeEntries.ts';
import {contaNaGradeEfetiva} from '../../editorial/lib/contaNaGradeOrigem.ts';
import {countGrade, type GradeCounts, type PeriodoGrade, type PostItContagem} from '../../editorial/lib/gradeCounts.ts';
import type {EditorialSettings} from '../../editorial/lib/editorialSettings.ts';
import {contarSerieAgrupada} from '../../editorial/lib/frequenciaAgrupada.ts';
import {resolveFuncao} from '../../editorial/lib/funcoes.ts';
import {pilarPrincipalDaSerie} from '../../editorial/lib/pilarDaSerie.ts';
import type {DestinoPlataforma} from '../../editorial/lib/destinations.ts';
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

type AjustesDoMes = Pick<EditorialSettings, 'redeReferenciaId'> & Partial<
  Pick<EditorialSettings, 'proporcaoFuncoes' | 'preferencias' | 'periodos'>
>;

function postItsParaContagem(
  postIts: readonly PlanejamentoPostIt[],
  contents: readonly Content[],
): PostItContagem[] {
  const contentById = new Map(contents.map(content => [content.id, content]));
  const notas: PostItContagem[] = [];
  for (const postIt of postIts) {
    if (postIt.contentId) {
      const content = contentById.get(postIt.contentId);
      if (!content || content.deletedAt || content.archivedAt) continue;
    }
    notas.push({
      id: postIt.id,
      date: postIt.date,
      texto: postIt.texto,
      contentId: postIt.contentId,
      serieId: postIt.serieId,
      pilarId: postIt.pilarId,
      objetivo: postIt.objetivo,
      pautaDefinida: postIt.pautaDefinida,
    });
  }
  return notas;
}

/**
 * O mês junta post-it e data oficial sem contar o mesmo roteiro duas vezes.
 * Quem só publicou fora da rede de base continua, na data de referência.
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
  settings: AjustesDoMes;
  periodo: PeriodoGrade;
  platforms?: readonly DestinoPlataforma[];
}): readonly GradeEntry[] {
  return saudeDoMes({ postIts, contents, series, pilares: [], settings, periodo, platforms }).entries;
}

export type ForaDaConta = {
  semPilar: number;
  foraDaGrade: number;
  pilarSemEspaco: number;
  /** Mantido no tipo. Publicação fora da rede de base já entra na conta. */
  outrasRedes: number;
};

/**
 * Publicação fora da rede de base entra na conta, na data de referência.
 * Não há mais um extra para explicar fora dos números.
 */
export function publicacoesEmOutrasRedes(_input: {
  contents: readonly Content[];
  settings: Pick<EditorialSettings, 'redeReferenciaId'>;
  periodo: PeriodoGrade;
  platforms?: readonly DestinoPlataforma[];
}): number {
  return 0;
}

/**
 * O que tem data no mês e ficou de fora do limite.
 * Sem pilar e pilar sem frequência continuam na conta. Rede fora da base também.
 */
export function foraDaContaDoMes(
  counts: Pick<GradeCounts, 'pilares' | 'periodo'>,
  entries: readonly GradeEntry[],
  outrasRedes = 0,
): ForaDaConta {
  const resultado: ForaDaConta = {semPilar: 0, foraDaGrade: 0, pilarSemEspaco: 0, outrasRedes};
  for (const entry of entries) {
    if (!noPeriodo(entry.data, counts.periodo)) continue;
    if (entry.tipo === 'repost') continue;
    if (!entry.contaNaGrade) resultado.foraDaGrade += 1;
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
 * Avisa quando este conteúdo ainda não está no mês e o próximo item passa do limite.
 * Frequência de pilar ou de série não fecha a conta. Sem limite, não há aviso.
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
  settings: AjustesDoMes;
  platforms?: readonly DestinoPlataforma[];
}): ExcessoMes[] {
  if (!content || !date || content.deletedAt || content.archivedAt) return [];
  const serie = content.seriesId ? series.find(item => item.id === content.seriesId) : undefined;
  const resolved = resolveFuncao(content, serie);
  const efetiva = contaNaGradeEfetiva({
    contaNaGrade: content.contaNaGrade !== false,
    contaNaGradeOrigem: (content as { contaNaGradeOrigem?: 'manual' | 'regra' | null }).contaNaGradeOrigem,
    formato: content.formatoVisual,
    funcao: resolved.funcao,
  });
  if (!efetiva) return [];

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
  if (jaConta || saude.limite == null) return [];
  if (saude.previsto < saude.limite) return [];
  return [{ nome: 'Limite do período', planejado: saude.previsto, meta: saude.limite }];
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
  settings: AjustesDoMes;
  periodo: PeriodoGrade;
  platforms?: readonly DestinoPlataforma[];
}): SaudeDoMes {
  const oficiais = buildGradeEntries({
    contents,
    series,
    settings: { redeReferenciaId: settings.preferencias?.redeReferenciaId ?? settings.redeReferenciaId },
    platforms,
  });
  const contagem = countGrade({
    entries: oficiais,
    postIts: postItsParaContagem(postIts, contents),
    pilares,
    settings,
    periodo,
  });
  return {
    ...contagem,
    entries: contagem.itens,
    outrasRedes: 0,
  };
}

/** Usa os mesmos espaços conciliados da ocupação, inclusive a árvore de séries. */
export function frequenciasDoMes(counts: GradeCounts, series: readonly Serie[]) {
  const itens = counts.itens.map(item => ({serieId: item.serieId, espacoId: item.id, contentId: item.contentId}));
  return series.filter(serie => serie.ativa !== false).map(serie => contarSerieAgrupada({
    serie, series, itens, inicio: counts.periodo.inicio, fim: counts.periodo.fim,
  })).filter(item => item.expectativa != null && item.expectativa > 0);
}

export function ocupacaoDoMes(counts: Pick<GradeCounts, 'previsto' | 'limite'>) {
  return {
    preenchidos: counts.previsto,
    capacidade: counts.limite,
    livres: counts.limite == null ? null : Math.max(0, counts.limite - counts.previsto),
    excesso: counts.limite == null ? 0 : Math.max(0, counts.previsto - counts.limite),
    percentual: counts.limite == null || counts.limite <= 0 ? 0 : Math.min(100, counts.previsto / counts.limite * 100),
  };
}
