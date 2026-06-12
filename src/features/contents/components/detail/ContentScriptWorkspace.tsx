import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ChevronDown, Layout, Plus} from 'lucide-react';
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

const SCRIPT_BLOCKS = ['Gancho', 'Fato', 'Virada', 'Veredito'] as const;

function appendScriptBlock(script: string | null, label: string) {
  const blockHtml = `<p><strong>[${label}]</strong></p><p></p>`;
  const trimmed = script?.trim() ?? '';
  return trimmed ? `${trimmed}${blockHtml}` : blockHtml;
}

function ScriptBlockToolbar({
  onInsertBlock,
}: {
  onInsertBlock: (label: (typeof SCRIPT_BLOCKS)[number]) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]"
        >
          <Plus className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
          Bloco
          <ChevronDown className={cn('h-3 w-3 text-[var(--text-tertiary)] transition-transform', open && 'rotate-180')} />
        </button>
        {open ? (
          <div className="absolute left-0 top-full z-50 mt-1 min-w-[140px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-lg">
            {SCRIPT_BLOCKS.map(label => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onInsertBlock(label);
                  setOpen(false);
                }}
                className="w-full rounded-md px-2.5 py-1.5 text-left text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                [{label}]
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => navigate('/configuracoes/templates')}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        title="Gerenciar templates"
        aria-label="Gerenciar templates"
      >
        <Layout className="h-3.5 w-3.5" />
      </button>
    </>
  );
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
  const [refsOpen, setRefsOpen] = useState(() => (referencias?.trim().length ?? 0) > 0);

  const handleInsertBlock = (label: (typeof SCRIPT_BLOCKS)[number]) => {
    onScriptChange(appendScriptBlock(script, label));
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] flex-col gap-3">
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
          toolbarStart={<ScriptBlockToolbar onInsertBlock={handleInsertBlock} />}
          className="h-full min-h-[calc(100vh-260px)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-sm"
        />
      </div>

      <div className="cms-panel shrink-0 overflow-hidden">
        <button
          type="button"
          onClick={() => setRefsOpen(prev => !prev)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--bg-hover)]"
        >
          <span className="text-sm font-semibold text-[var(--text-primary)]">Referencias</span>
          <ChevronDown className={cn('h-4 w-4 text-[var(--text-tertiary)] transition-transform', refsOpen && 'rotate-180')} />
        </button>
        {refsOpen ? (
          <div className="border-t border-[var(--border-color)] px-3 pb-3">
            <textarea
              value={referencias ?? ''}
              onChange={event => onReferenciasChange(event.target.value)}
              className="mt-2 w-full min-h-[80px] resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-blue)]"
              placeholder="Links, observacoes e contexto do roteiro"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
