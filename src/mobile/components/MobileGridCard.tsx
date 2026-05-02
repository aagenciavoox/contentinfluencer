import type { ReactNode } from 'react';

interface MobileGridCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  footerClassName?: string;
}

export function MobileGridCard({
  title,
  subtitle,
  icon,
  footer,
  onClick,
  className,
  titleClassName,
  subtitleClassName,
  footerClassName,
}: MobileGridCardProps) {
  const content = (
    <div className={`flex min-h-36 flex-col justify-between rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm ${className ?? ''}`}>
      <div className="space-y-3">
        {icon ? <div className="text-[var(--text-secondary)]">{icon}</div> : null}
        <div className="space-y-1">
          <p className={`t-section-title text-[var(--text-primary)] ${titleClassName ?? ''}`}>{title}</p>
          {subtitle ? <p className={`t-secondary ${subtitleClassName ?? ''}`}>{subtitle}</p> : null}
        </div>
      </div>

      {footer ? <div className={footerClassName ?? 'mt-4'}>{footer}</div> : null}
    </div>
  );

  if (!onClick) return content;

  return (
    <button type="button" onClick={onClick} className="w-full text-left active:scale-[0.99]">
      {content}
    </button>
  );
}
