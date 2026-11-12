import { useEffect, useRef, useState, type ReactNode } from 'react';
import { inteiroNaoNegativo } from '../../../../lib/inteiro';
import { Minus, Plus } from 'lucide-react';
import { SettingsSectionCard } from '../../../../components/settings/SettingsSectionCard';
import { Ajuda } from '../../../../components/ui/Ajuda';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';

/** Campos dos formulários do Editorial (Período e Ajustes). Salvam sozinhos. */

/** Sem largura: quem usa decide (`CAMPO` ocupa a linha toda). */
export const CAMPO_BASE =
  'ds-input rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-secondary)] px-3 py-2 t-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

export const CAMPO = `${CAMPO_BASE} w-full`;

export const NUMERO = `${CAMPO} min-h-11 max-w-[8rem] tabular-nums`;

/** Curto, sem apagar o ponto: "1.5" continua "1.5" para a validação recusar. */
export function digitos(value: string): string {
  return value.slice(0, 8);
}

export function inteiroOuNull(value: string): number | null {
  return inteiroNaoNegativo(value);
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
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center">
        <label htmlFor={id}>
          <Text variant="bodyStrong" as="span">{label}</Text>
        </label>
        {hint ? <Ajuda rotulo={`Sobre ${label}`} texto={hint} /> : null}
      </span>
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
    </div>
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
  layout = 'stack',
  rotuloVisivel = true,
  zeroViraVazio = false,
}: {
  id: string;
  label: string;
  hint?: string;
  /** Depois do campo: "roteiros", "por semana". */
  unidade?: string;
  value: string;
  onChange: (value: string) => void;
  erro?: string;
  /** `row`: rótulo à esquerda e o passo à direita. */
  layout?: 'stack' | 'row';
  /** Esconde o rótulo visual. O campo continua com nome para leitor de tela. */
  rotuloVisivel?: boolean;
  /** No menos, 1 volta a vazio (o traço), em vez de zero. */
  zeroViraVazio?: boolean;
}) {
  const atual = inteiroOuNull(value);
  const erroId = erro ? `${id}-erro` : undefined;
  const diminuir = () => {
    if (atual == null || atual <= 0) return;
    if (zeroViraVazio && atual <= 1) onChange('');
    else onChange(String(atual - 1));
  };
  const controle = (
    <div className="inline-flex items-center overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
      <button
        type="button"
        className={PASSO}
        disabled={atual == null || atual <= 0}
        aria-label={`Diminuir ${label.toLowerCase()}`}
        onClick={diminuir}
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
        aria-describedby={erroId}
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
  );
  const rotulo = (
    <span className="inline-flex items-center">
      <label htmlFor={id} className={rotuloVisivel ? undefined : 'sr-only'}>
        <Text variant={layout === 'row' ? 'body' : 'bodyStrong'} as="span">{label}</Text>
      </label>
      {hint && rotuloVisivel ? <Ajuda rotulo={`Sobre ${label}`} texto={hint} /> : null}
    </span>
  );
  const notas = (
    <>
      {erro ? <Text variant="meta" as="p" className="text-[var(--accent-red)]"><span id={erroId}>{erro}</span></Text> : null}
    </>
  );
  if (layout === 'row') {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          {rotulo}
          <span className="inline-flex shrink-0 items-center gap-3">
            {controle}
            {unidade ? <Text variant="body" as="span" className="text-[var(--text-secondary)]">{unidade}</Text> : null}
          </span>
        </div>
        {notas}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {rotulo}
      <div className="flex flex-wrap items-center gap-3">
        {controle}
        {unidade ? <Text variant="body" as="span" className="text-[var(--text-secondary)]">{unidade}</Text> : null}
      </div>
      {notas}
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
    <SettingsSectionCard
      title={titulo}
      icon={icone}
      badge={descricao ? <Ajuda rotulo={`Sobre ${titulo}`} texto={descricao} /> : undefined}
      actions={acao}
      className={className}
    >
      {children}
    </SettingsSectionCard>
  );
}
