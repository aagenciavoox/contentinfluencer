import {Children, ReactNode} from 'react';
import {cn} from '../../lib/utils';

interface DesktopPageHeaderProps {
  section: string;
  title: string;
  subtitle?: string;
  meta?: string;
  icon?: unknown;
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
  icon: _icon,
  actions,
  children,
  className,
  backLabel,
  onBack: _onBack,
}: DesktopPageHeaderProps) {
  const breadcrumbItems = [backLabel || section, title].filter(
    (item, index, array) => item && array.indexOf(item) === index
  );
  const actionItems = Children.toArray(actions).slice(0, 2);

  return (
    <header className={cn('w-full', className)}>
      <div className="md:hidden">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold leading-[1.14] tracking-normal text-[var(--text-primary)]">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-2 max-w-[36rem] text-[15px] font-normal leading-[1.55] text-[var(--text-secondary)]">
              {subtitle}
            </p>
          ) : null}

          {meta ? (
            <p className="mt-3 text-[12px] font-medium tracking-normal text-[var(--text-tertiary)]">
              {meta}
            </p>
          ) : null}
        </div>

        {actionItems.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {actionItems}
          </div>
        ) : null}

        {children ? <div className="pt-6">{children}</div> : null}
      </div>

      <div className="hidden md:block">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium leading-[1.4] text-[var(--text-tertiary)]">
              {breadcrumbItems.map((item, index) => (
                <div key={`${item}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? <span className="text-[var(--border-strong)]">/</span> : null}
                  <span className="truncate">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-2 min-w-0">
              <h1 className="text-[30px] font-semibold leading-[1.16] tracking-normal text-[var(--text-primary)]">
                {title}
              </h1>

              {subtitle ? (
                <p className="mt-2 max-w-[720px] text-[14px] font-normal leading-[1.55] text-[var(--text-secondary)]">
                  {subtitle}
                </p>
              ) : null}

              {meta ? (
                <p className="mt-1.5 text-[12px] font-medium text-[var(--text-tertiary)]">
                  {meta}
                </p>
              ) : null}
            </div>
          </div>

          {actionItems.length > 0 ? (
            <div className="flex shrink-0 items-center justify-end gap-2 self-start max-lg:w-full max-lg:flex-wrap">
              {actionItems}
            </div>
          ) : null}
        </div>

        <div className="mt-6 h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />

        {children ? <div className="pt-6">{children}</div> : null}
      </div>
    </header>
  );
}
