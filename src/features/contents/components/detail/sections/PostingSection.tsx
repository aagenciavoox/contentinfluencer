import {AlertTriangle, CalendarDays, CheckCircle2, Clock3, Send} from 'lucide-react';
import type {Content, ContentPlataforma} from '../../../../../lib/database';
import type {PostingAlert} from '../../../lib/contentPipeline';

type PostingDraft = Pick<Content, 'status' | 'publishDate' | 'publishDateEnabled' | 'plataformas'>;

interface PostingSectionProps {
  draft: PostingDraft;
  alerts: PostingAlert[];
  onChange: (updates: Partial<PostingDraft>) => void;
}

function updatePlatformDate(
  plataformas: ContentPlataforma[],
  platformId: string,
  publishDate: string | null
) {
  return plataformas.map(plataforma =>
    plataforma.platformId === platformId
      ? {...plataforma, publishDate, publishDateEnabled: Boolean(publishDate)}
      : plataforma
  );
}

export function PostingSection({draft, alerts, onChange}: PostingSectionProps) {
  return (
    <div className="grid gap-6">
      <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          <CalendarDays className="h-4 w-4" />
          Agendamento
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Data principal
            </span>
            <input
              type="date"
              value={draft.publishDate || ''}
              onChange={event =>
                onChange({
                  publishDate: event.target.value || null,
                  publishDateEnabled: Boolean(event.target.value),
                  plataformas: draft.plataformas.map(plataforma => ({
                    ...plataforma,
                    publishDate: event.target.value || null,
                    publishDateEnabled: Boolean(event.target.value),
                  })),
                })
              }
              className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30"
            />
          </label>

          <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Status atual
            </p>
            <p className="mt-3 text-xl font-black text-[var(--text-primary)]">{draft.status}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Data futura programa o conteudo automaticamente ao salvar. Data vencida sem postagem gera alerta.
            </p>
          </div>
        </div>
      </section>

      {alerts.length > 0 ? (
        <section className="grid gap-3">
          {alerts.map(alert => (
            <article
              key={alert.id}
              className="flex items-start gap-3 rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
            >
              {alert.tone === 'warning' ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
              ) : (
                <Clock3 className="mt-0.5 h-5 w-5 text-sky-500" />
              )}
              <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.message}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          <Send className="h-4 w-4" />
          Plataformas
        </div>

        <div className="mt-5 space-y-4">
          {draft.plataformas.length > 0 ? (
            draft.plataformas.map(plataforma => (
              <article
                key={plataforma.platformId}
                className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-black text-[var(--text-primary)]">{plataforma.platformId}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {plataforma.legenda?.trim() ? 'Legenda pronta para publicar.' : 'Ainda sem legenda salva.'}
                    </p>
                  </div>

                  <label className="block md:min-w-[220px]">
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                      Data da plataforma
                    </span>
                    <input
                      type="date"
                      value={plataforma.publishDate || ''}
                      onChange={event =>
                        onChange({
                          plataformas: updatePlatformDate(
                            draft.plataformas,
                            plataforma.platformId,
                            event.target.value || null
                          ),
                        })
                      }
                      className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30"
                    />
                  </label>
                </div>

                <div className="mt-4 rounded-[18px] bg-[var(--bg-secondary)] px-4 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-primary)]">
                    {plataforma.legenda?.trim() || 'Sem legenda registrada.'}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <article className="rounded-[24px] border border-dashed border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-6 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--text-tertiary)]" />
              <p className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-[var(--text-primary)]">
                Nenhuma plataforma ativa
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Ative pelo menos uma plataforma na aba Producao para preparar o agendamento.
              </p>
            </article>
          )}
        </div>
      </section>
    </div>
  );
}
