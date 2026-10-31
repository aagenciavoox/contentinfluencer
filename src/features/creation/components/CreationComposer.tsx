import {useEffect, useMemo, useState} from 'react';
import type {ContentPlataforma} from '../../../lib/database';
import {DestinationChips} from '../../editorial/components/DestinationChips';
import {destinosPadraoAtivos, publicacoesDosDestinos} from '../../editorial/lib/destinations';
import type {AppState} from '../../../app/providers/appState';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {IdeaQuickCapture} from '../../ideas/components/IdeaQuickCapture';
import {contasAtivas} from '../../contas/lib/contas';

export interface CreationIdeaInput {
  title: string;
  notes: string | null;
  pilarId: string | null;
  seriesId: string | null;
  bibliotecaItemId: string | null;
  plataformas: ContentPlataforma[];
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
  const [plataformas, setPlataformas] = useState<ContentPlataforma[]>([]);
  const catalogo = useMemo(
    () => contasAtivas(state.platforms),
    [state.platforms],
  );

  useEffect(() => {
    if (!open) return;
    setOriginId(initialOriginId);
    const destinos = destinosPadraoAtivos(state.editorial.destinosPadrao, catalogo);
    setPlataformas(publicacoesDosDestinos({destinos, contentId: ''}));
  }, [catalogo, initialOriginId, open, state.preferences]);

  const reset = () => {
    setTitle('');
    setNotes('');
    setPilarId('');
    setSeriesId('');
    setOriginId('');
    setPlataformas([]);
  };

  const close = () => {
    reset();
    onClose();
  };

  const save = () => {
    const normalizedTitle = title.trim();
    const normalizedNotes = notes.trim();
    if (!normalizedTitle && !normalizedNotes) return;

    const input: CreationIdeaInput = {
      title: normalizedTitle || 'Ideia sem título',
      notes: normalizedNotes || null,
      pilarId: pilarId || null,
      seriesId: seriesId || null,
      bibliotecaItemId: originId || null,
      plataformas,
    };
    reset();
    onClose();
    void Promise.resolve(onSave(input)).catch(() => {
      // O aviso de sucesso ou erro aparece sem segurar o formulário.
    });
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
        subtitle="Capture agora e transforme em roteiro depois."
        onClose={close}
      />
      <OverlayBody className="bg-[var(--bg-hover)]/30">
        <div className="mb-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <DestinationChips
            platforms={catalogo}
            publications={plataformas}
            contentId=""
            onChange={setPlataformas}
          />
        </div>
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
