import { useId } from 'react';
import { Drawer } from '../../../components/overlays/Drawer';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { pontosParaRevisar, type AvisoOrientacao } from '../lib/orientacaoEditorial';
import { linhasDaRegua } from '../lib/reguaFrequencia';
import type { Continuidade } from '../lib/saudeIndicadores';
import { AjustesGruposPainel } from './AvisosFaixa';
import { ReguaDeFrequenciaPainel } from './ReguaDeFrequencia';

export type AbaSaudeDrawer = 'ajustes' | 'ritmo';

export interface PlanejamentoSaudeDrawerProps {
  open: boolean;
  abaAtiva: AbaSaudeDrawer;
  onAbaChange: (aba: AbaSaudeDrawer) => void;
  onClose: () => void;
  avisos: readonly AvisoOrientacao[];
  avisoAtivoId?: string | null;
  onLocalizar: (aviso: AvisoOrientacao) => void;
  onFoiDeProposito?: (aviso: AvisoOrientacao) => void;
  onQueroFazerAMais?: (aviso: AvisoOrientacao) => void;
  onLimparDestaque?: () => void;
  continuidade: Continuidade<unknown> | null | undefined;
  onVerAnalise: () => void;
}

export function PlanejamentoSaudeDrawer({
  open,
  abaAtiva,
  onAbaChange,
  onClose,
  avisos,
  avisoAtivoId,
  onLocalizar,
  onFoiDeProposito,
  onQueroFazerAMais,
  onLimparDestaque,
  continuidade,
  onVerAnalise,
}: PlanejamentoSaudeDrawerProps) {
  const baseId = useId();
  const tabAjustesId = `${baseId}-tab-ajustes`;
  const tabRitmoId = `${baseId}-tab-ritmo`;
  const panelId = `${baseId}-panel`;

  // Guard para testes SSR em Node (renderToStaticMarkup) onde document não existe.
  if (typeof document === 'undefined') return null;

  const revisar = pontosParaRevisar(avisos);
  const totalAjustes = revisar > 0 ? revisar : avisos.length;
  const linhasRegua = linhasDaRegua(continuidade);
  const temRitmo = linhasRegua.length > 0;

  const localizarEFechar = (aviso: AvisoOrientacao) => {
    onLocalizar(aviso);
    onClose();
  };

  const abrirAnaliseCompleta = () => {
    onClose();
    onVerAnalise();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      ariaLabel="Ajustes e ritmo — Planejamento"
      widthClassName="w-full max-w-none sm:max-w-[560px]"
    >
      <OverlayHeader onClose={onClose}>
        <div className="stack-xs">
          <span className="inline-flex items-center gap-1.5 t-meta text-[var(--text-secondary)]">
            <span>Planejamento</span>
            <span className="text-[var(--text-tertiary)]" aria-hidden>/</span>
            <span>Saúde</span>
          </span>
          <Text variant="sectionTitle" as="h2" className="min-w-0 [overflow-wrap:anywhere]">
            Ajustes e ritmo
          </Text>
        </div>
      </OverlayHeader>

      <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-6">
        <div
          role="tablist"
          aria-label="Seções de saúde do planejamento"
          className="grid grid-cols-2 gap-1 rounded-[var(--radius-input)] bg-[var(--surface-subtle)] p-1"
        >
          <button
            id={tabAjustesId}
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'ajustes'}
            aria-controls={panelId}
            onClick={() => onAbaChange('ajustes')}
            className={cn(
              'inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              abaAtiva === 'ajustes'
                ? 'border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            {revisar > 0 ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-orange)]" aria-hidden />
            ) : null}
            <Text variant="label" as="span" className="text-current">
              Ajustes
            </Text>
            {totalAjustes > 0 ? (
              <Badge variant={revisar > 0 ? 'warning' : 'neutral'} className="px-1.5 py-0 tabular-nums">
                {totalAjustes}
              </Badge>
            ) : null}
          </button>

          <button
            id={tabRitmoId}
            type="button"
            role="tab"
            aria-selected={abaAtiva === 'ritmo'}
            aria-controls={panelId}
            onClick={() => onAbaChange('ritmo')}
            className={cn(
              'inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--radius-sm)] px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              abaAtiva === 'ritmo'
                ? 'border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                : 'border border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            <Text variant="label" as="span" className="text-current">
              Ritmo das séries
            </Text>
            {temRitmo ? (
              <Badge variant="neutral" className="px-1.5 py-0 tabular-nums">
                {linhasRegua.length}
              </Badge>
            ) : null}
          </button>
        </div>
      </div>

      <OverlayBody className="p-4 sm:p-6">
        <div
          id={panelId}
          role="tabpanel"
          aria-labelledby={abaAtiva === 'ajustes' ? tabAjustesId : tabRitmoId}
        >
          {abaAtiva === 'ajustes' ? (
            <AjustesGruposPainel
              avisos={avisos}
              avisoAtivoId={avisoAtivoId}
              onLocalizar={localizarEFechar}
              onFoiDeProposito={onFoiDeProposito}
              onQueroFazerAMais={onQueroFazerAMais}
              onLimparDestaque={onLimparDestaque}
            />
          ) : temRitmo ? (
            <ReguaDeFrequenciaPainel continuidade={continuidade} />
          ) : (
            <div className="rounded-[var(--radius-card)] bg-[var(--surface-subtle)] px-4 py-6 text-center">
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                Nenhuma série acompanhada neste período.
              </Text>
            </div>
          )}
        </div>
      </OverlayBody>

      <OverlayFooter className="justify-between bg-[var(--bg-primary)] pb-safe">
        <AppButton variant="secondary" size="sm" onClick={abrirAnaliseCompleta}>
          Ver análise completa
        </AppButton>
        <AppButton variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </AppButton>
      </OverlayFooter>
    </Drawer>
  );
}
