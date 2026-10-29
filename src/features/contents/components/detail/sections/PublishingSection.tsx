import {AlertTriangle, CalendarDays, Image, Send} from 'lucide-react';
import type {Content, ContentPlataforma, Pilar, Serie} from '../../../../../lib/database';
import {AppButton} from '../../../../../components/ui/AppButton';
import {rotuloStatusPublicacao, setPublicacaoStatus} from '../../../../editorial/lib/markPublished';
import {CONTENT_STATUS, getDisplayStatus, isReadyToPublish} from '../../../lib/contentPipeline';
import type {PostingAlert} from '../../../lib/contentPipeline';
import {useRef, useState} from 'react';
import {useAppContext} from '../../../../../context/AppContext';
import {criarRepost} from '../../../../editorial/lib/destinations';
import {retirarPrevisao} from '../../../../editorial/lib/dataVencida';
import {progressoPublicacao} from '../../../../editorial/lib/publicacaoSituacao';
import {PlatformCopyEditor} from '../PlatformCopyEditor';
import {rotuloConta, rotuloDaRef} from '../../../../contas/lib/contas';
import {Badge} from '../../../../../components/ui/Badge';
import {Text} from '../../../../../components/ui/Text';

type PublishingDraft = Pick<
  Content,
  'status' | 'publishDate' | 'publishDateEnabled' | 'plataformas' | 'notes' | 'legendaBase' | 'title'
> & Partial<Pick<Content, 'postedAt' | 'edicaoConcluidaEm'>>;

interface PublishingSectionProps {
  draft: PublishingDraft;
  pilar: Pilar | null;
  serie: Serie | null;
  alerts: PostingAlert[];
  onChange: (updates: Partial<PublishingDraft>) => void;
  onMarkPosted?: () => void;
  contentId?: string;
}

function updatePlatformDate(
  plataformas: ContentPlataforma[],
  publicationId: string,
  publishDate: string | null
) {
  return plataformas.map(plataforma =>
    plataforma.id === publicationId
      ? {...plataforma, publishDate, publishDateEnabled: Boolean(publishDate)}
      : plataforma
  );
}

function updatePlatformLink(
  plataformas: ContentPlataforma[],
  publicationId: string,
  postUrl: string,
) {
  return plataformas.map(plataforma =>
    plataforma.id === publicationId
      ? {...plataforma, postUrl: postUrl.trim() || null}
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
  contentId = '',
}: PublishingSectionProps) {
  const {state} = useAppContext();
  const editorial = state.editorial;
  const referencia = state.platforms.find(platform => platform.id === editorial.redeReferenciaId) ?? null;
  const [repostDate, setRepostDate] = useState('');
  const dataPrincipalRef = useRef<HTMLInputElement>(null);
  const isPosted = draft.status === CONTENT_STATUS.POSTADO || Boolean(draft.postedAt);
  const materialPronto = isReadyToPublish(draft);
  const progresso = progressoPublicacao(draft.plataformas);
  const activePlatformIds = draft.plataformas.length > 0 ? draft.plataformas.map(item => item.platformId) : [];

  return (
    <div className="grid gap-6">
      {progresso.previstas > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="status" status={progresso.completo ? CONTENT_STATUS.POSTADO : 'Edição'}>
            {progresso.completo ? 'Publicado' : `Publicação parcial · ${progresso.rotulo}`}
          </Badge>
          {!progresso.completo && materialPronto ? (
            <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
              O ciclo fecha quando todas as contas previstas forem publicadas.
            </Text>
          ) : null}
        </div>
      ) : null}
      {!materialPronto && !isPosted ? (
        <Text variant="secondary">
          Dá para preparar legenda, capa, contas e datas desde já. Confirmar Programado fica para quando o material estiver em Edição · Pronto. Registrar uma publicação que já saiu continua liberado.
        </Text>
      ) : null}
      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:rounded-[var(--radius-card)] md:p-7">
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
              ref={dataPrincipalRef}
              type="date"
              value={draft.publishDate ? draft.publishDate.slice(0, 10) : ''}
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
              className="w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 md:rounded-[var(--radius-card)]"
            />
          </label>

          <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
            <p className="text-xs font-semibold text-[var(--text-tertiary)]">Status atual</p>
            <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
              {getDisplayStatus({
                status: draft.status,
                publishDate: draft.publishDate,
                postedAt: draft.postedAt ?? null,
                edicaoConcluidaEm: draft.edicaoConcluidaEm ?? null,
                plataformas: draft.plataformas,
              })}
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Datas ficam guardadas para lembrar, reagendar ou registrar a publicação. Nada se confirma sozinho.
            </p>
          </div>
        </div>
      </section>

      {alerts.length > 0 ? (
        <section className="grid gap-3">
          {alerts.map(alert => (
            <article
              key={alert.id}
              className="stack-sm rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
            >
              <div className="flex items-start gap-3">
                {alert.tone === 'warning' ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" />
                ) : (
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[var(--info)]" />
                )}
                <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.message}</p>
              </div>
              {alert.id === 'overdue' ? (
                <div className="flex flex-wrap gap-2 pl-8">
                  <AppButton
                    variant="secondary"
                    size="sm"
                    onClick={() => dataPrincipalRef.current?.focus()}
                  >
                    Reagendar
                  </AppButton>
                  {onMarkPosted ? (
                    <AppButton variant="secondary" size="sm" onClick={onMarkPosted}>
                      Registrar publicação
                    </AppButton>
                  ) : null}
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(retirarPrevisao(draft))}
                  >
                    Retirar previsão
                  </AppButton>
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <PlatformCopyEditor
        plataformas={draft.plataformas}
        pilar={pilar}
        serie={serie}
        // Cada publicação protege o próprio texto depois de ir ao ar; as pendentes seguem editáveis.
        status={draft.status}
        contentId={contentId}
        legendaBase={draft.legendaBase ?? null}
        titulo={draft.title}
        onTituloChange={title => onChange({title})}
        onChange={plataformas => onChange({plataformas})}
      />

      {activePlatformIds.length > 0 ? (
        <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:rounded-[var(--radius-card)] md:p-7">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)]">
            <Send className="h-4 w-4" />
            Datas por plataforma
          </div>
          <div className="mt-5 stack-lg">
            {draft.plataformas.map(plataforma => (
              <article
                key={plataforma.id || plataforma.platformId}
                className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{rotuloDaRef(plataforma.platformId, state.platforms)}</p>
                  <div className="grid gap-3 sm:grid-cols-2 md:min-w-[28rem]">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[var(--text-tertiary)]">Data</span>
                      <input
                        type="date"
                        value={plataforma.publishDate ? plataforma.publishDate.slice(0, 10) : ''}
                        onChange={event =>
                          onChange({
                            plataformas: updatePlatformDate(
                              draft.plataformas,
                              plataforma.id,
                              event.target.value ? `${event.target.value}T12:00:00.000Z` : null
                            ),
                          })
                        }
                        className="w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 md:rounded-[var(--radius-card)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold text-[var(--text-tertiary)]">Link</span>
                      <input
                        type="url"
                        value={plataforma.postUrl ?? ''}
                        placeholder="https://"
                        onChange={event =>
                          onChange({
                            plataformas: updatePlatformLink(
                              draft.plataformas,
                              plataforma.id,
                              event.target.value,
                            ),
                          })
                        }
                        className="w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 md:rounded-[var(--radius-card)]"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-[var(--text-tertiary)]">
                    {rotuloStatusPublicacao(plataforma.status)}
                  </p>
                  {plataforma.postCodigo ? (
                    <p className="text-xs text-[var(--text-tertiary)]">Código {plataforma.postCodigo}</p>
                  ) : null}
                  {!isPosted || plataforma.status !== 'publicada' ? (
                    <>
                      <AppButton
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          onChange({
                            plataformas: setPublicacaoStatus(draft.plataformas, plataforma.id, 'nao_publicada'),
                          })
                        }
                      >
                        Não publicada
                      </AppButton>
                      <AppButton
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          onChange({
                            plataformas: setPublicacaoStatus(draft.plataformas, plataforma.id, 'removida'),
                          })
                        }
                      >
                        Removida
                      </AppButton>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:rounded-[var(--radius-card)] md:p-7">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-tertiary)]">
          <Image className="h-4 w-4" />
          Assets e observações
        </div>
        <textarea
          value={draft.notes ?? ''}
          disabled={isPosted}
          onChange={event => onChange({notes: event.target.value})}
          className="mt-4 min-h-[140px] w-full rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-6 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 disabled:opacity-60"
          placeholder="Links de assets, instruções de edição, thumb, cortes e observações"
        />
      </section>


      {isPosted ? (
        <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:rounded-[var(--radius-card)] md:p-7">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Repostar</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {referencia
              ? 'Cria outra publicação em ' + rotuloConta(referencia) + ', com a data dela. Ela entra na grade como um item próprio.'
              : 'Escolha a conta base nos Ajustes do Editorial para o repost entrar na grade.'}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block sm:min-w-[220px]">
              <span className="mb-2 block text-xs font-semibold text-[var(--text-tertiary)]">Data do repost</span>
              <input
                type="date"
                value={repostDate}
                onChange={event => setRepostDate(event.target.value)}
                className="min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]"
              />
            </label>
            <AppButton
              variant="secondary"
              disabled={!referencia || !repostDate}
              onClick={() => {
                if (!referencia || !repostDate) return;
                onChange({
                  plataformas: criarRepost({
                    publicacoes: draft.plataformas,
                    contentId,
                    platformId: referencia.id,
                    publishDate: repostDate + 'T12:00:00.000Z',
                  }),
                });
                setRepostDate('');
              }}
            >
              Repostar
            </AppButton>
          </div>
        </section>
      ) : null}

      {!isPosted && onMarkPosted ? (
        <div className="flex justify-end">
          <AppButton variant="primary" onClick={onMarkPosted}>
            Registrar publicação
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}
