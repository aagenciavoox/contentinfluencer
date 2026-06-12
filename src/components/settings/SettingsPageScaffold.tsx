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
  /** Reduz padding vertical do conteúdo */
  compact?: boolean;
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
  compact = false,
}: SettingsPageScaffoldProps) {
  return (
    <PageLayout
      variant="settings"
      className={cn(className)}
      contentClassName={cn(compact && '!py-4 !px-4 md:!px-6 !pb-16')}
      header={
        <DesktopPageHeader
          section={section}
          title={title}
          icon={icon}
          backLabel={backLabel}
          backTo={backTo}
          actions={actions}
        />
      }
    >
      {children}
    </PageLayout>
  );
}
