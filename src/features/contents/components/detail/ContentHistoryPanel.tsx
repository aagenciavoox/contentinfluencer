import {ChevronDown, History} from 'lucide-react';
import {HistorySection} from './sections/HistorySection';
import type {Content} from '../../../../lib/database';

interface ContentHistoryPanelProps {
  content: Content;
  defaultOpen?: boolean;
}

export function ContentHistoryPanel({content, defaultOpen = false}: ContentHistoryPanelProps) {
  return (
    <details
      className="ds-card overflow-hidden bg-[var(--bg-secondary)]"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-xs font-semibold  text-[var(--text-tertiary)]">
          <History className="h-4 w-4" />
          Historico
        </span>
        <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
      </summary>
      <div className="border-t border-[var(--border-color)] p-2">
        <HistorySection content={content} compact />
      </div>
    </details>
  );
}
