import {AppButton} from '../../../components/ui/AppButton';
import {TagSelect} from '../../../components/ui/TagSelect';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {Z_INDEX_CONFIRM} from '../../../components/overlays/overlayConstants';
import {CreationRedeQuickFilter} from '../../creation/components/CreationRedeQuickFilter';
import type {RedeDoFiltro} from '../../contas/lib/contas';
import type {FiltroPuxar, OpcaoFiltro} from '../lib/filtroPuxar';

/**
 * Filtros do Puxar (série, pilar, tags, status e redes) num modal por cima da lista.
 * Aplica na hora; fechar não zera o que já foi escolhido.
 */
export function PuxarBuscaAvancadaDialog({
  open,
  filtro,
  opcoes,
  redesRapidas,
  onChange,
  onClose,
}: {
  open: boolean;
  filtro: FiltroPuxar;
  opcoes: {series: OpcaoFiltro[]; pilares: OpcaoFiltro[]; tags: OpcaoFiltro[]; status: OpcaoFiltro[]};
  redesRapidas: readonly RedeDoFiltro[];
  onChange: (filtro: FiltroPuxar) => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      desktopMaxW="max-w-lg"
      zIndex={Z_INDEX_CONFIRM}
      ariaLabel="Busca avançada"
    >
      <div className="flex max-h-[85dvh] min-h-0 flex-col bg-[var(--bg-elevated)]">
        <OverlayHeader title="Busca avançada" onClose={onClose} />
        <OverlayBody>
          <div className="stack-sm">
            <TagSelect
              id="puxar-avancada-serie"
              label="Série"
              placeholder="Todas as séries"
              searchable
              values={filtro.serieIds}
              options={opcoes.series}
              disabled={opcoes.series.length === 0}
              onChange={serieIds => onChange({...filtro, serieIds})}
            />
            <TagSelect
              id="puxar-avancada-pilar"
              label="Pilar"
              placeholder="Todos os pilares"
              values={filtro.pilarIds}
              options={opcoes.pilares}
              disabled={opcoes.pilares.length === 0}
              onChange={pilarIds => onChange({...filtro, pilarIds})}
            />
            <TagSelect
              id="puxar-avancada-tags"
              label="Tags"
              placeholder="Todas as tags"
              searchable
              values={filtro.tags}
              options={opcoes.tags}
              disabled={opcoes.tags.length === 0}
              onChange={tags => onChange({...filtro, tags})}
            />
            <TagSelect
              id="puxar-avancada-status"
              label="Status"
              placeholder="Todos os status"
              values={filtro.statusIds}
              options={opcoes.status}
              disabled={opcoes.status.length === 0}
              onChange={statusIds => onChange({...filtro, statusIds})}
            />
            {redesRapidas.length > 0 ? (
              <div className="space-y-1.5">
                <p className="t-body-strong text-[var(--text-primary)]">Redes</p>
                <CreationRedeQuickFilter
                  redes={redesRapidas}
                  value={filtro.redes ?? []}
                  onChange={redes => onChange({...filtro, redes})}
                />
              </div>
            ) : null}
            <div className="flex justify-end">
              <AppButton variant="secondary" onClick={onClose}>
                Fechar
              </AppButton>
            </div>
          </div>
        </OverlayBody>
      </div>
    </Dialog>
  );
}
