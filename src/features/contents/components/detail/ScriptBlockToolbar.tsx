import {useEffect, useRef, useState} from 'react';
import {ChevronDown, Layout, Plus} from 'lucide-react';
import {Dialog} from '../../../../components/overlays/Dialog';
import {OverlayHeader} from '../../../../components/overlays/OverlayHeader';
import {OverlayBody} from '../../../../components/overlays/OverlayBody';
import {useAppContext} from '../../../../context/AppContext';
import {Text} from '../../../../components/ui/Text';
import {cn} from '../../../../lib/utils';
import {templateToHtml} from '../../lib/seriesScriptTemplate';

export {templateToHtml};

export const SCRIPT_BLOCKS = ['Gancho', 'Fato', 'Virada', 'Veredito'] as const;
export type ScriptBlockLabel = (typeof SCRIPT_BLOCKS)[number];

export function appendScriptBlock(script: string | null, label: string) {
  const blockHtml = `<p><strong>[${label}]</strong></p><p></p>`;
  const trimmed = script?.trim() ?? '';
  return trimmed ? `${trimmed}${blockHtml}` : blockHtml;
}

interface ScriptBlockToolbarProps {
  onInsertBlock: (label: ScriptBlockLabel) => void;
  onApplyTemplate: (html: string) => void;
  menuPlacement?: 'bottom' | 'top';
  /** Neutral controls for the gray Escrita bar. Block types keep a light tint in the menu. */
  neutral?: boolean;
}

export function ScriptBlockToolbar({
  onInsertBlock,
  onApplyTemplate,
  menuPlacement = 'bottom',
  neutral = false,
}: ScriptBlockToolbarProps) {
  const [open, setOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const {state} = useAppContext();
  const roteiroTemplates = state.templates.filter(
    template => template.ativo && (template.type ?? 'roteiro') === 'roteiro',
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
          className={cn(
            'inline-flex items-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--text-primary)] transition-colors',
            neutral ? 'h-9 hover:bg-[var(--bg-secondary)]' : 'h-10 hover:bg-[var(--bg-hover)]',
          )}
        >
          <Plus className={cn('h-3.5 w-3.5', neutral ? 'text-[var(--text-secondary)]' : 'text-[var(--accent-blue)]')} />
          Bloco
          <ChevronDown
            className={cn(
              'h-3 w-3 text-[var(--text-tertiary)] transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>
        {open ? (
          <div
            className={cn(
              'absolute left-0 z-50 min-w-[140px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1',
              menuPlacement === 'top' ? 'bottom-full mb-1' : 'top-full mt-1',
            )}
          >
            {SCRIPT_BLOCKS.map(label => (
              <button
                key={label}
                type="button"
                data-block={label}
                onClick={() => {
                  onInsertBlock(label);
                  setOpen(false);
                }}
                className="script-block-option w-full rounded-md px-2.5 py-2 text-left text-xs text-[var(--text-primary)] transition-colors"
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
        className={cn(
          'inline-flex w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]',
          neutral ? 'h-9 hover:bg-[var(--bg-secondary)]' : 'h-10 hover:bg-[var(--bg-hover)]',
        )}
        title="Aplicar template"
        aria-label="Aplicar template"
      >
        <Layout className="h-3.5 w-3.5" />
      </button>

      <Dialog open={templatesOpen} onClose={() => setTemplatesOpen(false)} desktopMaxW="max-w-lg">
        <OverlayHeader
          title="Aplicar template"
          subtitle="Insere a estrutura do template no final do roteiro."
          onClose={() => setTemplatesOpen(false)}
        />
        <OverlayBody>
          {roteiroTemplates.length === 0 ? (
            <Text variant="meta" className="py-8 text-center">
              Nenhum template de roteiro ativo. Crie um na edição da série.
            </Text>
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
                  <Text variant="bodyStrong">{template.nome}</Text>
                  <Text variant="meta">
                    {template.estrutura.length} {template.estrutura.length === 1 ? 'bloco' : 'blocos'}
                  </Text>
                </button>
              ))}
            </div>
          )}
        </OverlayBody>
      </Dialog>
    </>
  );
}
