import type { Content, ContentMetric, ContentPlataforma, Pilar, Serie } from '../../../lib/database.ts';
import { intervalo } from '../../../lib/dates.ts';
import { contaDaRef, redeDaConta, rotuloConta, type ContaRef } from '../../contas/lib/contas.ts';
import { contentPassaFiltroSerie } from '../../editorial/lib/filtroSubarvore.ts';
import { FUNCAO_LABELS, isFuncaoEditorial } from '../../editorial/lib/funcoes.ts';
import { semanaDe } from '../../editorial/lib/periodoEditorial.ts';

export type BaseDoPeriodo = 'planejada' | 'efetiva';

export type FiltroAnalise = {
  inicio: string | null;
  fim: string | null;
  base: BaseDoPeriodo;
  rede: string | null;
  contaId: string | null;
  /** Inclui a subárvore quando a série tem filhos. */
  serieId?: string | null;
};

export const FORMULA_ENGAJAMENTO =
  '(curtidas + comentários + salvamentos + compartilhamentos) ÷ visualizações';

export type LinhaAnalise = {
  publicacaoId: string;
  contentId: string;
  titulo: string;
  contaRotulo: string;
  rede: string | null;
  pilar: string | null;
  serie: string | null;
  objetivo: string | null;
  dataPlanejada: string | null;
  dataEfetiva: string | null;
  link: string | null;
  externoId: string | null;
  periodoEditorial: string | null;
  origem: string | null;
  atualizadoEm: string | null;
  views: number | null;
  alcance: number | null;
  interacoes: number | null;
  taxa: number | null;
};

const ORIGEM_ROTULO: Record<string, string> = {
  manual: 'Informada manualmente',
  importacao: 'Importação',
  api: 'Integração',
};

function dia(value: string | null | undefined): string | null {
  if (!value) return null;
  const texto = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

/** Data em que a publicação foi ao ar. Não usa a data do conteúdo quando a publicação não tem a própria. */
export function dataEfetivaDaPublicacao(
  publicacao: Pick<ContentPlataforma, 'realizadaApiEm' | 'realizadaManualEm'>,
): string | null {
  return dia(publicacao.realizadaApiEm) ?? dia(publicacao.realizadaManualEm);
}

export function metricaDaPublicacao(
  metricas: readonly ContentMetric[],
  publicacaoId: string,
): ContentMetric | null {
  return metricas.find(item => item.publicacaoId === publicacaoId) ?? null;
}

/** Soma só os tipos de interação presentes. Sem nenhum número, não vira zero. */
export function interacoesDaMetrica(metrica: ContentMetric | null): number | null {
  if (!metrica) return null;
  const partes = [metrica.likes, metrica.comments, metrica.saves, metrica.shares];
  if (partes.every(parte => parte == null)) return null;
  return partes.reduce<number>((soma, parte) => soma + (parte ?? 0), 0);
}

/**
 * Taxa só quando há visualizações para o denominador.
 * Zero visualizações não vira taxa zero: a conta não existe.
 */
export function taxaDeEngajamento(metrica: ContentMetric | null): number | null {
  if (!metrica || metrica.views == null || metrica.views <= 0) return null;
  const interacoes = interacoesDaMetrica(metrica);
  if (interacoes == null) return null;
  return interacoes / metrica.views;
}

function noIntervalo(data: string | null, inicio: string | null, fim: string | null): boolean {
  if (!inicio || !fim) return true;
  if (!data) return false;
  return data >= inicio && data <= fim;
}

export function filtrarPublicacoes({
  contents,
  contas,
  series,
  pilares,
  metricas,
  filtro,
}: {
  contents: readonly Content[];
  contas: readonly ContaRef[];
  series: readonly Pick<Serie, 'id' | 'name'>[];
  pilares: readonly Pick<Pilar, 'id' | 'nome'>[];
  metricas: readonly ContentMetric[];
  filtro: FiltroAnalise;
}): LinhaAnalise[] {
  const linhas: LinhaAnalise[] = [];

  for (const content of contents) {
    if (content.deletedAt) continue;
    if (!contentPassaFiltroSerie(content.seriesId, filtro.serieId, series)) continue;
    const serie = series.find(item => item.id === content.seriesId) ?? null;
    const pilar = pilares.find(item => item.id === content.pilarId) ?? null;
    const objetivo = isFuncaoEditorial(content.funcao) ? FUNCAO_LABELS[content.funcao] : null;

    for (const publicacao of content.plataformas) {
      const conta = contaDaRef(publicacao.platformId, contas);
      const rede = conta ? redeDaConta(conta) : null;
      if (filtro.rede && rede !== filtro.rede) continue;
      if (filtro.contaId && conta?.id !== filtro.contaId) continue;

      const dataPlanejada = dia(publicacao.publishDate);
      const dataEfetiva = dataEfetivaDaPublicacao(publicacao);
      const dataDoFiltro = filtro.base === 'efetiva' ? dataEfetiva : dataPlanejada;
      if (!noIntervalo(dataDoFiltro, filtro.inicio, filtro.fim)) continue;

      const metrica = metricaDaPublicacao(metricas, publicacao.id);
      const semana = dataPlanejada ? semanaDe(dataPlanejada) : null;

      linhas.push({
        publicacaoId: publicacao.id,
        contentId: content.id,
        titulo: content.title.trim() || 'Sem título',
        contaRotulo: conta ? rotuloConta(conta) : publicacao.platformId,
        rede,
        pilar: pilar?.nome ?? null,
        serie: serie?.name ?? null,
        objetivo,
        dataPlanejada,
        dataEfetiva,
        link: publicacao.postUrl?.trim() || null,
        externoId: publicacao.externoId?.trim() || null,
        periodoEditorial: semana ? intervalo(semana.inicio, semana.fim) : null,
        origem: metrica?.origem ? (ORIGEM_ROTULO[metrica.origem] ?? metrica.origem) : null,
        atualizadoEm: metrica?.atualizadoEm ?? null,
        views: metrica ? metrica.views : null,
        alcance: metrica ? metrica.accountsReached : null,
        interacoes: interacoesDaMetrica(metrica),
        taxa: taxaDeEngajamento(metrica),
      });
    }
  }

  return linhas.sort((esquerda, direita) => {
    const dataEsquerda = (filtro.base === 'efetiva' ? esquerda.dataEfetiva : esquerda.dataPlanejada) ?? '';
    const dataDireita = (filtro.base === 'efetiva' ? direita.dataEfetiva : direita.dataPlanejada) ?? '';
    if (dataEsquerda !== dataDireita) return dataDireita.localeCompare(dataEsquerda);
    return esquerda.titulo.localeCompare(direita.titulo, 'pt-BR');
  });
}
