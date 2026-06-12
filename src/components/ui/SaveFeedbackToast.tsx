import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  getSaveFeedbackState,
  subscribeSaveFeedback,
  type SaveFeedbackState,
} from '../../lib/saveFeedback';

export function SaveFeedbackToast() {
  const [feedback, setFeedback] = useState<SaveFeedbackState>(() => getSaveFeedbackState());

  useEffect(() => subscribeSaveFeedback(() => setFeedback(getSaveFeedbackState())), []);

  if (feedback.status === 'idle') return null;

  const tone =
    feedback.status === 'error'
      ? 'border-red-500/30 bg-[color-mix(in_srgb,var(--bg-secondary)_94%,#ef4444_6%)] text-red-100'
      : feedback.status === 'success'
        ? 'border-emerald-500/30 bg-[color-mix(in_srgb,var(--bg-secondary)_94%,#10b981_6%)] text-emerald-50'
        : 'border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-secondary)_94%,transparent)] text-[var(--text-primary)]';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[120] flex justify-center px-4 md:bottom-6 md:justify-end md:pr-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'pointer-events-auto flex max-w-md items-start gap-3 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border px-4 py-3 shadow-none backdrop-blur-md',
          tone
        )}
      >
        {feedback.status === 'saving' ? (
          <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
        ) : feedback.status === 'success' ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold">{feedback.message}</p>
          {feedback.detail ? (
            <p className="mt-1 text-xs font-semibold opacity-80">{feedback.detail}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
