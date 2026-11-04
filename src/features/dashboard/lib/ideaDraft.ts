export type TodayIdeaDraft = { title: string; notes: string; pilarId: string; seriesId: string; originId: string };
export const emptyIdeaDraft = (): TodayIdeaDraft => ({ title: '', notes: '', pilarId: '', seriesId: '', originId: '' });
export const ideaDraftKey = (userId: string) => `criaki.today-idea:${userId}`;

export function readIdeaDraft(storage: Pick<Storage, 'getItem'> | null, key: string): TodayIdeaDraft {
  try {
    const raw: unknown = JSON.parse(storage?.getItem(key) || 'null');
    if (!raw || typeof raw !== 'object') return emptyIdeaDraft();
    const fields = raw as Record<string, unknown>;
    return Object.fromEntries(Object.keys(emptyIdeaDraft()).map(field => [field, typeof fields[field] === 'string' ? fields[field] : ''])) as TodayIdeaDraft;
  } catch { return emptyIdeaDraft(); }
}

export function writeIdeaDraft(storage: Pick<Storage, 'setItem' | 'removeItem'> | null, key: string, draft: TodayIdeaDraft) {
  try {
    if (Object.values(draft).some(Boolean)) storage?.setItem(key, JSON.stringify(draft));
    else storage?.removeItem(key);
  } catch { /* O formulário continua disponível quando o armazenamento local está bloqueado. */ }
}
