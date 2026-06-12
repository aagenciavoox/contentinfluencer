import {ReactNode} from 'react';
import {cn} from '../../lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[240px] flex-col items-center justify-center rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-dashed border-[#E5E7EB] bg-white px-6 py-10 text-center',
        className
      )}
    >
      <div className="mb-4 text-[#9CA3AF]">{icon}</div>
      <h3 className="text-[18px] font-semibold text-[#0F172A]">{title}</h3>
      <p className="mt-2 max-w-md text-[14px] text-[#6B7280]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
