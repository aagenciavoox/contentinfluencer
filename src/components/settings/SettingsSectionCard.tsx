import type { ReactNode } from 'react';
import { Surface } from '../ui/Surface';
import { Text } from '../ui/Text';

interface SettingsSectionCardProps {
  title: string;
  padding?: 'md' | 'lg';
  icon?: ReactNode;
  description?: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
  badge?: ReactNode;
}

/** Cabeçalho de formulário e de card de configuração: título, ícone e descrição opcionais. */
export function SettingsSectionCard({
  title,
  padding = 'lg',
  icon,
  description,
  children,
  actions,
  className,
  badge,
}: SettingsSectionCardProps) {
  return (
    <Surface variant="outlined" padding={padding} className={className}>
      <div className="stack-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 stack-xs">
            <div className="flex min-w-0 items-center gap-2">
              {icon ? <span className="shrink-0 text-[var(--text-tertiary)]" aria-hidden>{icon}</span> : null}
              <Text variant="itemTitle" as="h3" className="min-w-0">{title}</Text>
              {badge}
            </div>
            {description ? <Text variant="secondary">{description}</Text> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        {children}
      </div>
    </Surface>
  );
}
