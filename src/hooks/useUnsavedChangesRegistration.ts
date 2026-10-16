import { useEffect, useId, useRef } from 'react';
import { setUnsavedChanges, type FlushUnsaved } from '../lib/unsavedChanges';

/** Registra o editor como "sujo" no registro global enquanto houver alterações pendentes. */
export function useUnsavedChangesRegistration(dirty: boolean, flush?: FlushUnsaved): void {
  const id = useId();
  const flushRef = useRef(flush);
  flushRef.current = flush;

  useEffect(() => {
    setUnsavedChanges(id, dirty, () => flushRef.current?.());
  }, [id, dirty]);

  useEffect(() => () => setUnsavedChanges(id, false), [id]);
}