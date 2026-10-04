/**
 * Contrato da fase 1 no MCP.
 * As telas de vários livros e do aviso de evento ficam nos outros pull requests;
 * aqui o servidor lê e grava as colunas do modelo desta branch.
 */

export const MIGRACAO_FUNCOES = 'supabase/migrations/20261004100000_funcoes_editoriais.sql';
export const MIGRACAO_PUBLICACOES = 'supabase/migrations/20261004110000_publicacoes.sql';

export const FUNCOES = ['atrair', 'converter', 'aprofundar', 'comunidade', 'acao', 'reter'] as const;
export type FuncaoEditorial = (typeof FUNCOES)[number];

export const FUNCAO_ORIGENS = ['herdada', 'escolhida', 'nenhuma', 'aplicada', 'migrada'] as const;
export type FuncaoOrigem = (typeof FUNCAO_ORIGENS)[number];

export const PUBLICACAO_STATUS = ['agendada', 'publicada', 'nao_publicada', 'removida'] as const;
export type PublicacaoStatus = (typeof PUBLICACAO_STATUS)[number];

export const TIPOS_PROJETO = ['evento', 'publi', 'producao', 'outro', 'campanha'] as const;

const ORIGENS = new Set<string>(FUNCAO_ORIGENS);

export function isFuncao(value: unknown): value is FuncaoEditorial {
  return typeof value === 'string' && (FUNCOES as readonly string[]).includes(value);
}

export function isOrigem(value: unknown): value is FuncaoOrigem {
  return typeof value === 'string' && ORIGENS.has(value);
}

/** Função da série que um roteiro pode herdar. `varia` e vazio não herdam valor. */
export function funcaoHerdavel(serie: {funcao_padrao?: string | null} | null | undefined): FuncaoEditorial | null {
  return isFuncao(serie?.funcao_padrao) ? serie.funcao_padrao : null;
}

export type FuncaoResolvida = {
  funcao: FuncaoEditorial | null;
  origem: FuncaoOrigem | 'indefinida';
  congelada: boolean;
};

/** Enquanto não congela, origem `herdada` lê a série. Congelada, fica o valor copiado. */
export function resolveFuncao(
  content: {funcao?: string | null; funcao_origem?: string | null; classificacao_congelada_em?: string | null},
  serie?: {funcao_padrao?: string | null} | null,
): FuncaoResolvida {
  const congelada = Boolean(content.classificacao_congelada_em);
  const stored = isFuncao(content.funcao) ? content.funcao : null;
  const origem = isOrigem(content.funcao_origem) ? content.funcao_origem : stored ? 'escolhida' : 'indefinida';

  if (congelada) {
    return {funcao: origem === 'nenhuma' ? null : stored, origem, congelada: true};
  }
  if (origem === 'herdada') {
    return {funcao: funcaoHerdavel(serie), origem, congelada: false};
  }
  if (origem === 'nenhuma' || origem === 'indefinida') {
    return {funcao: null, origem, congelada: false};
  }
  return {funcao: stored, origem, congelada: false};
}

/** Stories, Live e a função reter ficam fora da grade por padrão. */
export function contaNaGradePadrao(
  formato: string | null | undefined,
  funcao: FuncaoEditorial | null | undefined,
): boolean {
  if (funcao === 'reter') return false;
  const normalized = (formato ?? '').trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  return !['stories', 'story', 'live'].includes(normalized);
}

export function livrosDoConteudo(row: {livro_ids?: unknown; biblioteca_item_id?: string | null}): string[] {
  const fromList = Array.isArray(row.livro_ids)
    ? row.livro_ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).map(id => id.trim())
    : [];
  const unique = [...new Set(fromList)];
  if (unique.length > 0) return unique;
  const single = row.biblioteca_item_id?.trim();
  return single ? [single] : [];
}

/** Lista explícita + origem antiga. A origem antiga entra na frente se ainda não estiver na lista. */
export function unirLivros(livroIds: string[] | undefined, bibliotecaItemId: string | null | undefined): string[] {
  const list = [...new Set((livroIds ?? []).map(id => id.trim()).filter(Boolean))];
  const single = bibliotecaItemId?.trim() || null;
  if (single && !list.includes(single)) list.unshift(single);
  return list;
}

/**
 * Origem escolhida, aplicada ou migrada exige função.
 * Herdada e nenhuma guardam a função vazia: o valor efetivo vem da série, ou não há função.
 */
export function gravarFuncao(input: {
  funcao?: FuncaoEditorial | null;
  funcao_origem?: FuncaoOrigem | null;
  serie?: {funcao_padrao?: string | null} | null;
}): {funcao: FuncaoEditorial | null; funcao_origem: FuncaoOrigem | null; efetiva: FuncaoEditorial | null} {
  let origem = input.funcao_origem === undefined
    ? (input.funcao ? 'escolhida' : funcaoHerdavel(input.serie) ? 'herdada' : null)
    : input.funcao_origem;
  let funcao = input.funcao === undefined ? null : input.funcao;

  if (origem === 'herdada' || origem === 'nenhuma') funcao = null;
  if ((origem === 'escolhida' || origem === 'aplicada' || origem === 'migrada') && !funcao) {
    throw new Error('Essa origem precisa de uma função: atrair, converter, aprofundar, comunidade, acao ou reter.');
  }
  if (!origem && funcao) origem = 'escolhida';

  const efetiva = origem === 'herdada' ? funcaoHerdavel(input.serie) : funcao;
  return {funcao, funcao_origem: origem, efetiva};
}

/** Código do post a partir da URL. Links curtos do TikTok não têm código. */
export function parsePostCode(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
  const path = parsed.pathname;
  if (host === 'vm.tiktok.com') return null;
  if (host === 'instagram.com' || host.endsWith('.instagram.com')) {
    return path.match(/\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i)?.[1] ?? null;
  }
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    return path.match(/\/@[^/]+\/video\/(\d+)/)?.[1] ?? null;
  }
  return null;
}

export function dataMaisAntiga(values: Array<string | null | undefined>): string | null {
  let best: {time: number; value: string} | null = null;
  for (const value of values) {
    if (!value) continue;
    const time = Date.parse(value);
    if (Number.isNaN(time)) continue;
    if (!best || time < best.time) best = {time, value};
  }
  return best?.value ?? null;
}

/**
 * Primeira publicação congela a classificação.
 * Origem herdada copia a função da série. Origem escolhida não é sobrescrita.
 * Uma segunda publicação não congela de novo.
 */
export function patchPrimeiraPublicacao(
  content: {
    funcao?: string | null;
    funcao_origem?: string | null;
    classificacao_congelada_em?: string | null;
    posted_at?: string | null;
    link?: string | null;
  },
  serie: {funcao_padrao?: string | null} | null | undefined,
  now: string,
  realizadas: Array<string | null | undefined>,
  postUrl: string | null,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    status: 'Postado',
    posted_at: dataMaisAntiga(realizadas) ?? content.posted_at ?? now,
  };
  if (!content.link && postUrl) patch.link = postUrl;
  if (!content.classificacao_congelada_em) {
    patch.classificacao_congelada_em = now;
    if (content.funcao_origem === 'herdada') patch.funcao = funcaoHerdavel(serie);
  }
  return patch;
}

export function migracaoDaColuna(
  coluna: string,
  tabela: 'contents' | 'content_plataformas' | 'projetos' | 'series',
): string | null {
  if (tabela === 'projetos') return coluna === 'aviso_dias' ? MIGRACAO_PUBLICACOES : null;
  if (tabela === 'content_plataformas') return MIGRACAO_PUBLICACOES;
  if (coluna === 'funcao_padrao' || coluna === 'formato_apresentacao' || coluna === 'energia_padrao' || coluna === 'motivo_salvar' || coluna === 'motivo_enviar' || coluna === 'pilar_principal_id') {
    return MIGRACAO_FUNCOES;
  }
  if (
    coluna === 'funcao' ||
    coluna === 'funcao_origem' ||
    coluna === 'classificacao_congelada_em' ||
    coluna === 'conta_na_grade' ||
    coluna === 'legenda_base' ||
    coluna === 'livro_ids'
  ) {
    return tabela === 'contents' || tabela === 'series' ? MIGRACAO_FUNCOES : MIGRACAO_PUBLICACOES;
  }
  if (
    coluna === 'status' ||
    coluna === 'realizada_manual_em' ||
    coluna === 'realizada_api_em' ||
    coluna === 'post_codigo' ||
    coluna === 'post_url' ||
    coluna === 'legenda_propria' ||
    coluna === 'updated_at' ||
    coluna === 'aviso_dias'
  ) {
    return MIGRACAO_PUBLICACOES;
  }
  return null;
}

export function descreverColunasOmitidas(
  colunas: string[],
  tabela: 'contents' | 'content_plataformas' | 'projetos' | 'series',
): Array<{coluna: string; migration: string | null}> {
  return colunas.map(coluna => ({coluna, migration: migracaoDaColuna(coluna, tabela)}));
}
