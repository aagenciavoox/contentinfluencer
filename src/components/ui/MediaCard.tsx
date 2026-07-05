import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface MediaCardProps {
  imageUrl?: string | null;
  alt: string;
  placeholderIcon?: LucideIcon;
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
  return (
    <div
      className={cn(
        'media-card relative overflow-hidden rounded-[var(--radius-card-mobile)] bg-[var(--bg-hover)] shadow-none transition-all md:rounded-[var(--radius-card)]',
        ASPECT_CLASSES[aspectRatio],
        className,
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={(event) => {
            (event.target as HTMLImageElement).style.display = 'none';
            onImageError?.();
          }}
        />
      ) : PlaceholderIcon ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3">
          <PlaceholderIcon className="h-8 w-8 text-[var(--text-tertiary)]" />
          {placeholderLabel ? (
            <span className="text-center text-xs font-bold leading-tight text-[var(--text-tertiary)]">
              {placeholderLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      {overlay}
    </div>
  );
}
