import {AlertTriangle, CalendarDays, Image, Send} from 'lucide-react';
import type {Content, ContentPlataforma, Pilar, Serie} from '../../../../../lib/database';
import {AppButton} from '../../../../../components/ui/AppButton';
import {CONTENT_STATUS} from '../../../lib/contentPipeline';
import type {PostingAlert} from '../../../lib/contentPipeline';
import {PlatformCopyEditor} from '../PlatformCopyEditor';

type PublishingDraft = Pick<
  Content,
  'status' | 'publishDate' | 'publishDateEnabled' | 'plataformas' | 'notes'
>;

interface PublishingSectionProps {
  draft: PublishingDraft;
  pilar: Pilar | null;
  serie: Serie | null;
  alerts: PostingAlert[];
  onChange: (updates: Partial<PublishingDraft>) => void;
  onMarkPosted?: () => void;
  isSaving?: boolean;
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

export function PublishingSection({
  draft,
  pilar,
  serie,
  alerts,
  onChange,
  onMarkPosted,
  isSaving = false,
}: PublishingSectionProps) {
  const isPosted = draft.status === CONTENT_STATUS.POSTADO;
  const activePlatformIds = draft.plataformas.length > 0 ? draft.plataformas.map(item => item.platformId) : [];

  return (
    <div className="grid gap-6">
      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm md:rounded-[var(--radius-card)] md:p-7">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)]">
          <CalendarDays className="h-4 w-4" />
          Agendamento
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[var(--text-tertiary)]">
              Data principal
            </span>
            <input
              type="date"
              value={draft.publishDate ? draft.publishDate.slice(0, 10) : ''}
              disabled={isPosted}
              onChange={event =>
                onChange({
                  publishDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null,
                  publishDateEnabled: Boolean(event.target.value),
                  plataformas: draft.plataformas.map(plataforma => ({
                    ...plataforma,
                    publishDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null,
                    publishDateEnabled: Boolean(event.target.value),
                  })),
                })
              }
              className="w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 disabled:opacity-60 md:rounded-[var(--radius-card)]"
            />
          </label>

          <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
            <p className="text-xs font-semibold text-[var(--text-tertiary)]">Status atual</p>
            <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{draft.status}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Datas ficam guardadas aqui para lembrar, reagendar ou marcar como postado quando fizer sentido.
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
                <CalendarDays className="mt-0.5 h-5 w-5 text-sky-500" />
              )}
              <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.message}</p>
            </article>
          ))}
        </section>
      ) : null}

      <PlatformCopyEditor
        plataformas={draft.plataformas}
        pilar={pilar}
        serie={serie}
        disabled={isPosted}
        onChange={plataformas => onChange({plataformas})}
      />

      {activePlatformIds.length > 0 ? (
        <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm md:rounded-[var(--radius-card)] md:p-7">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)]">
            <Send className="h-4 w-4" />
            Datas por plataforma
          </div>
          <div className="mt-5 stack-lg">
            {draft.plataformas.map(plataforma => (
              <article
                key={plataforma.platformId}
                className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{plataforma.platformId}</p>
                  <label className="block md:min-w-[220px]">
                    <span className="mb-2 block text-xs font-semibold text-[var(--text-tertiary)]">Data</span>
                    <input
                      type="date"
                      value={plataforma.publishDate ? plataforma.publishDate.slice(0, 10) : ''}
                      disabled={isPosted}
                      onChange={event =>
                        onChange({
                          plataformas: updatePlatformDate(
                            draft.plataformas,
                            plataforma.platformId,
                            event.target.value ? `${event.target.value}T12:00:00.000Z` : null
                          ),
                        })
                      }
                      className="w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 disabled:opacity-60 md:rounded-[var(--radius-card)]"
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 shadow-sm md:rounded-[var(--radius-card)] md:p-7">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)]">
          <Image className="h-4 w-4" />
          Assets e observacoes
        </div>
        <textarea
          value={draft.notes ?? ''}
          disabled={isPosted}
          onChange={event => onChange({notes: event.target.value})}
          className="mt-4 min-h-[140px] w-full rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-6 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 disabled:opacity-60"
          placeholder="Links de assets, instruções de edição, thumb, cortes e observações"
        />
      </section>

      {!isPosted && onMarkPosted ? (
        <div className="flex justify-end">
          <AppButton variant="primary" disabled={isSaving} onClick={onMarkPosted}>
            {isSaving ? 'Salvando...' : 'Registrar como postado'}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}
