import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {RichTextEditor} from '../../../../components/editors/RichTextEditor';
import {AppButton} from '../../../../components/ui/AppButton';
import {Skeleton} from '../../../../components/ui/Skeleton';
import {Text} from '../../../../components/ui/Text';
import type {Content} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {
  ScriptBlockToolbar,
  appendScriptBlock,
  type ScriptBlockLabel,
} from './ScriptBlockToolbar';

interface ContentScriptWorkspaceProps {
  script: string | null;
  scriptNotes: Content['scriptNotes'];
  documentTitle: string;
  authorName: string;
  referencias: string | null;
  onScriptChange: (html: string) => void;
  onReferenciasChange: (value: string) => void;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  showReferencias?: boolean;
  bodyLoading?: boolean;
  bodyError?: string | null;
  onRetryBody?: () => void;
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
  saveState,
  showReferencias = true,
  bodyLoading = false,
  bodyError = null,
  onRetryBody,
  onAddAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
}: ContentScriptWorkspaceProps) {
  const [refsOpen, setRefsOpen] = useState(() => (referencias?.trim().length ?? 0) > 0);

  const handleInsertBlock = (label: ScriptBlockLabel) => {
    onScriptChange(appendScriptBlock(script, label));
  };

  const handleApplyTemplate = (html: string) => {
    const trimmed = script?.trim() ?? '';
    onScriptChange(trimmed ? `${trimmed}${html}` : html);
  };

  return (
    <section className="cms-panel flex flex-col">
      <div className="border-b border-[var(--border-color)] px-4 py-3 md:px-6">
        <Text variant="sectionTitle">Roteiro</Text>
      </div>
      <div>
        {bodyLoading ? (
          <div className="stack-sm p-4 md:p-6" aria-busy="true" aria-label="Carregando roteiro">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="mt-3 h-48 w-full" />
            <p className="pt-2 text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)]">
              Carregando roteiro...
            </p>
          </div>
        ) : bodyError ? (
          <div className="stack-md p-6 text-center">
            <Text variant="sectionTitle">Não foi possível carregar o roteiro</Text>
            <Text variant="meta" className="mx-auto max-w-md">
              {bodyError}
            </Text>
            {onRetryBody ? (
              <AppButton type="button" variant="secondary" size="sm" onClick={onRetryBody}>
                Tentar novamente
              </AppButton>
            ) : null}
          </div>
        ) : (
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
            toolbarStart={<ScriptBlockToolbar onInsertBlock={handleInsertBlock} onApplyTemplate={handleApplyTemplate} />}
            saveState={saveState}
            className="border-0 bg-[var(--bg-elevated)] shadow-none"
          />
        )}
      </div>

      {showReferencias ? (
        <div className="shrink-0 overflow-hidden border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setRefsOpen(prev => !prev)}
            className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left transition-colors hover:bg-[var(--bg-hover)] md:px-6"
          >
            <span className="text-sm font-semibold text-[var(--text-primary)]">Referencias</span>
            <ChevronDown className={cn('h-4 w-4 text-[var(--text-tertiary)] transition-transform', refsOpen && 'rotate-180')} />
          </button>
          {refsOpen ? (
            <div className="border-t border-[var(--border-color)] px-4 pb-3 md:px-6">
              <textarea
                value={referencias ?? ''}
                onChange={event => onReferenciasChange(event.target.value)}
                className="mt-2 w-full min-h-[80px] resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-blue)]"
                placeholder="Links, observacoes e contexto do roteiro"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
