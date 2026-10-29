import type { ReactNode } from 'react';
import { RichTextEditor } from '../../components/editors/RichTextEditor';
import type { CommentPatch, ScriptComment } from '../../components/editors/commentModel';
import { DraftSaveBar } from '../../features/contents/components/detail/DraftSaveBar';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { RoteiroTypographyControls } from '../../features/contents/components/detail/RoteiroTypographyControls';
import { roteiroTypographyStyle } from '../../features/contents/lib/roteiroTypography';
import { useRoteiroTypography } from '../../features/contents/lib/useRoteiroTypography';

interface MobileScriptEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  documentTitle?: string;
  className?: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  toolbarStart?: ReactNode;
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
  authorName?: string;
  annotations?: ScriptComment[];
  onAddAnnotation?: (text: string, selection: { from: number; to: number }, comment: string, id?: string) => void;
  onRemoveAnnotation?: (id: string) => void;
  onUpdateAnnotation?: (id: string, comment: string, color?: string) => void;
  onPatchAnnotation?: (id: string, patch: CommentPatch) => void;
}

export function MobileScriptEditor({
  content,
  onChange,
  placeholder = 'Escreva o roteiro…',
  autoFocus = false,
  documentTitle = 'Roteiro',
  className,
  saveState,
  toolbarStart,
  onSave,
  hasUnsavedChanges = false,
  authorName,
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
  onPatchAnnotation,
}: MobileScriptEditorProps) {
  const { user } = useAuth();
  const { typography, setTypography } = useRoteiroTypography(user?.id);
  return (
    <div className="roteiro-typography contents" style={roteiroTypographyStyle(typography)}>
    <RichTextEditor
      variant="workspace"
      compactMobileComposer
      content={content}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      documentTitle={documentTitle}
      saveState={saveState}
      authorName={authorName}
      annotations={annotations}
      onAddAnnotation={onAddAnnotation}
      onRemoveAnnotation={onRemoveAnnotation}
      onUpdateAnnotation={onUpdateAnnotation}
      onPatchAnnotation={onPatchAnnotation}
      toolbarStart={
        <>
          {toolbarStart}
          <RoteiroTypographyControls typography={typography} onChange={setTypography} />
        </>
      }
      saveAction={
        onSave ? (
          <DraftSaveBar
            onSave={onSave}
            saveState={saveState}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        ) : null
      }
      className={cn('border-0 bg-transparent shadow-none', className)}
      editorViewportClassName="bg-transparent p-0"
      editorCanvasClassName="min-h-[50dvh] rounded-none border-0 bg-transparent px-0 py-2 shadow-none"
    />
    </div>
  );
}
