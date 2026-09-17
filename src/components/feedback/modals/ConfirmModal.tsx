import { AppButton } from '../../ui/AppButton';
import { Text } from '../../ui/Text';
import { useIsMobile } from '../../../hooks/useIsMobile';
import {
  DESKTOP_DIALOG_ANIMATE,
  DESKTOP_DIALOG_EXIT,
  DESKTOP_DIALOG_INITIAL,
  DESKTOP_PANEL_TRANSITION,
  Z_INDEX_CONFIRM,
} from '../../overlays/overlayConstants';
import { OverlayRoot } from '../../overlays/OverlayRoot';

interface ConfirmModalProps {
  open: boolean;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  altLabel?: string;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  altDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onAlt?: () => void;
}

export function ConfirmModal({
  open,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  altLabel,
  confirmDisabled = false,
  cancelDisabled = false,
  altDisabled = false,
  onConfirm,
  onCancel,
  onAlt,
}: ConfirmModalProps) {
  const isMobile = useIsMobile();

  return (
    <OverlayRoot
      open={open}
      onClose={onCancel}
      placement="center"
      zIndex={Z_INDEX_CONFIRM}
      mobileEdgePadding={isMobile}
      ariaLabel="Confirmação"
      panelInitial={DESKTOP_DIALOG_INITIAL}
      panelAnimate={DESKTOP_DIALOG_ANIMATE}
      panelExit={DESKTOP_DIALOG_EXIT}
      panelTransition={DESKTOP_PANEL_TRANSITION}
      panelClassName="absolute top-1/2 left-1/2 w-[88%] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6"
    >
      <Text variant="body" className="mb-6 leading-relaxed text-[var(--text-primary)] opacity-80">
        {message}
      </Text>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">
        <AppButton
          variant="secondary"
          fullWidth
          className="sm:min-w-0 sm:shrink sm:flex-1"
          disabled={cancelDisabled}
          onClick={onCancel}
        >
          {cancelLabel}
        </AppButton>
        {altLabel && onAlt ? (
          <AppButton
            variant="ghost"
            fullWidth
            className="sm:min-w-0 sm:shrink sm:flex-1 text-[var(--accent-red)] hover:text-[var(--accent-red)]"
            disabled={altDisabled}
            onClick={onAlt}
          >
            {altLabel}
          </AppButton>
        ) : null}
        <AppButton
          variant="primary"
          fullWidth
          className="sm:min-w-0 sm:shrink sm:flex-1"
          disabled={confirmDisabled}
          onClick={onConfirm}
        >
          {confirmLabel}
        </AppButton>
      </div>
    </OverlayRoot>
  );
}
