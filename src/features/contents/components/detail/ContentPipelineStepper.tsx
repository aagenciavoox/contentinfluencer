import {Check} from 'lucide-react';
import {cn} from '../../../../lib/utils';
import type {ContentDetailTab} from '../../lib/contentPipeline';
import {
  CONTENT_PIPELINE_TABS,
  getContentStage,
  getPipelineTabIndex,
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
  visibleTabs?: ContentDetailTab[];
  stageOptions?: StageOptions;
  onTabChange: (tab: ContentDetailTab) => void;
  compact?: boolean;
}

function StepIndicator({done, current, compact}: {done: boolean; current: boolean; compact?: boolean}) {
  if (done) {
    return <Check className={cn('shrink-0', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} aria-hidden />;
  }
  if (current) {
    return <span aria-hidden className={cn('shrink-0 rounded-full bg-current', compact ? 'h-1 w-1' : 'h-1.5 w-1.5')} />;
  }
  return (
    <span
      aria-hidden
      className={cn('shrink-0 rounded-full border border-current opacity-60', compact ? 'h-1 w-1' : 'h-1.5 w-1.5')}
    />
  );
}

export function ContentPipelineStepper({
  content,
  activeTab,
  visibleTabs = CONTENT_PIPELINE_TABS,
  stageOptions = {},
  onTabChange,
  compact = false,
}: ContentPipelineStepperProps) {
  const stage = getContentStage(content, stageOptions);
  const current = getPipelineTabIndex(stage, content);

  return (
    <nav
      className={cn(
        'tab-bar',
        compact && 'gap-0.5 border-0 bg-transparent p-0 shadow-none',
      )}
      aria-label="Etapas do roteiro"
    >
      {visibleTabs.map(stepId => {
        const stepIndex = CONTENT_PIPELINE_TABS.indexOf(stepId);
        const isActive = activeTab === stepId;
        const isDone = stepIndex < current;
        const isCurrent = stepIndex === current;

        return (
          <button
            key={stepId}
            type="button"
            aria-current={isActive ? 'step' : undefined}
            onClick={() => onTabChange(stepId)}
            className={cn(
              'tab-item',
              isActive && 'tab-item-active',
              compact && 'h-7 min-h-0 px-2.5 py-1 text-xs font-medium text-[var(--text-tertiary)]',
              compact && isActive && 'bg-[var(--bg-hover)] text-[var(--text-primary)]',
            )}
          >
            <StepIndicator done={isDone} current={isCurrent} compact={compact} />
            <span className="truncate">{STEP_LABELS[stepId]}</span>
          </button>
        );
      })}
    </nav>
  );
}
