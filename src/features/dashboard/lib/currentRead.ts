const ACTIVE_READING = new Set(['Lendo', 'Consumindo', 'Assistindo']);

export function resolveCurrentRead<T extends { id: string; tipo: string; status: string; deletedAt?: string | null }>(
  items: T[],
  preferredId: string | null,
): T | null {
  const visible = items.filter(item => !item.deletedAt);
  if (preferredId) {
    const pinned = visible.find(item => item.id === preferredId);
    if (pinned) return pinned;
  }

  const active = visible.filter(item => ACTIVE_READING.has(item.status));
  return (
    active.find(item => item.tipo === 'livro')
    ?? active.find(item => item.tipo === 'manga')
    ?? active[0]
    ?? null
  );
}
