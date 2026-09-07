import { Children, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Text } from '../../components/ui/Text';

interface DesktopPageHeaderProps {
  /** Breadcrumb / section label shown above the title. Doubles as the back link when `backTo`/`onBack` is set. */
  section: string;
  title: string;
  /** Replaces the default title node (e.g. inline title editor). */
  titleContent?: ReactNode;
  /** Larger sans display weight for hero page titles (e.g. Dashboard). */
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
  /** @deprecated Global search lives in the sidebar (Ctrl K). */
  hideSearch?: boolean;
}

export function DesktopPageHeader({
  section,
  title,
  titleContent,
  titleVariant = 'default',
  meta,
  actions,
  children,
  className,
  backLabel,
  backTo,
  onBack,
}: DesktopPageHeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (backTo ? () => navigate(backTo) : undefined);
  const eyebrow = backLabel || section;
  const hasBack = Boolean(backTo || handleBack);
  const actionItems = Children.toArray(actions);
  const crumbInteractiveClass =
    'desktop-page-header-crumb transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

  return (
    <header className={cn('desktop-page-header', className)}>
      {eyebrow ? (
        hasBack ? (
          backTo ? (
            <Link to={backTo} className={crumbInteractiveClass}>
              {eyebrow}
            </Link>
          ) : (
            <button type="button" onClick={handleBack} className={crumbInteractiveClass}>
              {eyebrow}
            </button>
          )
        ) : (
          <span className="desktop-page-header-crumb">{eyebrow}</span>
        )
      ) : null}

      <div className="desktop-page-header-row">
        <div className="min-w-0 flex-1">
          {titleContent ?? (
            titleVariant === 'display' ? (
              <Text variant="display" className="truncate">{title}</Text>
            ) : (
              <Text variant="pageTitle" className="truncate">
                {title}
              </Text>
            )
          )}
          {meta ? (
            <Text variant="meta" className="mt-1.5 truncate">
              {meta}
            </Text>
          ) : null}
        </div>

        {actionItems.length > 0 ? (
          <div className="flex shrink-0 items-start justify-end gap-2">
            {actionItems}
          </div>
        ) : null}
      </div>

      {children ? <div className="pt-4">{children}</div> : null}
    </header>
  );
}
