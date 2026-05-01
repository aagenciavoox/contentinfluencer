import {useEffect, useState} from 'react';
import {CalendarDays, Check, Eye, Send, X} from 'lucide-react';
import {FixedPanelModal} from '../../../../components/overlays/FixedPanelModal';
import {STATUS_STAGES} from '../../../../constants';
import {useAppContext} from '../../../../context/AppContext';
import {Content} from '../../../../lib/database';
import {htmlToReadableText} from '../../../../lib/utils';

interface PostedContentPreviewModalProps {
  content: Content;
  onClose: () => void;
  onOpenScript: () => void;
}

function toPreviewLines(script: string | null, maxLines = 4) {
  const readable = htmlToReadableText(script || '').trim();
  if (!readable) return [];
  return readable
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

export function PostedContentPreviewModal({
  content,
  onClose,
  onOpenScript,
}: PostedContentPreviewModalProps) {
  const {updateContent} = useAppContext();
  const scriptLines = toPreviewLines(content.script);
  const [status, setStatus] = useState(content.status);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(content.status);
    setError(null);
  }, [content.id, content.status]);

  const hasStatusChanged = status !== content.status;

  const handleSaveStatus = async () => {
    if (!hasStatusChanged) return;

    setIsSaving(true);
    setError(null);

    try {
      await updateContent({
        ...content,
        status,
        updatedAt: new Date().toISOString(),
      });

      if (status !== 'Postado') {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FixedPanelModal
      open
      onClose={onClose}
      desktopMaxW="md:max-w-[980px]"
      desktopPanelClassName="md:h-[82vh]"
    >
      <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-primary)]">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4 md:px-8 md:py-6">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              <Send className="h-3.5 w-3.5" />
              Historico de postagem
            </div>
            <h2 className="truncate text-lg font-black uppercase tracking-tight text-[var(--text-primary)] md:text-2xl">
              {content.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar visualizacao da postagem"
            className="rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] p-2.5 text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-secondary)]"
          >
            <X className="h-4 w-4 md:h-5 md:w-5" />
          </button>
        </header>

        {error && (
          <div className="border-b border-[var(--accent-pink)]/20 bg-[var(--accent-pink)]/10 px-5 py-3 text-xs font-bold text-[var(--accent-pink)] md:px-8">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-8">
          <div className="grid gap-6">
            <section className="rounded-[24px] border border-[var(--border-color)] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                    Status do conteudo
                  </p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Ajuste o status deste roteiro sem sair do historico.
                  </p>
                </div>

                <div className="flex flex-col gap-2 md:min-w-[280px]">
                  <select
                    value={status}
                    onChange={event => setStatus(event.target.value)}
                    disabled={isSaving}
                    className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:ring-0 disabled:opacity-60"
                  >
                    {STATUS_STAGES.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleSaveStatus}
                    disabled={!hasStatusChanged || isSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--text-primary)] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--bg-primary)] transition-all disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSaving ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg-primary)] border-t-transparent" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {isSaving ? 'Salvando...' : 'Salvar status'}
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[24px] border border-[var(--border-color)] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                  Roteiro
                </span>
                <button
                  type="button"
                  onClick={onOpenScript}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-primary)]"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver roteiro
                </button>
              </div>

              {scriptLines.length > 0 ? (
                <div className="space-y-2">
                  {scriptLines.map((line, index) => (
                    <p key={`${content.id}-line-${index}`} className="text-sm leading-7 text-[var(--text-primary)]">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm font-bold text-[var(--text-tertiary)]">
                  Este conteudo nao possui roteiro salvo.
                </p>
              )}
            </section>

            <section className="rounded-[24px] border border-[var(--border-color)] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] md:p-6">
              <div className="mb-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                <CalendarDays className="h-3.5 w-3.5" />
                Informacoes da postagem
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-[var(--bg-hover)] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                    Data principal
                  </p>
                  <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                    {content.publishDate ? new Date(content.publishDate).toLocaleDateString('pt-BR') : 'Sem data'}
                  </p>
                </div>

                <div className="rounded-2xl bg-[var(--bg-hover)] px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                    Plataformas
                  </p>
                  <p className="mt-2 text-sm font-bold text-[var(--text-primary)]">
                    {content.plataformas.length > 0
                      ? content.plataformas.map(plataforma => plataforma.platformId).join(', ')
                      : 'Sem plataformas'}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {content.plataformas.length > 0 ? (
                  content.plataformas.map(plataforma => (
                    <article
                      key={`${content.id}-${plataforma.platformId}`}
                      className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-black text-[var(--text-primary)]">
                          {plataforma.platformId}
                        </p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                          {plataforma.publishDate
                            ? new Date(plataforma.publishDate).toLocaleDateString('pt-BR')
                            : 'Sem data'}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                        {plataforma.legenda?.trim() || 'Sem legenda salva.'}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm font-bold text-[var(--text-tertiary)]">
                    Nenhuma informacao de legenda ou plataforma foi registrada.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </FixedPanelModal>
  );
}
