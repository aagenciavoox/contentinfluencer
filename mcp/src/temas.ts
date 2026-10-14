/**
 * Temas de roteiro: catálogo em `temas`, vínculo em `content_temas`.
 * Nome novo é criado. A tabela pode ainda não existir no banco.
 */

import {
  chaveTema,
  normalizarNomeTema,
  resolverTemas,
  type TemaCatalogo,
} from './campos.ts';
import {newId, nowIso, type Row} from './lib.ts';
import type {Session} from './supabase.ts';

export function tabelaDeTemasAusente(error: {message?: string} | null | undefined): boolean {
  const message = error?.message?.toLowerCase() ?? '';
  if (!message) return false;
  const missing = message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('could not find');
  return missing && (message.includes('content_temas') || message.includes('temas'));
}

export async function carregarTemas(session: Session): Promise<{itens: TemaCatalogo[]; ausente: boolean}> {
  const result = await session.client
    .from('temas')
    .select('id, nome')
    .eq('user_id', session.userId)
    .order('nome');
  if (result.error) {
    if (tabelaDeTemasAusente(result.error)) return {itens: [], ausente: true};
    throw new Error(`temas: ${result.error.message}`);
  }
  return {
    ausente: false,
    itens: ((result.data ?? []) as Row[]).map(row => ({id: String(row.id), nome: String(row.nome ?? '')})),
  };
}

export function acharTema(itens: readonly TemaCatalogo[], ref: string): TemaCatalogo | null {
  const nome = normalizarNomeTema(ref);
  return itens.find(tema => tema.id === ref)
    ?? itens.find(tema => chaveTema(tema.nome) === chaveTema(nome))
    ?? null;
}

export async function temasDosConteudos(
  session: Session,
  contentIds: readonly string[],
): Promise<{porConteudo: Map<string, TemaCatalogo[]>; ausente: boolean}> {
  const porConteudo = new Map<string, TemaCatalogo[]>();
  if (contentIds.length === 0) return {porConteudo, ausente: false};

  const result = await session.client
    .from('content_temas')
    .select('content_id, temas(id, nome)')
    .in('content_id', [...contentIds]);
  if (result.error) {
    if (tabelaDeTemasAusente(result.error)) return {porConteudo, ausente: true};
    throw new Error(`content_temas: ${result.error.message}`);
  }

  for (const row of (result.data ?? []) as Row[]) {
    const tema = row.temas;
    if (!tema?.id) continue;
    const contentId = String(row.content_id);
    const lista = porConteudo.get(contentId) ?? [];
    lista.push({id: String(tema.id), nome: String(tema.nome ?? '')});
    porConteudo.set(contentId, lista);
  }
  return {porConteudo, ausente: false};
}

export async function anexarTemas(session: Session, rows: Row[]): Promise<{rows: Row[]; ausente: boolean}> {
  const {porConteudo, ausente} = await temasDosConteudos(session, rows.map(row => String(row.id)));
  if (ausente) return {rows, ausente};
  return {
    ausente: false,
    rows: rows.map(row => ({...row, temas: porConteudo.get(String(row.id)) ?? []})),
  };
}

/** Substitui os temas do roteiro. Devolve `ausente` se a migration ainda não rodou. */
export async function gravarTemasDoConteudo(
  session: Session,
  contentId: string,
  pedidos: readonly string[],
): Promise<{temas: TemaCatalogo[]; ausente: boolean}> {
  const catalogo = await carregarTemas(session);
  if (catalogo.ausente) return {temas: [], ausente: true};

  const {ids, criados} = resolverTemas(catalogo.itens, pedidos, newId);
  const now = nowIso();
  if (criados.length > 0) {
    const inserted = await session.client.from('temas').insert(criados.map(tema => ({
      id: tema.id,
      user_id: session.userId,
      nome: tema.nome,
      created_at: now,
      updated_at: now,
    })));
    if (inserted.error) {
      if (tabelaDeTemasAusente(inserted.error)) return {temas: [], ausente: true};
      throw new Error(`criar temas: ${inserted.error.message}`);
    }
  }

  const removed = await session.client.from('content_temas').delete().eq('content_id', contentId);
  if (removed.error) {
    if (tabelaDeTemasAusente(removed.error)) return {temas: [], ausente: true};
    throw new Error(`content_temas: ${removed.error.message}`);
  }
  if (ids.length > 0) {
    const linked = await session.client.from('content_temas').insert(
      ids.map(temaId => ({content_id: contentId, tema_id: temaId})),
    );
    if (linked.error) throw new Error(`content_temas: ${linked.error.message}`);
  }

  const porId = new Map([...catalogo.itens, ...criados].map(tema => [tema.id, tema]));
  return {temas: ids.map(id => porId.get(id)).filter((tema): tema is TemaCatalogo => Boolean(tema)), ausente: false};
}

export async function idsComTema(session: Session, ref: string): Promise<{ids: string[]; ausente: boolean}> {
  const catalogo = await carregarTemas(session);
  if (catalogo.ausente) return {ids: [], ausente: true};
  const tema = acharTema(catalogo.itens, ref);
  if (!tema) return {ids: [], ausente: false};
  const links = await session.client.from('content_temas').select('content_id').eq('tema_id', tema.id);
  if (links.error) {
    if (tabelaDeTemasAusente(links.error)) return {ids: [], ausente: true};
    throw new Error(`roteiros do tema: ${links.error.message}`);
  }
  return {ids: [...new Set(((links.data ?? []) as Row[]).map(row => String(row.content_id)))], ausente: false};
}
