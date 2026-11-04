import { useEffect, useState } from 'react';
import { emptyIdeaDraft, ideaDraftKey, readIdeaDraft, writeIdeaDraft, type TodayIdeaDraft } from '../lib/ideaDraft';

function storage() { try { return window.localStorage; } catch { return null; } }

export function useTodayIdeaDraft(userId: string) {
  const key = ideaDraftKey(userId);
  const [saved, setSaved] = useState(() => ({ key, draft: readIdeaDraft(storage(), key) }));
  useEffect(() => {
    setSaved(previous => previous.key === key ? previous : { key, draft: readIdeaDraft(storage(), key) });
  }, [key]);
  const draft = saved.key === key ? saved.draft : emptyIdeaDraft();
  const updateDraft = (next: TodayIdeaDraft) => {
    writeIdeaDraft(storage(), key, next);
    setSaved({ key, draft: next });
  };
  const clearDraft = () => {
    // Uma gravação iniciada antes de sair da tela não apaga um novo rascunho feito ao voltar.
    if (JSON.stringify(readIdeaDraft(storage(), key)) === JSON.stringify(draft)) {
      writeIdeaDraft(storage(), key, emptyIdeaDraft());
    }
    setSaved({ key, draft: emptyIdeaDraft() });
  };
  return { draft, updateDraft, clearDraft };
}
