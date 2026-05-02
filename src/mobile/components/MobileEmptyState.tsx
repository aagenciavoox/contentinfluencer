import type { ReactNode } from 'react';

interface MobileEmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function MobileEmptyState({
  title,
  description,
  action,
  icon,
}: MobileEmptyStateProps) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-8 text-center shadow-sm">
      {icon ? <div className="mb-4 flex justify-center text-[var(--text-tertiary)]">{icon}</div> : null}
      <div className="space-y-2">
        <p className="t-section-title text-[var(--text-primary)]">{title}</p>
        <p className="t-secondary">{description}</p>
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
