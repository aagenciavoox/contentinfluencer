import {ReactNode} from 'react';
import {cn} from '../../lib/utils';
import {Surface} from './Surface';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'md' | 'lg';
  interactive?: boolean;
}

const paddingMap = {
  md: 'md' as const,
  lg: 'lg' as const,
};

/** @deprecated Prefer Surface directly */
export function Card({
  children,
  className,
  padding = 'md',
  interactive = false,
}: CardProps) {
  return (
    <Surface
      variant={interactive ? 'interactive' : 'outlined'}
      padding={paddingMap[padding]}
      className={cn('editorial-card shadow-none', className)}
    >
      {children}
    </Surface>
  );
}
