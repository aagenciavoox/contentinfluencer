import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { PageContainer } from './PageContainer';

interface PageScaffoldProps {
  header?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentWidth?: 'narrow' | 'wide' | 'book' | 'full';
}

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
          <div className="desktop-header-frame flex flex-col gap-6">
            {header}
            {toolbar}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-auto">
        <PageContainer width={contentWidth} className={contentClassName}>
          {children}
        </PageContainer>
      </main>
    </div>
  );
}
