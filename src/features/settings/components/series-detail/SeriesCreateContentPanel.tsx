import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppButton } from '../../../../components/ui/AppButton';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import type { Content, Pilar, Serie } from '../../../../lib/database';
import { buildDetailBackState } from '../../../../lib/navigation/detailBack';
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
  onClose: () => void;
}

export function SeriesCreateContentPanel({
  mode,
  serie,
  pilares,
  platformNames,
  onCreate,
  onClose,
}: SeriesCreateContentPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef<SeriesCreateContentFormHandle>(null);

  const title = mode === 'ideia' ? 'Nova ideia' : 'Novo roteiro';
  const serieColor = serie.cor || '#6366f1';

  const handleSuccess = (contentId: string, action: 'draft' | 'open') => {
    onClose();
    if (action === 'open') {
      navigate(
        `/conteudos/${contentId}`,
        buildDetailBackState(`${location.pathname}${location.search}`),
      );
    }
  };

  return (
    <>
      <div className="h-1 w-full shrink-0" style={{ backgroundColor: serieColor }} />

      <OverlayHeader title={title} subtitle={serie.name} onClose={onClose} />

      <OverlayBody>
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
      </OverlayBody>

      <OverlayFooter className="flex-wrap justify-end">
        <AppButton variant="secondary" onClick={onClose}>
          Cancelar
        </AppButton>
        <AppButton variant="secondary" onClick={() => void formRef.current?.saveDraft()}>
          Salvar rascunho
        </AppButton>
        <AppButton variant="primary" onClick={() => void formRef.current?.saveAndOpen()}>
          Salvar e abrir editor
        </AppButton>
      </OverlayFooter>
    </>
  );
}
