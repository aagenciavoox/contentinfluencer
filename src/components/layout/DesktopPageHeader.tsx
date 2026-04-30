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
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium leading-[1.4] text-[#8A8F98]">
            {breadcrumbItems.map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-center gap-2">
                {index > 0 ? <span>/</span> : null}
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 min-w-0">
            <h1 className="text-[24px] font-semibold leading-[1.25] text-[#0F172A]">
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-1 max-w-[720px] text-[14px] font-normal leading-[1.5] text-[#6B7280]">
                {subtitle}
              </p>
            ) : null}

            {meta ? (
              <p className="mt-1.5 text-[12px] font-medium text-[#8A8F98]">
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

      <div className="mt-4 border-t border-[#E5E7EB]" />

      {children ? <div className="pt-6">{children}</div> : null}
    </header>
  );
}
