import { Text } from './Text';
import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { AppButton } from './AppButton';
import {
  applyAppUpdate,
  isAppUpdateApplying,
  isAppUpdateAvailable,
  subscribeAppUpdate,
} from '../../lib/appUpdate';

/** Aviso persistente de nova versão. Slot próprio, acima do toast de salvamento. */
export function AppUpdateToast() {
  const [, setTick] = useState(0);
  useEffect(() => subscribeAppUpdate(() => setTick(tick => tick + 1)), []);

  if (!isAppUpdateAvailable()) return null;
  const applying = isAppUpdateApplying();

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+10rem)] z-[209] flex justify-center px-4 lg:bottom-28 lg:justify-end lg:pr-6"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-2.5 text-[var(--text-primary)] shadow-none backdrop-blur-md">
        <RefreshCw className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
        <Text variant="itemTitle" as="p" className="text-inherit">Nova versão disponível</Text>
        <AppButton
          type="button"
          variant="ghost"
          size="xs"
          disabled={applying}
          onClick={() => void applyAppUpdate()}
        >
          {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {applying ? 'Salvando…' : 'Atualizar'}
        </AppButton>
      </div>
    </div>
  );
}