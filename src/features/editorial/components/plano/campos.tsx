import { useEffect, useRef, useState } from 'react';
import { Text } from '../../../../components/ui/Text';

/** Campos dos formulários do Editorial (Período e Ajustes). Salvam sozinhos. */

/** Sem largura: quem usa decide (`CAMPO` ocupa a linha toda). */
export const CAMPO_BASE =
  'ds-input rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

export const CAMPO = `${CAMPO_BASE} w-full`;

export const NUMERO = `${CAMPO} min-h-11 max-w-[8rem] tabular-nums`;

export function digitos(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

export function inteiroOuNull(value: string): number | null {
  const bruto = digitos(value);
  if (!bruto) return null;
  return Number.parseInt(bruto, 10);
}

export function CampoNumero({
  id,
  label,
  hint,
  value,
  onChange,
  erro,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  erro?: string;
}) {
  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      <Text variant="bodyStrong" as="span">{label}</Text>
      {hint ? <Text variant="secondary">{hint}</Text> : null}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={event => onChange(digitos(event.target.value))}
        className={NUMERO}
      />
      {erro ? <Text variant="meta" className="text-[var(--accent-red)]">{erro}</Text> : null}
    </label>
  );
}

export function CampoTexto({
  id,
  label,
  nome,
  value,
  onSave,
  rows = 4,
  placeholder,
}: {
  id: string;
  label?: string;
  nome?: string;
  value: string;
  onSave: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  const draftRef = useRef(value);
  const savedRef = useRef(value);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (draftRef.current === savedRef.current) {
      draftRef.current = value;
      savedRef.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => () => {
    if (draftRef.current !== savedRef.current) onSaveRef.current(draftRef.current);
  }, []);

  const commit = () => {
    if (draftRef.current === savedRef.current) return;
    savedRef.current = draftRef.current;
    onSaveRef.current(draftRef.current);
  };

  const campo = (
    <textarea
      id={id}
      rows={rows}
      value={draft}
      placeholder={placeholder}
      aria-label={label ? undefined : nome}
      onChange={event => {
        draftRef.current = event.target.value;
        setDraft(event.target.value);
      }}
      onBlur={commit}
      className={`${CAMPO} min-h-24 resize-y`}
    />
  );

  if (!label) return campo;

  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      <Text variant="bodyStrong" as="span">{label}</Text>
      {campo}
    </label>
  );
}
