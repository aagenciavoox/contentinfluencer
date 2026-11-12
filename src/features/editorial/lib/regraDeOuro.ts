import { filhosDaSerie, type SerieNo } from './serieArvore.ts';
import type { UnidadeDaMeta } from './metaDaOnda.ts';

/**
 * Regra de Ouro do plano: cada série consome no máximo 1 episódio por semana.
 * Quadro é sob demanda: não tem meta, não entra na conta da série nem da família
 * e não soma no teto da semana. Os números gravados no banco ficam como estão; só a conta muda.
 *
 * - Série, wave da série e meta da série numa conta ou formato: 1 por semana.
 * - Janela maior que a semana: no máximo uma por semana inteira da janela
 *   (14 dias = 2, mês = 4, bimestre = 8, trimestre = 13, semestre = 26).
 * - Família é só pasta visual: não tem meta, não entra no teto e não ocupa vaga.
 */

/** Máximo de episódios de uma série em cada janela da meta. */
export const MAXIMO_DA_REGRA_DE_OURO: Record<UnidadeDaMeta, number> = {
  semana: 1,
  quinzena: 2,
  mes: 4,
  bimestre: 8,
  trimestre: 13,
  semestre: 26,
};

function ehUnidadeDaMeta(valor: unknown): valor is UnidadeDaMeta {
  return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(MAXIMO_DA_REGRA_DE_OURO, valor);
}

type TipoNaArvore = 'familia' | 'serie' | 'quadro';

export type NoDaRegra = SerieNo & {
  tipoAgrupamento?: TipoNaArvore | null;
  ativa?: boolean | null;
  status?: 'rascunho' | 'ativa' | 'arquivada' | null;
};

/**
 * Tipo escolhido; sem escolha, deduzido pela árvore. Mesma regra de `tipoDaSerie`
 * (settings/lib/serieAgrupamento.ts), repetida aqui para a apuração não depender do módulo de telas.
 */
export function tipoNaArvore(serieId: string, series: readonly NoDaRegra[]): TipoNaArvore {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const vistos = new Set<string>();
  const resolver = (id: string): TipoNaArvore => {
    const serie = porId.get(id);
    if (!serie) return 'serie';
    if (serie.tipoAgrupamento) return serie.tipoAgrupamento;
    if (vistos.has(id)) return 'serie';
    vistos.add(id);
    const paiId = serie.parentId?.trim();
    if (!paiId || !porId.has(paiId)) {
      const temNeto = filhosDaSerie(id, series).some(filho => filhosDaSerie(filho.id, series).length > 0);
      return temNeto ? 'familia' : 'serie';
    }
    return resolver(paiId) === 'familia' ? 'serie' : 'quadro';
  };
  return resolver(serieId);
}

/** Quadro: sob demanda, sem meta própria e fora da meta da série. */
export function ehQuadroNaArvore(serieId: string, series: readonly NoDaRegra[]): boolean {
  return tipoNaArvore(serieId, series) === 'quadro';
}

/** Ids dos quadros abaixo de `raizId` (a própria raiz não entra). */
export function quadrosDaSubarvore(raizId: string, series: readonly NoDaRegra[]): Set<string> {
  const ids = new Set<string>();
  for (const serie of series) {
    if (serie.id === raizId) continue;
    if (tipoNaArvore(serie.id, series) !== 'quadro') continue;
    // Sobe até a raiz: só entra quem está abaixo dela.
    let cursor = serie.parentId?.trim() || null;
    const vistos = new Set<string>();
    while (cursor && !vistos.has(cursor)) {
      if (cursor === raizId) {
        ids.add(serie.id);
        break;
      }
      vistos.add(cursor);
      cursor = series.find(item => item.id === cursor)?.parentId?.trim() || null;
    }
  }
  return ids;
}

/** Família é só pasta visual: não tem meta própria. */
export function ehFamiliaNaArvore(serieId: string, series: readonly NoDaRegra[]): boolean {
  return tipoNaArvore(serieId, series) === 'familia';
}

/**
 * Quantas séries a meta cobre. Série e wave: 1.
 * Família não tem cota — o número gravado no banco é ignorado nas contas.
 */
export function unidadesDaRegraDeOuro(_serieId: string, _series: readonly NoDaRegra[]): number {
  return 1;
}

/** Teto da quantidade numa janela da unidade. Unidade desconhecida: sem teto. */
export function tetoDaRegraDeOuro(unidade: string | null | undefined, unidades = 1): number | null {
  if (!ehUnidadeDaMeta(unidade)) return null;
  return MAXIMO_DA_REGRA_DE_OURO[unidade] * Math.max(1, Math.trunc(unidades) || 1);
}

/** A quantidade que conta no plano: a gravada, até o teto da Regra de Ouro. */
export function vezesNaRegraDeOuro(vezes: number | null | undefined, unidade: string | null | undefined, unidades = 1): number | null | undefined {
  if (typeof vezes !== 'number' || !Number.isFinite(vezes)) return vezes;
  const teto = tetoDaRegraDeOuro(unidade, unidades);
  return teto != null && vezes > teto ? teto : vezes;
}

const NOME_DA_JANELA: Record<UnidadeDaMeta, string> = {
  semana: 'por semana',
  quinzena: 'a cada 14 dias',
  mes: 'por mês',
  bimestre: 'por bimestre',
  trimestre: 'por trimestre',
  semestre: 'por semestre',
};

/** Mensagem do formulário quando a quantidade passa da Regra de Ouro. Null quando cabe. */
export function erroDaRegraDeOuro(vezes: number | null | undefined, unidade: string | null | undefined, unidades = 1): string | null {
  if (typeof vezes !== 'number' || !Number.isFinite(vezes) || !ehUnidadeDaMeta(unidade)) return null;
  const teto = tetoDaRegraDeOuro(unidade, unidades);
  if (teto == null || vezes <= teto) return null;
  if (unidades > 1) {
    return `Regra de Ouro: no máximo 1 episódio por semana da mesma série (até ${teto} ${NOME_DA_JANELA[unidade]}).`;
  }
  if (unidade === 'semana') return 'Regra de Ouro: no máximo 1 episódio por semana da mesma série.';
  return `Regra de Ouro: no máximo 1 episódio por semana da mesma série (até ${teto} ${NOME_DA_JANELA[unidade]}).`;
}
