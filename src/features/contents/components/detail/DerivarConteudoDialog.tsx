import { useMemo, useState } from 'react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { OverlayRoot } from '../../../../components/overlays/OverlayRoot';
import {
  DESKTOP_DIALOG_ANIMATE,
  DESKTOP_DIALOG_EXIT,
  DESKTOP_DIALOG_INITIAL,
  DESKTOP_PANEL_TRANSITION,
  Z_INDEX_CONFIRM,
} from '../../../../components/overlays/overlayConstants';
import { useIsMobile } from '../../../../hooks/useIsMobile';
import type { Content } from '../../../../lib/database';
import type { OpcoesDerivacao } from '../../lib/derivarConteudo';

type CopiarCampos = NonNullable<OpcoesDerivacao['copiar']>;

const CAMPOS: Array<{ key: keyof CopiarCampos; label: string; hint?: string }> = [
  { key: 'seriesId', label: 'Série / quadro', hint: 'Vem marcado; pode desmarcar.' },
  { key: 'script', label: 'Roteiro' },
  { key: 'formato', label: 'Formato' },
  { key: 'pilar', label: 'Pilar' },
  { key: 'funcao', label: 'Função' },
  { key: 'referencias', label: 'Referências' },
  { key: 'temas', label: 'Temas' },
  { key: 'notes', label: 'Notas' },
  { key: 'legendaBase', label: 'Legenda-base' },
];

const PADRAO: CopiarCampos = {
  seriesId: true,
  script: true,
  formato: true,
  pilar: true,
  funcao: true,
  referencias: true,
  temas: true,
  notes: true,
  legendaBase: true,
};

type Props = {
  open: boolean;
  content: Content;
  onConfirm: (copiar: CopiarCampos) => void;
  onCancel: () => void;
};

export function DerivarConteudoDialog({ open, content, onConfirm, onCancel }: Props) {
  const isMobile = useIsMobile();
  const [copiar, setCopiar] = useState<CopiarCampos>(PADRAO);
  const temSerie = Boolean(content.seriesId);

  const resumo = useMemo(() => {
    const ativos = CAMPOS.filter(campo => copiar[campo.key]).map(campo => campo.label);
    return ativos.length > 0 ? ativos.join(', ') : 'Nada além do vínculo de origem';
  }, [copiar]);

  if (!open) return null;

  return (
    <OverlayRoot
      open={open}
      onClose={onCancel}
      placement="center"
      zIndex={Z_INDEX_CONFIRM}
      mobileEdgePadding={isMobile}
      ariaLabel="Novo a partir deste"
      panelInitial={DESKTOP_DIALOG_INITIAL}
      panelAnimate={DESKTOP_DIALOG_ANIMATE}
      panelExit={DESKTOP_DIALOG_EXIT}
      panelTransition={DESKTOP_PANEL_TRANSITION}
      panelClassName="absolute top-1/2 left-1/2 w-[88%] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6"
    >
      <div className="stack-lg">
        <div className="stack-sm">
          <Text variant="sectionTitle" as="h2">Novo a partir deste</Text>
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            O título nasce em branco. Sem publicações, métricas nem marcos. Escolha o que copiar.
          </Text>
        </div>

        <div className="stack-sm">
          {CAMPOS.map(campo => {
            if (campo.key === 'seriesId' && !temSerie) return null;
            return (
              <label
                key={campo.key}
                className="flex items-start gap-2 text-sm text-[var(--text-primary)]"
              >
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(copiar[campo.key])}
                  onChange={event => setCopiar(previous => ({
                    ...previous,
                    [campo.key]: event.target.checked,
                  }))}
                />
                <span>
                  <span className="font-medium">{campo.label}</span>
                  {campo.hint ? (
                    <span className="block text-[var(--text-secondary)]">{campo.hint}</span>
                  ) : null}
                </span>
              </label>
            );
          })}
        </div>

        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
          Vai copiar: {resumo}.
        </Text>

        <div className="flex flex-col gap-3 sm:flex-row">
          <AppButton variant="secondary" fullWidth onClick={onCancel}>
            Cancelar
          </AppButton>
          <AppButton variant="primary" fullWidth onClick={() => onConfirm(copiar)}>
            Criar
          </AppButton>
        </div>
      </div>
    </OverlayRoot>
  );
}

/** Aviso ao trocar a série do episódio: relatórios leem a série ao vivo. */
export function AvisoTrocaSerieModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmModal
      open={open}
      message="Trocar a série pode mudar o agrupamento dos relatórios, porque a análise lê a série ao vivo. Classificação congelada permanece."
      confirmLabel="Trocar série"
      cancelLabel="Manter"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
