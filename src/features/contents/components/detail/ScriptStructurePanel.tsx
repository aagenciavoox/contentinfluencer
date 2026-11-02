import {useEffect, useRef, useState, type DragEvent, type KeyboardEvent} from 'react';
import {useEditorState, type Editor} from '@tiptap/react';
import {FileText, GripVertical, PlusCircle, X} from 'lucide-react';
import {Text} from '../../../../components/ui/Text';
import {useAppContext} from '../../../../context/AppContext';
import {cn} from '../../../../lib/utils';
import {
  EMPTY_STRUCTURE,
  addSectionAtEnd,
  appendHtml,
  jumpToSection,
  moveSectionInEditor,
  readStructure,
  sameStructure,
} from '../../../../components/editors/scriptSections';
import {YOUTUBE_SECTION_MODEL, sectionModelHtml, templateSectionsHtml} from '../../lib/youtubeScript';

const DRAG_TYPE = 'application/x-criaki-secao';

interface ScriptStructurePanelProps {
  editor: Editor | null;
  onClose: () => void;
  className?: string;
}

/**
 * Painel Estrutura do modo YouTube: as seções saem dos títulos do texto.
 * Clicar leva até a seção; arrastar (ou Alt+↑/↓) muda a ordem levando o texto junto.
 */
export function ScriptStructurePanel({editor, onClose, className}: ScriptStructurePanelProps) {
  const {state} = useAppContext();
  const structure = useEditorState({
    editor,
    selector: ({editor: current}) => readStructure(current),
    equalityFn: sameStructure,
  }) ?? EMPTY_STRUCTURE;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const templates = state.templates.filter(
    template => template.ativo && (template.type ?? 'roteiro') === 'roteiro' && template.estrutura.length > 0,
  );
  const disabled = !editor || editor.isDestroyed || !editor.isEditable;

  useEffect(() => {
    if (!modelOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!modelRef.current?.contains(event.target as Node)) setModelOpen(false);
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setModelOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modelOpen]);

  const move = (from: number, to: number) => {
    if (!editor || !moveSectionInEditor(editor, from, to)) return false;
    // O foco acompanha a seção movida, para dar vários Alt+↓ seguidos.
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>(`[data-section-index="${to}"]`)?.focus();
    });
    return true;
  };

  const handleItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    move(index, index + (event.key === 'ArrowUp' ? -1 : 1));
  };

  const handleDrop = (event: DragEvent<HTMLLIElement>, index: number) => {
    event.preventDefault();
    if (dragIndex !== null) move(dragIndex, index);
    setDragIndex(null);
    setDropIndex(null);
  };

  const applyModel = (html: string) => {
    setModelOpen(false);
    if (editor) appendHtml(editor, html);
  };

  return (
    <aside aria-label="Estrutura do roteiro" className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex shrink-0 items-start justify-between gap-2 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <Text variant="itemTitle" as="h2">Estrutura</Text>
          <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">Seções do roteiro</Text>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar estrutura"
          title="Fechar estrutura"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {structure.sections.length === 0 ? (
        <div className="min-h-0 flex-1 px-4 py-3">
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            Nenhuma seção ainda. Cada Título 1 ou Título 2 do texto vira uma seção aqui.
          </Text>
        </div>
      ) : (
        <ol
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar"
          aria-label="Seções"
          aria-describedby="script-structure-hint"
        >
          {structure.sections.map((section, index) => {
            const active = index === structure.active;
            const showDropLine = dragIndex !== null && dropIndex === index && dragIndex !== index;
            return (
              <li
                key={index}
                draggable={!disabled}
                onDragStart={event => {
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData(DRAG_TYPE, String(index));
                  setDragIndex(index);
                }}
                onDragOver={event => {
                  if (dragIndex === null) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  if (dropIndex !== index) setDropIndex(index);
                }}
                onDrop={event => handleDrop(event, index)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                className={cn(
                  'relative',
                  dragIndex === index && 'opacity-50',
                  showDropLine && (dragIndex! < index
                    ? 'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-[var(--brand-accent)]'
                    : 'before:absolute before:inset-x-2 before:-top-px before:h-0.5 before:rounded-full before:bg-[var(--brand-accent)]'),
                )}
              >
                <button
                  type="button"
                  data-section-index={index}
                  aria-current={active ? 'location' : undefined}
                  onClick={() => editor && jumpToSection(editor, section.pos)}
                  onKeyDown={event => handleItemKeyDown(event, index)}
                  title="Clique para ir até a seção. Arraste ou use Alt+↑/↓ para mudar a ordem."
                  className={cn(
                    'group relative flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                    active
                      ? 'bg-[color-mix(in_srgb,var(--brand-accent)_8%,transparent)] text-[var(--text-primary)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
                  )}
                >
                  {active ? (
                    <span aria-hidden className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-[var(--brand-accent)]" />
                  ) : null}
                  <GripVertical
                    className="h-4 w-4 shrink-0 cursor-grab text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
                    aria-hidden
                  />
                  <Text as="span" variant={active ? 'bodyStrong' : 'body'} className="min-w-0 flex-1 truncate">
                    {section.title || 'Seção sem título'}
                  </Text>
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <span id="script-structure-hint" className="sr-only">
        Enter vai até a seção. Alt com seta para cima ou para baixo muda a ordem.
      </span>

      <div className="shrink-0 border-t border-[var(--border-color)] p-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => editor && addSectionAtEnd(editor)}
          className="flex min-h-10 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 text-left t-body text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50"
        >
          <PlusCircle className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
          Adicionar seção
        </button>
        <div ref={modelRef} className="relative">
          <button
            type="button"
            disabled={disabled}
            aria-haspopup="menu"
            aria-expanded={modelOpen}
            onClick={() => setModelOpen(open => !open)}
            className="flex min-h-10 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 text-left t-body text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50"
          >
            <FileText className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
            Usar modelo
          </button>
          {modelOpen ? (
            <div
              role="menu"
              aria-label="Modelos de estrutura"
              className="absolute bottom-full left-0 z-30 mb-1 w-[min(18rem,calc(100vw-2rem))] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-dropdown)]"
            >
              <Text variant="meta" as="p" className="px-2.5 pb-1 pt-1.5 text-[var(--text-tertiary)]">
                Entra no fim do roteiro
              </Text>
              <ModelOption
                title="Vídeo do YouTube"
                detail={YOUTUBE_SECTION_MODEL.join(' · ')}
                onSelect={() => applyModel(sectionModelHtml())}
              />
              {templates.map(template => (
                <ModelOption
                  key={template.id}
                  title={template.nome}
                  detail={template.estrutura.map(bloco => bloco.label).join(' · ')}
                  onSelect={() => applyModel(templateSectionsHtml(template.estrutura))}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function ModelOption({title, detail, onSelect}: {title: string; detail: string; onSelect: () => void}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:bg-[var(--bg-hover)] focus-visible:outline-none"
    >
      <Text as="span" variant="body">{title}</Text>
      <Text as="span" variant="meta" className="line-clamp-2 text-[var(--text-tertiary)]">{detail}</Text>
    </button>
  );
}
