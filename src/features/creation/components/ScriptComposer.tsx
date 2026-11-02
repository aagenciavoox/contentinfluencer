import {useEffect, useMemo, useState} from 'react';
import type {ContentPlataforma} from '../../../lib/database';
import {DestinationChips} from '../../editorial/components/DestinationChips';
import {destinosPadraoAtivos, publicacoesDosDestinos} from '../../editorial/lib/destinations';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';
import {useAppContext} from '../../../context/AppContext';
import {contasAtivas} from '../../contas/lib/contas';

interface ScriptComposerProps {
  open: boolean;
  onClose: () => void;
  /** Recebe as publicações marcadas, ainda sem o id do roteiro. */
  onCreate: (plataformas: ContentPlataforma[]) => void;
}

/**
 * Antes de abrir o roteiro novo, as redes onde ele vai sair. Cada rede marcada vira
 * uma publicação, e a legenda dela já aparece na Gestão para editar depois.
 */
export function ScriptComposer({open, onClose, onCreate}: ScriptComposerProps) {
  const {state} = useAppContext();
  const [plataformas, setPlataformas] = useState<ContentPlataforma[]>([]);
  const catalogo = useMemo(
    () => contasAtivas(state.platforms),
    [state.platforms],
  );

  useEffect(() => {
    if (!open) return;
    const destinos = destinosPadraoAtivos(state.editorial.destinosPadrao, catalogo);
    setPlataformas(publicacoesDosDestinos({destinos, contentId: ''}));
  }, [catalogo, open, state.preferences]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      desktopMaxW="md:max-w-lg"
      ariaLabel="Novo roteiro"
    >
      <OverlayHeader
        title="Novo roteiro"
        subtitle="A legenda de cada rede marcada já fica pronta na Gestão."
        onClose={onClose}
      />
      <OverlayBody className="stack-sm">
        <DestinationChips
          platforms={catalogo}
          publications={plataformas}
          contentId=""
          onChange={setPlataformas}
        />
        <Text variant="meta" className="text-[var(--text-tertiary)]">
          Dá para mudar depois, na Gestão do roteiro.
        </Text>
      </OverlayBody>
      <OverlayFooter className="justify-end">
        <AppButton variant="secondary" onClick={onClose}>
          Cancelar
        </AppButton>
        <AppButton variant="primary" onClick={() => onCreate(plataformas)}>
          Criar roteiro
        </AppButton>
      </OverlayFooter>
    </Dialog>
  );
}
