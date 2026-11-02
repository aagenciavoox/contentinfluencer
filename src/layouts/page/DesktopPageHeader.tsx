import { Children, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Text } from '../../components/ui/Text';

interface DesktopPageHeaderProps {
  /** Breadcrumb / section label shown above the title (e.g. 'Produção', 'Criação', 'Configurações'). */
  section: string;
  /** Main H1 title of the page. */
  title: string;
  /** Replaces the default title node (e.g. inline title editor). */
  titleContent?: ReactNode;
  /** Larger sans display weight for hero page titles (e.g. Dashboard). */
  titleVariant?: 'default' | 'display';
  /**
   * Optional operational support/description text for utility or complex onboarding screens.
   * Rendered directly below H1 with 4px top margin, 14px size and secondary neutral color.
   */
  subtitle?: ReactNode;
  /** Legacy support text / short count. */
  meta?: string;
  /** Observação curta depois do meta, num tom mais leve (ex.: onde fica outra coisa). */
  metaNote?: string;
  /** Ao lado do título: contagem ou selo (ex.: "69 publicações"). */
  titleAside?: ReactNode;
  /** Primary action button aligned to the far right. */
  actions?: ReactNode;
  className?: string;
  /** Parent section/page label for back navigation (e.g. '< Configurações', '< Criação'). */
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
  subtitle,
  meta,
  metaNote,
  titleAside,
  actions,
  className,
  backLabel,
  backTo,
  onBack,
  rowAlign = 'start',
}: DesktopPageHeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (backTo ? () => navigate(backTo) : undefined);
  const hasBack = Boolean(backTo || handleBack);
  const eyebrow = hasBack ? (backLabel === 'Roteiros' ? 'Criação' : (backLabel || section)) : section;
  const actionItems = Children.toArray(actions);
  const supportText = subtitle ?? meta;
  const crumbInteractiveClass =
    'desktop-page-header-crumb desktop-page-header-back inline-flex items-center text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

  return (
    <div className={cn('desktop-page-header w-full', className)}>
      {eyebrow ? (
        <div className="mb-1 flex items-center">
          {hasBack ? (
            backTo ? (
              <Link to={backTo} className={crumbInteractiveClass} aria-label={`Voltar para ${eyebrow}`}>
                <span>{eyebrow}</span>
              </Link>
            ) : (
              <button type="button" onClick={handleBack} className={crumbInteractiveClass} aria-label={`Voltar para ${eyebrow}`}>
                <span>{eyebrow}</span>
              </button>
            )
          ) : (
            <span className="desktop-page-header-crumb">
              {eyebrow}
            </span>
          )}
        </div>
      ) : null}

      <div className={cn('desktop-page-header-row flex items-start justify-between gap-6 min-h-[var(--control-height)]', rowAlign === 'center' && 'items-center')}>
        <div className="min-w-0 flex-1">
          <div className={cn('min-w-0', titleAside && 'flex items-center gap-3')}>
            {titleContent ?? (
              titleVariant === 'display' ? (
                <Text variant="display" as="h1" className="truncate text-[var(--text-primary)]">
                  {title}
                </Text>
              ) : (
                <Text variant="pageTitle" as="h1" className="truncate text-[var(--text-primary)]">
                  {title}
                </Text>
              )
            )}
            {titleAside ? <div className="flex shrink-0 items-center gap-2">{titleAside}</div> : null}
          </div>
          {supportText ? (
            <p className="mt-1 truncate t-body text-[var(--text-secondary)]">
              {supportText}
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
          <div className="flex shrink-0 items-center justify-end gap-2">
            {actionItems}
          </div>
        ) : null}
      </div>
    </div>
  );
}
