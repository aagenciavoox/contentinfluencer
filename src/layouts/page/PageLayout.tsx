import { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';
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
  /** Vertical rhythm between direct page sections (default: operational 32px, settings 24px) */
  contentStack?: 'operational' | 'settings' | 'dense' | 'none';
  /** Settings pages use secondary background */
  variant?: 'default' | 'settings';
}

const contentStackClasses = {
  operational: 'stack-2xl',
  settings: 'stack-xl',
  dense: 'stack-lg',
  none: '',
} as const;

const headerWidthClasses = {
  narrow: 'desktop-header-frame',
  wide: 'desktop-header-frame-wide',
  book: 'desktop-header-frame-book',
  full: 'desktop-header-frame-full',
} as const;

export function PageLayout({
  header,
  toolbar,
  mobileHeader,
  mobileToolbar,
  children,
  className,
  contentClassName,
  contentWidth = 'wide',
  contentStack,
  variant = 'default',
}: PageLayoutProps) {
  const isMobile = useIsMobile();
  const resolvedStack =
    contentStack ?? (variant === 'settings' ? 'settings' : 'operational');

  return (
    <div
      className={cn(
        'flex min-h-full w-full flex-col overflow-x-hidden bg-[var(--bg-primary)] transition-colors duration-200',
        variant === 'settings' && 'bg-[var(--bg-secondary)]',
        className
      )}
    >
      {!isMobile && (header || toolbar) ? (
        <header className="desktop-header-sticky">
          <div className={cn(headerWidthClasses[contentWidth], 'stack-md')}>
            {header}
            {toolbar}
          </div>
        </header>
      ) : null}

      <main className="flex-1">
        {isMobile && mobileHeader ? (
          <div>{mobileHeader}</div>
        ) : null}

        <PageContainer
          width={contentWidth}
          className={cn(
            contentStackClasses[resolvedStack],
            variant === 'settings' && 'pb-20',
            contentClassName,
          )}
        >
          {isMobile && mobileToolbar ? <div className="mb-6">{mobileToolbar}</div> : null}
          {children}
        </PageContainer>
      </main>
    </div>
  );
}

/** @deprecated Use PageLayout */
export const PageScaffold = PageLayout;
