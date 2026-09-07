import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Surface } from './Surface';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'md' | 'lg';
  interactive?: boolean;
}

/**
 * Thin wrapper over Surface for legacy call sites.
 * Prefer Surface directly: outlined (neutral), interactive (hover lift), elevated (overlays).
 */
export function Card({
  children,
  className,
  padding = 'md',
  interactive = false,
}: CardProps) {
  return (
    <Surface
      variant={interactive ? 'interactive' : 'outlined'}
      padding={padding}
      className={cn(className)}
    >
      {children}
    </Surface>
  );
}
