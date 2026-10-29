import type { Serie } from '../../../lib/database.ts';
import { expectativaNoIntervalo, lerFrequencia, type FrequenciaSerie } from './frequenciaSerie.ts';
import { filhosDaSerie, idsDaSubarvore, type SerieNo } from './serieArvore.ts';

export type SerieFrequencia = Pick<
  Serie,
  'id' | 'name' | 'parentId' | 'frequenciaRecomendada' | 'frequenciaVezes' | 'frequenciaUnidade' | 'frequenciaAPartirDe'
> & SerieNo;

export type ItemContagemSerie = {
  serieId: string | null;
  /** Identificador estável do espaço (contentId:original ou contentId:ciclo:N). */
  espacoId: string;
  contentId: string;
};

export type ContribuicaoFilho = {
  serieId: string;
  nome: string;
  /** Episódios na subárvore do filho (uma vez cada espaço). */
  quantidade: number;
  /** Expectativa própria do filho, se houver número. */
  expectativa: number | null;
};

export type ContagemSerieAgrupada = {
  serieId: string;
  nome: string;
  /** Meta compartilhada quando esta série tem número. */
  expectativa: number | null;
  /** Episódios ligados diretamente a esta série. */
  diretos: number;
  /** Contribuição de cada filho direto (já com netos do filho). */
  filhos: ContribuicaoFilho[];
  /**
   * Total único nesta árvore: diretos + contribuições dos filhos.
   * Neto incluído no filho não entra de novo aqui.
   */
  total: number;
  /**
   * Soma das expectativas dos filhos diretos que têm número.
   * Compara com a meta do pai; null se nenhum filho tem número.
   */
  somaRecortesFilhos: number | null;
  /** True quando a soma dos recortes dos filhos diverge da meta do pai. */
  recorteIncompativel: boolean;
};

function frequenciaDe(serie: SerieFrequencia): FrequenciaSerie {
  return lerFrequencia({
    frequenciaRecomendada: serie.frequenciaRecomendada,
    vezes: serie.frequenciaVezes,
    unidade: serie.frequenciaUnidade,
    aPartirDe: serie.frequenciaAPartirDe,
  });
}

function expectativaDe(
  serie: SerieFrequencia,
  inicio: string,
  fim: string,
): number | null {
  const freq = frequenciaDe(serie);
  if (freq.unidade === 'sob-demanda') return null;
  return expectativaNoIntervalo(freq, inicio, fim);
}

/** Espaços únicos cuja série está no conjunto. */
function contarEspacos(
  itens: readonly ItemContagemSerie[],
  serieIds: ReadonlySet<string>,
): number {
  const vistos = new Set<string>();
  for (const item of itens) {
    if (!item.serieId || !serieIds.has(item.serieId)) continue;
    vistos.add(item.espacoId);
  }
  return vistos.size;
}

function contarDiretos(
  itens: readonly ItemContagemSerie[],
  serieId: string,
): number {
  const vistos = new Set<string>();
  for (const item of itens) {
    if (item.serieId !== serieId) continue;
    vistos.add(item.espacoId);
  }
  return vistos.size;
}

/**
 * Conta a série com meta compartilhada: diretos + contribuição de cada filho.
 * Não soma metas no limite semanal. Filho sem número só contribui com a contagem.
 */
export function contarSerieAgrupada({
  serie,
  series,
  itens,
  inicio,
  fim,
}: {
  serie: SerieFrequencia;
  series: readonly SerieFrequencia[];
  itens: readonly ItemContagemSerie[];
  inicio: string;
  fim: string;
}): ContagemSerieAgrupada {
  const expectativa = expectativaDe(serie, inicio, fim);
  const diretos = contarDiretos(itens, serie.id);
  const filhosNos = filhosDaSerie(serie.id, series);
  const filhos: ContribuicaoFilho[] = filhosNos.map(filhoNo => {
    const filho = series.find(item => item.id === filhoNo.id) ?? {
      ...filhoNo,
      frequenciaRecomendada: null,
      frequenciaVezes: null,
      frequenciaUnidade: null,
      frequenciaAPartirDe: null,
    };
    const sub = idsDaSubarvore(filho.id, series);
    return {
      serieId: filho.id,
      nome: filho.name?.trim() || 'Quadro',
      quantidade: contarEspacos(itens, sub),
      expectativa: expectativaDe(filho as SerieFrequencia, inicio, fim),
    };
  });

  const total = diretos + filhos.reduce((soma, filho) => soma + filho.quantidade, 0);
  const recortes = filhos
    .map(filho => filho.expectativa)
    .filter((valor): valor is number => valor != null);
  const somaRecortesFilhos = recortes.length > 0 ? recortes.reduce((a, b) => a + b, 0) : null;
  const recorteIncompativel = expectativa != null
    && somaRecortesFilhos != null
    && somaRecortesFilhos !== expectativa;

  return {
    serieId: serie.id,
    nome: serie.name?.trim() || 'Série',
    expectativa,
    diretos,
    filhos,
    total,
    somaRecortesFilhos,
    recorteIncompativel,
  };
}

/** Contagem de todas as séries ativas no período (para o painel). */
export function contarTodasSeriesAgrupadas({
  series,
  itens,
  inicio,
  fim,
}: {
  series: readonly SerieFrequencia[];
  itens: readonly ItemContagemSerie[];
  inicio: string;
  fim: string;
}): ContagemSerieAgrupada[] {
  return series
    .map(serie => contarSerieAgrupada({ serie, series, itens, inicio, fim }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * Texto curto para o painel: "3 de 3" ou "2 · quando houver pauta".
 * Usa o total da árvore quando a série tem filhos; senão só os diretos.
 */
export function textoDaContagemSerie(contagem: ContagemSerieAgrupada): string {
  const contados = contagem.total;
  const esperado = contagem.expectativa;
  if (esperado == null) return `${contados} · quando houver pauta`;
  if (esperado === 0) return contados === 0 ? 'nada previsto' : `${contados} · nada previsto`;
  return `${contados} de ${esperado}`;
}
