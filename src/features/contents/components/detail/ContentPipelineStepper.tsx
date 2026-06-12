import {Lock} from 'lucide-react';
import {cn} from '../../../../lib/utils';
import type {ContentDetailTab} from '../../lib/contentPipeline';
import {
  CONTENT_PIPELINE_TABS,
  getContentStage,
  getPipelineTabIndex,
  isTabLocked,
  type StageOptions,
} from '../../lib/contentPipeline';
import type {Content} from '../../../../lib/database';

const STEP_LABELS: Record<ContentDetailTab, string> = {
  roteiro: 'Roteiro',
  gravacao: 'Gravação',
  publicacao: 'Publicação',
};

interface ContentPipelineStepperProps {
  content: Content;
  activeTab: ContentDetailTab;
  stageOptions?: StageOptions;
  onTabChange: (tab: ContentDetailTab) => void;
  compact?: boolean;
}

function StepIndicator({
  done,
  current,
  locked,
}: {
  done: boolean;
  current: boolean;
  locked: boolean;
}) {
  if (locked) {
    return <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  }
  if (done) {
    return <span aria-hidden className="text-xs leading-none">✓</span>;
  }
  if (current) {
    return <span aria-hidden className="text-[10px] leading-none">●</span>;
  }
  return <span aria-hidden className="text-[10px] leading-none opacity-60">○</span>;
}

export function ContentPipelineStepper({
  content,
  activeTab,
  stageOptions = {},
  onTabChange,
  compact = false,
}: ContentPipelineStepperProps) {
  const stage = getContentStage(content, stageOptions);
  const current = getPipelineTabIndex(stage);

  return (
    <nav
      className={cn(compact ? 'pb-1' : 'border-b border-[var(--border-color)] pb-4')}
      aria-label="Pipeline editorial"
    >
      <ol className={cn('flex items-center', compact && 'max-w-lg')}>
        {CONTENT_PIPELINE_TABS.map((stepId, stepIndex) => {
          const isActive = activeTab === stepId;
          const isDone = stepIndex < current;
          const isCurrent = stepIndex === current;
          const locked = isTabLocked(stepId, content, stageOptions);
          const connectorDone = stepIndex > 0 && stepIndex <= current;

          return (
            <li key={stepId} className="flex min-w-0 flex-1 items-center">
              {stepIndex > 0 ? (
                <span
                  aria-hidden
                  className={cn(
                    'mx-1 h-px flex-1',
                    connectorDone
                      ? 'bg-[var(--text-tertiary)]'
                      : 'bg-[var(--border-color)]'
                  )}
                />
              ) : null}

              <button
                type="button"
                disabled={locked}
                aria-current={isActive ? 'step' : undefined}
                aria-disabled={locked || undefined}
                title={locked ? 'Disponível após gravar o conteúdo' : undefined}
                onClick={() => {
                  if (locked) return;
                  onTabChange(stepId);
                }}
                className={cn(
                  'inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md font-medium transition-colors',
                  compact ? 'px-1.5 py-1 text-xs' : 'gap-1.5 px-2 py-1.5 text-sm',
                  locked
                    ? 'cursor-not-allowed text-[var(--text-tertiary)] opacity-60'
                    : isActive
                      ? 'bg-[var(--bg-hover)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border-color)]'
                      : isDone
                        ? 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                        : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
                )}
              >
                <StepIndicator done={isDone} current={isCurrent && !locked} locked={locked} />
                <span className="truncate">{STEP_LABELS[stepId]}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
