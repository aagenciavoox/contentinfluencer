import { Children, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Text } from '../../components/ui/Text';

interface DesktopPageHeaderProps {
  /** Eyebrow / section label shown above the title. Doubles as the back link when `backTo`/`onBack` is set. */
  section: string;
  title: string;
  /** Editorial serif display for hero page titles (e.g. Dashboard "Hoje"). */
  titleVariant?: 'default' | 'display';
  /** @deprecated Use meta or inline hints in page content instead. */
  subtitle?: string;
  meta?: string;
  icon?: unknown;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  backLabel?: string;
  backTo?: string;
  onBack?: () => void;
  /** Hide the global search trigger in the topbar (default: shown). */
  hideSearch?: boolean;
}

function openGlobalSearch() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true }));
}

function GlobalSearchButton() {
  return (
    <button
      type="button"
      onClick={openGlobalSearch}
      aria-label="Busca global"
      title="Busca global (Ctrl K)"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <Search className="h-4 w-4" />
    </button>
  );
}

export function DesktopPageHeader({
  section,
  title,
  titleVariant = 'default',
  meta,
  actions,
  children,
  className,
  backLabel,
  backTo,
  onBack,
  hideSearch = false,
}: DesktopPageHeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (backTo ? () => navigate(backTo) : undefined);
  const eyebrow = backLabel || section;
  const hasBack = Boolean(backTo || handleBack);
  const actionItems = Children.toArray(actions);
  const eyebrowInteractiveClass =
    'transition-colors hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

  return (
    <header className={cn('w-full', className)}>
      {eyebrow ? (
        hasBack ? (
          backTo ? (
            <Link to={backTo} className={eyebrowInteractiveClass}>
              <Text variant="eyebrow" as="span">
                {eyebrow}
              </Text>
            </Link>
          ) : (
            <button type="button" onClick={handleBack} className={eyebrowInteractiveClass}>
              <Text variant="eyebrow" as="span">
                {eyebrow}
              </Text>
            </button>
          )
        ) : (
          <Text variant="eyebrow">{eyebrow}</Text>
        )
      ) : null}

      <div className="mt-1.5 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {titleVariant === 'display' ? (
            <Text variant="display" className="truncate">{title}</Text>
          ) : (
            <Text variant="pageTitle" className="truncate">
              {title}
            </Text>
          )}
          {meta ? (
            <Text variant="meta" className="mt-1.5 truncate">
              {meta}
            </Text>
          ) : null}
        </div>

        {actionItems.length > 0 || !hideSearch ? (
          <div className="flex shrink-0 items-center justify-end gap-2">
            {!hideSearch ? <GlobalSearchButton /> : null}
            {actionItems}
          </div>
        ) : null}
      </div>

      {children ? <div className="pt-4">{children}</div> : null}
    </header>
  );
}
