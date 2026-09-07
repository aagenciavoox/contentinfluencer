import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SettingsArrayInputProps {
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
  label?: string;
  itemClassName?: string;
  bulletColor?: string;
}

export function SettingsArrayInput({
  items,
  onAdd,
  onRemove,
  placeholder = "Adicionar item...",
  label = "Novo item",
  itemClassName,
  bulletColor = "var(--accent-blue)",
}: SettingsArrayInputProps) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue('');
  };

  return (
    <div className="stack-lg">
      <div className="stack-sm">
        <p className="t-label text-[var(--text-tertiary)]">{label}</p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={placeholder}
            aria-label={label}
            className="flex-1 rounded-xl border-none bg-[var(--bg-hover)] px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:ring-1 focus:ring-[var(--border-strong)]"
          />
          <button
            type="button"
            onClick={handleAdd}
            aria-label="Adicionar item"
            className="inline-flex h-10 w-10 min-h-10 min-w-10 items-center justify-center rounded-xl bg-[var(--bg-hover)] transition-colors hover:bg-[var(--bg-hover-strong)]"
          >
            <Plus className="h-4 w-4 text-[var(--text-tertiary)]" />
          </button>
        </div>
      </div>

      <ul className="stack-sm">
        {items.map((item, index) => (
          <li key={index} className={cn("group flex items-start justify-between gap-3 rounded-xl border border-transparent p-1 transition-all hover:bg-[var(--bg-hover)]/30", itemClassName)}>
            <div className="flex items-start gap-3 text-sm text-[var(--text-primary)]">
              <div
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: bulletColor }}
              />
              <span className="leading-relaxed opacity-90">{item}</span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remover ${item}`}
              className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-[var(--radius-input)] p-1 text-[var(--accent-pink)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <p className="py-2 text-center text-xs italic text-[var(--text-tertiary)] opacity-50">
            Nenhum item adicionado.
          </p>
        )}
      </ul>
    </div>
  );
}
