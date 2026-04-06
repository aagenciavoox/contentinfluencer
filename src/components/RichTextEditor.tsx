import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, 
  AlignLeft, AlignCenter, AlignRight, Maximize2, Minimize2,
  Type, Highlighter, Link as LinkIcon, Quote, Undo, Redo,
  MessageSquarePlus, X, Trash2, PenTool, MessageSquare,
  Check, ChevronRight, Palette, Plus, User, MoreVertical
} from 'lucide-react';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { Plugin } from 'prosemirror-state';
import '../editor.css';

interface Annotation {
  id: string;
  text: string;
  comment: string;
  color?: string;
  authorName?: string;
  selection: { from: number; to: number };
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  onAddAnnotation?: (text: string, selection: { from: number; to: number }, comment: string) => void;
  annotations?: Annotation[];
  onRemoveAnnotation?: (id: string) => void;
  onUpdateAnnotation?: (id: string, comment: string, color?: string) => void;
  authorName?: string;
}

const COMMENT_COLORS = [
  { name: 'Yellow', value: 'rgba(255, 235, 153, 0.5)' },
  { name: 'Orange', value: 'rgba(255, 184, 108, 0.5)' },
  { name: 'Blue', value: 'rgba(139, 233, 253, 0.5)' },
  { name: 'Pink', value: 'rgba(255, 121, 198, 0.5)' },
];

export function RichTextEditor({ 
  content, 
  onChange, 
  placeholder, 
  className, 
  onAddAnnotation,
  annotations = [],
  onRemoveAnnotation,
  onUpdateAnnotation,
  authorName = 'Você'
}: RichTextEditorProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number } | null>(null);
  const [marginMenu, setMarginMenu] = useState<{ x: number, y: number } | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [draftCommentText, setDraftCommentText] = useState('');
  const [activeDraft, setActiveDraft] = useState<{ text: string, selection: { from: number; to: number } } | null>(null);
  const [activeAnnotationModal, setActiveAnnotationModal] = useState<Annotation | null>(null);

  const editorContainerRef = useRef<HTMLDivElement>(null);

  const extensions = useMemo(() => [
    StarterKit.configure({
      underline: false,
      bulletList: { keepMarks: true, keepAttributes: false },
      orderedList: { keepMarks: true, keepAttributes: false },
    }),
    Underline,
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Typography,
  ], []);

  const editor = useEditor({
    extensions,
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onSelectionUpdate: ({ editor }) => {
      const { empty } = editor.state.selection;
      if (empty) {
        setSelectionMenu(null);
        setMarginMenu(null);
        return;
      }
      const { view, state: { selection } } = editor;
      try {
        const start = view.coordsAtPos(selection.from);
        const end = view.coordsAtPos(selection.to);
        const scrollOffset = editorContainerRef.current?.scrollTop || 0;
        
        setSelectionMenu({ x: (start.left + end.left) / 2, y: Math.max(10, Math.min(start.top, end.top) - 48) });
        if (editorContainerRef.current) {
          const rect = editorContainerRef.current.getBoundingClientRect();
          setMarginMenu({ x: rect.right + 15, y: start.top + (end.top - start.top) / 2 - 16 });
        }
      } catch (e) {
        setSelectionMenu(null);
        setMarginMenu(null);
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[inherit] max-w-none text-[var(--text-primary)] transition-all duration-300',
      },
      // Using decorations for dynamic highlights that don't change the HTML
      decorations: (state) => {
        const decorations: Decoration[] = [];
        annotations.forEach(note => {
          const isExpanded = expandedNoteId === note.id;
          decorations.push(Decoration.inline(note.selection.from, note.selection.to, {
            class: cn(
              "annotation-highlight transition-all duration-300 cursor-pointer",
              isExpanded && "active-annotation"
            ),
            style: `background-color: ${note.color || 'rgba(255, 235, 153, 0.3)'}; border-bottom: 2px solid ${isExpanded ? 'var(--accent-blue)' : 'rgba(200,160,0,0.4)'}`
          }));
        });
        return DecorationSet.create(state.doc, decorations);
      }
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const sortedAnnotations = useMemo(() => {
    return [...annotations]
      .filter(a => !!a.id)
      .sort((a, b) => a.selection.from - b.selection.from);
  }, [annotations]);

  const startCommenting = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (text) {
      setActiveDraft({ text, selection: { from, to } });
      setDraftCommentText('');
      setSelectionMenu(null);
      setMarginMenu(null);
    }
  }, [editor]);

  const submitComment = useCallback(() => {
    if (activeDraft && draftCommentText.trim() && onAddAnnotation) {
      onAddAnnotation(activeDraft.text, activeDraft.selection, draftCommentText);
      setActiveDraft(null);
      setDraftCommentText('');
    }
  }, [activeDraft, draftCommentText, onAddAnnotation]);

  const handleNoteExpand = (id: string) => {
    const isExpanding = expandedNoteId !== id;
    setExpandedNoteId(isExpanding ? id : null);
    if (isExpanding && editor) {
      const note = annotations.find(n => n.id === id);
      if (note) editor.commands.setTextSelection(note.selection);
    }
  };

  const handleEditorAreaClick = useCallback((e: React.MouseEvent) => {
    if (isFullscreen || !editor) return;
    const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
    if (!pos) return;
    const clicked = annotations.find(note =>
      pos.pos >= note.selection.from && pos.pos <= note.selection.to
    );
    if (clicked) {
      e.preventDefault();
      setActiveAnnotationModal(clicked);
    }
  }, [isFullscreen, editor, annotations]);

  if (!editor) return null;

  return (
    <>
      <AnimatePresence>
        {isFullscreen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsFullscreen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-md z-[99]" />
        )}
      </AnimatePresence>

      <motion.div layout className={cn("relative border border-[var(--border-color)] rounded-2xl transition-all duration-500", isFullscreen ? "fixed inset-4 md:inset-6 lg:inset-[5%_10%] z-[100] bg-[var(--bg-primary)] shadow-2xl flex flex-col" : "flex flex-col min-h-[400px] bg-[var(--bg-secondary)]/50", className)}>
        {isFullscreen && (
          <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border-color)] bg-[var(--bg-primary)] shrink-0">
             <PenTool className="w-5 h-5 text-[var(--accent-blue)]" />
             <button onClick={() => setIsFullscreen(false)} className="p-3 hover:bg-[var(--bg-hover)] rounded-full transition-all active:scale-95 text-gray-400"><Minimize2 className="w-5 h-5" /></button>
          </div>
        )}
        
        {!isFullscreen && (
          <button onClick={() => setIsFullscreen(true)} className="absolute top-4 right-4 p-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl z-20 hover:bg-[var(--bg-hover)] shadow-sm"><Maximize2 className="w-4 h-4 opacity-40 hover:opacity-100" /></button>
        )}

        <div className="flex items-center gap-1 p-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] rounded-t-xl overflow-x-auto">
          <button onClick={() => editor.chain().focus().undo().run()} className="p-2 opacity-60"><Undo className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().redo().run()} className="p-2 opacity-60"><Redo className="w-4 h-4" /></button>
          <div className="w-[1px] h-4 bg-[var(--border-color)] mx-1" />
          <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-2 rounded-lg", editor.isActive('bold') ? "bg-blue-100 text-blue-600" : "opacity-60")}><Bold className="w-4 h-4" /></button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-2 rounded-lg", editor.isActive('italic') ? "bg-blue-100 text-blue-600" : "opacity-60")}><Italic className="w-4 h-4" /></button>
        </div>

        <AnimatePresence>
          {selectionMenu && editor && !activeDraft && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed z-[120] flex items-center gap-0.5 p-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl -translate-x-1/2" style={{ top: selectionMenu.y, left: selectionMenu.x }}>
              <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn("p-2 rounded-lg", editor.isActive('bold') ? "text-blue-600" : "opacity-60")}><Bold className="w-4 h-4" /></button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn("p-2 rounded-lg", editor.isActive('italic') ? "text-blue-600" : "opacity-60")}><Italic className="w-4 h-4" /></button>
              <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn("p-2 rounded-lg", editor.isActive('underline') ? "text-blue-600" : "opacity-60")}><UnderlineIcon className="w-4 h-4" /></button>
            </motion.div>
          )}

          {marginMenu && !activeDraft && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="fixed z-[120]" style={{ top: marginMenu.y, left: marginMenu.x }}>
              <button onClick={startCommenting} className="p-2.5 bg-white text-blue-600 border border-gray-100 rounded-full shadow-lg hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110 active:scale-95"><MessageSquarePlus className="w-5 h-5" /></button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className={cn("flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 custom-scrollbar transition-all duration-500", isFullscreen ? "bg-[var(--bg-secondary)]/50" : "bg-[var(--bg-secondary)]/30")}>
          <div className={cn("mx-auto flex flex-col xl:flex-row gap-12 items-start relative", isFullscreen ? "max-w-6xl" : "max-w-full")}>
            <div
              ref={editorContainerRef}
              onClick={handleEditorAreaClick}
              className={cn("flex-1 bg-white shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-[#e5e7eb] rounded-[4px] min-h-[800px] transition-all relative p-12 md:p-24 w-full")}
            >
              <EditorContent editor={editor} className="cursor-text prose-sm sm:prose lg:prose-lg max-w-none" />

              {/* Badge contador de comentários (modo normal) */}
              {!isFullscreen && annotations.length > 0 && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-[10px] font-bold text-amber-600 pointer-events-none select-none">
                  <MessageSquare className="w-3 h-3" />
                  {annotations.length}
                </div>
              )}
            </div>

            {/* Painel lateral — só aparece no modo fullscreen */}
            {isFullscreen && (
              <div className="w-full xl:w-80 shrink-0 space-y-4 pb-24">
                <AnimatePresence mode="popLayout">
                  {activeDraft && (
                    <motion.div key="active-draft" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white border-2 border-blue-100 rounded-2xl p-5 shadow-2xl z-20 relative">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center font-bold text-xs">{authorName[0]}</div>
                        <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest">{authorName}</span>
                      </div>
                      <div className="bg-gray-50/80 rounded-xl p-3 mb-4 border border-gray-100 overflow-hidden"><span className="text-[10px] font-medium italic text-gray-400 line-clamp-2">"{activeDraft.text}"</span></div>
                      <textarea autoFocus value={draftCommentText} onChange={(e) => setDraftCommentText(e.target.value)} placeholder="O que você quer comentar?" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none mb-4 transition-all min-h-[80px] resize-none" onKeyDown={(e)=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault(); submitComment();}}}/>
                      <div className="flex items-center justify-end gap-3"><button onClick={()=>setActiveDraft(null)} className="text-[11px] font-black text-gray-400">Cancelar</button><button onClick={submitComment} disabled={!draftCommentText.trim()} className={cn("px-6 py-2 rounded-full text-[11px] font-black transition-all", draftCommentText.trim() ? "bg-blue-600 text-white shadow-lg active:scale-95" : "bg-gray-100 text-gray-300")}>Comentar</button></div>
                    </motion.div>
                  )}

                  {sortedAnnotations.map((note) => {
                    const isExpanded = expandedNoteId === note.id;
                    const currentAuthor = note.authorName || authorName;
                    return (
                      <motion.div
                        key={note.id}
                        layout
                        onClick={() => handleNoteExpand(note.id)}
                        className={cn(
                          "bg-white border rounded-2xl transition-all group relative cursor-pointer overflow-hidden",
                          isExpanded ? "p-5 shadow-xl border-blue-500/30 scale-105 z-10" : "p-4 shadow-sm border-gray-100 hover:shadow-md hover:border-gray-200"
                        )}
                      >
                        <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ backgroundColor: note.color || 'rgba(255, 235, 153, 0.4)' }} />
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-7 h-7 bg-gray-50 rounded-full flex items-center justify-center text-blue-500 border border-gray-100 font-bold text-[10px]">{currentAuthor[0]}</div>
                          <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest flex-1">{currentAuthor}</span>
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={(e) => { e.stopPropagation(); onRemoveAnnotation?.(note.id); }} className="p-1.5 hover:bg-red-50 text-red-300 hover:text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div>
                          <p className={cn("text-[12px] text-gray-700 leading-relaxed font-medium transition-all duration-300", !isExpanded && "line-clamp-2 overflow-hidden text-ellipsis")}>
                            {note.comment}
                          </p>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-4 mt-4 border-t border-gray-50 flex items-center justify-between overflow-hidden">
                                <div className="flex items-center gap-2">
                                  {COMMENT_COLORS.map(c => (
                                    <button key={c.value} onClick={(e) => { e.stopPropagation(); onUpdateAnnotation?.(note.id, note.comment, c.value); }} className={cn("w-3.5 h-3.5 rounded-full transition-all hover:scale-125 ring-offset-2", note.color === c.value && "ring-2 ring-blue-500")} style={{ backgroundColor: c.value }} />
                                  ))}
                                </div>
                                <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Fechar</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Modal de comentário — modo normal (não fullscreen) */}
      <AnimatePresence>
        {activeAnnotationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveAnnotationModal(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="h-1.5 w-full" style={{ backgroundColor: activeAnnotationModal.color || 'rgba(255, 235, 153, 0.8)' }} />
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-blue-500 border border-gray-100 font-bold text-xs">
                    {(activeAnnotationModal.authorName || authorName)[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-gray-800 uppercase tracking-widest">{activeAnnotationModal.authorName || authorName}</p>
                    <p className="text-[10px] text-gray-400">Comentário</p>
                  </div>
                  <button onClick={() => setActiveAnnotationModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X className="w-4 h-4" /></button>
                </div>

                <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-100">
                  <p className="text-[10px] font-medium italic text-amber-700 line-clamp-2">"{activeAnnotationModal.text}"</p>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed">{activeAnnotationModal.comment}</p>

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    {COMMENT_COLORS.map(c => (
                      <button
                        key={c.value}
                        onClick={() => {
                          onUpdateAnnotation?.(activeAnnotationModal.id, activeAnnotationModal.comment, c.value);
                          setActiveAnnotationModal({ ...activeAnnotationModal, color: c.value });
                        }}
                        className={cn("w-4 h-4 rounded-full transition-all hover:scale-125 ring-offset-2", activeAnnotationModal.color === c.value && "ring-2 ring-blue-500")}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => { onRemoveAnnotation?.(activeAnnotationModal.id); setActiveAnnotationModal(null); }}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 hover:text-red-600 transition-colors px-3 py-1.5 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de novo comentário — modo normal (não fullscreen) */}
      <AnimatePresence>
        {activeDraft && !isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveDraft(null)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center font-bold text-xs">{authorName[0]}</div>
                <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest flex-1">{authorName}</span>
                <button onClick={() => setActiveDraft(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="bg-gray-50/80 rounded-xl p-3 mb-4 border border-gray-100 overflow-hidden">
                <span className="text-[10px] font-medium italic text-gray-400 line-clamp-2">"{activeDraft.text}"</span>
              </div>
              <textarea
                autoFocus
                value={draftCommentText}
                onChange={(e) => setDraftCommentText(e.target.value)}
                placeholder="O que você quer comentar?"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:outline-none mb-4 transition-all min-h-[80px] resize-none"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              />
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setActiveDraft(null)} className="text-[11px] font-black text-gray-400">Cancelar</button>
                <button onClick={submitComment} disabled={!draftCommentText.trim()} className={cn("px-6 py-2 rounded-full text-[11px] font-black transition-all", draftCommentText.trim() ? "bg-blue-600 text-white shadow-lg active:scale-95" : "bg-gray-100 text-gray-300")}>Comentar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
