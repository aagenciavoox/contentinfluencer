import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Text } from './Text';

export function OperationalList({
  title,
  icon: Icon,
  empty,
  seeAllHref,
  seeAllLabel,
  children,
}: {
  title: string;
  icon: React.ElementType;
  empty: string;
  seeAllHref: string;
  seeAllLabel: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const items = React.Children.toArray(children);

  return (
    <div className="editorial-card p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />
          <Text variant="itemTitle" as="h3">
            {title}
          </Text>
        </div>
      </div>

      <div className="space-y-1">
        {items.length > 0 ? (
          items
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-7 text-center">
            <Icon className="h-5 w-5 text-[var(--text-tertiary)] opacity-40" />
            <Text variant="meta">{empty}</Text>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate(seeAllHref)}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-input)] py-2.5 text-sm font-medium text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        {seeAllLabel}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}
