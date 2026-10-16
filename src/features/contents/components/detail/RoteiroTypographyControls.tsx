import {Type} from 'lucide-react';
import {SelectField} from '../../../../components/ui/SelectField';
import {
  ROTEIRO_FONTS,
  ROTEIRO_FONT_SIZE_MAX,
  ROTEIRO_FONT_SIZE_MIN,
  type RoteiroFontId,
  type RoteiroTypography,
} from '../../lib/roteiroTypography';

const SIZE_OPTIONS = Array.from(
  {length: ROTEIRO_FONT_SIZE_MAX - ROTEIRO_FONT_SIZE_MIN + 1},
  (_, index) => {
    const size = ROTEIRO_FONT_SIZE_MIN + index;
    return {value: String(size), label: `${size}px`};
  },
);

const FONT_OPTIONS = ROTEIRO_FONTS.map(font => ({value: font.id, label: font.label}));

/** Fonte e tamanho do texto do roteiro, na barra do editor. */
export function RoteiroTypographyControls({
  typography,
  onChange,
}: {
  typography: RoteiroTypography;
  onChange: (updates: Partial<RoteiroTypography>) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <SelectField
        ariaLabel="Fonte do roteiro"
        leadingIcon={<Type className="h-3.5 w-3.5 text-[var(--text-secondary)]" />}
        value={typography.font}
        onChange={font => onChange({font: font as RoteiroFontId})}
        options={FONT_OPTIONS}
      />
      <SelectField
        ariaLabel="Tamanho da fonte do roteiro"
        value={String(typography.size)}
        onChange={size => onChange({size: Number(size)})}
        options={SIZE_OPTIONS}
      />
    </div>
  );
}