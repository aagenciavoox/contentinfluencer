import {useState, type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import {RichTextEditor} from '../../../../components/editors/RichTextEditor';
import type {CommentPatch} from '../../../../components/editors/commentModel';
import {useAuth} from '../../../../context/AuthContext';
import {roteiroTypographyStyle, useRoteiroTypography} from '../../lib/roteiroTypography';
import {RoteiroTypographyControls} from './RoteiroTypographyControls';
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
  /** Compact neutral format bar used by the desktop Escrita tab. */
  writingToolbar?: boolean;
  bodyLoading?: boolean;
  bodyError?: string | null;
  onRetryBody?: () => void;
  headerAction?: React.ReactNode;
  /** Na barra do editor, antes de "Mais" (ex.: botão "Notas"). */
  toolbarEnd?: ReactNode;
  className?: string;
  fullscreenAside?: ReactNode;
  onFullscreenChange?: (open: boolean) => void;
  notesPanelOpen?: boolean;
  onAddAnnotation?: (text: string, selection: {from: number; to: number}, comment: string, id?: string) => void;
  onRemoveAnnotation?: (id: string) => void;
  onUpdateAnnotation?: (id: string, comment: string, color?: string) => void;
  onPatchAnnotation?: (id: string, patch: CommentPatch) => void;
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
  writingToolbar = false,
  bodyLoading = false,
  bodyError = null,
  onRetryBody,
  headerAction,
  toolbarEnd,
  className,
  fullscreenAside,
  onFullscreenChange,
  notesPanelOpen = false,
  onAddAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
  onPatchAnnotation,
}: ContentScriptWorkspaceProps) {
  const [refsOpen, setRefsOpen] = useState(() => (referencias?.trim().length ?? 0) > 0);

  const handleInsertBlock = (label: ScriptBlockLabel) => {
    onScriptChange(appendScriptBlock(script, label));
  };

  const handleApplyTemplate = (html: string) => {
    const trimmed = script?.trim() ?? '';
    onScriptChange(trimmed ? `${trimmed}${html}` : html);
  };

  const {user} = useAuth();
  const {typography, setTypography} = useRoteiroTypography(user?.id);

  return (
    <section className={cn(
      writingToolbar
        ? 'cms-panel flex min-h-[calc(100dvh-14rem)] flex-col overflow-visible'
        : 'cms-panel flex max-h-[calc(100dvh-10.5rem)] min-h-[28rem] flex-col overflow-hidden',
      className,
    )}>
      {writingToolbar ? (
        // Na aba Escrita o título "Roteiro" repetia a aba; só a ação fica, quando existe.
        <>
          <Text variant="sectionTitle" className="sr-only">Roteiro</Text>
          {headerAction ? (
            <div className="flex shrink-0 items-center justify-end gap-3 border-b border-[var(--border-color)] px-4 py-2 md:px-6">
              {headerAction}
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3 md:px-6">
          <Text variant="sectionTitle">Roteiro</Text>
          {headerAction}
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col">
        {bodyLoading ? (
          <div className="stack-sm p-4 md:p-6" aria-busy="true" aria-label="Carregando roteiro">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="mt-3 h-48 w-full" />
            <p className="pt-2 text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)]">
              Carregando roteiro…
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
          <div className="roteiro-typography contents" style={roteiroTypographyStyle(typography)}>
          <RichTextEditor
            variant="workspace"
            formatBar={writingToolbar ? 'writing' : 'full'}
            meter="spoken"
            content={script || ''}
            onChange={onScriptChange}
            placeholder="Escreva o roteiro…"
            authorName={authorName}
            documentTitle={documentTitle}
            annotations={scriptNotes || []}
            onAddAnnotation={onAddAnnotation}
            onRemoveAnnotation={onRemoveAnnotation}
            onUpdateAnnotation={onUpdateAnnotation}
            onPatchAnnotation={onPatchAnnotation}
            toolbarStart={
              <>
              <ScriptBlockToolbar
                neutral={writingToolbar}
                onInsertBlock={handleInsertBlock}
                onApplyTemplate={handleApplyTemplate}
              />
              </>
            }
            toolbarEnd={toolbarEnd}
            typographySlot={<RoteiroTypographyControls variant="toolbar" typography={typography} onChange={setTypography} />}
            saveState={saveState}
            fullscreenAside={fullscreenAside}
            onFullscreenChange={onFullscreenChange}
            notesPanelOpen={notesPanelOpen}
            className={writingToolbar
              ? 'min-h-[calc(100dvh-18rem)] border-0 bg-[var(--bg-elevated)] shadow-none'
              : 'h-full min-h-0 border-0 bg-[var(--bg-elevated)] shadow-none'}
          />
          </div>
        )}
      </div>

      {showReferencias ? (
        <div className="shrink-0 overflow-hidden border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setRefsOpen(prev => !prev)}
            className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left transition-colors hover:bg-[var(--bg-hover)] md:px-6"
          >
            <span className="text-sm font-semibold text-[var(--text-primary)]">Referências</span>
            <ChevronDown className={cn('h-4 w-4 text-[var(--text-tertiary)] transition-transform', refsOpen && 'rotate-180')} />
          </button>
          {refsOpen ? (
            <div className="border-t border-[var(--border-color)] px-4 pb-3 md:px-6">
              <textarea
                value={referencias ?? ''}
                onChange={event => onReferenciasChange(event.target.value)}
                className="mt-2 w-full min-h-[80px] resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-blue)]"
                placeholder="Links, observações e contexto do roteiro"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
