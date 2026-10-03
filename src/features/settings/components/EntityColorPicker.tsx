import { Check } from 'lucide-react';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import {
  PILAR_PRESET_CORES,
  entityColorLabel,
  normalizeEntityColor,
} from '../lib/pilarConstants';

function swatchInk(hex: string): string {
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
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const selected = normalizeEntityColor(value || '');
  const pickerValue = /^#[0-9A-F]{6}$/.test(selected) ? selected : '#6366F1';

  return (
    <div>
      <div className="grid w-full max-w-sm grid-cols-8 gap-1.5">
        {PILAR_PRESET_CORES.map(color => {
          const isSelected = selected === color;
          return (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              aria-label={`Cor ${entityColorLabel(color)}`}
              aria-pressed={isSelected}
              className={cn(
                'relative flex aspect-square w-full items-center justify-center rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                isSelected
                  ? 'scale-105 border-[var(--text-primary)]'
                  : 'border-[var(--border-color)] hover:scale-105',
              )}
              style={{ backgroundColor: color }}
            >
              {isSelected ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: swatchInk(color) }} />
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
            onChange={event => onChange(normalizeEntityColor(event.target.value))}
            aria-label="Escolher outra cor"
            className="h-8 w-10 cursor-pointer rounded-[var(--radius-input)] border border-[var(--border-color)] bg-transparent p-0.5"
          />
          <Text variant="meta" className="text-[var(--text-secondary)]">
            Outra cor
          </Text>
        </label>
        <Text variant="meta" className="text-[var(--text-tertiary)]">
          {entityColorLabel(selected)}
        </Text>
      </div>
    </div>
  );
}
