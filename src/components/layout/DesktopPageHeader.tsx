import { ReactNode } from 'react';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DesktopPageHeaderProps {
  section: string;
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  backLabel?: string;
  onBack?: () => void;
}

export function DesktopPageHeader({
  section,
  title,
  subtitle,
  meta,
  icon: Icon,
  actions,
  children,
  className,
  backLabel,
  onBack,
}: DesktopPageHeaderProps) {
  return (
    <header className={cn('mb-8 md:mb-10', className)}>
      {backLabel && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="t-button t-button-uppercase mb-5 hidden items-center gap-2 text-[var(--text-primary)] opacity-45 transition-opacity hover:opacity-80 md:flex"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0">
          <p className="t-label mb-2 text-[var(--text-tertiary)]">
            {section}
          </p>

          <div className="flex items-center gap-4">
            {Icon ? (
              <div className="hidden h-14 w-14 items-center justify-center rounded-[1.35rem] border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm md:flex">
                <Icon className="h-6 w-6 opacity-70" />
              </div>
            ) : null}

            <div className="min-w-0">
              <h1 className="t-page-title text-[var(--text-primary)]">
                {title}
              </h1>
              {subtitle ? (
                <p className="t-body-strong mt-2 max-w-2xl text-[var(--text-secondary)] md:mt-3">
                  {subtitle}
                </p>
              ) : null}
              {meta ? (
                <p className="t-label mt-2 text-[var(--text-tertiary)]">
                  {meta}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {actions ? <div className="md:shrink-0">{actions}</div> : null}
      </div>

      {children ? <div className="mt-6 md:mt-7">{children}</div> : null}
    </header>
  );
}
