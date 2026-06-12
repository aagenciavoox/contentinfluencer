import { Children, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Text } from '../../components/ui/Text';

interface DesktopPageHeaderProps {
  section: string;
  title: string;
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
}

function BreadcrumbTrail({
  items,
  onParentClick,
  parentHref,
}: {
  items: string[];
  onParentClick?: () => void;
  parentHref?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
      {items.map((item, index) => {
        const isParent = index === 0 && items.length > 1;
        const isCurrent = index === items.length - 1;

        return (
          <div key={`${item}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? <span className="text-[var(--border-strong)]">/</span> : null}
            {isParent && parentHref ? (
              <Link
                to={parentHref}
                className="t-meta truncate transition-colors hover:text-[var(--text-primary)]"
              >
                {item}
              </Link>
            ) : isParent && onParentClick ? (
              <button
                type="button"
                onClick={onParentClick}
                className="t-meta truncate transition-colors hover:text-[var(--text-primary)]"
              >
                {item}
              </button>
            ) : (
              <Text variant="meta" as="span" className={cn('truncate', isCurrent && 'text-[var(--text-secondary)]')}>
                {item}
              </Text>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DesktopPageHeader({
  section,
  title,
  meta,
  icon: _icon,
  actions,
  children,
  className,
  backLabel,
  backTo,
  onBack,
}: DesktopPageHeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (backTo ? () => navigate(backTo) : undefined);
  const breadcrumbItems = [backLabel || section, title].filter(
    (item, index, array) => item && array.indexOf(item) === index
  );
  const actionItems = Children.toArray(actions);
  const breadcrumbProps = {
    items: breadcrumbItems,
    onParentClick: backTo ? undefined : handleBack,
    parentHref: backTo,
  };

  return (
    <header className={cn('w-full', className)}>
      <div className="md:hidden">
        <BreadcrumbTrail {...breadcrumbProps} />

        <div className="mt-1.5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Text variant="pageTitle" as="h1" truncate>
              {title}
            </Text>
            {meta ? (
              <Text variant="meta" className="mt-1 truncate">
                {meta}
              </Text>
            ) : null}
          </div>

          {actionItems.length > 0 ? (
            <div className="flex shrink-0 items-center gap-2">{actionItems}</div>
          ) : null}
        </div>

        {children ? <div className="pt-4">{children}</div> : null}
      </div>

      <div className="hidden md:block">
        <BreadcrumbTrail {...breadcrumbProps} />

        <div className="mt-1 flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Text variant="pageTitle" as="h1" truncate>
              {title}
            </Text>
            {meta ? (
              <Text variant="meta" className="mt-0.5 truncate">
                {meta}
              </Text>
            ) : null}
          </div>

          {actionItems.length > 0 ? (
            <div className="flex shrink-0 items-center justify-end gap-2">{actionItems}</div>
          ) : null}
        </div>

        {children ? <div className="pt-4">{children}</div> : null}
      </div>
    </header>
  );
}
