import { useState } from 'react';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { Content, Pilar, Serie } from '../../../lib/database';
import { SeriesCreateContentForm } from './series-detail/SeriesCreateContentForm';

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
  compact = false,
}: SeriesBulkComposerProps) {
  const [contentType, setContentType] = useState<BulkContentType>('roteiro');

  return (
    <Surface
      variant="outlined"
      padding={compact ? 'md' : 'lg'}
      className="stack-lg"
    >
      <div className="stack-sm">
        <Text variant="sectionTitle">Criar</Text>
        <Text variant="meta" className="text-[var(--text-secondary)]">
          {contentType === 'ideia' ? 'Nova ideia nesta série' : 'Novo roteiro nesta série'}
        </Text>
        <SegmentTabs
          value={contentType}
          onChange={setContentType}
          options={[
            { id: 'roteiro', label: 'Roteiro' },
            { id: 'ideia', label: 'Ideia' },
          ]}
        />
      </div>

      <SeriesCreateContentForm
        key={contentType}
        serie={serie}
        pilares={pilares}
        platformNames={platformNames}
        mode={contentType}
        variant={compact ? 'compact' : 'default'}
        onCreate={onCreate}
      />
    </Surface>
  );
}
