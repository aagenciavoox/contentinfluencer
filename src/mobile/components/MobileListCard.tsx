import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface MobileListCardProps {
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: ReactNode;
  status?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function MobileListCard({
  title,
  description,
  eyebrow,
  meta,
  status,
  trailing,
  onClick,
  className,
}: MobileListCardProps) {
  const content = (
    <div className={cn('rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm', className)}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {eyebrow ? <p className="t-label text-[var(--text-tertiary)]">{eyebrow}</p> : null}
          <p className="t-section-title text-[var(--text-primary)]">{title}</p>
          {description ? <p className="t-body text-[var(--text-secondary)]">{description}</p> : null}
          {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>

        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>

      {status ? <div className="mt-3">{status}</div> : null}
    </div>
  );

  if (!onClick) return content;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className="w-full text-left active:scale-[0.99]"
    >
      {content}
    </div>
  );
}
