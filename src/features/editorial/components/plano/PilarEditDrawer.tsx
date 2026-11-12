import { useCallback, useMemo, useState } from 'react';
import { SidePanel } from '../../../../components/layout/SidePanel';
import { AppButton } from '../../../../components/ui/AppButton';
import { useAppContext } from '../../../../context/AppContext';
import { useAuth } from '../../../../context/AuthContext';
import { contasAtivas } from '../../../contas/lib/contas';
import {
  PilarEditForm,
  type PilarEditChromeState,
  type PilarEditSavePayload,
} from '../../../settings/components/PilarEditForm';
import { patchSerieAoVincularPilar, serieLigadaAoPilar } from '../../lib/vincularSerieAoPilar';

/**
 * Pilar numa gaveta (~560px) sem sair da Direção editorial: o mesmo formulário da página,
 * com legenda-base e dias e horários por conta. `pilarId` = 'nova' cria um pilar.
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
    <SidePanel
      open={aberto}
      onClose={onClose}
      title={criando ? 'Novo pilar' : pilar?.nome ?? 'Pilar'}
      subtitle="Que tipo de conteúdo entra aqui?"
      widthClassName="max-w-[560px]"
    >
      {aberto ? (
        <div className="stack-md">
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
          <div className="sticky bottom-0 flex justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] py-3">
            <AppButton variant="secondary" size="sm" onClick={onClose}>Cancelar</AppButton>
            <AppButton variant="primary" size="sm" disabled={!chrome?.canSave} onClick={() => chrome?.handleSave()}>
              Salvar pilar
            </AppButton>
          </div>
        </div>
      ) : null}
    </SidePanel>
  );
}
