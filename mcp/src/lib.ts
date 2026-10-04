import {randomUUID} from 'node:crypto';
import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {livrosDoConteudo} from './editorial.ts';
import {getSession, type Session} from './supabase.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export const CONTENT_STATUSES = ['Ideia', 'Roteiro', 'Produção', 'Postado'] as const;
export type ContentStatus = typeof CONTENT_STATUSES[number];

const LEGACY_STATUS: Record<string, ContentStatus> = {
  'Pronto para Gravar': 'Produção',
  Gravado: 'Produção',
  'A Editar': 'Produção',
  Editado: 'Produção',
  Programado: 'Produção',
};

export function normalizeStatus(status: string | null | undefined): string {
  if (!status) return 'Roteiro';
  return LEGACY_STATUS[status] ?? status;
}

export function newId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function json(data: unknown): CallToolResult {
  return {content: [{type: 'text', text: JSON.stringify(data, null, 2)}]};
}

export function fail(message: string): CallToolResult {
  return {content: [{type: 'text', text: message}], isError: true};
}

/** Envolve a ferramenta com login e transforma exceções em erro legível para o modelo. */
export function tool<A>(handler: (args: A, session: Session) => Promise<CallToolResult>) {
  return async (args: A): Promise<CallToolResult> => {
    try {
      return await handler(args, await getSession());
    } catch (error) {
      return fail(error instanceof Error ? error.message : String(error));
    }
  };
}

export function check<T>(label: string, result: {data: T; error: {message?: string} | null}): T {
  if (result.error) throw new Error(`${label}: ${result.error.message ?? 'erro desconhecido no banco'}`);
  return result.data;
}

/** Coluna que o PostgREST ou o Postgres ainda não conhece. */
export function columnAbsence(error: {message?: string} | null): {column: string; table: string | null} | null {
  const message = error?.message ?? '';
  const schema = message.match(/'([a-z_]+)' column of '([a-z_]+)'/);
  if (schema) return {column: schema[1], table: schema[2]};
  const qualified = message.match(/column "?([a-z_]+)\.([a-z_]+)"? does not exist/i);
  if (qualified) return {column: qualified[2], table: qualified[1]};
  const quoted = message.match(/'([a-z_]+)' column/);
  if (quoted) return {column: quoted[1], table: null};
  const bare = message.match(/column "?([a-z_]+)"? does not exist/i);
  if (bare) return {column: bare[1], table: null};
  return null;
}

function stripListToken(list: string, column: string): string {
  return list
    .split(',')
    .map(part => part.trim())
    .filter(part => part && part !== column)
    .join(', ');
}

/** Tira uma coluna do select. Se a tabela for um embed, só mexe dentro dos parênteses dela. */
export function stripSelectColumn(select: string, column: string, table: string | null): string {
  if (table) {
    const match = select.match(new RegExp(`\\b${table}(?:![a-z]+)?\\(([^()]*)\\)`));
    if (match && match.index !== undefined) {
      const inner = stripListToken(match[1], column);
      const full = match[0];
      const replaced = full.replace(match[1], inner);
      return select.slice(0, match.index) + replaced + select.slice(match.index + full.length);
    }
  }
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of select) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts
    .map(part => part.trim())
    .filter(part => part && part !== column)
    .join(', ');
}

/**
 * O banco em produção pode estar atrás das migrations do repositório.
 * Remove do payload as colunas que o PostgREST ainda não conhece e tenta de novo.
 * Devolve os nomes que ficaram de fora.
 */
export async function writeCompat(
  label: string,
  payload: Row,
  run: (row: Row) => PromiseLike<{data?: unknown; error: {message?: string} | null}>,
): Promise<string[]> {
  let row = {...payload};
  const dropped: string[] = [];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const {error} = await run(row);
    if (!error) return dropped;
    const missing = columnAbsence(error);
    if (missing && missing.column in row && !dropped.includes(missing.column)) {
      const {[missing.column]: _dropped, ...rest} = row;
      row = rest;
      dropped.push(missing.column);
      continue;
    }
    throw new Error(`${label}: ${error.message}`);
  }
  throw new Error(`${label}: muitas colunas ausentes no banco`);
}

type QueryResult<T> = {data: T; error: {message?: string} | null; count?: number | null};

/**
 * Select com as colunas da fase 1. Se o banco não tiver uma delas, repete sem ela
 * para a lista e o detalhe continuarem abrindo.
 */
export async function readCompat<T>(
  label: string,
  columns: string,
  run: (columns: string) => PromiseLike<QueryResult<T>>,
): Promise<{data: T; count: number | null; omitidas: string[]}> {
  let current = columns;
  const omitidas: string[] = [];
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await run(current);
    if (!result.error) return {data: result.data, count: result.count ?? null, omitidas};
    const missing = columnAbsence(result.error);
    if (!missing || omitidas.includes(`${missing.table ?? ''}.${missing.column}`)) {
      throw new Error(`${label}: ${result.error.message ?? 'erro desconhecido no banco'}`);
    }
    const next = stripSelectColumn(current, missing.column, missing.table);
    if (next === current) throw new Error(`${label}: ${result.error.message ?? 'erro desconhecido no banco'}`);
    omitidas.push(`${missing.table ?? ''}.${missing.column}`);
    current = next;
  }
  throw new Error(`${label}: muitas colunas ausentes no banco`);
}

// ---------------------------------------------------------------------------
// Texto do roteiro: o editor do app grava HTML (TipTap).
// ---------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {'&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'", '&nbsp;': ' '};

export function htmlToText(html: string | null | undefined): string {
  const value = html?.trim();
  if (!value) return '';
  return value
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|blockquote)>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|nbsp|#0?39);/g, entity => ENTITIES[entity] ?? entity)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Texto simples vira parágrafos; HTML recebido é mantido como está. */
export function textToHtml(value: string): string {
  const normalized = value.trim();
  if (!normalized) return '';
  if (/<([a-z][\w-]*)(?:\s[^>]*)?>/i.test(normalized)) return normalized;
  return normalized
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// ---------------------------------------------------------------------------
// Nomes de pilares, séries e plataformas para respostas legíveis.
// ---------------------------------------------------------------------------

export interface Lookups {
  platforms: Row[];
  pilares: Row[];
  series: Row[];
  platformName: (id: string) => string;
  pilarName: (id: string | null) => string | null;
  serieName: (id: string | null) => string | null;
}

let lookupsCache: {at: number; value: Lookups} | null = null;
const LOOKUPS_TTL_MS = 60_000;

export function invalidateLookups() {
  lookupsCache = null;
}

export async function loadLookups(session: Session): Promise<Lookups> {
  if (lookupsCache && Date.now() - lookupsCache.at < LOOKUPS_TTL_MS) return lookupsCache.value;
  const {client, userId} = session;
  const [platforms, pilares, series] = await Promise.all([
    client.from('platforms').select('*').or(`user_id.is.null,user_id.eq.${userId}`).order('nome'),
    client.from('pilares').select('*, pilar_plataformas(*)').eq('user_id', userId).is('deleted_at', null).order('nome'),
    client.from('series').select('*, serie_pilares(pilar_id), serie_plataformas(*)').eq('user_id', userId).is('deleted_at', null).order('name'),
  ]);
  const value: Lookups = {
    platforms: check('plataformas', platforms) ?? [],
    pilares: check('pilares', pilares) ?? [],
    series: check('séries', series) ?? [],
    platformName: id => value.platforms.find(p => p.id === id)?.nome ?? id,
    pilarName: id => (id ? value.pilares.find(p => p.id === id)?.nome ?? id : null),
    serieName: id => (id ? value.series.find(s => s.id === id)?.name ?? id : null),
  };
  lookupsCache = {at: Date.now(), value};
  return value;
}

function fold(value: string): string {
  return value.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function resolveRef(rows: Row[], ref: string, nameKey: string, label: string): string {
  const byId = rows.find(row => row.id === ref);
  if (byId) return byId.id;
  const byName = rows.filter(row => fold(String(row[nameKey] ?? '')) === fold(ref));
  if (byName.length === 1) return byName[0].id;
  const options = rows.map(row => row[nameKey]).join(', ') || 'nenhum cadastrado';
  throw new Error(`${label} "${ref}" não encontrado. Opções: ${options}`);
}

/** Aceita id ou nome (sem diferenciar acentos e maiúsculas). */
export function resolvePilar(lookups: Lookups, ref: string | null | undefined): string | null | undefined {
  if (ref === undefined || ref === null) return ref;
  return ref === '' ? null : resolveRef(lookups.pilares, ref, 'nome', 'Pilar');
}

export function resolveSerie(lookups: Lookups, ref: string | null | undefined): string | null | undefined {
  if (ref === undefined || ref === null) return ref;
  return ref === '' ? null : resolveRef(lookups.series, ref, 'name', 'Série');
}

export function resolvePlatform(lookups: Lookups, ref: string): string {
  return resolveRef(lookups.platforms.filter(p => p.ativo !== false), ref, 'nome', 'Plataforma');
}

// ---------------------------------------------------------------------------
// Função editorial (substituiu o funil topo/meio/fundo).
// Espelha src/features/editorial/lib/funcoes.ts do app.
// ---------------------------------------------------------------------------

export const FUNCOES = ['atrair', 'converter', 'aprofundar', 'comunidade', 'acao', 'reter'] as const;
export type Funcao = typeof FUNCOES[number];

export const FUNCAO_LABELS: Record<Funcao, string> = {
  atrair: 'Atrair alcance',
  converter: 'Converter em seguidor',
  aprofundar: 'Aprofundar',
  comunidade: 'Gerar comunidade',
  acao: 'Levar à ação',
  reter: 'Reter',
};

export const FUNIL_DA_FUNCAO: Record<Funcao, 'topo' | 'meio' | 'fundo' | null> = {
  atrair: 'topo',
  converter: 'topo',
  aprofundar: 'meio',
  comunidade: 'meio',
  acao: 'fundo',
  reter: null,
};

export function isFuncao(value: unknown): value is Funcao {
  return typeof value === 'string' && (FUNCOES as readonly string[]).includes(value);
}

/** Só uma função concreta é herdável; `varia` e vazio não passam valor ao roteiro. */
export function funcaoHerdavel(serie: Row | null | undefined): Funcao | null {
  return isFuncao(serie?.funcao_padrao) ? serie.funcao_padrao : null;
}

/** Stories, Live e a função reter ficam fora da grade por padrão. */
export function contaNaGradePadrao(formato: string | null | undefined, funcao: Funcao | null | undefined): boolean {
  if (funcao === 'reter') return false;
  return !['stories', 'story', 'live'].includes(fold(formato ?? ''));
}

/**
 * Função efetiva. Enquanto não congela (ao postar), origem `herdada` lê a série;
 * congelada, vale o valor copiado no conteúdo.
 */
export function funcaoEfetiva(row: Row, lookups: Lookups) {
  const congelada = Boolean(row.classificacao_congelada_em);
  const stored = isFuncao(row.funcao) ? row.funcao : null;
  const origem: string = row.funcao_origem ?? (stored ? 'escolhida' : 'indefinida');
  let funcao: Funcao | null = stored;
  if (!congelada && origem === 'herdada') {
    funcao = funcaoHerdavel(lookups.series.find(s => s.id === row.series_id));
  } else if (origem === 'nenhuma' || origem === 'indefinida') {
    funcao = null;
  }
  return {
    funcao,
    funcao_rotulo: funcao ? FUNCAO_LABELS[funcao] : null,
    etapa_funil: funcao ? FUNIL_DA_FUNCAO[funcao] ?? 'fora' : null,
    funcao_origem: origem,
    classificacao_congelada: congelada,
  };
}

// ---------------------------------------------------------------------------
// Formato de saída dos conteúdos
// ---------------------------------------------------------------------------

export const CONTENT_LIST_COLUMNS = [
  'id', 'title', 'status', 'series_id', 'pilar_id', 'formato_visual', 'energia_necessaria',
  'funcao', 'funcao_origem', 'classificacao_congelada_em', 'conta_na_grade',
  'legenda_base', 'link',
  'publish_date', 'publish_time', 'recording_date', 'recorded_at', 'posted_at', 'tags',
  'biblioteca_item_id', 'livro_ids', 'archived_at', 'deleted_at', 'created_at', 'updated_at',
  'content_plataformas(id, platform_id, publish_date, publish_time, publication_kind, status, post_url, post_codigo, legenda_propria, conta_na_grade)',
].join(', ');

export function displayStatus(row: Row): string {
  const status = normalizeStatus(row.status);
  if (status === 'Postado' || row.posted_at) return 'Postado';
  if (row.publish_date && row.publish_date > new Date().toISOString().slice(0, 10)) return 'Programado';
  return status;
}

export function contentSummary(row: Row, lookups: Lookups) {
  return {
    id: row.id,
    titulo: row.title,
    status: normalizeStatus(row.status),
    status_exibido: displayStatus(row),
    pilar: lookups.pilarName(row.pilar_id),
    serie: lookups.serieName(row.series_id),
    formato: row.formato_visual ?? null,
    ...funcaoEfetiva(row, lookups),
    conta_na_grade: row.conta_na_grade !== false,
    legenda_base: row.legenda_base ?? null,
    data_publicacao: row.publish_date ?? null,
    hora_publicacao: row.publish_time ?? null,
    data_gravacao: row.recording_date ?? null,
    gravado_em: row.recorded_at ?? null,
    postado_em: row.posted_at ?? null,
    tags: row.tags ?? [],
    biblioteca_item_id: row.biblioteca_item_id ?? null,
    livro_ids: livrosDoConteudo(row),
    arquivado: Boolean(row.archived_at),
    na_lixeira: Boolean(row.deleted_at),
    plataformas: (row.content_plataformas ?? []).map((p: Row) => ({
      plataforma: lookups.platformName(p.platform_id),
      data: p.publish_date ?? null,
      hora: p.publish_time ?? null,
      tipo: p.publication_kind ?? 'post',
      status: p.status ?? null,
      conta_na_grade: p.conta_na_grade === false ? false : true,
      link_do_post: p.post_url ?? null,
    })),
    atualizado_em: row.updated_at,
  };
}
