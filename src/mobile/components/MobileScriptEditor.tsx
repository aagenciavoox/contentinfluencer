import type { ReactNode } from 'react';
import { RichTextEditor } from '../../components/editors/RichTextEditor';
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
      className={cn('border-0 bg-transparent shadow-none', className)}
      editorViewportClassName="bg-transparent p-0"
      editorCanvasClassName="min-h-[50dvh] rounded-none border-0 bg-transparent px-0 py-2 shadow-none"
    />
  );
}
