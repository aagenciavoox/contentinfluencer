// Avisa quem estiver ouvindo que o app gravou numa tabela. O aviso entre abas e aparelhos
// (Broadcast, em AppContext) sai daqui: assim nenhuma gravação precisa lembrar de avisar.

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

type TableWriteListener = (table: string) => void;

const listeners = new Set<TableWriteListener>();

export function onTableWrite(listener: TableWriteListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyTableWrite(table: string): void {
  listeners.forEach(listener => {
    try {
      listener(table);
    } catch (error) {
      console.error('[sync] aviso de gravação não saiu:', error);
    }
  });
}
