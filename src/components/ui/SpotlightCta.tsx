import React from 'react';

export function SpotlightCta({children}: {children: React.ReactNode}) {
  return (
    <span className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-input)] border border-[var(--brand-accent)] bg-[var(--brand-accent)] px-3 text-[length:var(--font-size-button)] font-semibold text-[var(--brand-on-accent)]">
      {children}
    </span>
  );
}
