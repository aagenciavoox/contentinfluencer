import {useState} from 'react';
import {cn} from '../../../lib/utils';
import type {Content, Pilar, Serie} from '../../../lib/database';
import {SeriesCreateContentForm} from './series-detail/SeriesCreateContentForm';

type BulkContentType = 'roteiro' | 'ideia';

interface SeriesBulkComposerProps {
  serie: Serie;
  pilares: Pilar[];
  platformNames: string[];
  onCreate: (contents: Content[]) => Promise<void>;
  /** Reduz altura do editor para fluxo mobile. */
  compact?: boolean;
}

export function SeriesBulkComposer({
  serie,
  pilares,
  platformNames,
  onCreate,
}: SeriesBulkComposerProps) {
  const [contentType, setContentType] = useState<BulkContentType>('roteiro');

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      <div className="flex flex-wrap gap-2">
        {(['roteiro', 'ideia'] as const).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => setContentType(type)}
            className={cn(
              'rounded-[var(--radius-pill)] px-4 py-2 text-xs font-semibold transition-colors',
              contentType === type
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : 'border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            {type === 'roteiro' ? 'Roteiro' : 'Ideia'}
          </button>
        ))}
      </div>

      <SeriesCreateContentForm
        serie={serie}
        pilares={pilares}
        platformNames={platformNames}
        mode={contentType}
        variant="compact"
        onCreate={onCreate}
      />
    </div>
  );
}
