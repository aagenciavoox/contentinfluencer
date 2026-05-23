import {ReactNode} from 'react';
import {cn} from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'md' | 'lg';
  interactive?: boolean;
}

const paddingClasses = {
  md: 'p-4',
  lg: 'p-6',
} as const;

export function Card({
  children,
  className,
  padding = 'md',
  interactive = false,
}: CardProps) {
  return (
    <div
      className={cn(
        'editorial-card',
        paddingClasses[padding],
        interactive && 'editorial-card-interactive',
        className
      )}
    >
      {children}
    </div>
  );
}
