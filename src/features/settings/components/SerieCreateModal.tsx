import { useCallback, useMemo, useState } from 'react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import type { Serie } from '../../../lib/database';
import { ordenarContas } from '../../contas/lib/contas';
import { nextFreeSerieColor, takenSerieColorKeys } from '../lib/serieColors';
import { SerieEditForm, type SerieEditChromeState } from './SerieEditForm';

export type SerieCreateModalTarget =
  | { tipo: 'familia'; seriePaiId?: null }
  | { tipo: 'quadro'; seriePaiId: string };

export function SerieCreateModal({
  target,
  onClose,
  onCreated,
}: {
  target: SerieCreateModalTarget | null;
  onClose: () => void;
  onCreated?: (serie: Serie) => void;
}) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const [chrome, setChrome] = useState<SerieEditChromeState | null>(null);

  const open = Boolean(target);
  const tipo = target?.tipo ?? 'familia';
  const seriePaiId = target?.tipo === 'quadro' ? target.seriePaiId : null;
  const seriePai = useMemo(
    () => (seriePaiId ? state.series.find(item => item.id === seriePaiId) ?? null : null),
    [seriePaiId, state.series],
  );

  const contas = useMemo(
    () => ordenarContas(state.platforms.filter(platform => platform.ativo)),
    [state.platforms],
  );

  const handleChromeChange = useCallback((next: SerieEditChromeState) => {
    setChrome(next);
  }, []);

  const handleSave = useCallback((serie: Serie) => {
    const payload: Serie = {
      ...serie,
      userId: serie.userId || user?.id || '',
    };
    void dispatch({ type: 'ADD_SERIE', payload });
    onCreated?.(payload);
    onClose();
  }, [dispatch, onClose, onCreated, user?.id]);

  const titulo = tipo === 'familia' ? 'Criar família' : 'Criar quadro';
  const subtitulo = tipo === 'familia'
    ? 'Agrupe séries relacionadas pelo mesmo conceito.'
    : seriePai
      ? `Dentro de ${seriePai.name}. Só o nome é necessário agora.`
      : 'Só o nome é necessário agora.';

  const formKey = open ? `modal:${tipo}:${seriePaiId ?? ''}` : 'fechado';

  return (
    <BottomSheetModal
      open={open}
      onClose={onClose}
      desktopMaxW={tipo === 'familia' ? 'max-w-lg' : 'max-w-2xl'}
    >
      <OverlayHeader onClose={onClose}>
        <Text variant="sectionTitle">{titulo}</Text>
        <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
          {subtitulo}
        </Text>
      </OverlayHeader>
      <OverlayBody className="max-h-[75vh] overflow-y-auto">
        {open ? (
          <SerieEditForm
            key={formKey}
            inModal
            tipo={tipo}
            initial={{
              cor: tipo === 'quadro' && seriePai?.cor ? seriePai.cor : nextFreeSerieColor(state.series),
              tipoAgrupamento: tipo,
              parentId: seriePaiId,
              ...(tipo === 'quadro' ? { frequenciaRecomendada: 'Sob demanda' } : {}),
            }}
            takenColors={[...takenSerieColorKeys(state.series)]}
            contas={contas}
            pilares={state.pilares}
            series={state.series}
            contents={state.contents}
            usedFormatoValues={state.series.flatMap(serie => serie.formatoVisualPadrao ?? [])}
            showOpenInfoNotice={false}
            onSave={handleSave}
            onCancel={onClose}
            onChromeChange={handleChromeChange}
          />
        ) : null}
      </OverlayBody>
      <OverlayFooter>
        <AppButton variant="secondary" onClick={onClose}>
          Cancelar
        </AppButton>
        <AppButton
          variant="primary"
          onClick={() => chrome?.handleSave()}
          disabled={!chrome?.canSave}
        >
          {titulo}
        </AppButton>
      </OverlayFooter>
    </BottomSheetModal>
  );
}
