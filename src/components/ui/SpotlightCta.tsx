import { Text } from './Text';
import React from 'react';

export function SpotlightCta({children}: {children: React.ReactNode}) {
  return (
    <Text variant="bodyStrong" as="span" className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-input)] border border-[var(--brand-accent)] bg-[var(--brand-accent)] px-3 text-[length:var(--font-size-button)] text-[var(--brand-on-accent)]">
      {children}
    </Text>
  );
}
