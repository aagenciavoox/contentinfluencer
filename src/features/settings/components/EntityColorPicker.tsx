import { Check } from 'lucide-react';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import {
  PILAR_PRESET_CORES,
  entityColorLabel,
  normalizeEntityColor,
} from '../lib/pilarConstants';

const INLINE_SWATCHES = ['#EC4899', '#F5F0E4', '#F5C543', '#FB923C', '#EF4444', '#C084FC'];

export function entitySwatchInk(hex: string): string {
  const raw = hex.replace('#', '');
  const red = Number.parseInt(raw.slice(0, 2), 16);
  const green = Number.parseInt(raw.slice(2, 4), 16);
  const blue = Number.parseInt(raw.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? '#1C1917' : '#FFFFFF';
}

export function EntityColorPicker({
  value,
  onChange,
  unavailableColors = [],
  variant = 'grid',
  swatches = INLINE_SWATCHES,
  caption = 'hex',
}: {
  value: string;
  onChange: (color: string) => void;
  unavailableColors?: readonly string[];
  variant?: 'grid' | 'inline';
  swatches?: readonly string[];
  caption?: 'hex' | 'name';
}) {
  const selected = normalizeEntityColor(value || '');
  const pickerValue = /^#[0-9A-F]{6}$/.test(selected) ? selected : '#6366F1';
  const unavailable = new Set(unavailableColors.map(color => normalizeEntityColor(color)));
  const selectedTaken = unavailable.has(selected);

  const choose = (color: string) => {
    const next = normalizeEntityColor(color);
    if (unavailable.has(next)) return;
    onChange(next);
  };

  if (variant === 'inline') {
    const quick = swatches.map(color => normalizeEntityColor(color));
    const visibleSwatches = quick.includes(selected) ? quick : [selected, ...quick];

    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {visibleSwatches.map(color => {
            const isSelected = selected === color;
            const isTaken = unavailable.has(color);
            return (
              <button
                key={color}
                type="button"
                onClick={() => choose(color)}
                disabled={isTaken}
                aria-label={isTaken ? `Cor ${entityColorLabel(color)} já usada em outra série` : `Cor ${entityColorLabel(color)}`}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex h-8 w-8 items-center justify-center rounded-full focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                  isTaken && 'cursor-not-allowed opacity-30',
                  !isSelected && !isTaken && 'hover:scale-105',
                )}
                style={{ backgroundColor: color }}
              >
                {isSelected ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: entitySwatchInk(color) }} />
                ) : null}
              </button>
            );
          })}
          <label className="relative inline-flex h-8 cursor-pointer items-center overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
            <span>Mais cores</span>
            <input
              type="color"
              value={pickerValue.toLowerCase()}
              onChange={event => choose(event.target.value)}
              aria-label="Escolher outra cor"
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
        <Text
          variant="meta"
          className={cn(
            'mt-2 block',
            caption === 'hex' && 'font-mono',
            selectedTaken ? 'text-[var(--accent-red)]' : 'text-[var(--text-tertiary)]',
          )}
        >
          {selectedTaken
            ? 'Essa cor já está em outra série.'
            : caption === 'name'
              ? entityColorLabel(selected)
              : selected}
        </Text>
      </div>
    );
  }

  return (
    <div>
      <div className="grid w-full grid-cols-8 justify-items-center gap-y-2.5">
        {PILAR_PRESET_CORES.map(color => {
          const isSelected = selected === color;
          const isTaken = unavailable.has(color);
          return (
            <button
              key={color}
              type="button"
              onClick={() => choose(color)}
              disabled={isTaken}
              aria-label={isTaken ? `Cor ${entityColorLabel(color)} já usada em outra série` : `Cor ${entityColorLabel(color)}`}
              aria-pressed={isSelected}
              className={cn(
                'relative flex aspect-square w-full max-w-14 items-center justify-center rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                isTaken && 'cursor-not-allowed opacity-30',
                isSelected
                  ? 'scale-105 border-[var(--text-primary)]'
                  : 'border-[var(--border-color)]',
                !isSelected && !isTaken && 'hover:scale-105',
              )}
              style={{ backgroundColor: color }}
            >
              {isSelected ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: entitySwatchInk(color) }} />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="color"
            value={pickerValue.toLowerCase()}
            onChange={event => choose(event.target.value)}
            aria-label="Escolher outra cor"
            className="h-8 w-10 cursor-pointer rounded-[var(--radius-input)] border border-[var(--border-color)] bg-transparent p-0.5"
          />
          <Text variant="meta" className="text-[var(--text-secondary)]">
            Outra cor
          </Text>
        </label>
        <Text variant="meta" className={selectedTaken ? 'text-[var(--accent-red)]' : 'text-[var(--text-tertiary)]'}>
          {selectedTaken ? 'Essa cor já está em outra série.' : entityColorLabel(selected)}
        </Text>
      </div>
    </div>
  );
}
