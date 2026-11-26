import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Ajuda } from './Ajuda';
import { Text } from './Text';

/**
 * Linha de leitura: rótulo à esquerda e, à direita, um valor (tabular-nums) ou um controle.
 * Sem token novo; reusa Text e a grade do app.
 */
export function LinhaDeLeitura({
  rotulo,
  meta,
  ajuda,
  valor,
  children,
  className,
}: {
  rotulo: string;
  /** Frase curta abaixo do rótulo. */
  meta?: string;
  /** Texto do “?” ao lado do rótulo. */
  ajuda?: string;
  /** Valor estático. Use `children` quando o lado direito for um controle ou um conjunto de chips. */
  valor?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3', className)}>
      <div className="min-w-0">
        <span className="inline-flex min-w-0 max-w-full items-center">
          <Text variant="bodyStrong" as="span" className="min-w-0 truncate">{rotulo}</Text>
          {ajuda ? <Ajuda rotulo={`Sobre ${rotulo}`} texto={ajuda} /> : null}
        </span>
        {meta ? (
          <Text variant="meta" as="span" className="mt-0.5 block text-[var(--text-secondary)]">{meta}</Text>
        ) : null}
      </div>
      <div className="min-w-0 shrink-0 tabular-nums">
        {children ?? (
          valor != null
            ? <Text variant="body" as="span" className="tabular-nums">{valor}</Text>
            : null
        )}
      </div>
    </div>
  );
}
