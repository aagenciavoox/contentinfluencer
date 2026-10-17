import type {SupabaseClient} from '@supabase/supabase-js';

// Avisa o app aberto (abas e aparelhos) que o MCP gravou em tabelas, pelo mesmo canal de Broadcast
// que o app ouve (src/context/realtimeSync.ts: syncChannelName e SYNC_EVENT). O aviso não passa pelo banco.
export const SYNC_EVENT = 'tabelas-mudaram';

export function syncChannelName(userId: string): string {
  return `content-os-sync:${userId}`;
}

const REST_PATH = '/rest/v1/';
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

/** Tabela de uma gravação REST (insert, upsert, update, delete). Leituras e RPC ficam de fora. */
export function writtenTable(url: string, method: string): string | null {
  if (!WRITE_METHODS.has(method.toUpperCase())) return null;
  const start = url.indexOf(REST_PATH);
  if (start < 0) return null;
  const table = url.slice(start + REST_PATH.length).split(/[/?#]/)[0];
  if (!table || table === 'rpc') return null;
  return table;
}

const pendentes = new Set<string>();

/** fetch do cliente Supabase do MCP: anota as tabelas das gravações que deram certo. */
export const fetchQueAnotaGravacoes: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  const table = writtenTable(url, method);
  if (table && response.ok) pendentes.add(table);
  return response;
};

type ClienteDeAviso = Pick<SupabaseClient, 'channel' | 'removeChannel'>;

/** Manda um aviso com as tabelas gravadas desde o último. Falha no aviso não derruba a ferramenta. */
export async function avisarGravacoes(client: ClienteDeAviso, userId: string): Promise<void> {
  if (pendentes.size === 0) return;
  const tables = [...pendentes];
  pendentes.clear();
  const channel = client.channel(syncChannelName(userId));
  try {
    await channel.httpSend(SYNC_EVENT, {tables});
  } catch (error) {
    console.error(`Aviso ao app não saiu: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await client.removeChannel(channel).catch(() => undefined);
  }
}
