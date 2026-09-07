import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { SkeletonList } from './Skeleton';
import { AppButton } from './AppButton';
import { ERRORS } from '../../lib/uiCopy';
import {
  resolveQueryViewStatus,
  type QueryViewStatus,
  type ResolveQueryViewStatusInput,
} from './queryViewStatus';

export type { QueryViewStatus, ResolveQueryViewStatusInput };
export { resolveQueryViewStatus };

type QueryViewStateProps = {
  status: QueryViewStatus;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  errorMessage?: string | null;
  onRetry?: () => void;
  skeletonCount?: number;
  skeletonVariant?: 'card' | 'row' | 'content';
  children: ReactNode;
  compactEmpty?: boolean;
};

/** Renders loading / empty / error / ready for list-style queries. */
export function QueryViewState({
  status,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  emptyAction,
  errorMessage,
  onRetry,
  skeletonCount = 9,
  skeletonVariant = 'card',
  children,
  compactEmpty = true,
}: QueryViewStateProps) {
  if (status === 'loading') {
    return <SkeletonList count={skeletonCount} variant={skeletonVariant} />;
  }

  if (status === 'error') {
    return (
      <EmptyState
        compact={compactEmpty}
        title={ERRORS.carregarDados}
        description={errorMessage?.trim() || 'Verifique a conexão e tente de novo.'}
        action={
          onRetry ? (
            <AppButton type="button" variant="secondary" size="sm" onClick={onRetry}>
              Tentar novamente
            </AppButton>
          ) : undefined
        }
      />
    );
  }

  if (status === 'empty') {
    return (
      <EmptyState
        compact={compactEmpty}
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return <>{children}</>;
}
