import type { ReactNode } from 'react';
import { RichTextEditor } from '../../components/editors/RichTextEditor';
import { DraftSaveBar } from '../../features/contents/components/detail/DraftSaveBar';
import { cn } from '../../lib/utils';

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
}

export function MobileScriptEditor({
  content,
  onChange,
  placeholder = 'Escreva o roteiro...',
  autoFocus = false,
  documentTitle = 'Roteiro',
  className,
  saveState,
  toolbarStart,
  onSave,
  hasUnsavedChanges = false,
}: MobileScriptEditorProps) {
  return (
    <RichTextEditor
      variant="workspace"
      compactMobileComposer
      content={content}
      onChange={onChange}
      placeholder={placeholder}
      autoFocus={autoFocus}
      documentTitle={documentTitle}
      saveState={saveState}
      toolbarStart={toolbarStart}
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
  );
}
