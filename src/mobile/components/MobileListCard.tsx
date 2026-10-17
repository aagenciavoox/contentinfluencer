import { useState, type ReactNode } from 'react';
import { Text } from '../../components/ui/Text';
import { Surface } from '../../components/ui/Surface';
import { cn } from '../../lib/utils';

interface MobileListCardProps {
  title: string;
  description?: string;
  eyebrow?: string;
  meta?: ReactNode;
  status?: ReactNode;
  trailing?: ReactNode;
  imageUrl?: string | null;
  onClick?: () => void;
  /** Nome do botão que cobre o card (padrão: o título). */
  actionLabel?: string;
  /** Card que liga e desliga uma seleção: anuncia o estado com aria-pressed. */
  selected?: boolean;
  className?: string;
}

export function MobileListCard({
  title,
  description,
  eyebrow,
  meta,
  status,
  trailing,
  imageUrl,
  onClick,
  actionLabel,
  selected,
  className,
}: MobileListCardProps) {
  const isClickable = Boolean(onClick);
  const coverSrc = /^https?:\/\//i.test(imageUrl?.trim() ?? '') ? imageUrl!.trim() : null;
  const [coverBroken, setCoverBroken] = useState(false);
  const content = (
    <div className={cn('flex gap-3', isClickable && 'pointer-events-none relative z-[1]', className)}>
      {coverSrc && !coverBroken ? (
        <img
          src={coverSrc}
          alt=""
          loading="lazy"
          onError={() => setCoverBroken(true)}
          className="h-16 w-12 shrink-0 rounded-[var(--radius-input)] object-cover"
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
      {status || eyebrow || trailing ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {status ?? (eyebrow ? <Text variant="label">{eyebrow}</Text> : null)}
          </div>
          {trailing ? (
            <div className={cn('card-actions shrink-0', isClickable && 'pointer-events-auto relative z-[2]')}>
              {trailing}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="min-w-0">
        {eyebrow && status ? <Text variant="label" className="mb-0.5">{eyebrow}</Text> : null}
        <Text variant="itemTitle" as="p" className="line-clamp-2 font-semibold leading-snug">
          {title}
        </Text>
        {description ? (
          <Text variant="secondary" className="mt-0.5 line-clamp-2">
            {description}
          </Text>
        ) : null}
      </div>

      {meta ? (
        <div className="mobile-list-card-meta flex flex-wrap items-center gap-1 pt-0.5">
          {meta}
        </div>
      ) : null}
      </div>
    </div>
  );

  if (onClick) {
    // Card clicável em qualquer ponto (DESIGN.md › Clicabilidade, regra 3): um botão cobre o card,
    // o texto deixa o toque passar e as ações à direita ficam por cima.
    return (
      <Surface
        variant="interactive"
        padding="sm"
        as="div"
        className="group relative w-full text-left"
      >
        <button
          type="button"
          onClick={onClick}
          aria-label={actionLabel ?? title}
          aria-pressed={selected}
          className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        />
        {content}
      </Surface>
    );
  }

  return (
    <Surface variant="outlined" padding="sm" className="group">
      {content}
    </Surface>
  );
}
