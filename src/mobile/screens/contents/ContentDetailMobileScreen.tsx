import { useState } from 'react';
import { AlertTriangle, ChevronDown, Clock3, FileText, Settings2 } from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { AppButton } from '../../../components/ui/AppButton';
import type { Content } from '../../../lib/database';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import type { ContentDetailTab, ContentPrimaryAction, PostingAlert } from '../../../features/contents/lib/contentPipeline';

interface ContentDetailMobileScreenProps {
  content: Content;
  activeTab: ContentDetailTab;
  onTabChange: (tab: ContentDetailTab) => void;
  primaryAction: ContentPrimaryAction;
  onPrimaryAction: () => void;
  onStatusChange?: (status: string) => void;
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

  const blockLabel = blockName
    ? blockOrder
      ? `${blockName} (${blockOrder})`
      : blockName
    : 'Sem bloco';

  if (isScriptTab) {
    return (
      <div className="flex min-h-[calc(100dvh-120px)] flex-col pb-24">
        <div className="sticky top-0 z-10 -mx-1 space-y-2 border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_94%,transparent)] px-1 py-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-base font-semibold text-[var(--text-primary)]">
              {content.title || 'Sem titulo'}
            </p>
            <span className="status-pill shrink-0 text-[10px]">{stageLabel}</span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)]">
            {blockLabel} · Grav: {formatDate(content.recordingDate)} · Post: {formatDate(content.publishDate)}
          </p>
          {saveHint ? <p className="text-[10px] text-[var(--text-tertiary)]">{saveHint}</p> : null}
        </div>

        <div className="min-h-0 flex-1 py-2">{section}</div>

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
          <div className="space-y-4 p-1">
            <h2 className="ds-h3">Detalhes editoriais</h2>
            {operationalPanel}
            <MobileSegmentTabs
              rounded="tight"
              tabs={[
                { value: 'roteiro', label: 'Roteiro' },
                { value: 'gravacao', label: 'Gravacao' },
                { value: 'producao', label: 'Producao' },
                { value: 'postagem', label: 'Postagem' },
                { value: 'historico', label: 'Historico' },
              ]}
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
    <div className="space-y-3 pb-8">
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
            <p className="text-[11px] text-[var(--text-tertiary)]">{stageLabel}</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        </summary>

        <div className="space-y-3 border-t border-[var(--border-color)] p-3">
          <p className="text-[11px] text-[var(--text-secondary)]">
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
          {primaryAction.reason ? (
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">{primaryAction.reason}</p>
          ) : null}
        </div>
      </details>

      {postingAlerts.length > 0 ? (
        <section className="grid gap-2">
          {postingAlerts.map(alert => (
            <article key={alert.id} className="ds-card flex items-start gap-2 bg-[var(--bg-secondary)] px-3 py-3">
              {alert.tone === 'warning' ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
              ) : (
                <Clock3 className="mt-0.5 h-4 w-4 text-sky-500" />
              )}
              <p className="text-sm font-medium text-[var(--text-primary)]">{alert.message}</p>
            </article>
          ))}
        </section>
      ) : null}

      <MobileSegmentTabs
        rounded="tight"
        tabs={[
          { value: 'roteiro', label: 'Roteiro' },
          { value: 'gravacao', label: 'Gravacao' },
          { value: 'producao', label: 'Producao' },
          { value: 'postagem', label: 'Postagem' },
          { value: 'historico', label: 'Historico' },
        ]}
        value={activeTab}
        onChange={onTabChange}
      />

      {section}

      <AppButton variant="secondary" onClick={onSave} className="min-h-11 w-full justify-center">
        {isSaving ? 'Salvando...' : 'Salvar'}
      </AppButton>
    </div>
  );
}
