/**
 * Estrutura das séries (família → série → quadro), temporadas e ordem dos episódios,
 * com as regras do app. Só código puro: nada de banco aqui.
 *
 * Reaproveita os módulos do app sem dependências: serieArvore.ts e temporadas.ts.
 * São espelhados aqui (com o nome da função de origem) porque os arquivos do app importam
 * tipos de src/lib/database.ts, que puxa o Supabase do app e o DOM para o tsc do MCP, ou date-fns/React:
 * - tipoDaSerie e tipoSugeridoParaFilho (settings/lib/serieAgrupamento.ts);
 * - erroDoVinculo, podeTerTemporadas (settings/lib/serieHierarquia.ts);
 * - nomeDeQuadroRepetido (settings/lib/estruturaSerie.ts);
 * - formatarFrequenciaRecomendada (settings/components/SerieEditForm.tsx);
 * - compararOrdemEpisodio (settings/lib/ordemEpisodios.ts);
 * - aplicarEscolhasDaSerie com resolverPilar/resolverFuncaoHerdada (editorial/lib/escolhasSerie.ts e herancaSerie.ts);
 * - moverConteudo, destinosDeQuadro, temporadasComuns, ordemFinalNoFim (settings/lib/seriesGrupos.ts e selecaoEpisodios.ts).
 */

import {
  ancestraisDaSerie,
  formariaCicloParent,
  filhosDaSerie,
  idsDaSubarvore,
} from '../../src/features/editorial/lib/serieArvore.ts';
import {
  acharTemporadaPorNome,
  escopoTemporadas,
  temporadaNoEscopo,
  temporadasDoEscopo,
  type Temporada,
} from '../../src/features/editorial/lib/temporadas.ts';

type Row = Record<string, any>;

export const TIPOS_AGRUPAMENTO = ['familia', 'serie', 'quadro'] as const;
export type TipoAgrupamento = (typeof TIPOS_AGRUPAMENTO)[number];
export const UNIDADES_FREQUENCIA = ['semana', 'quinzena', 'mes', 'sob-demanda'] as const;
export type UnidadeFrequencia = (typeof UNIDADES_FREQUENCIA)[number];

/** Migrações citadas pelo app quando a coluna ainda não existe (database.ts). */
export const MIGRACAO_SERIE_TIPO = '20261030120000_serie_tipo_agrupamento';
export const MIGRACAO_SERIE_CONTINUIDADE = '20261102240000_serie_acompanhar_continuidade';
export const MIGRACAO_CONTAS = '20261015120000_contas_legendas_metricas';
export const MIGRACAO_ORDEM_EPISODIO = '20261102210000_ordem_episodio';
export const MIGRACAO_MOVER_EPISODIOS = '20261102230000_mover_episodios_rpc';

export type SerieNoMcp = {
  id: string;
  name: string | null;
  parentId: string | null;
  tipoAgrupamento: TipoAgrupamento | null;
  usaTemporadas: boolean;
  ativa: boolean;
  funcaoPadrao: string | null;
  pilarPrincipalId: string | null;
  pilarIds: string[];
  semPilar: boolean;
};

function texto(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function tipoValido(value: unknown): TipoAgrupamento | null {
  return (TIPOS_AGRUPAMENTO as readonly unknown[]).includes(value) ? value as TipoAgrupamento : null;
}

/** Linha de `series` (snake_case, com serie_pilares) no formato das funções do app. */
export function serieDaLinha(row: Row): SerieNoMcp {
  return {
    id: String(row.id),
    name: typeof row.name === 'string' ? row.name : null,
    parentId: texto(row.parent_id),
    tipoAgrupamento: tipoValido(row.tipo_agrupamento),
    usaTemporadas: row.usa_temporadas === true,
    ativa: row.ativa !== false,
    funcaoPadrao: texto(row.funcao_padrao),
    pilarPrincipalId: texto(row.pilar_principal_id),
    pilarIds: Array.isArray(row.serie_pilares)
      ? row.serie_pilares.map((sp: Row) => texto(sp?.pilar_id)).filter((id: string | null): id is string => Boolean(id))
      : [],
    semPilar: row.sem_pilar === true,
  };
}

export function temporadaDaLinha(row: Row): Temporada {
  return {
    id: String(row.id),
    userId: String(row.user_id ?? ''),
    serieId: String(row.serie_id ?? ''),
    nome: typeof row.nome === 'string' ? row.nome : '',
    descricao: texto(row.descricao),
    createdAt: typeof row.created_at === 'string' ? row.created_at : '',
  };
}

/**
 * Espelho de tipoDaSerie (src/features/settings/lib/serieAgrupamento.ts).
 * Tipo escolhido; sem escolha, deduzido pela árvore: raiz com netos é família, raiz sem netos é série,
 * filho de família é série, filho de série ou quadro é quadro.
 */
export function tipoDaSerie(serieId: string, series: readonly SerieNoMcp[]): TipoAgrupamento {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const vistos = new Set<string>();
  const resolver = (id: string): TipoAgrupamento => {
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

/** Espelho de tipoSugeridoParaFilho: dentro de família é série; dentro de série é quadro. */
export function tipoSugeridoParaFilho(paiId: string | null | undefined, series: readonly SerieNoMcp[]): TipoAgrupamento {
  if (!paiId) return 'serie';
  return tipoDaSerie(paiId, series) === 'familia' ? 'serie' : 'quadro';
}

/** Espelho de erroDoVinculo (serieHierarquia.ts), mais: o pai precisa existir. */
export function erroDoVinculo(
  tipo: TipoAgrupamento,
  parentId: string | null | undefined,
  serieId: string,
  series: readonly SerieNoMcp[],
): string | null {
  const pai = parentId ? series.find(item => item.id === parentId) ?? null : null;
  if (parentId && !pai) return `Agrupamento pai não encontrado: ${parentId}`;
  if (tipo === 'familia') {
    return pai ? 'Uma família não fica dentro de outro agrupamento.' : null;
  }
  if (tipo === 'quadro' && !pai) return 'Escolha a série deste quadro.';
  if (!pai) return null;
  if (formariaCicloParent(serieId, pai.id, series)) return 'Um agrupamento não pode ficar dentro de si mesmo.';
  const tipoDoPai = tipoDaSerie(pai.id, series);
  if (tipo === 'serie' && tipoDoPai !== 'familia') return 'Uma série só pode fazer parte de uma família.';
  if (tipo === 'quadro' && tipoDoPai !== 'serie') return 'Um quadro só pode ficar dentro de uma série.';
  return null;
}

/** Temporadas ficam na série; os quadros dela usam as mesmas (podeTerTemporadas). */
export function podeTerTemporadas(tipo: TipoAgrupamento): boolean {
  return tipo === 'serie';
}

/** Espelho de nomeDeQuadroRepetido (estruturaSerie.ts). */
export function nomeDeQuadroRepetido(nome: string, serieId: string, series: readonly SerieNoMcp[], ignorarId?: string): boolean {
  const limpo = nome.trim().toLocaleLowerCase('pt-BR');
  if (!limpo) return false;
  return filhosDaSerie(serieId, series)
    .some(filho => filho.id !== ignorarId && (filho.name ?? '').trim().toLocaleLowerCase('pt-BR') === limpo);
}

/** Espelho de formatarFrequenciaRecomendada (SerieEditForm.tsx). */
export function frequenciaRecomendada(vezes: number | null, unidade: string): string | null {
  const u = unidade.trim().toLowerCase();
  const qtd = vezes && vezes > 0 ? vezes : 1;
  if (u === 'semana') return qtd === 1 ? 'Semanal' : `${qtd} por semana`;
  if (u === 'quinzena') return qtd === 1 ? 'Quinzenal' : `${qtd} por quinzena`;
  if (u === 'mes') return qtd === 1 ? 'Mensal' : `${qtd} por mês`;
  return null;
}

export type FrequenciaPedida = {
  vezes?: number | null;
  unidade?: UnidadeFrequencia | null;
  a_partir_de?: string | null;
};

/**
 * Colunas da frequência como o formulário do app grava (buildPayload em SerieEditForm.tsx):
 * com meta, vezes (mínimo 1), unidade (padrão semana), data de início e a frase de
 * frequencia_recomendada; sem meta, tudo nulo e o quadro fica "Sob demanda".
 * unidade `sob-demanda` (ou null) tira a meta. Devolve null quando nenhum campo da frequência veio.
 */
export function colunasDaFrequencia(
  pedido: FrequenciaPedida,
  atual: {vezes: number | null; unidade: string | null; aPartirDe: string | null},
  tipo: TipoAgrupamento,
): {colunas: Row} | {erro: string} | null {
  if (pedido.vezes === undefined && pedido.unidade === undefined && pedido.a_partir_de === undefined) return null;
  const tiraMeta = pedido.unidade === null || pedido.unidade === 'sob-demanda'
    || (pedido.unidade === undefined && pedido.vezes === null);
  if (tiraMeta) {
    return {colunas: {
      frequencia_vezes: null,
      frequencia_unidade: null,
      frequencia_a_partir_de: null,
      frequencia_recomendada: tipo === 'quadro' || pedido.unidade === 'sob-demanda' ? 'Sob demanda' : null,
    }};
  }
  const unidadeAtual = atual.unidade && atual.unidade !== 'sob-demanda' ? atual.unidade : null;
  const unidade = pedido.unidade ?? unidadeAtual ?? (pedido.vezes != null ? 'semana' : null);
  if (!unidade) return {erro: 'A data de início só vale com uma meta: informe frequencia_vezes e frequencia_unidade.'};
  const vezesPedidas = pedido.vezes !== undefined ? pedido.vezes : atual.vezes;
  const vezes = vezesPedidas && vezesPedidas > 0 ? vezesPedidas : 1;
  const aPartirDe = pedido.a_partir_de !== undefined ? pedido.a_partir_de : atual.aPartirDe;
  // Como no formulário do app: ciclo de 14 dias só existe com a data em que o primeiro ciclo começa.
  if (unidade === 'quinzena' && !aPartirDe) {
    return {erro: 'Meta a cada 14 dias precisa de frequencia_a_partir_de: é a data em que o primeiro ciclo começa.'};
  }
  return {colunas: {
    frequencia_vezes: vezes,
    frequencia_unidade: unidade,
    frequencia_a_partir_de: aPartirDe || null,
    frequencia_recomendada: frequenciaRecomendada(vezes, unidade),
  }};
}

/** Frequência legível, como a Saúde lê (vezes + unidade; senão a frase antiga). */
export function frequenciaDaLinha(row: Row) {
  const vezes = typeof row.frequencia_vezes === 'number' ? row.frequencia_vezes : null;
  const unidade = texto(row.frequencia_unidade);
  const recomendada = texto(row.frequencia_recomendada);
  const sobDemanda = !unidade && (recomendada ?? '').toLowerCase() === 'sob demanda';
  return {
    vezes,
    unidade: sobDemanda ? 'sob-demanda' : unidade,
    a_partir_de: texto(row.frequencia_a_partir_de),
    resumo: recomendada,
    definida: Boolean(unidade) || Boolean(recomendada && !sobDemanda),
  };
}

/**
 * Regra do app para "Acompanhar continuidade na Saúde": família não entra (o app nem grava o campo);
 * série ou quadro marcados sem frequência viram pendência "Sem frequência definida", nunca "abaixo".
 */
export function avisoDaContinuidade(acompanhar: boolean, tipo: TipoAgrupamento, frequenciaDefinida: boolean): {erro?: string; aviso?: string} {
  if (!acompanhar) return {};
  if (tipo === 'familia') return {erro: 'Família não entra na Continuidade da Saúde; marque a série ou o quadro.'};
  if (!frequenciaDefinida) return {aviso: 'Sem frequência definida: na Saúde aparece como pendência até você definir vezes e unidade.'};
  return {};
}

// ---------------------------------------------------------------------------
// Temporadas
// ---------------------------------------------------------------------------

/** Escopo de temporadas de uma série ou quadro: ela mesma, se usa temporadas; senão o ancestral mais próximo que usa. */
export function escopoDe(serieId: string, series: readonly SerieNoMcp[]): SerieNoMcp | null {
  return (escopoTemporadas(serieId, series) as SerieNoMcp | null) ?? null;
}

export {acharTemporadaPorNome, temporadaNoEscopo, temporadasDoEscopo};
export type {Temporada};

/** Acha a temporada por id ou pelo nome dentro do escopo. */
export function resolverTemporada(
  ref: string,
  escopoId: string | null,
  temporadas: readonly Temporada[],
): Temporada | null {
  const porId = temporadas.find(item => item.id === ref);
  if (porId) return porId;
  return escopoId ? acharTemporadaPorNome(escopoId, ref, temporadas) : null;
}

/**
 * Valida a temporada de um conteúdo como o app (temporadaNoEscopo): precisa de série,
 * e a temporada tem de ser do escopo dessa série. Null quando está tudo certo.
 */
export function erroDaTemporadaDoConteudo(
  temporadaId: string | null,
  serieId: string | null,
  series: readonly SerieNoMcp[],
  temporadas: readonly Temporada[],
): string | null {
  if (!temporadaId) return null;
  if (!serieId) return 'Temporada só existe dentro de uma série: informe a série do conteúdo.';
  if (!temporadas.some(item => item.id === temporadaId)) return `Temporada não encontrada: ${temporadaId}`;
  const escopo = escopoDe(serieId, series);
  if (!escopo) return 'Esta série não usa temporadas. Ligue usa_temporadas na série (ou crie a primeira temporada).';
  if (!temporadaNoEscopo(temporadaId, serieId, series, temporadas)) {
    return `Essa temporada não é da série "${escopo.name ?? escopo.id}". Use uma temporada dela.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Episódios: mover e reordenar
// ---------------------------------------------------------------------------

export type EpisodioMcp = {
  id: string;
  title: string;
  seriesId: string | null;
  temporadaId: string | null;
  ordemEpisodio?: number | null;
  pilarId: string | null;
  pilarOrigem: string | null;
  funcao: string | null;
  funcaoOrigem: string | null;
  classificacaoCongeladaEm: string | null;
  createdAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export function episodioDaLinha(row: Row): EpisodioMcp {
  return {
    id: String(row.id),
    title: typeof row.title === 'string' ? row.title : '',
    seriesId: texto(row.series_id),
    temporadaId: texto(row.temporada_id),
    ordemEpisodio: typeof row.ordem_episodio === 'number' ? row.ordem_episodio : row.ordem_episodio === null ? null : undefined,
    pilarId: texto(row.pilar_id),
    pilarOrigem: texto(row.pilar_origem),
    funcao: texto(row.funcao),
    funcaoOrigem: texto(row.funcao_origem),
    classificacaoCongeladaEm: texto(row.classificacao_congelada_em),
    createdAt: typeof row.created_at === 'string' ? row.created_at : '',
    archivedAt: texto(row.archived_at),
    deletedAt: texto(row.deleted_at),
  };
}

/** Espelho de compararOrdemEpisodio: com número vem antes, em ordem crescente; sem número empata. */
export function compararOrdemEpisodio(a: {ordemEpisodio?: number | null}, b: {ordemEpisodio?: number | null}): number {
  const oa = typeof a.ordemEpisodio === 'number' ? a.ordemEpisodio : null;
  const ob = typeof b.ordemEpisodio === 'number' ? b.ordemEpisodio : null;
  if (oa === null && ob === null) return 0;
  if (oa === null) return 1;
  if (ob === null) return -1;
  return oa - ob;
}

const FUNCOES_EDITORIAIS = ['atrair', 'converter', 'aprofundar', 'comunidade', 'acao', 'reter'];
const ehFuncao = (value: unknown): value is string => typeof value === 'string' && FUNCOES_EDITORIAIS.includes(value);

/** Própria série e ancestrais (mais próximo primeiro), sem as marcadas como família (propriaEAncestrais). */
function propriaEAncestrais(serieId: string, series: readonly SerieNoMcp[]): SerieNoMcp[] {
  const porId = new Map(series.map(serie => [serie.id, serie]));
  const propria = porId.get(serieId);
  const acima = ancestraisDaSerie(serieId, series).map(no => porId.get(no.id)).filter((s): s is SerieNoMcp => Boolean(s));
  return (propria ? [propria, ...acima] : acima).filter(serie => serie.tipoAgrupamento !== 'familia');
}

/** pilarPrincipalDaSerie: o principal; sem ele, o primeiro vínculo. */
function pilarDaSerie(serie: SerieNoMcp): string | null {
  return serie.pilarPrincipalId?.trim() || serie.pilarIds.find(id => id.trim()) || null;
}

/** Pilar que viria da série (resolverPilar), para quem não escolheu à mão. */
function pilarResolvido(content: EpisodioMcp, series: readonly SerieNoMcp[]): string | null {
  if (content.pilarOrigem === 'escolhida') return content.pilarId ?? null;
  if (content.pilarOrigem === 'nenhuma') return null;
  const serieId = content.seriesId?.trim();
  if (!serieId) return content.pilarId ?? null;
  for (const serie of propriaEAncestrais(serieId, series)) {
    const pilar = pilarDaSerie(serie);
    if (pilar) return pilar;
    if (serie.semPilar) break;
  }
  return null;
}

/** Objetivo (função) que viria da série (resolverFuncaoHerdada). `varia` para a subida. */
function funcaoResolvida(content: EpisodioMcp, series: readonly SerieNoMcp[]): string | null {
  const origem = content.funcaoOrigem;
  if (origem === 'escolhida' || origem === 'aplicada' || origem === 'migrada') return ehFuncao(content.funcao) ? content.funcao : null;
  if (origem === 'nenhuma') return null;
  const serieId = content.seriesId?.trim();
  if (!serieId) return ehFuncao(content.funcao) ? content.funcao : null;
  for (const serie of propriaEAncestrais(serieId, series)) {
    if (serie.funcaoPadrao === 'varia') return null;
    if (ehFuncao(serie.funcaoPadrao)) return serie.funcaoPadrao;
  }
  return null;
}

/** podeHerdar: escolha manual não volta atrás; `aplicada` só entra com o campo vazio. */
function podeHerdar(origem: string | null, vazio: boolean): boolean {
  if (origem === 'escolhida' || origem === 'nenhuma') return false;
  if (origem === 'herdada' || origem == null) return true;
  return vazio;
}

/**
 * Espelho de aplicarEscolhasDaSerie com catálogo: conteúdo congelado (publicado) não muda;
 * pilar e objetivo herdados passam a vir da série nova; escolha manual fica.
 */
export function aplicarEscolhasDaSerie(content: EpisodioMcp, serieId: string | null, series: readonly SerieNoMcp[]): EpisodioMcp {
  if (content.classificacaoCongeladaEm) return content;
  if (!serieId || !series.some(item => item.id === serieId)) return {...content, seriesId: null};
  let out: EpisodioMcp = {...content, seriesId: serieId};
  const pilar = pilarResolvido(out, series)?.trim() || null;
  if (podeHerdar(out.pilarOrigem, !out.pilarId?.trim())) {
    if (pilar) out = {...out, pilarId: pilar, pilarOrigem: 'herdada'};
    else if (out.pilarOrigem === 'herdada') out = {...out, pilarId: null, pilarOrigem: 'herdada'};
  }
  const funcao = funcaoResolvida(out, series);
  if (podeHerdar(out.funcaoOrigem, !out.funcao)) {
    if (funcao) out = {...out, funcao, funcaoOrigem: 'herdada'};
    else if (out.funcaoOrigem === 'herdada') out = {...out, funcao: null, funcaoOrigem: 'herdada'};
  }
  return out;
}

/** Ordem manual do app (porManual em seriesLista.ts): ordem_episodio, depois criação, depois id. */
export function ordenarManual<T extends {id: string; createdAt: string; ordemEpisodio?: number | null}>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) =>
    compararOrdemEpisodio(a, b) || (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id));
}

/** Episódios ativos da série e dos quadros (episodiosDaPagina): sem arquivados nem lixeira. */
export function episodiosDaSerie<T extends EpisodioMcp>(serieId: string, series: readonly SerieNoMcp[], contents: readonly T[]): T[] {
  const subarvore = idsDaSubarvore(serieId, series);
  const vistos = new Set<string>();
  return contents.filter(content => {
    if (content.deletedAt || content.archivedAt || !content.seriesId || !subarvore.has(content.seriesId)) return false;
    if (vistos.has(content.id)) return false;
    vistos.add(content.id);
    return true;
  });
}

/** Destinos de "Definir quadro" (destinosDeQuadro): a própria série (sem quadro) e os quadros ativos dela. */
export function destinosDeQuadro(serieId: string, series: readonly SerieNoMcp[]): string[] {
  const ativos = filhosDaSerie(serieId, series)
    .filter(filho => series.find(item => item.id === filho.id)?.ativa !== false)
    .map(filho => filho.id);
  return [serieId, ...ativos];
}

/** Temporadas válidas para todos os episódios (temporadasComuns). */
export function temporadasComuns(
  episodios: readonly Pick<EpisodioMcp, 'seriesId'>[],
  series: readonly SerieNoMcp[],
  temporadas: readonly Temporada[],
): Temporada[] {
  let comuns: Temporada[] | null = null;
  for (const content of episodios) {
    const escopo = content.seriesId ? escopoDe(content.seriesId, series) : null;
    if (!escopo) return [];
    const doEscopo = temporadasDoEscopo(escopo.id, temporadas);
    comuns = comuns === null ? doEscopo : comuns.filter(item => doEscopo.some(outra => outra.id === item.id));
    if (comuns.length === 0) return [];
  }
  return comuns ?? [];
}

export type DestinoTemporada = 'manter' | 'nenhuma' | string;

/**
 * Espelho de moverConteudo (seriesGrupos.ts): muda o quadro, mantém a temporada só se ela
 * continua valendo no destino, e recalcula só pilar e objetivo herdados (aplicarEscolhasDaSerie).
 * Escolha manual e conteúdo congelado (publicado) não mudam.
 */
export function moverEpisodio(
  content: EpisodioMcp,
  destino: {serieId?: string | null; temporada: DestinoTemporada},
  series: readonly SerieNoMcp[],
  temporadas: readonly Temporada[],
): EpisodioMcp {
  const serieId = destino.serieId ?? content.seriesId ?? null;
  const pedida = destino.temporada === 'manter'
    ? content.temporadaId ?? null
    : destino.temporada === 'nenhuma' ? null : destino.temporada;
  const temporadaId = pedida && serieId && temporadaNoEscopo(pedida, serieId, series, temporadas) ? pedida : null;
  const trocaDeSerie = serieId !== (content.seriesId ?? null);
  const comSerie = trocaDeSerie ? aplicarEscolhasDaSerie(content, serieId, series) : content;
  return {...comSerie, seriesId: serieId, temporadaId};
}

/** Item de p_itens igual ao de moverEpisodios em src/lib/database.ts. */
export function itemDoRpc(content: EpisodioMcp) {
  return {
    id: content.id,
    series_id: content.seriesId ?? null,
    temporada_id: content.temporadaId ?? null,
    pilar_id: content.pilarId ?? null,
    pilar_origem: content.pilarOrigem ?? null,
    funcao: content.funcao ?? null,
    funcao_origem: content.funcaoOrigem ?? null,
  };
}

/** Ordem final da série depois de mover: quem muda vai para o fim, na ordem em que já estava (ordemFinalNoFim). */
export function ordemFinalNoFim(escopo: readonly EpisodioMcp[], movidos: ReadonlySet<string>): string[] {
  const ordenado = ordenarManual(escopo);
  return [...ordenado.filter(item => !movidos.has(item.id)), ...ordenado.filter(item => movidos.has(item.id))].map(item => item.id);
}

/**
 * Nova ordem pedida. `ordem` com todos os episódios da série é usada como veio;
 * com só alguns, eles ocupam, nessa sequência, as posições que já tinham entre si
 * (os outros não saem do lugar). Devolve erro em texto quando há id estranho ou repetido.
 */
export function novaOrdem(
  escopo: readonly EpisodioMcp[],
  pedida: readonly string[],
): {ordem: string[]} | {erro: string} {
  const atual = ordenarManual(escopo).map(item => item.id);
  const noEscopo = new Set(atual);
  const repetidos = pedida.filter((id, index) => pedida.indexOf(id) !== index);
  if (repetidos.length) return {erro: `Episódio repetido na ordem: ${[...new Set(repetidos)].join(', ')}`};
  const fora = pedida.filter(id => !noEscopo.has(id));
  if (fora.length) return {erro: `Fora dos episódios ativos desta série: ${fora.join(', ')}`};
  const pedidos = new Set(pedida);
  const posicoes = atual.map((id, index) => (pedidos.has(id) ? index : -1)).filter(index => index >= 0);
  const ordem = [...atual];
  posicoes.forEach((posicao, i) => {
    ordem[posicao] = pedida[i];
  });
  return {ordem};
}

export type PlanoMover = {
  mudam: EpisodioMcp[];
  jaNoDestino: string[];
  perdemTemporada: string[];
};

/**
 * Plano de "Definir quadro" / "Definir temporada" (planoDefinirQuadro e planoDefinirTemporada).
 * quadroId undefined = não mexe no quadro. temporada 'manter' = não mexe na temporada.
 */
export function planoMover(
  episodios: readonly EpisodioMcp[],
  destino: {quadroId?: string; temporada: DestinoTemporada},
  series: readonly SerieNoMcp[],
  temporadas: readonly Temporada[],
): PlanoMover {
  const plano: PlanoMover = {mudam: [], jaNoDestino: [], perdemTemporada: []};
  for (const content of episodios) {
    const movido = moverEpisodio(content, {serieId: destino.quadroId, temporada: destino.temporada}, series, temporadas);
    const mudou = movido.seriesId !== content.seriesId || (movido.temporadaId ?? null) !== (content.temporadaId ?? null);
    if (!mudou) {
      plano.jaNoDestino.push(content.id);
      continue;
    }
    plano.mudam.push(movido);
    if (content.temporadaId && !movido.temporadaId && destino.temporada === 'manter') plano.perdemTemporada.push(content.id);
  }
  return plano;
}

/** Árvore de uma raiz para a estrutura editorial: quadros dentro da série, séries dentro da família. */
export function arvore<T>(raizId: string, series: readonly SerieNoMcp[], visitar: (id: string, filhos: T[]) => T): T {
  const vistos = new Set<string>();
  const descer = (id: string): T => {
    vistos.add(id);
    const filhos = filhosDaSerie(id, series).filter(filho => !vistos.has(filho.id)).map(filho => descer(filho.id));
    return visitar(id, filhos);
  };
  return descer(raizId);
}
