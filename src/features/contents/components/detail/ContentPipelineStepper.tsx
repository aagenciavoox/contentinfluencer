import {cn} from '../../../../lib/utils';
import type {ContentDetailTab} from '../../lib/contentPipeline';
import {getContentStage} from '../../lib/contentPipeline';
import type {Content} from '../../../../lib/database';

const STEPS: Array<{id: ContentDetailTab | 'pipeline'; label: string; tab?: ContentDetailTab}> = [
  {id: 'pipeline', label: 'Ideia'},
  {id: 'roteiro', label: 'Roteiro', tab: 'roteiro'},
  {id: 'gravacao', label: 'Gravacao', tab: 'gravacao'},
  {id: 'producao', label: 'Producao', tab: 'producao'},
  {id: 'postagem', label: 'Postagem', tab: 'postagem'},
  {id: 'historico', label: 'Publicado', tab: 'historico'},
];

function stageIndex(content: Content) {
  const stage = getContentStage(content);
  const map: Record<string, number> = {
    IDEIA: 0,
    ROTEIRO: 1,
    PRONTO_PARA_GRAVAR: 2,
    EM_BLOCO: 2,
    GRAVADO: 3,
    PRODUCAO: 3,
    PROGRAMADO: 4,
    POSTADO: 5,
  };
  return map[stage] ?? 1;
}

interface ContentPipelineStepperProps {
  content: Content;
  activeTab: ContentDetailTab;
  onTabChange: (tab: ContentDetailTab) => void;
}

export function ContentPipelineStepper({content, activeTab, onTabChange}: ContentPipelineStepperProps) {
  const current = stageIndex(content);

  return (
    <nav
      className="flex flex-wrap items-center gap-1 border-b border-[var(--border-color)] pb-3"
      aria-label="Pipeline editorial"
    >
      {STEPS.map((step, index) => {
        const isActive = step.tab ? activeTab === step.tab : false;
        const isDone = index < current;
        const isCurrent = index === current;

        return (
          <button
            key={step.label}
            type="button"
            disabled={!step.tab}
            onClick={() => step.tab && onTabChange(step.tab)}
            className={cn(
              'rounded-[var(--radius-pill)] px-2.5 py-1 text-[10px] font-medium transition-colors',
              !step.tab && 'cursor-default opacity-50',
              isActive || isCurrent
                ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                : isDone
                  ? 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                  : 'text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]'
            )}
          >
            {step.label}
          </button>
        );
      })}
    </nav>
  );
}
