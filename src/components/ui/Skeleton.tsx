import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('surface-outlined flex flex-col overflow-hidden p-0', className)} aria-hidden="true">
      <Skeleton className="aspect-[0.74] w-full rounded-none" />
      <div className="stack-sm p-3 md:p-4">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Skeleton className="h-5 w-14 rounded-[var(--radius-pill)]" />
          <Skeleton className="h-5 w-16 rounded-[var(--radius-pill)]" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <div className={cn('surface-outlined stack-sm.5 p-3', className)} aria-hidden="true">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-12 rounded-[var(--radius-md)]" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-[var(--radius-pill)]" />
        <Skeleton className="h-5 w-20 rounded-[var(--radius-pill)]" />
      </div>
    </div>
  );
}

/** Skeleton for pipeline/publicados content cards — text layout, not library covers. */
export function SkeletonContentCard({ className }: SkeletonProps) {
  return (
    <div className={cn('surface-outlined stack-sm p-3', className)} aria-hidden="true">
      <div className="flex flex-wrap gap-1.5">
        <Skeleton className="h-5 w-14 rounded-[var(--radius-pill)]" />
        <Skeleton className="h-5 w-16 rounded-[var(--radius-pill)]" />
      </div>
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-full" />
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <Skeleton className="h-5 w-12 rounded-[var(--radius-pill)]" />
        <Skeleton className="h-5 w-20 rounded-[var(--radius-pill)]" />
      </div>
      <Skeleton className="h-3 w-2/5" />
    </div>
  );
}

interface SkeletonListProps {
  count?: number;
  variant?: 'card' | 'content' | 'row';
  className?: string;
}

const SKELETON_LIST_GRID: Record<'card' | 'content', string> = {
  card: 'grid-catalog',
  content: 'grid-content',
};

export function SkeletonList({ count = 6, variant = 'row', className }: SkeletonListProps) {
  const Item =
    variant === 'card' ? SkeletonCard : variant === 'content' ? SkeletonContentCard : SkeletonRow;

  return (
    <div
      className={cn(variant === 'row' ? 'stack-sm.5' : SKELETON_LIST_GRID[variant], className)}
      aria-busy="true"
      aria-label="Carregando"
    >
      {Array.from({ length: count }, (_, index) => (
        <Item key={index} />
      ))}
    </div>
  );
}
