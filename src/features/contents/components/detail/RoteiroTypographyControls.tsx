import {Minus, Plus, Type} from 'lucide-react';
import {ToolbarDropdown} from '../../../../components/editors/EditorToolbar';
import {SelectField} from '../../../../components/ui/SelectField';
import {cn} from '../../../../lib/utils';
import {
  preloadRoteiroFonts,
  ROTEIRO_FONTS,
  ROTEIRO_FONT_SIZE_MAX,
  ROTEIRO_FONT_SIZE_MIN,
  type RoteiroFontId,
  type RoteiroTypography,
} from '../../lib/roteiroTypography';

const SIZES = Array.from(
  {length: ROTEIRO_FONT_SIZE_MAX - ROTEIRO_FONT_SIZE_MIN + 1},
  (_, index) => ROTEIRO_FONT_SIZE_MIN + index,
);

const SIZE_OPTIONS = SIZES.map(size => ({value: String(size), label: `${size}px`}));

const FONT_OPTIONS = ROTEIRO_FONTS.map(font => ({value: font.id, label: font.label}));

const TITLE = 'Fonte e tamanho do roteiro inteiro (não só do trecho selecionado)';

/** Moldura de campo dos seletores, na altura compacta da barra. */
const FIELD_FRAME = 'border border-[var(--border-input)] bg-[var(--bg-elevated)] hover:border-[var(--text-tertiary)]';

const STEP_BUTTON = cn(
  'flex h-8 w-7 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition',
  'hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-40',
  'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
);

/**
 * Fonte e tamanho do texto do roteiro, na barra do editor.
 * variant="toolbar" (computador): menus da própria barra, cada fonte na própria fonte e
 * tamanho como "− 16px +". variant="field" (celular): seletores do design system.
 */
export function RoteiroTypographyControls({
  typography,
  onChange,
  variant = 'field',
}: {
  typography: RoteiroTypography;
  onChange: (updates: Partial<RoteiroTypography>) => void;
  variant?: 'field' | 'toolbar';
}) {
  if (variant === 'toolbar') {
    const current = ROTEIRO_FONTS.find(font => font.id === typography.font) ?? ROTEIRO_FONTS[0];
    const size = typography.size;
    return (
      <div className="flex shrink-0 items-center gap-1" title={TITLE}>
        <ToolbarDropdown
          label="Fonte do roteiro"
          triggerIcon={Type}
          triggerText={current.label}
          triggerStyle={{fontFamily: current.family}}
          triggerClassName={FIELD_FRAME}
          neutral
          compact
          selectable
          minWidth="min-w-[200px]"
          onOpen={preloadRoteiroFonts}
          items={ROTEIRO_FONTS.map(font => ({
            id: font.id,
            label: font.label,
            style: {fontFamily: font.family},
            active: font.id === typography.font,
            run: () => onChange({font: font.id}),
          }))}
        />
        <div className="flex shrink-0 items-center" role="group" aria-label="Tamanho da fonte do roteiro">
          <button
            type="button"
            className={STEP_BUTTON}
            onMouseDown={event => event.preventDefault()}
            onClick={() => onChange({size: size - 1})}
            disabled={size <= ROTEIRO_FONT_SIZE_MIN}
            aria-label="Diminuir tamanho da fonte"
            title="Diminuir tamanho da fonte"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden />
          </button>
          <ToolbarDropdown
            label="Tamanho da fonte do roteiro"
            triggerText={`${size}px`}
            triggerClassName={cn(FIELD_FRAME, 'tabular-nums')}
            hideChevron
            neutral
            compact
            selectable
            minWidth="min-w-[96px]"
            items={SIZES.map(value => ({
              id: String(value),
              label: `${value}px`,
              active: value === size,
              run: () => onChange({size: value}),
            }))}
          />
          <button
            type="button"
            className={STEP_BUTTON}
            onMouseDown={event => event.preventDefault()}
            onClick={() => onChange({size: size + 1})}
            disabled={size >= ROTEIRO_FONT_SIZE_MAX}
            aria-label="Aumentar tamanho da fonte"
            title="Aumentar tamanho da fonte"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1" title={TITLE}>
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
