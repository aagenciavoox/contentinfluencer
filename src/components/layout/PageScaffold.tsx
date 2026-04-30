import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface PageScaffoldProps {
  header?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentWidth?: 'narrow' | 'wide' | 'book' | 'full';
}

const contentWidthClasses = {
  narrow: 'desktop-content-frame',
  wide: 'desktop-content-frame-wide',
  book: 'desktop-content-frame-book',
  full: 'px-4 md:px-10 py-6 md:py-10',
} as const;

export function PageScaffold({
  header,
  toolbar,
  children,
  className,
  contentClassName,
  contentWidth = 'narrow',
}: PageScaffoldProps) {
  return (
    <div className={cn('h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-200 w-full overflow-x-hidden', className)}>
      {(header || toolbar) && (
        <header className="desktop-header-sticky">
          <div className="desktop-header-frame flex flex-col gap-3 md:gap-6">
            {header}
            {toolbar}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-auto">
        <div className={cn(contentWidthClasses[contentWidth], contentClassName)}>
          {children}
        </div>
      </main>
    </div>
  );
}
