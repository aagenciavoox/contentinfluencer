import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Section } from '../ui/Section';
import { Surface } from '../ui/Surface';

interface SettingsSectionCardProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export function SettingsSectionCard({
  title,
  icon: Icon,
  description,
  children,
  actions,
  className,
  badge,
}: SettingsSectionCardProps) {
  const titleNode = (
    <span className="flex items-center gap-2">
      {Icon ? <Icon className="h-4 w-4 text-[var(--text-tertiary)]" /> : null}
      <span>{title}</span>
      {badge}
    </span>
  );

  return (
    <Surface variant="outlined" padding="lg" className={className}>
      <Section title={titleNode} description={description} action={actions}>
        {children}
      </Section>
    </Surface>
  );
}
