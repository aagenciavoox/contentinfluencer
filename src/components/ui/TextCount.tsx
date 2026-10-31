import type { CSSProperties, ElementType } from 'react';
import { cn } from '../../lib/utils';
import { contagemDeTexto, contagemDeQuantidade } from '../../lib/textMeasure';

type TextCountProps = ({ value: string; count?: never } | { count: number; value?: never }) & {
  limit?: number | null;
  mode?: 'chars' | 'words';
  as?: 'p' | 'span';
  id?: string;
  className?: string;
  style?: CSSProperties;
};

/** Contagem à direita, abaixo do campo; também pode compor metadados em linha. */
export function TextCount({ value, count, limit, mode = 'chars', as = 'p', id, className, style }: TextCountProps) {
  const { texto, tom } = count == null
    ? contagemDeTexto(value ?? '', limit, mode)
    : contagemDeQuantidade(count, limit, mode);
  const Component: ElementType = as;
  return (
    <Component
      id={id}
      style={{ color: tom === 'acima' ? 'var(--accent-red)' : tom === 'perto' ? 'var(--text-primary)' : 'var(--text-tertiary)', ...style }}
      className={cn(
        'text-right t-meta tabular-nums',
        className,
      )}
    >
      {texto}
    </Component>
  );
}
