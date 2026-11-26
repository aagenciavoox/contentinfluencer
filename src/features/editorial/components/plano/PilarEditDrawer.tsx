import { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../../../context/AppContext';
import { useAuth } from '../../../../context/AuthContext';
import { contasAtivas } from '../../../contas/lib/contas';
import {
  PilarEditForm,
  type PilarEditChromeState,
  type PilarEditSavePayload,
} from '../../../settings/components/PilarEditForm';
import { patchSerieAoVincularPilar, serieLigadaAoPilar } from '../../lib/vincularSerieAoPilar';
import { EditorialDrawer } from './EditorialDrawer';

/**
 * Pilar numa gaveta padrão do Editorial (560px no desktop, tela inteira no mobile).
 * `pilarId` = 'nova' cria um pilar. Preserva todos os vínculos existentes com as séries.
 */
export function PilarEditDrawer({ pilarId, onClose }: { pilarId: string | null; onClose: () => void }) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const [chrome, setChrome] = useState<PilarEditChromeState | null>(null);
  const criando = pilarId === 'nova';
  const pilar = useMemo(
    () => (pilarId && !criando ? state.pilares.find(item => item.id === pilarId) ?? null : null),
    [criando, pilarId, state.pilares],
  );
  const contas = useMemo(() => contasAtivas(state.platforms).map(conta => conta.id), [state.platforms]);
  const ligadas = useMemo(
    () => (pilar ? state.series.filter(serie => serieLigadaAoPilar(serie, pilar.id)).map(serie => serie.id) : []),
    [pilar, state.series],
  );
  const aberto = Boolean(pilarId) && (criando || pilar != null);

  const salvar = ({ pilar: payload, linkedSerieIds }: PilarEditSavePayload) => {
    const final = { ...payload, userId: payload.userId || user?.id || '' };
    const existe = state.pilares.some(item => item.id === final.id);
    dispatch({ type: existe ? 'UPDATE_PILAR' : 'ADD_PILAR', payload: final });
    for (const serie of state.series) {
      const patch = patchSerieAoVincularPilar(serie, final.id, linkedSerieIds.includes(serie.id));
      if (!patch) continue;
      dispatch({ type: 'UPDATE_SERIE', payload: { ...serie, ...patch, updatedAt: new Date().toISOString() } });
    }
    onClose();
  };

  const mudarChrome = useCallback((next: PilarEditChromeState) => setChrome(next), []);

  return (
    <EditorialDrawer
      open={aberto}
      onClose={onClose}
      title={criando ? 'Adicionar pilar' : `Editar pilar: ${pilar?.nome ?? 'Pilar'}`}
      subtitle="Que tipo de conteúdo entra aqui?"
      escopoConta="Geral"
      secao="Identidade"
      dirty={Boolean(chrome?.isDirty)}
      onSave={() => chrome?.handleSave()}
      canSave={Boolean(chrome?.canSave)}
      saveLabel="Salvar pilar"
    >
      {aberto ? (
        <PilarEditForm
          key={pilar?.id ?? 'nova'}
          compacto
          initial={pilar ?? {}}
          platformNames={contas}
          series={state.series}
          postingTimeEntries={state.postingTimeEntries}
          platforms={state.platforms}
          initialLinkedSerieIds={ligadas}
          pilares={state.pilares}
          onSave={salvar}
          onCancel={onClose}
          onChromeChange={mudarChrome}
        />
      ) : null}
    </EditorialDrawer>
  );
}
