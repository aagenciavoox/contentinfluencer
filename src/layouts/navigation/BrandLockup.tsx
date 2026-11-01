import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Text } from '../../components/ui/Text';

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
        'flex min-w-0 items-center rounded-[var(--radius-input)] transition-opacity',
        collapsed ? 'justify-center' : 'gap-2.5',
        'hover:opacity-90 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]',
        className,
      )}
    >
      <img
        src="/brand/criaki-app-icon.png"
        alt=""
        className="h-8 w-8 shrink-0 rounded-[var(--radius-input)] object-cover ring-1 ring-[var(--border-color)]"
      />
      {collapsed ? null : (
        <Text variant="itemTitle" as="span" className="truncate tracking-tight">
          Criaki
        </Text>
      )}
    </Link>
  );
}

