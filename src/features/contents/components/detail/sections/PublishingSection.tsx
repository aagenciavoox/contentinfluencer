import {AlertTriangle, CalendarDays, Image, Send} from 'lucide-react';
import type {Content, ContentPlataforma, Pilar, Serie} from '../../../../../lib/database';
import {AppButton} from '../../../../../components/ui/AppButton';
import {rotuloStatusPublicacao, setPublicacaoStatus} from '../../../../editorial/lib/markPublished';
import {CONTENT_STATUS, getDisplayStatus, isReadyToPublish} from '../../../lib/contentPipeline';
import type {PostingAlert} from '../../../lib/contentPipeline';
import {useRef, useState} from 'react';
import {useAppContext} from '../../../../../context/AppContext';
import {cicloDaPublicacao, criarCicloDeRepost} from '../../../../editorial/lib/cicloPublicacao';
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
              O repost fecha quando todas as contas previstas forem publicadas.
            </Text>
          ) : null}
        </div>
      ) : null}
      {!materialPronto && !isPosted ? (
        <Text variant="secondary">
          Prepare legenda, capa, contas e datas desde já. Programado pede o material pronto na Edição; uma publicação que já saiu pode ser registrada a qualquer momento.
        </Text>
      ) : null}
      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:rounded-[var(--radius-card)] md:p-7">
        <div className="flex items-center gap-2 t-label text-[var(--text-tertiary)]">
          <CalendarDays className="h-4 w-4" />
          Agendamento
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <Text variant="label" as="span" className="mb-2 block text-[var(--text-tertiary)]">
              Data principal
            </Text>
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
              className="w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 t-body-strong text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 md:rounded-[var(--radius-card)]"
            />
          </label>

          <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
            <Text variant="label" as="p" className="text-[var(--text-tertiary)]">Status atual</Text>
            <Text variant="sectionTitle" as="p" className="mt-3 text-[var(--text-primary)]">
              {getDisplayStatus({
                status: draft.status,
                publishDate: draft.publishDate,
                postedAt: draft.postedAt ?? null,
                edicaoConcluidaEm: draft.edicaoConcluidaEm ?? null,
                plataformas: draft.plataformas,
              })}
            </Text>
            <Text variant="secondary" as="p" className="mt-2 text-[var(--text-secondary)]">
              A data fica guardada até você registrar a publicação.
            </Text>
          </div>
        </div>
      </section>

      {alerts.length > 0 ? (
        <section className="grid gap-3">
          {alerts.map(alert => (
            <article
              key={alert.id}
              className="stack-sm rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
            >
              <div className="flex items-start gap-3">
                {alert.tone === 'warning' ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" />
                ) : (
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[var(--info)]" />
                )}
                <Text variant="itemTitle" as="p" className="text-[var(--text-primary)]">{alert.message}</Text>
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
          <div className="flex items-center gap-2 t-label text-[var(--text-tertiary)]">
            <Send className="h-4 w-4" />
            Datas por plataforma
          </div>
          <div className="mt-5 stack-lg">
            {draft.plataformas.map(plataforma => (
              <article
                key={plataforma.id || plataforma.platformId}
                className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <Text variant="itemTitle" as="p" className="text-[var(--text-primary)]">{rotuloDaRef(plataforma.platformId, state.platforms)}</Text>
                  <div className="grid gap-3 sm:grid-cols-2 md:min-w-[28rem]">
                    <label className="block">
                      <Text variant="label" as="span" className="mb-2 block text-[var(--text-tertiary)]">Data</Text>
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
                        className="w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 t-body-strong text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 md:rounded-[var(--radius-card)]"
                      />
                    </label>
                    <label className="block">
                      <Text variant="label" as="span" className="mb-2 block text-[var(--text-tertiary)]">Link</Text>
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
                        className="w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 t-body-strong text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 md:rounded-[var(--radius-card)]"
                      />
                    </label>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Text variant="label" as="p" className="text-[var(--text-tertiary)]">
                    {rotuloStatusPublicacao(plataforma.status)}
                  </Text>
                  {plataforma.postCodigo ? (
                    <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">Código {plataforma.postCodigo}</Text>
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
        <div className="flex items-center gap-2 t-label text-[var(--text-tertiary)]">
          <Image className="h-4 w-4" />
          Assets e observações
        </div>
        <textarea
          value={draft.notes ?? ''}
          disabled={isPosted}
          onChange={event => onChange({notes: event.target.value})}
          className="mt-4 min-h-[140px] w-full rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-6 py-4 t-body leading-7 text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 disabled:opacity-60"
          placeholder="Ex.: link dos arquivos, instruções de edição, capa, cortes"
        />
      </section>


      {isPosted ? (
        <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:rounded-[var(--radius-card)] md:p-7">
          <Text variant="itemTitle" as="p" className="text-[var(--text-primary)]">Repostar</Text>
          <Text variant="secondary" as="p" className="mt-1 text-[var(--text-secondary)]">
            Abre um ciclo novo no mesmo roteiro, sem desfazer a publicação anterior nem as métricas.
            {referencia
              ? ` Entra na grade pela conta de referência (${rotuloConta(referencia)}).`
              : ' Escolha a conta de referência no Editorial para o ciclo entrar na grade.'}
          </Text>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block sm:min-w-[220px]">
              <Text variant="label" as="span" className="mb-2 block text-[var(--text-tertiary)]">Data do repost</Text>
              <input
                type="date"
                value={repostDate}
                onChange={event => setRepostDate(event.target.value)}
                className="min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 t-body text-[var(--text-primary)]"
              />
            </label>
            <AppButton
              variant="secondary"
              disabled={!referencia || !repostDate}
              onClick={() => {
                if (!referencia || !repostDate) return;
                const ciclo1 = draft.plataformas.filter(
                  item => cicloDaPublicacao(item) === 1 && item.status !== 'nao_publicada' && item.status !== 'removida',
                );
                const platformIds = [...new Set(
                  (ciclo1.length > 0 ? ciclo1 : draft.plataformas).map(item => item.platformId),
                )];
                const ids = platformIds.includes(referencia.id)
                  ? platformIds
                  : [referencia.id, ...platformIds];
                onChange({
                  plataformas: criarCicloDeRepost({
                    publicacoes: draft.plataformas,
                    contentId,
                    platformIds: ids.length > 0 ? ids : [referencia.id],
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
