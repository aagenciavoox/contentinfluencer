import { raizSemTipoEhFamilia, type SerieNo } from './serieArvore.ts';
import type { UnidadeDaMeta } from './metaDaOnda.ts';

/**
 * Regra de Ouro do plano: cada série consome no máximo N episódios por semana.
 * N é escolhido pela pessoa em Editorial › Geral ("Limite por série"); sem nada gravado, 1.
 * Quadro é sob demanda: não tem meta, não entra na conta da série nem da família
 * e não soma no teto da semana. Os números gravados no banco ficam como estão; só a conta muda.
 *
 * - Série, wave da série e meta da série numa conta ou formato: até N por semana.
 * - Janela maior que a semana: até N por semana inteira da janela
 *   (com N = 1: 14 dias = 2, mês = 4, bimestre = 8, trimestre = 13, semestre = 26).
 * - Família é só pasta visual: não tem meta, não entra no teto e não ocupa vaga.
 */

/** Limite por série sem nada gravado: 1 episódio por semana. */
export const LIMITE_REGRA_DE_OURO_PADRAO = 1;
/** Maior limite por série que a pessoa pode escolher (um por dia da semana). */
export const LIMITE_REGRA_DE_OURO_MAXIMO = 7;

/** Inteiro entre 1 e o máximo; qualquer outra coisa é null. */
export function normalizarLimiteDaRegraDeOuro(valor: unknown): number | null {
  if (typeof valor !== 'number' || !Number.isInteger(valor)) return null;
  return valor >= 1 && valor <= LIMITE_REGRA_DE_OURO_MAXIMO ? valor : null;
}

/**
 * Chave do limite por série no jsonb `editorial_conta.avisos` (mesmo lugar do limite do mesmo quadro,
 * sem coluna nova). Sem valor gravado, vale o padrão.
 */
export const CHAVE_LIMITE_REGRA_DE_OURO = 'regra-de-ouro-limite';

/** Limite por série lido do jsonb dos avisos como veio do banco. Ausente ou inválido: padrão. */
export function limiteDaRegraNosAvisos(avisos: unknown): number {
  if (!avisos || typeof avisos !== 'object' || Array.isArray(avisos)) return LIMITE_REGRA_DE_OURO_PADRAO;
  return normalizarLimiteDaRegraDeOuro((avisos as Record<string, unknown>)[CHAVE_LIMITE_REGRA_DE_OURO]) ?? LIMITE_REGRA_DE_OURO_PADRAO;
}

/**
 * Limite escolhido pela pessoa, sincronizado pelo AppContext a cada render a partir
 * das configurações editoriais. Fora do app (testes, MCP) fica no padrão.
 */
let limiteConfigurado = LIMITE_REGRA_DE_OURO_PADRAO;

/** Grava o limite por série em uso. Valor inválido volta ao padrão. */
export function definirLimiteDaRegraDeOuro(valor: unknown): void {
  limiteConfigurado = normalizarLimiteDaRegraDeOuro(valor) ?? LIMITE_REGRA_DE_OURO_PADRAO;
}

/** Limite por série em uso (episódios por semana da mesma série). */
export function limiteDaRegraDeOuro(): number {
  return limiteConfigurado;
}

/** Quantas semanas inteiras cada janela da meta tem. Com limite N, o teto da janela é N × este número. */
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
  usaTemporadas?: boolean | null;
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
    if (!paiId || !porId.has(paiId)) return raizSemTipoEhFamilia(id, series) ? 'familia' : 'serie';
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
 * Episódios por semana que a meta de uma série (ou wave) pode pedir: o limite por série escolhido.
 * Família não tem cota — o número gravado no banco é ignorado nas contas.
 */
export function unidadesDaRegraDeOuro(_serieId: string, _series: readonly NoDaRegra[], limitePorSemana: number = limiteConfigurado): number {
  return normalizarLimiteDaRegraDeOuro(Math.trunc(limitePorSemana)) ?? LIMITE_REGRA_DE_OURO_PADRAO;
}

/** Teto da quantidade numa janela da unidade (limite por semana × semanas da janela). Unidade desconhecida: sem teto. */
export function tetoDaRegraDeOuro(unidade: string | null | undefined, limitePorSemana: number = limiteConfigurado): number | null {
  if (!ehUnidadeDaMeta(unidade)) return null;
  return MAXIMO_DA_REGRA_DE_OURO[unidade] * Math.max(1, Math.trunc(limitePorSemana) || 1);
}

/** A quantidade que conta no plano: a gravada, até o teto da Regra de Ouro. */
export function vezesNaRegraDeOuro(vezes: number | null | undefined, unidade: string | null | undefined, limitePorSemana: number = limiteConfigurado): number | null | undefined {
  if (typeof vezes !== 'number' || !Number.isFinite(vezes)) return vezes;
  const teto = tetoDaRegraDeOuro(unidade, limitePorSemana);
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

/** Início comum das mensagens de erro da Regra de Ouro (ver erroDaRegraDeOuro). */
const INICIO_DO_ERRO = 'Regra de Ouro: no máximo';

/** A mensagem (de qualquer formulário de meta) é o erro da Regra de Ouro? Serve para mostrar o “?” ao lado. */
export function ehErroDaRegraDeOuro(mensagem: string | null | undefined): boolean {
  return typeof mensagem === 'string' && mensagem.includes(INICIO_DO_ERRO);
}

/** Texto do “?” ao lado do erro: de onde vem o limite, o valor atual e as janelas maiores. */
export function explicacaoDoLimiteDaRegraDeOuro(limitePorSemana: number = limiteConfigurado): string {
  const porSemana = Math.max(1, Math.trunc(limitePorSemana) || 1);
  const janela = (unidade: UnidadeDaMeta) => tetoDaRegraDeOuro(unidade, porSemana);
  return `Esse limite vem de “Limite por série”, em Editorial › Geral › Regra de Ouro. `
    + `Hoje: ${porSemana} ${porSemana === 1 ? 'episódio' : 'episódios'} por semana da mesma série. `
    + `Janelas maiores seguem a mesma proporção: até ${janela('quinzena')} a cada 14 dias, ${janela('mes')} por mês, `
    + `${janela('bimestre')} por bimestre, ${janela('trimestre')} por trimestre e ${janela('semestre')} por semestre.`;
}

/** Mensagem do formulário quando a quantidade passa da Regra de Ouro. Null quando cabe. */
export function erroDaRegraDeOuro(vezes: number | null | undefined, unidade: string | null | undefined, limitePorSemana: number = limiteConfigurado): string | null {
  if (typeof vezes !== 'number' || !Number.isFinite(vezes) || !ehUnidadeDaMeta(unidade)) return null;
  const teto = tetoDaRegraDeOuro(unidade, limitePorSemana);
  if (teto == null || vezes <= teto) return null;
  const porSemana = Math.max(1, Math.trunc(limitePorSemana) || 1);
  const limite = `${INICIO_DO_ERRO} ${porSemana} ${porSemana === 1 ? 'episódio' : 'episódios'} por semana da mesma série`;
  if (unidade === 'semana') return `${limite}.`;
  return `${limite} (até ${teto} ${NOME_DA_JANELA[unidade]}).`;
}
