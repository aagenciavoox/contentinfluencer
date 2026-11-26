import { useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ConfirmModal } from '../../../../components/feedback/modals/ConfirmModal';
import { Drawer } from '../../../../components/overlays/Drawer';
import { OverlayBody } from '../../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';

export interface EditorialDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  /** Conta ou escopo em edição, exibido em destaque no cabeçalho fixo. */
  escopoConta?: string;
  /** Seção da página para compor a trilha no cabeçalho (ex.: "Geral / Regras e avisos"). */
  secao?: string;
  escopoIcone?: ReactNode;
  /** Navegação interna sem empilhar outro drawer. */
  onBack?: () => void;
  backLabel?: string;
  /** Quando verdadeiro, pede confirmação antes de fechar e descartar alterações. */
  dirty?: boolean;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  canSave?: boolean;
  saveDisabledReason?: string;
  saving?: boolean;
  footerLeft?: ReactNode;
  hideFooter?: boolean;
  children: ReactNode;
}

/**
 * Padrão único dos drawers do Editorial:
 * - Abre pela direita (560px no desktop, tela inteira no mobile).
 * - Cabeçalho fixo com título, escopo/conta e botão de fechar.
 * - Corpo rolável; rodapé fixo com Cancelar à esquerda e Salvar à direita.
 * - Confirma antes de descartar alterações não salvas.
 */
export function EditorialDrawer({
  open,
  title,
  subtitle,
  escopoConta = 'Geral',
  secao,
  escopoIcone,
  onBack,
  backLabel = 'Voltar',
  dirty = false,
  onClose,
  onSave,
  saveLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  canSave = true,
  saveDisabledReason,
  saving = false,
  footerLeft,
  hideFooter = false,
  children,
}: EditorialDrawerProps) {
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);

  useEffect(() => {
    if (!open) setConfirmandoDescarte(false);
  }, [open]);

  const tentarFechar = () => {
    if (confirmandoDescarte) return;
    if (dirty) {
      setConfirmandoDescarte(true);
      return;
    }
    onClose();
  };

  return (
    <>
      <Drawer
        open={open}
        onClose={tentarFechar}
        ariaLabel={`${title} — ${escopoConta}`}
        widthClassName="w-full max-w-none sm:max-w-[560px]"
      >
        <OverlayHeader onClose={tentarFechar}>
          <div className="stack-xs">
            <div className="flex flex-wrap items-center gap-2">
              {onBack ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 t-meta text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>{backLabel}</span>
                </button>
              ) : null}
              <span className="inline-flex items-center gap-1.5 t-meta text-[var(--text-secondary)]">
                {escopoIcone ? <span className="inline-flex shrink-0" aria-hidden>{escopoIcone}</span> : null}
                <span>{escopoConta}</span>
                {secao ? (
                  <>
                    <span className="text-[var(--text-tertiary)]" aria-hidden>/</span>
                    <span>{secao}</span>
                  </>
                ) : null}
              </span>
            </div>
            <Text variant="sectionTitle" as="h2" className="min-w-0 [overflow-wrap:anywhere]">
              {title}
            </Text>
            {subtitle ? (
              <Text variant="meta" as="p" className="text-[var(--text-secondary)] [overflow-wrap:anywhere]">
                {subtitle}
              </Text>
            ) : null}
          </div>
        </OverlayHeader>

        <OverlayBody className="p-4 sm:p-6">
          {children}
        </OverlayBody>

        {!hideFooter ? (
          <OverlayFooter className="justify-between bg-[var(--bg-primary)] pb-safe">
            <div className="min-w-0">{footerLeft ?? null}</div>
            <div className="flex shrink-0 items-center gap-2">
              <AppButton
                variant="secondary"
                size="sm"
                onClick={tentarFechar}
                disabled={saving}
              >
                {cancelLabel}
              </AppButton>
              {onSave ? (
                <AppButton
                  variant="primary"
                  size="sm"
                  onClick={onSave}
                  disabled={!canSave || saving}
                  disabledReason={!canSave ? saveDisabledReason : undefined}
                >
                  {saving ? 'Salvando…' : saveLabel}
                </AppButton>
              ) : null}
            </div>
          </OverlayFooter>
        ) : null}
      </Drawer>

      <ConfirmModal
        open={confirmandoDescarte}
        message="Você tem alterações não salvas. Deseja descartá-las?"
        confirmLabel="Descartar alterações"
        cancelLabel="Continuar editando"
        onConfirm={() => {
          setConfirmandoDescarte(false);
          onClose();
        }}
        onCancel={() => setConfirmandoDescarte(false)}
      />
    </>
  );
}
