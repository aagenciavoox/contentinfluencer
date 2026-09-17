import {AppButton} from '../../../../components/ui/AppButton';
import {cn} from '../../../../lib/utils';

export type EditorSaveState = 'idle' | 'saving' | 'saved' | 'error';

interface DraftSaveBarProps {
  onSave: () => void;
  saveState?: EditorSaveState;
  hasUnsavedChanges?: boolean;
  className?: string;
}

export function DraftSaveBar({
  onSave,
  saveState = 'idle',
  hasUnsavedChanges = false,
  className,
}: DraftSaveBarProps) {
  const visible = hasUnsavedChanges || saveState === 'saving' || saveState === 'error';
  if (!visible) return null;

  return (
    <div className={cn('flex justify-end', className)}>
      <AppButton
        type="button"
        variant="secondary"
        onClick={onSave}
        disabled={saveState === 'saving'}
      >
        {saveState === 'saving' ? 'Salvando…' : saveState === 'error' ? 'Tentar novamente' : 'Salvar'}
      </AppButton>
    </div>
  );
}
