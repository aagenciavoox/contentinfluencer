import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { PageContainer } from './PageContainer';

interface PageLayoutProps {
  header?: ReactNode;
  toolbar?: ReactNode;
  mobileHeader?: ReactNode;
  mobileToolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  contentWidth?: 'narrow' | 'wide' | 'book' | 'full';
  /** Settings pages use secondary background */
  variant?: 'default' | 'settings';
}

export function PageLayout({
  header,
  toolbar,
  mobileHeader,
  mobileToolbar,
  children,
  className,
  contentClassName,
  contentWidth = 'narrow',
  variant = 'default',
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-x-hidden bg-[var(--bg-primary)] transition-colors duration-200',
        variant === 'settings' && 'min-h-screen bg-[var(--bg-secondary)]',
        className
      )}
    >
      {(header || toolbar) && (
        <header className="desktop-header-sticky hidden md:block">
          <div className="desktop-header-frame flex flex-col gap-3">
            {header}
            {toolbar}
          </div>
        </header>
      )}

      <main className="flex-1 overflow-auto">
        {mobileHeader ? (
          <div className="desktop-header-frame md:hidden">{mobileHeader}</div>
        ) : null}

        <PageContainer width={contentWidth} className={cn(variant === 'settings' && 'pb-20', contentClassName)}>
          {mobileToolbar ? <div className="mb-6 md:hidden">{mobileToolbar}</div> : null}
          {children}
        </PageContainer>
      </main>
    </div>
  );
}

/** @deprecated Use PageLayout */
export const PageScaffold = PageLayout;
