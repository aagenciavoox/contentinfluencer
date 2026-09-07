import { useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, ChevronLeft, FileText, MoreHorizontal, Settings2, Trash2 } from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import type { Content } from '../../../lib/database';
import { resolveContentDetailBack } from '../../../lib/navigation/detailBack';
import { useVisualViewportKeyboard } from '../../../hooks/useVisualViewportKeyboard';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';
import type { ContentDetailTab, ContentPrimaryAction, PostingAlert } from '../../../features/contents/lib/contentPipeline';
import { cn } from '../../../lib/utils';

const TAB_LABELS: Record<ContentDetailTab, string> = {
  roteiro: 'Roteiro',
  gravacao: 'Gravação',
  publicacao: 'Publicação',
};

interface ContentDetailMobileScreenProps {
  content: Content;
  activeTab: ContentDetailTab;
  visibleTabs: ContentDetailTab[];
  onTabChange: (tab: ContentDetailTab) => void;
  primaryAction: ContentPrimaryAction;
  onPrimaryAction: () => void;
  isSaving: boolean;
  postingAlerts: PostingAlert[];
  stageLabel: string;
  blockName?: string | null;
  blockOrder?: number | null;
  section: ReactNode;
  operationalPanel: ReactNode;
  onRetrySave: () => void;
  onDelete: () => void;
  saveHint?: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  onBack?: () => void;
}

export function ContentDetailMobileScreen({
  content,
  activeTab,
  visibleTabs,
  onTabChange,
  primaryAction,
  onPrimaryAction,
  isSaving,
  postingAlerts,
  stageLabel,
  blockName,
  blockOrder,
  section,
  operationalPanel,
  onRetrySave,
  onDelete,
  saveHint,
  saveState = 'idle',
  onBack,
}: ContentDetailMobileScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const keyboard = useVisualViewportKeyboard();
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const hasPrimaryAction = primaryAction.id !== 'none';
  const isScriptTab = activeTab === 'roteiro';
  const tabOptions = visibleTabs.map(tab => ({ value: tab, label: TAB_LABELS[tab] }));
  const blockLabel = blockName
    ? blockOrder
      ? `${blockName} (${blockOrder})`
      : blockName
    : 'Sem bloco';

  const handleBack = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (detailsSheetOpen) {
      setDetailsSheetOpen(false);
      return;
    }
    if (onBack) {
      onBack();
      return;
    }
    navigate(resolveContentDetailBack(location.state as { from?: string } | null));
  };

  const dismissKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  /** Keep the tap when the script editor has focus (iOS otherwise eats the first click). */
  const preserveTapWhileEditing = (event: MouseEvent | PointerEvent) => {
    event.preventDefault();
  };

  const detailsSheet = (
    <BottomSheetModal
      open={detailsSheetOpen}
      onClose={() => setDetailsSheetOpen(false)}
      desktopMaxW="max-w-md"
      zIndex="z-[120]"
    >
        <OverlayBody className="stack-lg pb-safe">
        <MobileSectionHeader
          icon={Settings2}
          tone="blue"
          title="Detalhes editoriais"
          description={`${stageLabel} · ${blockLabel}`}
          className="mb-0"
        />
        {postingAlerts.length > 0 ? (
          <div className="stack-sm">
            {postingAlerts.map(alert => (
              <Text key={alert.id} variant="secondary">
                {alert.message}
              </Text>
            ))}
          </div>
        ) : null}
        {operationalPanel}
        {tabOptions.length > 1 ? (
          <MobileSegmentTabs
            rounded="tight"
            tabs={tabOptions}
            value={activeTab}
            onChange={tab => {
              onTabChange(tab);
              setDetailsSheetOpen(false);
            }}
          />
        ) : null}
        {hasPrimaryAction ? (
          <AppButton
            variant="primary"
            onClick={() => {
              setDetailsSheetOpen(false);
              onPrimaryAction();
            }}
            disabled={isSaving || primaryAction.disabled}
            className="min-h-11 w-full justify-center"
          >
            {isSaving ? 'Salvando...' : primaryAction.label}
          </AppButton>
        ) : null}
        <AppButton
          variant="ghost"
          leftIcon={<Trash2 className="h-4 w-4" />}
          onClick={() => {
            setDetailsSheetOpen(false);
            onDelete();
          }}
          className="w-full justify-center text-[var(--accent-red)] hover:text-[var(--accent-red)]"
        >
          Mover para a lixeira
        </AppButton>
      </OverlayBody>
    </BottomSheetModal>
  );

  if (isScriptTab) {
    return (
      <div className="flex min-h-dvh flex-col bg-[var(--bg-primary)]">
        {/* z below overlays (100+) so details sheet is not trapped under the chrome */}
        <header
          className="fixed inset-x-0 top-0 z-[90] border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex h-14 max-h-14 items-center gap-2">
            <button
              type="button"
              aria-label="Voltar"
              onPointerDown={preserveTapWhileEditing}
              onMouseDown={preserveTapWhileEditing}
              onClick={handleBack}
              className={cn(
                'relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                'text-[var(--text-primary)] touch-manipulation active:scale-95',
                'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              {saveHint ? (
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className={
                      saveState === 'error'
                        ? 'h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-red)]'
                        : saveState === 'saved'
                          ? 'h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]'
                          : 'h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[var(--accent-blue)]'
                    }
                    aria-hidden
                  />
                  <Text variant="meta" truncate>
                    {saveHint}
                  </Text>
                  {saveState === 'error' ? (
                    <AppButton
                      variant="ghost"
                      size="xs"
                      onMouseDown={preserveTapWhileEditing}
                      onClick={onRetrySave}
                      disabled={isSaving}
                      className="h-7 px-2 text-[var(--accent-red)] hover:text-[var(--accent-red)]"
                    >
                      Tentar novamente
                    </AppButton>
                  ) : null}
                </div>
              ) : (
                <Text variant="meta" truncate>
                  {stageLabel}
                </Text>
              )}
            </div>
            {keyboard.open ? (
              <button
                type="button"
                aria-label="Concluir edição"
                onPointerDown={preserveTapWhileEditing}
                onMouseDown={preserveTapWhileEditing}
                onClick={dismissKeyboard}
                className={cn(
                  'relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                  'border border-[var(--brand-accent)] bg-[var(--brand-accent)] text-[var(--brand-on-accent)]',
                  'touch-manipulation active:scale-95',
                  'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]',
                )}
              >
                <Check className="h-5 w-5" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Abrir detalhes"
                onPointerDown={preserveTapWhileEditing}
                onMouseDown={preserveTapWhileEditing}
                onClick={() => setDetailsSheetOpen(true)}
                className={cn(
                  'relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
                  'text-[var(--text-secondary)] touch-manipulation active:scale-95',
                  'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        <div
          className="flex-1 px-4"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 3.5rem + 0.75rem)',
            paddingBottom: keyboard.open ? keyboard.inset + 64 : 88,
          }}
        >
          {section}
        </div>

        {detailsSheet}
      </div>
    );
  }

  return (
    <div className="stack-md pb-8">
      <button
        type="button"
        onClick={() => onTabChange('roteiro')}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-primary)]"
      >
        <FileText className="h-4 w-4" />
        Ver roteiro
      </button>

      <details className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-2 px-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {content.title || 'Conteudo sem titulo'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">{stageLabel}</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        </summary>

        <div className="stack-sm border-t border-[var(--border-color)] p-3">
          <p className="text-xs text-[var(--text-secondary)]">{blockLabel}</p>
          {hasPrimaryAction ? (
            <AppButton
              variant="primary"
              onClick={onPrimaryAction}
              disabled={isSaving || primaryAction.disabled}
              className="min-h-11 w-full justify-center"
            >
              {isSaving ? 'Salvando...' : primaryAction.label}
            </AppButton>
          ) : null}
          <AppButton
            variant="secondary"
            onClick={() => setDetailsSheetOpen(true)}
            leftIcon={<Settings2 className="h-4 w-4" />}
            className="min-h-11 w-full justify-center"
          >
            Detalhes
          </AppButton>
        </div>
      </details>

      <MobileSegmentTabs rounded="tight" tabs={tabOptions} value={activeTab} onChange={onTabChange} />

      {section}

      {saveState === 'error' ? (
        <AppButton
          variant="secondary"
          onClick={onRetrySave}
          disabled={isSaving}
          className="min-h-11 w-full justify-center text-[var(--accent-red)]"
        >
          Tentar salvar novamente
        </AppButton>
      ) : null}

      {detailsSheet}
    </div>
  );
}
