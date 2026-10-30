import { Children, ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
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
  meta?: string;
  /** Observação curta depois do meta, num tom mais leve (ex.: onde fica outra coisa). */
  metaNote?: string;
  /** Ao lado do título: contagem ou selo (ex.: "69 publicações"). */
  titleAside?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  backLabel?: string;
  backTo?: string;
  onBack?: () => void;
  /** Vertically center the title and the header actions. */
  rowAlign?: 'start' | 'center';
}

export function DesktopPageHeader({
  section,
  title,
  titleContent,
  titleVariant = 'default',
  meta,
  metaNote,
  titleAside,
  actions,
  children,
  className,
  backLabel,
  backTo,
  onBack,
  rowAlign = 'start',
}: DesktopPageHeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (backTo ? () => navigate(backTo) : undefined);
  const eyebrow = backLabel === 'Roteiros' ? 'Criação' : backLabel || section;
  const hideEyebrow = !backLabel && section === title;
  const hasBack = Boolean(backTo || handleBack);
  const actionItems = Children.toArray(actions);
  const crumbInteractiveClass =
    'desktop-page-header-crumb desktop-page-header-back transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

  return (
    <header className={cn('desktop-page-header', className)}>
      {!hideEyebrow && eyebrow ? (
        hasBack ? (
          backTo ? (
            <Link to={backTo} className={crumbInteractiveClass}>
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {eyebrow}
            </Link>
          ) : (
            <button type="button" onClick={handleBack} className={crumbInteractiveClass}>
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {eyebrow}
            </button>
          )
        ) : (
          <span className="desktop-page-header-crumb">{eyebrow}</span>
        )
      ) : null}

      <div className={cn('desktop-page-header-row', rowAlign === 'center' && 'items-center')}>
        <div className="min-w-0 flex-1">
          <div className={cn('min-w-0', titleAside && 'flex items-center gap-3')}>
            {titleContent ?? (
              titleVariant === 'display' ? (
                <Text variant="display" className="truncate">{title}</Text>
              ) : (
                <Text variant="pageTitle" className="truncate">
                  {title}
                </Text>
              )
            )}
            {titleAside ? <div className="flex shrink-0 items-center gap-2">{titleAside}</div> : null}
          </div>
          {meta ? (
            <p className="mt-1.5 truncate t-body text-[var(--text-secondary)]">
              {meta}
              {metaNote ? (
                <>
                  <span aria-hidden className="mx-2 text-[var(--text-tertiary)]">·</span>
                  <span className="t-secondary text-[var(--text-tertiary)]">{metaNote}</span>
                </>
              ) : null}
            </p>
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
