import {ReactNode} from 'react';
import {cn} from '../../lib/utils';

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  interactive?: boolean;
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  className,
  interactive = false,
}: ListRowProps) {
  return (
    <div
      className={cn(
        'flex min-h-14 items-center gap-4 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3',
        interactive && 'transition-colors hover:bg-[#FAFAFB]',
        className
      )}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-[#0F172A]">{title}</div>
        {subtitle ? <div className="mt-1 text-[12px] text-[#6B7280]">{subtitle}</div> : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
