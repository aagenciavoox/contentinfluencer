import {useEffect} from 'react';
import {Check, Minus, Plus, Type} from 'lucide-react';
import {ToolbarDropdown} from '../../../../components/editors/EditorToolbar';
import {SelectField} from '../../../../components/ui/SelectField';
import {Text} from '../../../../components/ui/Text';
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

/** Moldura discreta dos seletores (altura compacta). */
const FIELD_FRAME = 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)]';

const STEP_BUTTON = cn(
  'flex h-8 w-7 shrink-0 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition',
  'hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-40',
  'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
);

function SizeStepper({
  size,
  onChange,
}: {
  size: number;
  onChange: (updates: Partial<RoteiroTypography>) => void;
}) {
  return (
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
      <Text variant="meta" as="span" className="min-w-[2.75rem] text-center tabular-nums text-[var(--text-primary)]" aria-live="polite">
        {size}px
      </Text>
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
  );
}

/**
 * Fonte e tamanho do texto do roteiro, na barra do editor.
 * variant="toolbar": menus da própria barra.
 * variant="panel": lista plana (ex.: rodapé do menu Formatar — sem dropdown aninhado).
 * variant="field" (celular): seletores do design system.
 */
export function RoteiroTypographyControls({
  typography,
  onChange,
  variant = 'field',
}: {
  typography: RoteiroTypography;
  onChange: (updates: Partial<RoteiroTypography>) => void;
  variant?: 'field' | 'toolbar' | 'panel';
}) {
  useEffect(() => {
    if (variant === 'panel') preloadRoteiroFonts();
  }, [variant]);

  if (variant === 'panel') {
    return (
      <div className="flex flex-col gap-2" title={TITLE}>
        <Text variant="eyebrow" as="p" className="px-1">
          Fonte do roteiro
        </Text>
        <div className="flex flex-col gap-0.5" role="radiogroup" aria-label="Fonte do roteiro">
          {ROTEIRO_FONTS.map(font => {
            const active = font.id === typography.font;
            return (
              <button
                key={font.id}
                type="button"
                role="radio"
                aria-checked={active}
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  preloadRoteiroFonts();
                  onChange({font: font.id});
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-[var(--radius-input)] px-2 py-1.5 text-left t-body transition',
                  'focus-visible:outline-none focus-visible:bg-[var(--bg-hover)]',
                  active
                    ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                )}
                style={{fontFamily: font.family}}
              >
                <span className="min-w-0 flex-1 truncate">{font.label}</span>
                {active ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[var(--border-color)] px-1 pt-2">
          <Text variant="eyebrow" as="span">
            Tamanho
          </Text>
          <SizeStepper size={typography.size} onChange={onChange} />
        </div>
      </div>
    );
  }

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
