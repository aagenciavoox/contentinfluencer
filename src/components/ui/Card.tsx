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
        'rounded-2xl border border-[#E5E7EB] bg-white',
        paddingClasses[padding],
        interactive && 'transition-colors hover:bg-[#FAFAFB]',
        className
      )}
    >
      {children}
    </div>
  );
}
