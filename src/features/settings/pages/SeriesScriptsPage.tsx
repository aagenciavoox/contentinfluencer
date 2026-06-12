import { useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, FileText, Layers, X } from 'lucide-react';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { AppButton } from '../../../components/ui/AppButton';
import { useAppContext } from '../../../context/AppContext';
import type { Content } from '../../../lib/database';
import { cn, htmlToReadableText } from '../../../lib/utils';
import { broadcastDataSync } from '../../../lib/syncBroadcast';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import { SeriesBulkComposer } from '../components/SeriesBulkComposer';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

function scriptWordCount(script: string | null) {
  if (!script) return 0;
  return htmlToReadableText(script)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function SeriesScriptsPage() {
  const { serieId } = useParams<{ serieId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useAppContext();
  const [previewContent, setPreviewContent] = useState<Content | null>(null);

  const serie = state.series.find(item => item.id === serieId) ?? null;
  const platformNames = state.platforms.filter(platform => platform.ativo).map(platform => platform.nome);

  const linkedContents = useMemo(
    () =>
      state.contents
        .filter(content => content.seriesId === serieId && !content.deletedAt)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [serieId, state.contents]
  );

  useBodyScrollLock(previewContent !== null);

  useEffect(() => {
    if (!previewContent) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewContent(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewContent]);

  const handleCreateBulkContents = async (contents: Content[]) => {
    if (contents.length === 0) return;

    const plural = contents.length > 1 ? 'roteiros' : 'roteiro';
    notifySaveFeedback({
      status: 'saving',
      message: contents.length > 1 ? `Criando ${contents.length} ${plural}...` : 'Criando roteiro...',
    });

    for (const content of contents) {
      await dispatch(
        { type: 'ADD_CONTENT', payload: content },
        { silent: true, skipBroadcast: true }
      );
    }

    broadcastDataSync();
    notifySaveFeedback({
      status: 'success',
      message: contents.length > 1 ? `${contents.length} ${plural} criados` : 'Roteiro criado',
    });
  };

  if (!serie) {
    return (
      <SettingsPageScaffold
        compact
        title="Roteiros da série"
        icon={Layers}
        backTo="/configuracoes/series"
        backLabel="Séries"
      >
        <div className="py-12 text-center">
          <Layers className="mx-auto mb-3 h-8 w-8 opacity-10" />
          <p className="text-sm font-medium opacity-50">
            {state.isLoaded ? 'Série não encontrada.' : 'Carregando série...'}
          </p>
          {state.isLoaded ? (
            <AppButton
              variant="secondary"
              className="mt-4"
              onClick={() => navigate('/configuracoes/series')}
            >
              Voltar para séries
            </AppButton>
          ) : null}
        </div>
      </SettingsPageScaffold>
    );
  }

  return (
    <SettingsPageScaffold
      compact
      title={serie.name}
      icon={Layers}
      backTo="/configuracoes/series"
      backLabel="Séries"
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
        <div className="min-w-0">
          <SeriesBulkComposer
            serie={serie}
            pilares={state.pilares}
            platformNames={platformNames}
            onCreate={handleCreateBulkContents}
          />
        </div>

        <section className="min-w-0 space-y-3 xl:sticky xl:top-6 xl:self-start">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Roteiros vinculados
              <span className="ml-2 rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                {linkedContents.length}
              </span>
            </h2>
            {linkedContents.length > 0 ? (
              <button
                type="button"
                onClick={() => navigate('/conteudos')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Ver no pipeline
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          {linkedContents.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-primary)] px-5 py-8 text-center">
              <FileText className="mx-auto mb-2 h-6 w-6 opacity-15" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                Nenhum roteiro vinculado a esta série ainda.
              </p>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                Os roteiros criados acima aparecem aqui assim que forem salvos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-1 max-h-[70vh] xl:max-h-[calc(100vh-9rem)]">
              {linkedContents.map(content => {
                const words = scriptWordCount(content.script);
                const hasCaption = content.plataformas.some(item => item.legenda?.trim());

                return (
                  <button
                    key={content.id}
                    type="button"
                    onClick={() => setPreviewContent(content)}
                    className="group rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-left shadow-sm transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]"
                    style={{ borderLeftColor: serie.cor || undefined, borderLeftWidth: 3 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
                        {content.title || 'Sem título'}
                      </span>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>

                    {content.script ? (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                        {htmlToReadableText(content.script)}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                        {content.status}
                      </span>
                      <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--text-tertiary)]">
                        {words} palavras
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold',
                          hasCaption
                            ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                            : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'
                        )}
                      >
                        {hasCaption ? 'Legenda' : 'Só roteiro'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {previewContent ? (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/60"
            onClick={() => setPreviewContent(null)}
          />
          <div className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="pointer-events-auto flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-xl"
              role="dialog"
              aria-modal="true"
            >
              <div
                className="h-1 w-full shrink-0"
                style={{ backgroundColor: serie.cor || 'var(--accent-green)' }}
              />

              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-4">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-[var(--text-primary)]">
                    {previewContent.title || 'Sem título'}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                      {previewContent.status}
                    </span>
                    <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-semibold text-[var(--text-tertiary)]">
                      {scriptWordCount(previewContent.script)} palavras
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewContent(null)}
                  className="rounded-full p-2 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                    <FileText className="h-3.5 w-3.5" />
                    Roteiro
                  </div>
                  {previewContent.script ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                      {htmlToReadableText(previewContent.script)}
                    </p>
                  ) : (
                    <p className="text-sm italic text-[var(--text-tertiary)]">
                      Este roteiro ainda não tem texto.
                    </p>
                  )}
                </div>

                {previewContent.plataformas.some(item => item.legenda?.trim()) ? (
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Legenda
                    </div>
                    {previewContent.plataformas
                      .filter(item => item.legenda?.trim())
                      .map(item => (
                        <div
                          key={item.plataforma}
                          className="mb-2 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                        >
                          <span className="mb-1 block text-xs font-semibold text-[var(--text-tertiary)]">
                            {item.plataforma}
                          </span>
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">
                            {htmlToReadableText(item.legenda)}
                          </p>
                        </div>
                      ))}
                  </div>
                ) : null}
              </div>

              <div className="flex shrink-0 justify-end border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-4">
                <AppButton onClick={() => navigate(`/conteudos/${previewContent.id}`)}>
                  <ArrowUpRight className="h-4 w-4" />
                  Abrir no pipeline
                </AppButton>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </SettingsPageScaffold>
  );
}
