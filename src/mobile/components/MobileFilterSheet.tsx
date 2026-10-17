import { useId, type ReactNode } from 'react';
import { BottomSheetModal } from '../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../components/overlays/OverlayHeader';
import { AppButton } from '../../components/ui/AppButton';
import { SelectField, type SelectFieldOption } from '../../components/ui/SelectField';

interface MobileFilterSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Volta os filtros ao padrão. Fica no rodapé, como ação secundária. */
  onClear?: () => void;
  clearLabel?: string;
}

/**
 * Folha de filtros das listas mobile. O corpo rola (`OverlayBody`): com muitos campos, o rodapé
 * continua alcançável em celular baixo.
 */
export function MobileFilterSheet({
  open,
  title,
  onClose,
  children,
  onClear,
  clearLabel = 'Limpar filtros',
}: MobileFilterSheetProps) {
  return (
    <BottomSheetModal open={open} onClose={onClose} desktopMaxW="max-w-xl" zIndex="z-[110]" ariaLabel={title}>
      <OverlayHeader title={title} onClose={onClose} />
      <OverlayBody className="stack-lg px-4 py-4">{children}</OverlayBody>
      {onClear ? (
        <OverlayFooter className="pb-safe">
          <AppButton variant="secondary" fullWidth onClick={onClear}>
            {clearLabel}
          </AppButton>
        </OverlayFooter>
      ) : null}
    </BottomSheetModal>
  );
}

/** Campo de escolha única dentro da folha de filtros: rótulo + `SelectField`, igual em todas as telas. */
export function MobileFilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectFieldOption[];
}) {
  const id = useId();
  return (
    <div className="stack-sm">
      <label htmlFor={id} className="t-label text-[var(--text-tertiary)]">
        {label}
      </label>
      <SelectField id={id} block value={value} onChange={onChange} options={options} />
    </div>
  );
}
