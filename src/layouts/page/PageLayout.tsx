import type { ReactNode } from 'react';
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
  /** Espaçamento entre seções. No mobile, usa stack-md, exceto quando definido como none. */
  contentStack?: 'operational' | 'settings' | 'dense' | 'none';
  /** Páginas de configurações usam o fundo secundário. */
  variant?: 'default' | 'settings';
}

const contentStackClasses = {
  operational: 'stack-2xl',
  settings: 'stack-xl',
  dense: 'stack-lg',
  none: '',
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
  const stackClassName =
    isMobile && resolvedStack !== 'none'
      ? 'stack-md'
      : contentStackClasses[resolvedStack];

  return (
    <div
      className={cn(
        // clip contém o excesso horizontal sem criar um container de rolagem para o sticky.
        'flex min-h-full min-w-0 w-full flex-col overflow-x-clip transition-colors duration-200',
        variant === 'settings'
          ? 'bg-[var(--bg-secondary)]'
          : 'bg-[var(--bg-primary)]',
        className,
      )}
    >
      {!isMobile && (header || toolbar) ? (
        <header className="desktop-header-sticky">
          <div className="desktop-header-frame stack-lg">
            {header}
            {toolbar}
          </div>
        </header>
      ) : null}

      <main className="min-w-0 flex-1">
        {isMobile && mobileHeader ? <div>{mobileHeader}</div> : null}

        <PageContainer
          width={contentWidth}
          className={cn(
            stackClassName,
            variant === 'settings' && 'pb-20',
            contentClassName,
          )}
        >
          {isMobile && mobileToolbar ? <div>{mobileToolbar}</div> : null}
          {children}
        </PageContainer>
      </main>
    </div>
  );
}

/** @deprecated Use PageLayout. */
export const PageScaffold = PageLayout;
