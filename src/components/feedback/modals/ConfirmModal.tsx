import { AppButton } from '../../ui/AppButton';
import { Text } from '../../ui/Text';
import {
  DESKTOP_DIALOG_ANIMATE,
  DESKTOP_DIALOG_EXIT,
  DESKTOP_DIALOG_INITIAL,
  DESKTOP_PANEL_TRANSITION,
} from '../../overlays/overlayConstants';
import { OverlayRoot } from '../../overlays/OverlayRoot';

interface ConfirmModalProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <OverlayRoot
      open={open}
      onClose={onCancel}
      placement="center"
      zIndex="z-[200]"
      mobileEdgePadding={false}
      ariaLabel="Confirmação"
      panelInitial={DESKTOP_DIALOG_INITIAL}
      panelAnimate={DESKTOP_DIALOG_ANIMATE}
      panelExit={DESKTOP_DIALOG_EXIT}
      panelTransition={DESKTOP_PANEL_TRANSITION}
      panelClassName="absolute top-1/2 left-1/2 w-[88%] max-w-xs -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6"
    >
      <Text variant="body" className="mb-6 leading-relaxed text-[var(--text-primary)] opacity-80">
        {message}
      </Text>
      <div className="flex gap-3">
        <AppButton variant="secondary" className="flex-1" onClick={onCancel}>
          {cancelLabel}
        </AppButton>
        <AppButton variant="primary" className="flex-1" onClick={onConfirm}>
          {confirmLabel}
        </AppButton>
      </div>
    </OverlayRoot>
  );
}
