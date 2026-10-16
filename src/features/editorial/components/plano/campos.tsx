import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';

/** Campos dos formulários do Editorial (Período e Ajustes). Salvam sozinhos. */

/** Sem largura: quem usa decide (`CAMPO` ocupa a linha toda). */
export const CAMPO_BASE =
  'ds-input rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

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

  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
  }, []);

  const commit = () => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
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
        // Salva apos uma pausa curta na digitacao, sem esperar sair do campo.
        if (timerRef.current != null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(commit, 900);
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

const PASSO =
  'flex h-11 w-11 shrink-0 items-center justify-center text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:text-[var(--text-tertiary)] disabled:hover:bg-transparent';

/**
 * Número com − e + dos lados. O valor continua editável pelo teclado; vazio mostra "—".
 * `onChange` recebe texto, como o `CampoNumero`, para quem valida antes de salvar.
 */
export function CampoStepper({
  id,
  label,
  hint,
  unidade,
  value,
  onChange,
  erro,
}: {
  id: string;
  label: string;
  hint?: string;
  /** Depois do campo: "roteiros", "por semana". */
  unidade?: string;
  value: string;
  onChange: (value: string) => void;
  erro?: string;
}) {
  const atual = value === '' ? null : Number.parseInt(value, 10);
  const hintId = hint ? `${id}-hint` : undefined;
  const erroId = erro ? `${id}-erro` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id}>
        <Text variant="bodyStrong" as="span">{label}</Text>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex items-center overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
          <button
            type="button"
            className={PASSO}
            disabled={atual == null || atual <= 0}
            aria-label={`Diminuir ${label.toLowerCase()}`}
            onClick={() => onChange(String(Math.max(0, (atual ?? 0) - 1)))}
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <input
            id={id}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            placeholder="—"
            aria-describedby={[hintId, erroId].filter(Boolean).join(' ') || undefined}
            onChange={event => onChange(digitos(event.target.value))}
            className="!h-11 w-16 !rounded-none !border-0 !border-x !border-[var(--border-input)] !bg-transparent !px-2 text-center t-body tabular-nums text-[var(--text-primary)] !shadow-none outline-none placeholder:text-[var(--text-secondary)] focus-visible:shadow-[inset_0_0_0_2px_var(--focus-ring-color)]"
          />
          <button
            type="button"
            className={PASSO}
            disabled={atual != null && atual >= 9999}
            aria-label={`Aumentar ${label.toLowerCase()}`}
            onClick={() => onChange(String((atual ?? 0) + 1))}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {unidade ? <Text variant="body" as="span" className="text-[var(--text-secondary)]">{unidade}</Text> : null}
      </div>
      {hint ? <Text variant="secondary" as="p" className="text-[var(--text-secondary)]"><span id={hintId}>{hint}</span></Text> : null}
      {erro ? <Text variant="meta" as="p" className="text-[var(--accent-red)]"><span id={erroId}>{erro}</span></Text> : null}
    </div>
  );
}

/**
 * Card de configuração: ícone numa moldura, título e uma frase do que ele ajusta.
 * Usado em Ajustes e Período.
 */
export function CardConfiguracao({
  icone,
  titulo,
  descricao,
  acao,
  children,
  className,
}: {
  icone: ReactNode;
  titulo: string;
  descricao?: string;
  /** À direita do título (ex.: botão). */
  acao?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Surface padding="none" className={cn('stack-lg p-4 md:p-6', className)}>
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-color)] text-[var(--text-primary)]"
          aria-hidden
        >
          {icone}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <Text variant="sectionTitle" as="h2">{titulo}</Text>
          {descricao ? <Text variant="secondary" className="mt-0.5">{descricao}</Text> : null}
        </div>
        {acao ? <div className="shrink-0">{acao}</div> : null}
      </div>
      {children}
    </Surface>
  );
}
