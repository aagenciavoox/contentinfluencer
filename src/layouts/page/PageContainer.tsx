import {ReactNode} from 'react';
import {cn} from '../../lib/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  width?: 'narrow' | 'wide' | 'book' | 'full';
}

const widthClasses = {
  narrow: 'desktop-content-frame',
  wide: 'desktop-content-frame-wide',
  book: 'desktop-content-frame-book',
  full: 'px-4 md:px-6 py-6 md:py-8',
} as const;

export function PageContainer({
  children,
  className,
  width = 'narrow',
}: PageContainerProps) {
  return <div className={cn(widthClasses[width], className)}>{children}</div>;
}
