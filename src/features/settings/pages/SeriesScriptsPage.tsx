import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, FileText, Layers } from 'lucide-react';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { AppButton } from '../../../components/ui/AppButton';
import { useAppContext } from '../../../context/AppContext';
import type { Content } from '../../../lib/database';
import { cn, htmlToReadableText } from '../../../lib/utils';
import { broadcastDataSync } from '../../../lib/syncBroadcast';
import { notifySaveFeedback } from '../../../lib/saveFeedback';
import { SeriesBulkComposer } from '../components/SeriesBulkComposer';

const LINKED_CONTENTS_PAGE_SIZE = 5;

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
  const [currentPage, setCurrentPage] = useState(1);

  const serie = state.series.find(item => item.id === serieId) ?? null;
  const platformNames = state.platforms.filter(platform => platform.ativo).map(platform => platform.nome);

  const linkedContents = useMemo(
    () =>
      state.contents
        .filter(content => content.seriesId === serieId && !content.deletedAt)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [serieId, state.contents]
  );

  const totalPages = Math.max(1, Math.ceil(linkedContents.length / LINKED_CONTENTS_PAGE_SIZE));
  const pageStart = (currentPage - 1) * LINKED_CONTENTS_PAGE_SIZE;
  const pageEnd = pageStart + LINKED_CONTENTS_PAGE_SIZE;
  const paginatedContents = linkedContents.slice(pageStart, pageEnd);
  const visibleStart = linkedContents.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(pageEnd, linkedContents.length);

  useEffect(() => {
    setCurrentPage(1);
  }, [serieId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
              {paginatedContents.map(content => {
                const words = scriptWordCount(content.script);
                const hasCaption = content.plataformas.some(item => item.legenda?.trim());

                return (
                  <button
                    key={content.id}
                    type="button"
                    onClick={() => navigate(`/conteudos/${content.id}`)}
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

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2">
                <span className="text-xs font-medium text-[var(--text-tertiary)]">
                  {visibleStart}-{visibleEnd} de {linkedContents.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Pagina anterior"
                    title="Pagina anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="min-w-[3.5rem] text-center text-xs font-semibold text-[var(--text-secondary)]">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Proxima pagina"
                    title="Proxima pagina"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </SettingsPageScaffold>
  );
}
