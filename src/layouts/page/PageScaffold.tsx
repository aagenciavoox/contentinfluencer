import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { PageContainer } from './PageContainer';

interface PageScaffoldProps {
  header?: ReactNode;
  toolbar?: ReactNode;
  mobileHeader?: ReactNode;
  mobileToolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentWidth?: 'narrow' | 'wide' | 'book' | 'full';
}

export function PageScaffold({
  header,
  toolbar,
  mobileHeader,
  mobileToolbar,
  children,
  className,
  contentClassName,
  contentWidth = 'narrow',
}: PageScaffoldProps) {
  return (
    <div className={cn('h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-200 w-full overflow-x-hidden', className)}>
      {(header || toolbar) && (
        <header className="desktop-header-sticky hidden md:block">
          <div className="desktop-header-frame flex flex-col gap-6">
            {header}
            {toolbar}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-auto">
        {mobileHeader ? (
          <div className="desktop-header-frame md:hidden">
            {mobileHeader}
          </div>
        ) : null}

        <PageContainer width={contentWidth} className={contentClassName}>
          {mobileToolbar ? <div className="mb-6 md:hidden">{mobileToolbar}</div> : null}
          {children}
        </PageContainer>
      </main>
    </div>
  );
}
