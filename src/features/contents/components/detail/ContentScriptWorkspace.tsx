import {useState, type ReactNode} from 'react';
import type {Editor} from '@tiptap/react';
import {ChevronDown, Clapperboard, Heading2} from 'lucide-react';
import {insertSectionAfterCursor} from '../../../../components/editors/scriptSections';
import {RichTextEditor} from '../../../../components/editors/RichTextEditor';
import type {CommentPatch} from '../../../../components/editors/commentModel';
import {useAuth} from '../../../../context/AuthContext';
import {roteiroTypographyStyle} from '../../lib/roteiroTypography';
import {useRoteiroTypography} from '../../lib/useRoteiroTypography';
import {RoteiroTypographyControls} from './RoteiroTypographyControls';
import {AppButton} from '../../../../components/ui/AppButton';
import {Skeleton} from '../../../../components/ui/Skeleton';
import {Text} from '../../../../components/ui/Text';
import type {Content} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {templateSectionsHtml} from '../../lib/youtubeScript';
import {
  ScriptBlockToolbar,
  appendScriptBlock,
  type ScriptBlockLabel,
  type ScriptInsertItem,
} from './ScriptBlockToolbar';
import {ScriptStructurePanel} from './ScriptStructurePanel';

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
  /** Na barra do editor, antes de "Mais" (ex.: botão "Rascunho"). */
  toolbarEnd?: ReactNode;
  className?: string;
  fullscreenAside?: ReactNode;
  onFullscreenChange?: (open: boolean) => void;
  notesPanelOpen?: boolean;
  onNotesPanelChange?: (open: boolean) => void;
  draftEditor?: Editor | null;
  focusedPane?: 'script' | 'draft';
  onFocusedPaneChange?: (pane: 'script' | 'draft') => void;
  onRegisterInsertHandler?: (handler: ((text: string) => void) | null) => void;
  onAddAnnotation?: (text: string, selection: {from: number; to: number}, comment: string, id?: string) => void;
  onRemoveAnnotation?: (id: string) => void;
  onUpdateAnnotation?: (id: string, comment: string, color?: string) => void;
  onPatchAnnotation?: (id: string, patch: CommentPatch) => void;
  /** Modo YouTube: seções, blocos "Na tela" e fala estimada em faixa. */
  youtube?: boolean;
  /** Painel Estrutura à esquerda (só no modo YouTube). */
  structurePanelOpen?: boolean;
  onStructurePanelChange?: (open: boolean) => void;
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
  onNotesPanelChange,
  draftEditor = null,
  focusedPane = 'script',
  onFocusedPaneChange,
  onRegisterInsertHandler,
  onAddAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
  onPatchAnnotation,
  youtube = false,
  structurePanelOpen = false,
  onStructurePanelChange,
}: ContentScriptWorkspaceProps) {
  const [refsOpen, setRefsOpen] = useState(() => (referencias?.trim().length ?? 0) > 0);
  const [scriptEditor, setScriptEditor] = useState<Editor | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const showStructure = youtube && structurePanelOpen && !bodyLoading && !bodyError;
  // No modo foco o painel vai junto para dentro do editor (a página fica coberta).
  const structurePanel = (panelClassName: string) => (
    <ScriptStructurePanel
      editor={scriptEditor}
      onClose={() => onStructurePanelChange?.(false)}
      className={panelClassName}
    />
  );

  // No YouTube o "Inserir" põe o bloco onde está o cursor, não no fim.
  const youtubeInsertItems: ScriptInsertItem[] | undefined = youtube ? [
    {
      id: 'na-tela',
      label: 'Na tela',
      icon: <Clapperboard className="h-3.5 w-3.5 text-[var(--text-secondary)]" aria-hidden />,
      onSelect: () => scriptEditor?.chain().focus().insertOnScreenNote().run(),
    },
    {
      id: 'secao',
      label: 'Seção',
      icon: <Heading2 className="h-3.5 w-3.5 text-[var(--text-secondary)]" aria-hidden />,
      onSelect: () => {
        if (scriptEditor) insertSectionAfterCursor(scriptEditor);
      },
    },
  ] : undefined;

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
        ? 'flex min-h-[calc(100dvh-14rem)] flex-col overflow-visible rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)]'
        : 'cms-panel flex max-h-[calc(100dvh-10.5rem)] min-h-[28rem] flex-col overflow-hidden',
      className,
    )}>
      {writingToolbar ? (
        <>
          <Text variant="sectionTitle" className="sr-only">Roteiro</Text>
          {headerAction ? (
            <div className="flex shrink-0 items-center justify-end gap-3 px-3 py-1.5 md:px-4">
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
            <Text variant="label" as="p" className="pt-2 t-label-uppercase text-[var(--text-tertiary)]">
              Carregando roteiro…
            </Text>
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
          <div className={cn('flex min-h-0 flex-1', showStructure ? 'flex-row' : 'flex-col')}>
          {showStructure && !focusMode ? (
            <div className="w-64 shrink-0 border-r border-[var(--border-color)] xl:w-72">
              {structurePanel('sticky top-0 h-[calc(100dvh-9rem)] max-h-full')}
            </div>
          ) : null}
          <div className="roteiro-typography contents" style={roteiroTypographyStyle(typography)}>
          <RichTextEditor
            variant="workspace"
            formatBar={writingToolbar ? 'writing' : 'full'}
            meter={youtube ? 'spoken-range' : 'spoken'}
            onEditorReady={setScriptEditor}
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
                items={youtubeInsertItems}
                templateHtml={youtube ? template => templateSectionsHtml(template.estrutura) : undefined}
              />
              </>
            }
            toolbarEnd={toolbarEnd}
            typographySlot={<RoteiroTypographyControls variant="panel" typography={typography} onChange={setTypography} />}
            saveState={saveState}
            fullscreenAside={fullscreenAside}
            focusStart={showStructure ? structurePanel('h-full') : undefined}
            onFullscreenChange={open => {
              setFocusMode(open);
              onFullscreenChange?.(open);
            }}
            notesPanelOpen={notesPanelOpen}
            onNotesPanelChange={onNotesPanelChange}
            draftEditor={draftEditor}
            focusedPane={focusedPane}
            onFocusedPaneChange={onFocusedPaneChange}
            onRegisterInsertHandler={onRegisterInsertHandler}
            className={cn(
              writingToolbar
                ? 'min-h-[calc(100dvh-18rem)] border-0 bg-[var(--bg-elevated)] shadow-none'
                : 'h-full min-h-0 border-0 bg-[var(--bg-elevated)] shadow-none',
              showStructure && 'min-w-0 flex-1 rounded-l-none',
            )}
          />
          </div>
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
            <Text variant="itemTitle" as="span" className="text-[var(--text-primary)]">Referências</Text>
            <ChevronDown className={cn('h-4 w-4 text-[var(--text-tertiary)] transition-transform', refsOpen && 'rotate-180')} />
          </button>
          {refsOpen ? (
            <div className="border-t border-[var(--border-color)] px-4 pb-3 md:px-6">
              <textarea
                value={referencias ?? ''}
                onChange={event => onReferenciasChange(event.target.value)}
                className="mt-2 w-full min-h-[80px] resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 t-body outline-none focus:border-[var(--accent-blue)]"
                placeholder="Links, observações e contexto do roteiro"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
