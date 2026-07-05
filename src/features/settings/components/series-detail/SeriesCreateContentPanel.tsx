import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Text } from '../../../../components/ui/Text';
import { AppButton } from '../../../../components/ui/AppButton';
import type { Content, Pilar, Serie } from '../../../../lib/database';
import {
  SeriesCreateContentForm,
  type SeriesCreateContentFormHandle,
} from './SeriesCreateContentForm';

interface SeriesCreateContentPanelProps {
  mode: 'roteiro' | 'ideia';
  serie: Serie;
  pilares: Pilar[];
  platformNames: string[];
  onCreate: (contents: Content[]) => Promise<void>;
}

export function SeriesCreateContentPanel({
  mode,
  serie,
  pilares,
  platformNames,
  onCreate,
}: SeriesCreateContentPanelProps) {
  const navigate = useNavigate();
  const formRef = useRef<SeriesCreateContentFormHandle>(null);

  const title = mode === 'ideia' ? 'Nova ideia' : 'Novo roteiro';
  const serieColor = serie.cor || '#6366f1';

  const handleSuccess = (contentId: string, action: 'draft' | 'open') => {
    if (action === 'open') {
      navigate(`/conteudos/${contentId}`);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-sm">
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: serieColor }} />

      <div className="shrink-0 border-b border-[var(--border-color)] px-6 py-4">
        <Text variant="sectionTitle">{title}</Text>
        <Text variant="meta" className="mt-1 text-[var(--text-tertiary)]">
          {serie.name}
        </Text>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        <SeriesCreateContentForm
          ref={formRef}
          key={mode}
          serie={serie}
          pilares={pilares}
          platformNames={platformNames}
          mode={mode}
          hideInlineSave
          onCreate={onCreate}
          onSuccess={handleSuccess}
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-4">
        <AppButton variant="primary" fullWidth onClick={() => void formRef.current?.saveAndOpen()}>
          Salvar e abrir editor
        </AppButton>
        <AppButton variant="secondary" fullWidth onClick={() => void formRef.current?.saveDraft()}>
          Salvar rascunho
        </AppButton>
      </div>
    </div>
  );
}
