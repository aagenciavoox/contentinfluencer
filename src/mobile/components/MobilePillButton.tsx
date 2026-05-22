import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface MobilePillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'default' | 'success' | 'danger' | 'muted';
}

const TONE_CLASS: Record<NonNullable<MobilePillButtonProps['tone']>, string> = {
  default: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
  success: 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]',
  danger: 'bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]',
  muted: 'bg-[var(--bg-hover)] text-[var(--text-tertiary)] opacity-60',
};

export function MobilePillButton({
  tone = 'default',
  className,
  children,
  type = 'button',
  ...props
}: MobilePillButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[11px] font-black uppercase tracking-[0.14em] transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40',
        TONE_CLASS[tone],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
