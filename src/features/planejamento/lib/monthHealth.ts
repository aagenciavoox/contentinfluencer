import {endOfMonth, format, startOfMonth} from 'date-fns';
import type {Content, Pilar, Serie} from '../../../lib/database.ts';
import {buildGradeEntries, type GradeEntry} from '../../editorial/lib/gradeEntries.ts';
import {countGrade, type GradeCounts, type PeriodoGrade} from '../../editorial/lib/gradeCounts.ts';
import type {EditorialSettings} from '../../editorial/lib/editorialSettings.ts';
import {funcaoHerdavelDaSerie, resolveFuncao} from '../../editorial/lib/funcoes.ts';
import {pilarPrincipalDaSerie} from '../../editorial/lib/pilarDaSerie.ts';
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
}: {
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  settings: Pick<EditorialSettings, 'redeReferenciaId'>;
  periodo: PeriodoGrade;
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
  });
  for (const entry of oficiais) {
    if (!noPeriodo(entry.data, periodo)) continue;
    if (entry.tipo === 'original' && covered.has(entry.contentId)) continue;
    entries.push(entry);
  }
  return entries;
}

export type SaudeDoMes = GradeCounts & {
  entries: readonly GradeEntry[];
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

export function saudeDoMes({
  postIts,
  contents,
  series,
  pilares,
  settings,
  periodo,
}: {
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  series: readonly Serie[];
  pilares: readonly Pilar[];
  settings: Pick<EditorialSettings, 'redeReferenciaId' | 'distribuicaoFuncoes'>;
  periodo: PeriodoGrade;
}): SaudeDoMes {
  const entries = entriesDaSaudeDoMes({postIts, contents, series, settings, periodo});
  return {
    ...countGrade({
      entries,
      pilares,
      settings: {distribuicaoFuncoes: settings.distribuicaoFuncoes},
      periodo,
    }),
    entries,
  };
}
