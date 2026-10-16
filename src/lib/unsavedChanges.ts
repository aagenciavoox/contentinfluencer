/**
 * Registro global de editores com alterações ainda não salvas.
 * Usado para não recarregar o app (nova versão) por cima de um rascunho.
 */
export type FlushUnsaved = () => void | Promise<unknown>;

type Entry = { flush?: FlushUnsaved };

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach(listener => listener());
}

/** Marca (ou desmarca) um editor como sujo. `flush` grava o que estiver pendente. */
export function setUnsavedChanges(id: string, dirty: boolean, flush?: FlushUnsaved): void {
  const had = entries.has(id);
  if (dirty) {
    entries.set(id, { flush });
    if (!had) emit();
  } else if (had) {
    entries.delete(id);
    emit();
  }
}

export function clearUnsavedChanges(id: string): void {
  setUnsavedChanges(id, false);
}

export function hasUnsavedChanges(): boolean {
  return entries.size > 0;
}

export function unsavedChangesCount(): number {
  return entries.size;
}

export function subscribeUnsavedChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Grava tudo que estiver pendente. Erros de um editor não impedem os outros. */
export async function flushUnsavedChanges(): Promise<void> {
  const flushes = [...entries.values()].map(entry => entry.flush).filter(Boolean) as FlushUnsaved[];
  await Promise.allSettled(flushes.map(flush => Promise.resolve().then(flush)));
}

/** Só para testes. */
export function resetUnsavedChangesForTests(): void {
  entries.clear();
  listeners.clear();
}