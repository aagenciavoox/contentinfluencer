import {ReactNode} from 'react';
import {cn} from '../../lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  width?: 'narrow' | 'wide' | 'book' | 'full';
}

const widthClasses = {
  narrow: 'desktop-content-frame',
  wide: 'desktop-content-frame',
  book: 'desktop-content-frame',
  full: 'desktop-content-frame',
} as const;

export function PageContainer({
  children,
  className,
  width = 'wide',
}: PageContainerProps) {
  return <div className={cn(widthClasses[width], className)}>{children}</div>;
}
