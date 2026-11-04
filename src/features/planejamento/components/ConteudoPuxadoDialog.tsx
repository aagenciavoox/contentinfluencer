import {useEffect, useMemo, useRef, useState} from 'react';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {AlertCircle, Check, Clapperboard, Eye, MessageSquareText} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {MoreMenu, type MoreMenuItem} from '../../../components/ui/MoreMenu';
import {PlatformIcon} from '../../../components/ui/PlatformIcon';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {OverlayFooter} from '../../../components/overlays/OverlayFooter';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import type {Content} from '../../../lib/database';
import {fetchContentsByIds} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {isContentBodyLoaded, upsertContent} from '../../contents/lib/contentBody';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline';
import {ESTADO_LEGENDA_ROTULO} from '../../editorial/lib/captions';
import type {PublicacaoNaAgenda} from '../../editorial/lib/publicacoes';
import {
  destinosDoResumo,
  legendaBaseDoResumo,
  resumoDasLegendas,
  textoDoResumo,
  type DestinoDoResumo,
} from '../lib/resumoDoPuxado';
import {PostItAssuntosObras, PostItIdentity, type PostItMark} from './PostItNote';

function diaPorExtenso(data: string | null): string | null {
  if (!data) return null;
  return format(new Date(`${data}T12:00:00`), "d 'de' MMM", {locale: ptBR});
}

function LinhaDeDestino({destino}: {destino: DestinoDoResumo}) {
  const quando = destino.data
    ? `${diaPorExtenso(destino.data)}${destino.hora ? ` · ${destino.hora}` : ''}`
    : destino.rotuloSituacao;
  return (
    <li className="flex items-start gap-3 py-2">
      <PlatformIcon platform={destino.rede ?? destino.nome} className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Text variant="bodyStrong" as="span" className="truncate text-[var(--text-primary)]">{destino.nome}</Text>
          <Text variant="meta" as="span" className="text-[var(--text-secondary)]">{destino.rotuloFormato}</Text>
          {destino.programado ? <Badge variant="neutral">Programado</Badge> : null}
        </div>
        <Text variant="meta" as="span" className="flex items-center gap-1 text-[var(--text-secondary)]">
          {destino.situacao === 'realizada' ? <Check className="h-3 w-3 text-[var(--accent-green)]" aria-hidden /> : null}
          {destino.situacao === 'vencida' ? <AlertCircle className="h-3 w-3 text-[var(--accent-orange)]" aria-hidden /> : null}
          {destino.situacao === 'realizada' ? `Publicada${destino.data ? ` em ${diaPorExtenso(destino.data)}` : ''}` : quando}
        </Text>
      </div>
      <div className="shrink-0 text-right">
        {destino.legenda ? (
          <Text
            variant="meta"
            as="span"
            className={cn(
              'inline-flex items-center gap-1',
              destino.legenda.tem ? 'text-[var(--text-secondary)]' : 'text-[var(--accent-orange)]',
            )}
            title={destino.legenda.tem ? `${ESTADO_LEGENDA_ROTULO[destino.legenda.estado]}: ${destino.legenda.trecho}` : undefined}
          >
            <MessageSquareText className="h-3 w-3" aria-hidden />
            {destino.legenda.tem ? 'Com legenda' : 'Sem legenda'}
          </Text>
        ) : null}
      </div>
    </li>
  );
}

/**
 * Pré-visualização de um conteúdo do calendário: onde vai ser postado, se já tem legenda
 * e um pedaço do texto, sem sair do Planejamento. Abrir o roteiro é uma escolha, não o clique.
 */
export function ConteudoPuxadoDialog({
  open,
  content,
  dia,
  agenda,
  marks,
  seriesColor,
  assuntos,
  obras,
  onClose,
  onAbrir,
  onTransformarEmRoteiro,
  onGravacao,
  onMover,
  onTirar,
}: {
  open: boolean;
  content: Content | null;
  /** Dia do cartão clicado. */
  dia: string | null;
  /** Publicações do conteúdo na agenda (uma por conta). */
  agenda: readonly PublicacaoNaAgenda[];
  marks: PostItMark[];
  seriesColor: string | null;
  assuntos: readonly string[];
  obras: readonly string[];
  onClose: () => void;
  onAbrir: () => void;
  onTransformarEmRoteiro?: () => void;
  onGravacao?: () => void;
  onMover?: () => void;
  onTirar?: () => void;
}) {
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
  const contentsRef = useRef(state.contents);
  contentsRef.current = state.contents;
  const [carregando, setCarregando] = useState(false);

  // Select leve não traz o roteiro: busca o corpo ao abrir, uma vez, e guarda no estado.
  useEffect(() => {
    if (!open || !content || !user || isContentBodyLoaded(content)) {
      setCarregando(false);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    void fetchContentsByIds(user.id, [content.id]).then(lista => {
      if (cancelado) return;
      const completo = lista[0];
      if (completo) dispatch({type: 'SET_DATA', payload: {contents: upsertContent(contentsRef.current, completo)}});
    }).finally(() => {
      if (!cancelado) setCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [open, content?.id, user, dispatch]);

  const destinos = useMemo(
    () => (content ? destinosDoResumo(content, agenda, state.platforms) : []),
    [content, agenda, state.platforms],
  );
  if (!content) return null;

  const status = normalizeContentStatus(content.status);
  const ehIdeia = status === CONTENT_STATUS.IDEIA;
  const legendaBase = legendaBaseDoResumo(content);
  const texto = textoDoResumo(content);
  const menu: MoreMenuItem[] = [
    ...(onMover ? [{id: 'mover', label: 'Mover para outro dia…', onClick: onMover}] : []),
    ...(onTirar ? [{id: 'tirar', label: 'Tirar do planejamento', onClick: onTirar, tone: 'danger' as const}] : []),
  ];

  return (
    <Dialog open={open} onClose={onClose} desktopMaxW="max-w-lg" ariaLabel="Pré-visualização do conteúdo">
      <div className="flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]">
        <OverlayHeader
          title={content.title?.trim() || 'Sem título'}
          subtitle={[status, dia ? diaPorExtenso(dia) : null].filter(Boolean).join(' · ')}
          icon={<Eye className="h-6 w-6 text-[var(--brand-accent-text)]" />}
          onClose={onClose}
        />
        <OverlayBody>
          <div className="stack-lg">
            <Surface
              variant="outlined"
              padding="sm"
              style={seriesColor ? {borderColor: seriesColor} : undefined}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="status" status={status}>{status}</Badge>
                <PostItIdentity marks={marks} className="mb-0" />
              </div>
              <PostItAssuntosObras assuntos={assuntos} obras={obras} />
            </Surface>

            <section className="stack-xs" aria-labelledby="preview-destinos">
              <div className="flex items-center justify-between gap-2">
                <Text variant="label" as="h3" id="preview-destinos" className="text-[var(--text-secondary)]">Onde vai ser postado</Text>
                <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                  {resumoDasLegendas(destinos, legendaBase)}
                </Text>
              </div>
              {destinos.length > 0 ? (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {destinos.map(destino => <LinhaDeDestino key={destino.platformId} destino={destino} />)}
                </ul>
              ) : (
                <Text variant="secondary" className="text-[var(--text-secondary)]">
                  Nenhuma conta marcada ainda. As contas entram na aba Publicação do roteiro.
                </Text>
              )}
            </section>

            {legendaBase ? (
              <section className="stack-xs" aria-labelledby="preview-legenda">
                <Text variant="label" as="h3" id="preview-legenda" className="text-[var(--text-secondary)]">Legenda-base</Text>
                <Surface variant="info" padding="sm">
                  <Text variant="secondary" className="whitespace-pre-wrap text-[var(--text-secondary)]">{legendaBase.trecho}</Text>
                </Surface>
              </section>
            ) : null}

            <section className="stack-xs" aria-labelledby="preview-texto">
              <div className="flex items-center justify-between gap-2">
                <Text variant="label" as="h3" id="preview-texto" className="text-[var(--text-secondary)]">
                  {ehIdeia ? 'Texto da ideia' : 'Roteiro'}
                </Text>
                {texto.estado === 'pronto' ? (
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                    {texto.palavras === 1 ? '1 palavra' : `${texto.palavras} palavras`}
                  </Text>
                ) : null}
              </div>
              {texto.estado === 'carregando' || carregando ? (
                <Text variant="secondary" className="text-[var(--text-tertiary)]">Carregando texto…</Text>
              ) : texto.estado === 'vazio' ? (
                <Text variant="secondary" className="text-[var(--text-tertiary)]">
                  {ehIdeia ? 'Ideia ainda sem texto.' : 'Roteiro ainda vazio.'}
                </Text>
              ) : (
                <Surface variant="info" padding="md">
                  <Text variant="body" className="whitespace-pre-wrap leading-relaxed text-[var(--text-primary)]">{texto.trecho}</Text>
                </Surface>
              )}
            </section>
          </div>
        </OverlayBody>
        <OverlayFooter className="justify-between gap-2">
          <div>{menu.length > 0 ? <MoreMenu items={menu} align="left" label="Mais opções do conteúdo" /> : null}</div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {onTransformarEmRoteiro ? (
              <AppButton variant="secondary" onClick={onTransformarEmRoteiro}>
                Transformar em roteiro
              </AppButton>
            ) : null}
            {onGravacao ? (
              <AppButton variant="secondary" leftIcon={<Clapperboard className="h-4 w-4" />} onClick={onGravacao}>
                Mandar para gravação
              </AppButton>
            ) : null}
            <AppButton variant="primary" onClick={onAbrir}>
              {ehIdeia ? 'Abrir ideia' : 'Abrir roteiro'}
            </AppButton>
          </div>
        </OverlayFooter>
      </div>
    </Dialog>
  );
}
