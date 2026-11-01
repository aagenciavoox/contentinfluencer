import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { useIsMobile } from '../../hooks/useIsMobile';
import { PageContainer } from './PageContainer';

interface PageLayoutProps {
  header?: ReactNode;
  navigation?: ReactNode;
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
  /** Mantém navegação e barra de controles presas ao topo ao rolar. */
  stickyHeader?: boolean;
}

const contentStackClasses = {
  operational: 'stack-2xl',
  settings: 'stack-xl',
  dense: 'stack-lg',
  none: '',
} as const;

export function PageLayout({
  header,
  navigation,
  toolbar,
  mobileHeader,
  mobileToolbar,
  children,
  className,
  contentClassName,
  contentWidth = 'wide',
  contentStack,
  variant = 'default',
  stickyHeader,
}: PageLayoutProps) {
  const isMobile = useIsMobile();
  const resolvedStack =
    contentStack ?? (variant === 'settings' ? 'settings' : 'operational');
  const stackClassName =
    isMobile && resolvedStack !== 'none'
      ? 'stack-md'
      : contentStackClasses[resolvedStack];
  const hasControls = Boolean(navigation || toolbar);
  const resolvedSticky = stickyHeader ?? (variant !== 'settings');

  return (
    <div
      className={cn(
        // clip contém o excesso horizontal sem criar um container de rolagem para o sticky.
        'flex min-h-full min-w-0 w-full flex-col overflow-x-clip transition-colors duration-200',
        // O min-h-full não pega no desktop (o pai só tem min-height), e o fundo da página
        // parava onde o conteúdo acabava. O <main> do desktop tem a altura da tela.
        !isMobile && 'min-h-screen',
        variant === 'settings'
          ? 'bg-[var(--bg-secondary)]'
          : 'bg-[var(--bg-primary)]',
        className,
      )}
    >
      {!isMobile && header ? (
        <header
          className={cn(
            'desktop-page-header-shell',
            hasControls && 'desktop-page-header-shell--with-controls',
          )}
        >
          <div className="desktop-header-frame">
            {header}
          </div>
        </header>
      ) : null}

      {!isMobile && hasControls ? (
        <div
          className={cn(
            'desktop-header-sticky',
            !resolvedSticky && 'desktop-header-static',
          )}
        >
          <div className="desktop-controls-frame stack-md">
            {navigation ? <div className="min-w-0">{navigation}</div> : null}
            {toolbar ? <div className="min-w-0">{toolbar}</div> : null}
          </div>
        </div>
      ) : null}

      <main className="min-w-0 flex-1">
        <PageContainer
          width={contentWidth}
          className={cn(
            stackClassName,
            variant === 'settings' && 'pb-20',
            contentClassName,
          )}
        >
          {isMobile && mobileHeader ? <div className="min-w-0">{mobileHeader}</div> : null}
          {isMobile && mobileToolbar ? <div className="min-w-0">{mobileToolbar}</div> : null}
          {children}
        </PageContainer>
      </main>
    </div>
  );
}
