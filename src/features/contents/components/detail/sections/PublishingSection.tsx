import {AlertTriangle, CalendarCheck, CalendarDays, Check, Copy, Pencil} from 'lucide-react';
import type {Content, ContentPlataforma, Pilar, Serie} from '../../../../../lib/database';
import {AppButton} from '../../../../../components/ui/AppButton';
import {setPublicacaoStatus} from '../../../../editorial/lib/markPublished';
import {CONTENT_STATUS, DISPLAY_STATUS} from '../../../lib/contentPipeline';
import type {PostingAlert} from '../../../lib/contentPipeline';
import {useEffect, useRef, useState} from 'react';
import {useAppContext} from '../../../../../context/AppContext';
import {cicloDaPublicacao, criarCicloDeRepost} from '../../../../editorial/lib/cicloPublicacao';
import {retirarPrevisao} from '../../../../editorial/lib/dataVencida';
import {
  confirmarProgramado,
  normalizePublicacaoStatus,
  rotuloSituacaoPublicacao,
  seloDaPublicacao,
  type SeloDaPublicacao,
} from '../../../../editorial/lib/publicacaoSituacao';
import {mudarDataPrincipal, mudarHoraPrincipal} from '../../../lib/dataPrincipal';
import {PlatformCopyEditor} from '../PlatformCopyEditor';
import {contaDaRef, iconeDaConta, redeDaRef, rotuloConta, rotuloCurtoConta} from '../../../../contas/lib/contas';
import {formatoNoYoutube} from '../../../../editorial/lib/publicacoes';
import {legendaComHashtags} from '../../../../editorial/lib/captions';
import {PostingTimeSuggestions} from '../../../../settings/components/PostingTimeSuggestions';
import {ConfirmModal} from '../../../../../components/feedback/modals/ConfirmModal';
import {Drawer} from '../../../../../components/overlays/Drawer';
import {OverlayBody} from '../../../../../components/overlays/OverlayBody';
import {OverlayHeader} from '../../../../../components/overlays/OverlayHeader';
import {Badge} from '../../../../../components/ui/Badge';
import {MoreMenu} from '../../../../../components/ui/MoreMenu';
import {PlatformIcon} from '../../../../../components/ui/PlatformIcon';
import {Surface} from '../../../../../components/ui/Surface';
import {Text} from '../../../../../components/ui/Text';

type PublishingDraft = Pick<
  Content,
  'status' | 'publishDate' | 'publishDateEnabled' | 'publishTime' | 'plataformas' | 'notes' | 'legendaBase' | 'title'
> & Partial<Pick<Content, 'postedAt' | 'edicaoConcluidaEm' | 'formatoVisual' | 'writingMode'>>;

interface PublishingSectionProps {
  draft: PublishingDraft;
  pilar: Pilar | null;
  serie: Serie | null;
  alerts: PostingAlert[];
  onChange: (updates: Partial<PublishingDraft>) => void;
  onMarkPosted?: () => void;
  contentId?: string;
}

type SaidaDaConta = {id: string; status: 'nao_publicada' | 'removida'; rotulo: string};

const campoClass =
  'w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 t-body-strong text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 md:rounded-[var(--radius-card)]';

const campoDiscretoClass =
  'h-8 rounded-[var(--radius-input)] border border-transparent bg-transparent px-2 t-meta text-[var(--text-secondary)] outline-none transition-colors hover:bg-[var(--bg-hover)] focus:border-[var(--border-color)] focus:bg-[var(--bg-elevated)]';

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

/** "Não vai ao ar" e "Removida" saem da lista: a conta fica desmarcada, como no editor. */
function emDestino(publicacao: Pick<ContentPlataforma, 'status'>): boolean {
  return publicacao.status !== 'nao_publicada' && publicacao.status !== 'removida';
}

function hojeLocal(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function SeloDoTopo({selo}: {selo: SeloDaPublicacao}) {
  if (selo.tom === 'publicado') return <Badge variant="status" status={CONTENT_STATUS.POSTADO}>{selo.texto}</Badge>;
  if (selo.tom === 'programado') return <Badge variant="status" status={DISPLAY_STATUS.PROGRAMADO}>{selo.texto}</Badge>;
  if (selo.tom === 'parcial') return <Badge variant="status" status={CONTENT_STATUS.EDICAO}>{selo.texto}</Badge>;
  return <Badge variant="neutral">{selo.texto}</Badge>;
}

function SeloDaConta({status}: {status: ContentPlataforma['status']}) {
  const situacao = normalizePublicacaoStatus(status);
  const texto = rotuloSituacaoPublicacao(situacao);
  if (situacao === 'publicada') return <Badge variant="success">{texto}</Badge>;
  if (situacao === 'programada') return <Badge variant="status" status={DISPLAY_STATUS.PROGRAMADO}>{texto}</Badge>;
  return <Badge variant="neutral">{texto}</Badge>;
}

/**
 * Aba Publicação como confirmação: quando e onde, a prévia de cada legenda e as duas saídas
 * (Programar ou Marcar como já publicada). A edição da legenda abre numa gaveta.
 */
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
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [saida, setSaida] = useState<SaidaDaConta | null>(null);
  const dataPrincipalRef = useRef<HTMLInputElement>(null);
  const isPosted = draft.status === CONTENT_STATUS.POSTADO || Boolean(draft.postedAt);
  const selo = seloDaPublicacao(draft, draft.plataformas);
  const confirmacao = confirmarProgramado(draft, draft.plataformas);
  const jaProgramado = !confirmacao.pode && confirmacao.motivo === 'ja-programado';
  const publishDateOnly = draft.publishDate ? draft.publishDate.slice(0, 10) : '';
  // No dia ou depois dele, a saída mais provável é registrar o que já foi ao ar.
  const publicadaPrimeiro = Boolean(publishDateOnly) && publishDateOnly <= hojeLocal();
  const contasMarcadas = draft.plataformas.filter(emDestino);

  useEffect(() => {
    if (!copiadoId) return;
    const timer = window.setTimeout(() => setCopiadoId(null), 1500);
    return () => window.clearTimeout(timer);
  }, [copiadoId]);

  const nomeDaConta = (plataforma: ContentPlataforma) => {
    const conta = contaDaRef(plataforma.platformId, state.platforms);
    const rotulo = conta ? rotuloCurtoConta(conta) : plataforma.platformId;
    const comRepost = plataforma.publicationKind === 'repost' ? `${rotulo} · repost` : rotulo;
    if (redeDaRef(plataforma.platformId, state.platforms) !== 'youtube') return comRepost;
    const noYoutube = formatoNoYoutube({formatoVisual: draft.formatoVisual ?? null, writingMode: draft.writingMode}, plataforma);
    return `${comRepost} · ${noYoutube.formato === 'short' ? 'Shorts' : 'Vídeo longo'}`;
  };

  const iconeDaPublicacao = (plataforma: ContentPlataforma) => {
    const conta = contaDaRef(plataforma.platformId, state.platforms);
    if (redeDaRef(plataforma.platformId, state.platforms) === 'youtube') {
      const noYoutube = formatoNoYoutube({formatoVisual: draft.formatoVisual ?? null, writingMode: draft.writingMode}, plataforma);
      if (noYoutube.formato === 'short') return 'youtube-shorts';
    }
    return conta ? iconeDaConta(conta) : plataforma.platformId;
  };

  const copiar = async (plataforma: ContentPlataforma, texto: string) => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(plataforma.id);
    } catch {
      setCopiadoId(null);
    }
  };

  const editorProps = {
    plataformas: draft.plataformas,
    pilar,
    serie,
    // Cada publicação protege o próprio texto depois de ir ao ar; as pendentes seguem editáveis.
    status: draft.status,
    formatoVisual: draft.formatoVisual,
    writingMode: draft.writingMode,
    contentId,
    legendaBase: draft.legendaBase ?? null,
    titulo: draft.title,
    onTituloChange: (title: string) => onChange({title}),
    onChange: (plataformas: ContentPlataforma[]) => onChange({plataformas}),
  };

  const botaoProgramar = (
    <AppButton
      key="programar"
      variant={publicadaPrimeiro ? 'secondary' : 'primary'}
      leftIcon={jaProgramado ? <Check className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
      disabled={!confirmacao.pode}
      disabledReason={confirmacao.pode ? undefined : confirmacao.texto}
      onClick={() => {
        if (confirmacao.pode) onChange({plataformas: confirmacao.publicacoes});
      }}
    >
      {jaProgramado ? 'Programado' : 'Programar'}
    </AppButton>
  );
  const botaoPublicada = onMarkPosted ? (
    <AppButton key="publicada" variant={publicadaPrimeiro ? 'primary' : 'secondary'} onClick={onMarkPosted}>
      Marcar como já publicada
    </AppButton>
  ) : null;

  return (
    <div className="grid gap-6">
      {selo ? (
        <div className="flex flex-wrap items-center gap-2">
          <SeloDoTopo selo={selo} />
        </div>
      ) : null}

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

      <Surface as="section" variant="outlined" padding="lg" className="stack-lg bg-[var(--bg-elevated)]">
        <div className="flex items-center gap-2 t-label text-[var(--text-tertiary)]">
          <CalendarDays className="h-4 w-4" />
          Quando e onde
        </div>

        <div className="stack-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <Text variant="label" as="span" className="mb-2 block text-[var(--text-tertiary)]">
                Data principal
              </Text>
              <input
                ref={dataPrincipalRef}
                type="date"
                value={publishDateOnly}
                onChange={event => {
                  const mudanca = mudarDataPrincipal(draft, event.target.value || null, contentId);
                  if (mudanca) onChange(mudanca);
                }}
                className={campoClass}
              />
            </label>
            <label className="block">
              <Text variant="label" as="span" className="mb-2 block text-[var(--text-tertiary)]">
                Hora
              </Text>
              <input
                type="time"
                value={draft.publishTime ?? ''}
                onChange={event => onChange(mudarHoraPrincipal(draft, event.target.value || null, contentId))}
                className={campoClass}
              />
            </label>
          </div>
          {publishDateOnly ? (
            <PostingTimeSuggestions
              date={publishDateOnly}
              selectedTime={draft.publishTime ?? ''}
              postingTimeEntries={state.postingTimeEntries}
              platforms={state.platforms}
              pilar={pilar}
              onSelect={time => onChange(mudarHoraPrincipal(draft, time, contentId))}
            />
          ) : null}
        </div>

        <div className="border-t border-[var(--border-color)] pt-4">
          <PlatformCopyEditor {...editorProps} secoes="contas" />
        </div>
      </Surface>

      {contasMarcadas.length > 0 ? (
        <Surface as="section" variant="outlined" padding="lg" className="bg-[var(--bg-elevated)]">
          <Text variant="sectionTitle" as="h3">Legendas</Text>
          <ul className="mt-2">
            {contasMarcadas.map(plataforma => {
              const nome = nomeDaConta(plataforma);
              const texto = legendaComHashtags(draft.legendaBase ?? null, plataforma).trim();
              const diaDaConta = plataforma.publishDate ? plataforma.publishDate.slice(0, 10) : '';
              const outroDia = Boolean(diaDaConta) && diaDaConta !== publishDateOnly;
              const conta = contaDaRef(plataforma.platformId, state.platforms);
              const nomeCompleto = conta ? rotuloConta(conta) : plataforma.platformId;
              const podeSair = !isPosted || plataforma.status !== 'publicada';
              return (
                <li
                  key={plataforma.id || plataforma.platformId}
                  className="stack-xs border-t border-[var(--border-color)] py-4 first:border-t-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <PlatformIcon platform={iconeDaPublicacao(plataforma)} className="h-4 w-4 shrink-0" />
                    <Text variant="bodyStrong" as="span" className="min-w-0 truncate">{nome}</Text>
                    <SeloDaConta status={plataforma.status} />
                    <div className="ml-auto flex items-center gap-1">
                      <AppButton
                        size="xs"
                        variant="ghost"
                        disabled={!texto}
                        disabledReason="Escreva a legenda desta conta primeiro."
                        aria-label={`Copiar legenda de ${nomeCompleto}`}
                        leftIcon={copiadoId === plataforma.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        onClick={() => void copiar(plataforma, texto)}
                      >
                        {copiadoId === plataforma.id ? 'Copiada' : 'Copiar'}
                      </AppButton>
                      <AppButton
                        size="xs"
                        variant="ghost"
                        aria-label={`Editar legenda de ${nomeCompleto}`}
                        leftIcon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => setEditandoId(plataforma.id)}
                      >
                        Editar
                      </AppButton>
                      {podeSair ? (
                        <MoreMenu
                          size="sm"
                          label={`Mais opções de ${nomeCompleto}`}
                          items={[
                            {
                              id: 'nao-vai',
                              label: 'Não vai ao ar nesta conta',
                              onClick: () => setSaida({id: plataforma.id, status: 'nao_publicada', rotulo: nomeCompleto}),
                            },
                            {
                              id: 'removida',
                              label: 'Removida da rede',
                              tone: 'danger',
                              onClick: () => setSaida({id: plataforma.id, status: 'removida', rotulo: nomeCompleto}),
                            },
                          ]}
                        />
                      ) : null}
                    </div>
                  </div>
                  <Text
                    variant="secondary"
                    as="p"
                    className={texto ? 'line-clamp-3 whitespace-pre-line text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'}
                  >
                    {texto || 'Sem legenda ainda.'}
                  </Text>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <label className="inline-flex items-center gap-1">
                      <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                        {outroDia ? 'Data própria' : 'Data'}
                      </Text>
                      <input
                        type="date"
                        aria-label={`Data em ${nomeCompleto}`}
                        value={diaDaConta}
                        onChange={event =>
                          onChange({
                            plataformas: updatePlatformDate(
                              draft.plataformas,
                              plataforma.id,
                              event.target.value ? `${event.target.value}T12:00:00.000Z` : null
                            ),
                          })
                        }
                        className={campoDiscretoClass}
                      />
                    </label>
                    <label className="inline-flex min-w-[12rem] flex-1 items-center gap-1">
                      <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">Link</Text>
                      <input
                        type="url"
                        aria-label={`Link em ${nomeCompleto}`}
                        value={plataforma.postUrl ?? ''}
                        placeholder="https://"
                        onChange={event =>
                          onChange({
                            plataformas: updatePlatformLink(draft.plataformas, plataforma.id, event.target.value),
                          })
                        }
                        className={`${campoDiscretoClass} min-w-0 flex-1`}
                      />
                    </label>
                    {plataforma.postCodigo ? (
                      <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">Código {plataforma.postCodigo}</Text>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </Surface>
      ) : null}

      {isPosted ? (
        <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:rounded-[var(--radius-card)] md:p-6">
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

      {!isPosted ? (
        <div className="stack-xs border-t border-[var(--border-color)] bg-[var(--bg-primary)] py-4 md:sticky md:bottom-0 md:z-10">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {publicadaPrimeiro ? [botaoProgramar, botaoPublicada] : [botaoPublicada, botaoProgramar]}
          </div>
          {!confirmacao.pode ? (
            <Text variant="meta" as="p" className="text-right text-[var(--text-tertiary)]">{confirmacao.texto}</Text>
          ) : null}
        </div>
      ) : null}

      <Drawer open={editandoId !== null} onClose={() => setEditandoId(null)} ariaLabel="Editar legenda" widthClassName="max-w-xl">
        <OverlayHeader title="Editar legenda" onClose={() => setEditandoId(null)} />
        <OverlayBody className="px-6 py-4">
          {editandoId ? (
            <PlatformCopyEditor key={editandoId} {...editorProps} embedded secoes="legenda" abaInicialId={editandoId} />
          ) : null}
        </OverlayBody>
      </Drawer>

      <ConfirmModal
        open={saida !== null}
        message={saida
          ? saida.status === 'nao_publicada'
            ? `${saida.rotulo} não vai ao ar neste roteiro? A conta sai das previstas e fica desmarcada.`
            : `Marcar ${saida.rotulo} como removida da rede? A conta sai das previstas e fica desmarcada.`
          : ''}
        confirmLabel={saida?.status === 'removida' ? 'Marcar como removida' : 'Não vai ao ar'}
        cancelLabel="Voltar"
        onConfirm={() => {
          const atual = saida;
          setSaida(null);
          if (atual) onChange({plataformas: setPublicacaoStatus(draft.plataformas, atual.id, atual.status)});
        }}
        onCancel={() => setSaida(null)}
      />
    </div>
  );
}