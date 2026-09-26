import type { LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { coverInitial } from '../../features/library/lib/libraryCoverFile';

interface MediaCardProps {
  imageUrl?: string | null;
  alt: string;
  placeholderIcon?: LucideIcon;
  /** Short type label shown under the initial when there is no cover. */
  placeholderLabel?: string;
  aspectRatio?: 'cover' | 'poster';
  className?: string;
  overlay?: ReactNode;
  onImageError?: () => void;
}

const ASPECT_CLASSES = {
  cover: 'aspect-[0.74]',
  poster: 'aspect-[2/3]',
} as const;

/** Shared cover/thumbnail frame for library and catalog grids. */
export function MediaCard({
  imageUrl,
  alt,
  placeholderIcon: PlaceholderIcon,
  placeholderLabel,
  aspectRatio = 'cover',
  className,
  overlay,
  onImageError,
}: MediaCardProps) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [imageUrl]);

  const showImage = Boolean(imageUrl) && !broken;

  return (
    <div
      className={cn(
        'media-card relative overflow-hidden rounded-[var(--radius-card-mobile)] bg-[var(--bg-hover)] shadow-none transition-all md:rounded-[var(--radius-card)]',
        ASPECT_CLASSES[aspectRatio],
        className,
      )}
    >
      {showImage ? (
        <img
          src={imageUrl!}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={() => {
            setBroken(true);
            onImageError?.();
          }}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--bg-hover)] p-3 text-center">
          <span
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-lg font-semibold text-[var(--text-primary)]"
            aria-hidden
          >
            {coverInitial(alt)}
          </span>
          {placeholderLabel ? (
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
              {placeholderLabel}
            </span>
          ) : PlaceholderIcon ? (
            <PlaceholderIcon className="h-5 w-5 text-[var(--text-tertiary)]" />
          ) : null}
        </div>
      )}
      {overlay}
    </div>
  );
}
