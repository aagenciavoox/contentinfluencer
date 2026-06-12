import {useEffect, useMemo, useRef, useState, type KeyboardEvent} from 'react';
import {ChevronsUpDown, X} from 'lucide-react';
import {cn} from '../../lib/utils';

export interface TagSelectOption {
  value: string;
  label?: string;
}

export interface TagSelectProps {
  label: string;
  hint?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options?: TagSelectOption[];
  creatable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxSelections?: number;
  id?: string;
}

export function normalizeTagToken(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function appendUniqueTag(list: string[], rawValue: string) {
  const value = normalizeTagToken(rawValue);
  if (!value) return list;
  if (list.some(item => item.toLowerCase() === value.toLowerCase())) return list;
  return [...list, value];
}

export function removeTag(list: string[], value: string) {
  return list.filter(item => item !== value);
}

export function TagPill({
  label,
  onRemove,
  disabled = false,
  className,
}: {
  label: string;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'tag-pill inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
        className
      )}
    >
      <span className="truncate">{label}</span>
      {onRemove && !disabled ? (
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onRemove();
          }}
          className="rounded p-0.5 text-[var(--tag-text)]/70 transition hover:bg-[var(--tag-bg-hover)] hover:text-[var(--tag-text)]"
          aria-label={`Remover ${label}`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </span>
  );
}

export function TagSelect({
  label,
  hint,
  values,
  onChange,
  options = [],
  creatable = false,
  placeholder = 'Selecione uma ou mais opcoes',
  disabled = false,
  className,
  maxSelections,
  id,
}: TagSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = id || label.toLowerCase().replace(/\s+/g, '-');

  const optionMap = useMemo(
    () => new Map(options.map(option => [option.value, option.label ?? option.value])),
    [options]
  );

  const availableOptions = useMemo(
    () =>
      options.filter(
        option =>
          !values.some(value => value.toLowerCase() === option.value.toLowerCase()) &&
          (option.label ?? option.value).toLowerCase().includes(query.trim().toLowerCase())
      ),
    [options, query, values]
  );

  const canAddMore = maxSelections ? values.length < maxSelections : true;
  const showInput = creatable && canAddMore;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const addValue = (rawValue: string) => {
    const next = appendUniqueTag(values, rawValue);
    if (next.length === values.length) return;
    if (maxSelections && next.length > maxSelections) return;
    onChange(next);
    setQuery('');
  };

  const removeValue = (value: string) => {
    onChange(removeTag(values, value));
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      if (!query.trim()) return;
      addValue(query);
      return;
    }

    if (event.key === 'Backspace' && !query && values.length > 0) {
      removeValue(values[values.length - 1]);
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const toggleOption = (value: string) => {
    if (values.some(item => item.toLowerCase() === value.toLowerCase())) {
      removeValue(value);
      return;
    }
    addValue(value);
    if (maxSelections === 1) {
      setOpen(false);
    }
  };

  const handleControlClick = () => {
    if (disabled) return;
    setOpen(previous => !previous);
    if (!open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const creatableMatch = query.trim()
    ? !options.some(option => option.value.toLowerCase() === query.trim().toLowerCase()) &&
      !values.some(value => value.toLowerCase() === query.trim().toLowerCase())
    : false;

  return (
    <div className={cn('space-y-1.5', className)} ref={containerRef}>
      <label htmlFor={fieldId} className="block text-sm font-semibold text-[var(--text-primary)]">
        {label}
      </label>
      {hint ? <p className="text-sm text-[var(--text-tertiary)]">{hint}</p> : null}

      <div className="relative">
        <div
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={`${fieldId}-listbox`}
          onClick={handleControlClick}
          className={cn(
            'tag-select-control flex min-h-10 w-full cursor-text items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 transition-colors',
            open && 'border-[var(--border-strong)] ring-2 ring-[var(--shadow-focus)]',
            disabled && 'cursor-not-allowed opacity-60'
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {values.map(value => (
              <TagPill
                key={value}
                label={optionMap.get(value) ?? value}
                onRemove={() => removeValue(value)}
                disabled={disabled}
              />
            ))}

            {showInput ? (
              <input
                ref={inputRef}
                id={fieldId}
                type="text"
                value={query}
                disabled={disabled}
                onChange={event => {
                  setQuery(event.target.value);
                  if (!open) setOpen(true);
                }}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setOpen(true)}
                placeholder={values.length === 0 ? placeholder : ''}
                className="min-w-[120px] flex-1 border-none bg-transparent px-0 py-0.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            ) : values.length === 0 ? (
              <span className="text-sm text-[var(--text-tertiary)]">{placeholder}</span>
            ) : null}
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={event => {
              event.stopPropagation();
              setOpen(previous => !previous);
            }}
            className="shrink-0 rounded p-1 text-[var(--text-tertiary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            aria-label={open ? 'Fechar opcoes' : 'Abrir opcoes'}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </button>
        </div>

        {open && !disabled ? (
          <div
            id={`${fieldId}-listbox`}
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-56 overflow-y-auto rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] py-1 shadow-lg"
          >
            {availableOptions.length > 0 ? (
              availableOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  onClick={() => toggleOption(option.value)}
                  className="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
                >
                  {option.label ?? option.value}
                </button>
              ))
            ) : null}

            {creatable && creatableMatch ? (
              <button
                type="button"
                onClick={() => addValue(query)}
                className="flex w-full items-center px-3 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]"
              >
                Adicionar &quot;{query.trim()}&quot;
              </button>
            ) : null}

            {availableOptions.length === 0 && !(creatable && creatableMatch) ? (
              <p className="px-3 py-2 text-sm text-[var(--text-tertiary)]">Nenhuma opcao disponivel</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
