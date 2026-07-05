import {useEffect, useRef, useState} from 'react';
import {ChevronDown, Layout, Plus} from 'lucide-react';
import {RichTextEditor} from '../../../../components/editors/RichTextEditor';
import {BottomSheet} from '../../../../components/overlays/BottomSheet';
import {OverlayHeader} from '../../../../components/overlays/OverlayHeader';
import {OverlayBody} from '../../../../components/overlays/OverlayBody';
import {useAppContext} from '../../../../context/AppContext';
import {Text} from '../../../../components/ui/Text';
import type {Content, Template} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';

function templateToHtml(template: Template): string {
  return template.estrutura
    .map(bloco => {
      const body = (bloco.conteudo || bloco.placeholder || '').trim();
      return `<p><strong>[${bloco.label}]</strong></p><p>${body}</p>`;
    })
    .join('');
}

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
  onApplyTemplate,
}: {
  onInsertBlock: (label: (typeof SCRIPT_BLOCKS)[number]) => void;
  onApplyTemplate: (html: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const {state} = useAppContext();
  const roteiroTemplates = state.templates.filter(
    template => template.ativo && (template.type ?? 'roteiro') === 'roteiro'
  );

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
        onClick={() => setTemplatesOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
        title="Aplicar template"
        aria-label="Aplicar template"
      >
        <Layout className="h-3.5 w-3.5" />
      </button>

      <BottomSheet open={templatesOpen} onClose={() => setTemplatesOpen(false)} desktopMaxW="max-w-lg">
        <OverlayHeader
          title="Aplicar template"
          subtitle="Insere a estrutura do template no final do roteiro."
          onClose={() => setTemplatesOpen(false)}
        />
        <OverlayBody>
          {roteiroTemplates.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-tertiary)]">
              Nenhum template de roteiro ativo. Crie um em Configurações &gt; Templates.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {roteiroTemplates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    onApplyTemplate(templateToHtml(template));
                    setTemplatesOpen(false);
                  }}
                  className="flex flex-col gap-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3 text-left transition-colors hover:border-[var(--border-strong)]"
                >
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{template.nome}</span>
                  <span className="text-xs text-[var(--text-tertiary)]">
                    {template.estrutura.length} {template.estrutura.length === 1 ? 'bloco' : 'blocos'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </OverlayBody>
      </BottomSheet>
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
  saveState,
  showReferencias = true,
  onAddAnnotation,
  onRemoveAnnotation,
  onUpdateAnnotation,
}: ContentScriptWorkspaceProps) {
  const [refsOpen, setRefsOpen] = useState(() => (referencias?.trim().length ?? 0) > 0);

  const handleInsertBlock = (label: (typeof SCRIPT_BLOCKS)[number]) => {
    onScriptChange(appendScriptBlock(script, label));
  };

  const handleApplyTemplate = (html: string) => {
    const trimmed = script?.trim() ?? '';
    onScriptChange(trimmed ? `${trimmed}${html}` : html);
  };

  return (
    <section className="cms-panel flex flex-col overflow-hidden shadow-sm">
      <div className="border-b border-[var(--border-color)] px-4 py-3 md:px-6">
        <Text variant="sectionTitle">Roteiro</Text>
      </div>
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
          toolbarStart={<ScriptBlockToolbar onInsertBlock={handleInsertBlock} onApplyTemplate={handleApplyTemplate} />}
          saveState={saveState}
          className="min-h-[420px] border-0 bg-[var(--bg-elevated)] shadow-none"
        />
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
