import React from 'react';
import { LucideIcon } from 'lucide-react';
import { DesktopPageHeader } from '../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../layouts/page/PageLayout';
import { cn } from '../../lib/utils';

interface SettingsPageScaffoldProps {
  section?: string;
  title: string;
  icon: LucideIcon;
  backTo?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  toolbar?: React.ReactNode;
  variant?: 'default' | 'settings';
  showBack?: boolean;
}

/** @deprecated Use PageLayout with variant="settings" */
export function SettingsPageScaffold({
  section = 'Configurações',
  title,
  icon,
  backTo = '/configuracoes',
  backLabel = 'Configurações',
  actions,
  children,
  className,
  toolbar,
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
          icon={icon}
          {...(showBack ? { backLabel, backTo } : {})}
          actions={actions}
        />
      }
    >
      {children}
    </PageLayout>
  );
}
