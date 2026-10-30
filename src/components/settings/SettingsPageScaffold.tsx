import React from 'react';
import { DesktopPageHeader } from '../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../layouts/page/PageLayout';
import { cn } from '../../lib/utils';

interface SettingsPageScaffoldProps {
  section?: string;
  title: string;
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  toolbar?: React.ReactNode;
  meta?: string;
  variant?: 'default' | 'settings';
  showBack?: boolean;
}

/** @deprecated Use PageLayout with variant="settings" */
export function SettingsPageScaffold({
  section = 'Configurações',
  title,
  backTo = '/configuracoes',
  backLabel = 'Configurações',
  actions,
  children,
  className,
  toolbar,
  meta,
  variant = 'settings',
  showBack = true,
}: SettingsPageScaffoldProps) {
  return (
    <PageLayout
      variant={variant}
      toolbar={toolbar}
      mobileToolbar={toolbar}
      className={cn(className)}
      header={
        <DesktopPageHeader
          section={section}
          title={title}
          {...(showBack ? { backLabel, backTo } : {})}
          actions={actions}
          meta={meta}
        />
      }
    >
      {children}
    </PageLayout>
  );
}
