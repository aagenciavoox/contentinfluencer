import { intervalosDaFrequencia, situacaoDaFrequencia, type ExclusaoDaApuracao, type SerieDaApuracao } from './apuracaoSerie.ts';
import { exclusaoDaFamilia, exclusaoDeMetaPropria, type OndaDaExclusao } from './metaPropria.ts';
import type { SituacaoNaAgenda } from './publicacoes.ts';
import { quadrosDaSubarvore } from './regraDeOuro.ts';
import { idsDaSubarvore } from './serieArvore.ts';

/**
 * Tabela do Plano do período: contagens por conta, família, série, quadro e temporada.
 * Só lê. "Com data" e "Publicados" vêm das publicações; "Programado" só quando a publicação
 * está programada e o material está pronto (quem chama decide isso; aqui é um booleano).
 */

type Intervalo = { inicio: string; fim: string };

export type PublicacaoDoPlano = {
  platformId: string;
  /** yyyy-MM-dd; null = sem data. */
  data: string | null;
  situacao: SituacaoNaAgenda;
  /** Status "programada" e material pronto para publicar. */
  programada: boolean;
  /** Fora da meta (ex.: Stories, conta fora da grade): não entra na linha da conta. */
  contaNaMeta?: boolean;
};

export type EpisodioDoPlano = {
  contentId: string;
  serieId: string | null;
  temporadaId: string | null;
  publicacoes: readonly PublicacaoDoPlano[];
};

export type ContagemDoPlano = {
  comData: number;
  publicados: number;
  programados: number;
};

export type TipoDaLinha = 'conta' | 'familia' | 'serie' | 'quadro' | 'temporada';

export type TemporadaDoPlano = OndaDaExclusao & {
  frequenciaUnidade?: string | null;
  frequenciaAPartirDe?: string | null;
};

function dentro(data: string | null, intervalo: Intervalo): data is string {
  return Boolean(data && data >= intervalo.inicio && data <= intervalo.fim);
}

/** Primeira publicação feita do episódio, em qualquer destino. */
function primeiraPublicacao(episodio: EpisodioDoPlano): string | null {
  let menor: string | null = null;
  for (const pub of episodio.publicacoes) {
    if (pub.situacao !== 'realizada' || !pub.data) continue;
    if (!menor || pub.data < menor) menor = pub.data;
  }
  return menor;
}

/** Data que decide de qual lado do arquivo da temporada o episódio fica. */
export function dataDeReferencia(episodio: EpisodioDoPlano): string | null {
  const feita = primeiraPublicacao(episodio);
  if (feita) return feita;
  let menor: string | null = null;
  for (const pub of episodio.publicacoes) {
    if (!pub.data) continue;
    if (!menor || pub.data < menor) menor = pub.data;
  }
  return menor;
}

/**
 * Episódios únicos: publicado em qualquer destino conta uma vez, no dia da primeira publicação.
 * Com data = publicado no intervalo ou ainda não publicado e com alguma data no intervalo.
 */
export function contarEpisodios(episodios: readonly EpisodioDoPlano[], intervalo: Intervalo): ContagemDoPlano {
  const contagem: ContagemDoPlano = { comData: 0, publicados: 0, programados: 0 };
  const vistos = new Set<string>();
  for (const episodio of episodios) {
    if (vistos.has(episodio.contentId)) continue;
    vistos.add(episodio.contentId);
    const feita = primeiraPublicacao(episodio);
    if (feita) {
      if (dentro(feita, intervalo)) {
        contagem.comData += 1;
        contagem.publicados += 1;
      }
      continue;
    }
    const pendentes = episodio.publicacoes.filter(pub => pub.situacao !== 'realizada' && dentro(pub.data, intervalo));
    if (pendentes.length === 0) continue;
    contagem.comData += 1;
    if (pendentes.some(pub => pub.programada)) contagem.programados += 1;
  }
  return contagem;
}

/** Linha da conta: cada publicação naquela conta, com a situação dela (não a do episódio). */
export function contarNaConta(episodios: readonly EpisodioDoPlano[], platformId: string, intervalo: Intervalo): ContagemDoPlano {
  const contagem: ContagemDoPlano = { comData: 0, publicados: 0, programados: 0 };
  for (const episodio of episodios) {
    for (const pub of episodio.publicacoes) {
      if (pub.platformId !== platformId || pub.contaNaMeta === false || !dentro(pub.data, intervalo)) continue;
      contagem.comData += 1;
      if (pub.situacao === 'realizada') contagem.publicados += 1;
      else if (pub.programada) contagem.programados += 1;
    }
  }
  return contagem;
}

function semRascunhos(ids: Set<string>, raizId: string, series: readonly SerieDaApuracao[]): Set<string> {
  for (const outra of series) {
    if (outra.id === raizId || outra.status !== 'rascunho' || !ids.has(outra.id)) continue;
    for (const filho of idsDaSubarvore(outra.id, series)) ids.delete(filho);
  }
  return ids;
}

function filtrarPorExclusao(
  episodios: readonly EpisodioDoPlano[],
  ids: ReadonlySet<string>,
  exclusao: ExclusaoDaApuracao,
): EpisodioDoPlano[] {
  return episodios.filter(episodio => {
    if (!episodio.serieId || !ids.has(episodio.serieId)) return false;
    if (episodio.temporadaId && exclusao.temporadaIds?.has(episodio.temporadaId)) {
      const ate = exclusao.temporadaAte?.get(episodio.temporadaId);
      const data = dataDeReferencia(episodio);
      // Temporada arquivada: do dia do arquivo em diante, o episódio volta para a série.
      return Boolean(ate && data && data >= ate);
    }
    return true;
  });
}

/**
 * Episódios que a linha conta, com as mesmas regras da Continuidade:
 * série sem os quadros (sob demanda) e sem as waves com ritmo próprio; família com as séries dela
 * (sem rascunho nem quadros); temporada só os dela, sem quadros, até a véspera do arquivo.
 */
export function episodiosDaLinha(input: {
  tipo: Exclude<TipoDaLinha, 'conta'>;
  id: string;
  episodios: readonly EpisodioDoPlano[];
  series: readonly SerieDaApuracao[];
  temporadas: readonly TemporadaDoPlano[];
}): EpisodioDoPlano[] {
  if (input.tipo === 'temporada') {
    const temporada = input.temporadas.find(item => item.id === input.id);
    // Quadro é sob demanda: episódio de quadro na temporada não conta no ritmo da wave.
    const quadros = temporada ? quadrosDaSubarvore(temporada.serieId, input.series) : new Set<string>();
    return input.episodios.filter(episodio => {
      if (episodio.temporadaId !== input.id) return false;
      if (episodio.serieId && quadros.has(episodio.serieId)) return false;
      if (temporada?.status === 'arquivada' && temporada.arquivadaEm) {
        const data = dataDeReferencia(episodio);
        return !data || data < temporada.arquivadaEm;
      }
      return true;
    });
  }
  const serie = input.series.find(item => item.id === input.id);
  if (!serie) return [];
  const ids = semRascunhos(idsDaSubarvore(serie.id, input.series), serie.id, input.series);
  const daArvore = input.temporadas.filter(onda => ids.has(onda.serieId));
  if (input.tipo === 'familia') {
    const daFamilia = exclusaoDaFamilia(daArvore, serie, input.series);
    for (const id of daFamilia.serieIds ?? []) {
      for (const filho of idsDaSubarvore(id, input.series)) ids.delete(filho);
    }
    return filtrarPorExclusao(input.episodios, ids, daFamilia);
  }
  const exclusao = exclusaoDeMetaPropria(serie, input.series, daArvore);
  for (const id of exclusao.serieIds ?? []) {
    for (const filho of idsDaSubarvore(id, input.series)) ids.delete(filho);
  }
  return filtrarPorExclusao(input.episodios, ids, exclusao);
}

/**
 * Meta do ritmo no intervalo: quantidade × janelas inteiras que tocam o intervalo.
 * Sem ritmo definido, null (a tabela mostra "Sem ritmo", nunca zero).
 * Regra de Ouro: a quantidade vale até 1 por semana por série (`unidades` séries; família, uma por série ativa).
 */
export function metaDoRitmo(
  alvo: Pick<SerieDaApuracao, 'frequenciaRecomendada' | 'frequenciaVezes' | 'frequenciaUnidade' | 'frequenciaAPartirDe' | 'frequenciaAncora'>,
  intervalo: Intervalo,
  unidades = 1,
): { valor: number; janelas: number } | null {
  const situacao = situacaoDaFrequencia(alvo, unidades);
  if (situacao.tipo !== 'definida') return null;
  const janelas = intervalosDaFrequencia(situacao.freq, intervalo).length;
  const vezes = situacao.freq.vezes ?? 1;
  return { valor: vezes * janelas, janelas };
}

export type FiltroDoPlano = 'todos' | TipoDaLinha;

export type LinhaFiltravel = { tipo: TipoDaLinha; nome: string; detalhe?: string | null };

function chaveDeBusca(texto: string): string {
  return texto.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();
}

/** Busca por nome (e pelo detalhe, como a série dona) e filtro por tipo de linha. */
export function filtrarLinhas<T extends LinhaFiltravel>(linhas: readonly T[], busca: string, filtro: FiltroDoPlano): T[] {
  const termo = chaveDeBusca(busca);
  return linhas.filter(linha => {
    if (filtro !== 'todos' && linha.tipo !== filtro) return false;
    if (!termo) return true;
    return chaveDeBusca(`${linha.nome} ${linha.detalhe ?? ''}`).includes(termo);
  });
}
