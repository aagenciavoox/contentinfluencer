import {useEffect, useState} from 'react';
import type {AppState} from '../../../app/providers/appState';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {IdeaQuickCapture} from '../../ideas/components/IdeaQuickCapture';

export interface CreationIdeaInput {
  title: string;
  notes: string | null;
  pilarId: string | null;
  seriesId: string | null;
  bibliotecaItemId: string | null;
}

interface CreationComposerProps {
  open: boolean;
  state: AppState;
  initialOriginId?: string;
  onClose: () => void;
  onSave: (input: CreationIdeaInput) => void | Promise<void>;
}

export function CreationComposer({
  open,
  state,
  initialOriginId = '',
  onClose,
  onSave,
}: CreationComposerProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [pilarId, setPilarId] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [originId, setOriginId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOriginId(initialOriginId);
  }, [initialOriginId, open]);

  const reset = () => {
    setTitle('');
    setNotes('');
    setPilarId('');
    setSeriesId('');
    setOriginId('');
  };

  const close = () => {
    if (isSaving) return;
    reset();
    onClose();
  };

  const save = async () => {
    const normalizedTitle = title.trim();
    const normalizedNotes = notes.trim();
    if (!normalizedTitle && !normalizedNotes) return;

    setIsSaving(true);
    try {
      await onSave({
        title: normalizedTitle || 'Ideia sem título',
        notes: normalizedNotes || null,
        pilarId: pilarId || null,
        seriesId: seriesId || null,
        bibliotecaItemId: originId || null,
      });
      reset();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      desktopMaxW="md:max-w-2xl"
      ariaLabel="Capturar nova ideia"
    >
      <OverlayHeader
        title="Nova ideia"
        subtitle="Capture agora; organize e transforme em roteiro quando fizer sentido."
        onClose={close}
      />
      <OverlayBody className="bg-[var(--bg-hover)]/30">
        <IdeaQuickCapture
          title={title}
          notes={notes}
          selectedPilarId={pilarId}
          selectedSeries={seriesId}
          selectedBibliotecaId={originId}
          state={state}
          onTitleChange={setTitle}
          onNotesChange={setNotes}
          onSelectedPilarIdChange={setPilarId}
          onSelectedSeriesChange={setSeriesId}
          onSelectedBibliotecaIdChange={setOriginId}
          onSave={() => void save()}
          variant="default"
        />
      </OverlayBody>
    </Dialog>
  );
}
