import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {RichTextEditor} from '../../../../components/editors/RichTextEditor';
import type {Content} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';

interface ContentScriptWorkspaceProps {
  script: string | null;
  scriptNotes: Content['scriptNotes'];
  documentTitle: string;
  authorName: string;
  referencias: string | null;
  onScriptChange: (html: string) => void;
  onReferenciasChange: (value: string) => void;
  onAddAnnotation?: (text: string, selection: {from: number; to: number}, comment: string) => void;
  onRemoveAnnotation?: (id: string) => void;
  onUpdateAnnotation?: (id: string, comment: string, color?: string) => void;
}

export function ContentScriptWorkspace({
  script,
  scriptNotes,
  documentTitle,
  authorName,
  referencias,
  onScriptChange,
  onReferenciasChange,
  onAddAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
}: ContentScriptWorkspaceProps) {
  const [refsOpen, setRefsOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-220px)] flex-col gap-3">
      <div className="min-h-0 flex-1">
        <RichTextEditor
          variant="workspace"
          content={script || ''}
          onChange={onScriptChange}
          placeholder="Abra o seu coracao e escreva o roteiro..."
          authorName={authorName}
          documentTitle={documentTitle}
          annotations={scriptNotes || []}
          onAddAnnotation={onAddAnnotation}
          onRemoveAnnotation={onRemoveAnnotation}
          onUpdateAnnotation={onUpdateAnnotation}
          className="h-full min-h-[calc(100vh-280px)] border-0 bg-transparent shadow-none"
        />
      </div>

      <div className="ds-card shrink-0 bg-[var(--bg-secondary)]">
        <button
          type="button"
          onClick={() => setRefsOpen(prev => !prev)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span className="ds-meta">Referencias</span>
          <ChevronDown className={cn('h-4 w-4 text-[var(--text-tertiary)] transition-transform', refsOpen && 'rotate-180')} />
        </button>
        {refsOpen ? (
          <div className="border-t border-[var(--border-color)] px-4 pb-4">
            <textarea
              value={referencias ?? ''}
              onChange={event => onReferenciasChange(event.target.value)}
              className="ds-input mt-3 w-full min-h-[100px] resize-none border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm"
              placeholder="Links, observacoes e contexto do roteiro"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
