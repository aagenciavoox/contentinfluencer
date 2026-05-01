import { X, Eye } from 'lucide-react';
import { Content } from '../../../../lib/database';
import { FixedPanelModal } from '../../../../components/overlays/FixedPanelModal';
import { htmlToReadableText } from '../../../../lib/utils';

interface ScriptPreviewModalProps {
  content: Content;
  onClose: () => void;
}

function hasHtmlMarkup(value: string) {
  return /<[^>]+>/.test(value);
}

export function ScriptPreviewModal({ content, onClose }: ScriptPreviewModalProps) {
  const script = content.script?.trim() || '';
  const readableScript = htmlToReadableText(script);
  const renderHtml = script.length > 0 && hasHtmlMarkup(script);

  return (
    <FixedPanelModal
      open={true}
      onClose={onClose}
      desktopMaxW="md:max-w-[980px]"
      desktopPanelClassName="md:h-[82vh]"
    >
      <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-primary)]">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4 md:px-8 md:py-6">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              <Eye className="h-3.5 w-3.5" />
              Visualização do roteiro
            </div>
            <h2 className="truncate text-lg font-black uppercase tracking-tight text-[var(--text-primary)] md:text-2xl">
              {content.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar visualização do roteiro"
            className="rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] p-2.5 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg-primary)] px-4 py-4 md:px-8 md:py-8">
          <section className="min-h-full rounded-[24px] border border-[var(--border-color)] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[var(--border-color)] px-5 pb-3 pt-4 md:px-6">
              <span className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                Roteiro
              </span>
            </div>

            <div className="px-5 py-5 md:px-6 md:py-6">
              {script ? (
                renderHtml ? (
                  <article
                    className="tiptap min-h-[420px] text-sm leading-7 text-[var(--text-primary)] md:min-h-[520px] md:text-[15px]"
                    dangerouslySetInnerHTML={{ __html: script }}
                  />
                ) : (
                  <article className="min-h-[420px] whitespace-pre-wrap text-sm leading-7 text-[var(--text-primary)] md:min-h-[520px] md:text-[15px]">
                    {readableScript}
                  </article>
                )
              ) : (
                <div className="flex min-h-[420px] items-center justify-center rounded-[20px] border border-dashed border-[var(--border-color)] bg-[var(--bg-hover)]/40 px-6 text-center md:min-h-[520px]">
                  <p className="text-sm font-bold text-[var(--text-tertiary)]">
                    Este conteúdo ainda não possui roteiro.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </FixedPanelModal>
  );
}


