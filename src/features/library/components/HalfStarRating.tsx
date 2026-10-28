import { useState, type KeyboardEvent } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatarNota } from '../lib/avaliacaoCriterios';

interface HalfStarRatingProps {
  /** Nota de 0 a 5, de meia em meia; nula enquanto não tem nota. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Nome lido pelo leitor de tela (ex.: "Escrita"). */
  label: string;
  className?: string;
}

const PASSO = 0.5;
// O tamanho vai explícito nas duas estrelas: a de cima é recortada pela metade e não pode encolher.
const TAMANHO_ESTRELA = 'h-7 w-7 md:h-6 md:w-6';

/** Nota da metade da estrela sob o ponteiro: metade esquerda dá x,5; a direita, a estrela inteira. */
function notaNoPonto(event: { currentTarget: HTMLSpanElement; clientX: number }, index: number) {
  const rect = event.currentTarget.getBoundingClientRect();
  return index + (event.clientX - rect.left < rect.width / 2 ? PASSO : 1);
}

/**
 * Cinco estrelas com meia nota. Clicar na nota que já está marcada apaga a nota.
 * No teclado: setas sobem e descem meia estrela, Home vai a 0, End a 5, Delete apaga.
 */
export function HalfStarRating({ value, onChange, label, className }: HalfStarRatingProps) {
  const [previa, setPrevia] = useState<number | null>(null);
  const exibida = previa ?? value ?? 0;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let proxima: number | null | undefined;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') proxima = Math.min(5, value === null ? PASSO : value + PASSO);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') proxima = Math.max(0, (value ?? 0) - PASSO);
    else if (event.key === 'Home') proxima = 0;
    else if (event.key === 'End') proxima = 5;
    else if (event.key === 'Delete' || event.key === 'Backspace') proxima = null;
    if (proxima === undefined) return;
    event.preventDefault();
    onChange(proxima);
  };

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value === null ? 'Sem nota' : `${formatarNota(value)} de 5`}
        onKeyDown={handleKeyDown}
        onPointerLeave={() => setPrevia(null)}
        className="inline-flex items-center rounded-[var(--radius-input)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        {[0, 1, 2, 3, 4].map(index => {
          const preenchido = Math.max(0, Math.min(1, exibida - index));
          return (
            <span
              key={index}
              // A prévia só no mouse: no toque ela ficaria presa depois de soltar o dedo.
              onPointerMove={event => {
                if (event.pointerType === 'mouse') setPrevia(notaNoPonto(event, index));
              }}
              onClick={event => {
                const nota = notaNoPonto(event, index);
                onChange(nota === value ? null : nota);
                setPrevia(null);
              }}
              className="relative inline-flex cursor-pointer"
            >
              <Star className={cn(TAMANHO_ESTRELA, 'text-[var(--border-strong)]')} aria-hidden />
              {preenchido > 0 ? (
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${preenchido * 100}%` }}
                >
                  <Star className={cn(TAMANHO_ESTRELA, 'max-w-none fill-[var(--warning)] text-[var(--warning)]')} aria-hidden />
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
      <span className="w-7 text-right t-secondary tabular-nums text-[var(--text-secondary)]" aria-hidden>
        {value === null ? '—' : formatarNota(value)}
      </span>
    </div>
  );
}
