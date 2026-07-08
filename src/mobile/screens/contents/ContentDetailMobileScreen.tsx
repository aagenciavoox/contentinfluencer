import { useState } from 'react';
import { ChevronDown, FileText, Settings2 } from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { AppButton } from '../../../components/ui/AppButton';
import type { Content } from '../../../lib/database';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';
import type { ContentDetailTab, ContentPrimaryAction, PostingAlert } from '../../../features/contents/lib/contentPipeline';

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
  section: React.ReactNode;
  operationalPanel: React.ReactNode;
  onSave: () => void;
  saveHint?: string;
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleDateString('pt-BR');
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
  onSave,
  saveHint,
}: ContentDetailMobileScreenProps) {
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const hasPrimaryAction = primaryAction.id !== 'none';
  const isScriptTab = activeTab === 'roteiro';
  const tabOptions = visibleTabs.map(tab => ({ value: tab, label: TAB_LABELS[tab] }));

  const blockLabel = blockName
    ? blockOrder
      ? `${blockName} (${blockOrder})`
      : blockName
    : 'Sem bloco';

  if (isScriptTab) {
    return (
      <div className="stack-sm pb-24">
        <div className="sticky top-0 z-10 -mx-1 stack-sm border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_94%,transparent)] px-1 py-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-base font-semibold text-[var(--text-primary)]">
              {content.title || 'Sem titulo'}
            </p>
            <span className="status-pill shrink-0 text-xs">{stageLabel}</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            {blockLabel} · Grav: {formatDate(content.recordingDate)} · Post: {formatDate(content.publishDate)}
          </p>
          {saveHint ? <p className="text-xs text-[var(--text-tertiary)]">{saveHint}</p> : null}
        </div>

        <div className="py-2">{section}</div>

        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex gap-2 border-t border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_96%,transparent)] px-3 py-2 backdrop-blur-md">
          <AppButton
            variant="secondary"
            onClick={() => setDetailsSheetOpen(true)}
            leftIcon={<Settings2 className="h-4 w-4" />}
            className="min-h-11 flex-1 justify-center"
          >
            Detalhes
          </AppButton>
          {hasPrimaryAction ? (
            <AppButton
              variant="primary"
              onClick={onPrimaryAction}
              disabled={isSaving || primaryAction.disabled}
              className="min-h-11 flex-[1.4] justify-center"
            >
              {isSaving ? 'Salvando...' : primaryAction.label}
            </AppButton>
          ) : (
            <AppButton variant="secondary" onClick={onSave} className="min-h-11 flex-1 justify-center">
              Salvar
            </AppButton>
          )}
        </div>

        <BottomSheetModal open={detailsSheetOpen} onClose={() => setDetailsSheetOpen(false)} desktopMaxW="max-w-md">
          <div className="stack-lg p-1">
            <MobileSectionHeader icon={Settings2} tone="blue" title="Detalhes editoriais" />
            {operationalPanel}
            <MobileSegmentTabs
              rounded="tight"
              tabs={tabOptions}
              value={activeTab}
              onChange={tab => {
                onTabChange(tab);
                setDetailsSheetOpen(false);
              }}
            />
          </div>
        </BottomSheetModal>
      </div>
    );
  }

  return (
    <div className="stack-md pb-8">
      <button
        type="button"
        onClick={() => onTabChange('roteiro')}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-primary)]"
      >
        <FileText className="h-4 w-4" />
        Ver roteiro
      </button>

      <details className="ds-card bg-[var(--bg-secondary)]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {content.title || 'Conteudo sem titulo'}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">{stageLabel}</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        </summary>

        <div className="stack-md border-t border-[var(--border-color)] p-3">
          <p className="text-xs text-[var(--text-secondary)]">
            {blockLabel} · Grav: {formatDate(content.recordingDate)} · Post: {formatDate(content.publishDate)}
          </p>
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
        </div>
      </details>

      <MobileSegmentTabs rounded="tight" tabs={tabOptions} value={activeTab} onChange={onTabChange} />

      {section}

      <AppButton variant="secondary" onClick={onSave} className="min-h-11 w-full justify-center">
        {isSaving ? 'Salvando...' : 'Salvar'}
      </AppButton>
    </div>
  );
}
