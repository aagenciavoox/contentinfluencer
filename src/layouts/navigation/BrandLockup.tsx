import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

interface BrandLockupProps {
  collapsed?: boolean;
  className?: string;
  onNavigate?: () => void;
}

export function BrandLockup({ collapsed = false, className, onNavigate }: BrandLockupProps) {
  return (
    <Link
      to="/hoje"
      aria-label="Criaki"
      onClick={onNavigate}
      className={cn(
        'flex min-w-0 items-center rounded-md transition-opacity',
        collapsed ? 'justify-center' : 'gap-2.5',
        'hover:opacity-90 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]',
        className,
      )}
    >
      <img
        src="/brand/criaki-app-icon.png"
        alt=""
        className="h-8 w-8 shrink-0 rounded-md object-cover ring-1 ring-[var(--border-color)]"
      />
      {collapsed ? null : (
        <span className="truncate text-sm font-semibold tracking-tight text-[var(--text-primary)]">
          Criaki
        </span>
      )}
    </Link>
  );
}

