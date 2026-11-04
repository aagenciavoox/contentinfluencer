import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import { dia as diaVisivel } from '../../../../lib/dates';
import {Check, Copy, CopyPlus, Lock} from 'lucide-react';
import {DEFAULT_PLATFORMS} from '../../../../constants';
import {useAppContext} from '../../../../context/AppContext';
import type {Content, ContentPlataforma, FormatoEscolhidoNaPublicacao, Pilar, Serie} from '../../../../lib/database';
import {generateUUID} from '../../../../utils/uuid';
import {cn} from '../../../../lib/utils';
import {ConfirmModal} from '../../../../components/feedback/modals/ConfirmModal';
import {AppButton} from '../../../../components/ui/AppButton';
import {ChoiceChips} from '../../../../components/ui/ChoiceChips';
import {PlatformIcon} from '../../../../components/ui/PlatformIcon';
import {SegmentTabs} from '../../../../components/ui/SegmentTabs';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {TextCount} from '../../../../components/ui/TextCount';
import {
  complementoDoRotulo,
  contaDaRef,
  contasAtivas,
  iconeDaConta,
  redeDaConta,
  redeDaRef,
  rotuloConta,
  rotuloCurtoConta,
} from '../../../contas/lib/contas';
import {formatoNoYoutube} from '../../../editorial/lib/publicacoes';
import {HashtagsField} from '../../../editorial/components/legendas/HashtagsField';
import {
  adicionarHashtagsAoFim,
  copiarLegendaParaTodas,
  destinosDaCopia,
  editarLegendaDaConta,
  hashtagsNaLegenda,
  legendaComHashtags,
  legendasQueSeriamApagadas,
  legendasQueSeriamSubstituidas,
  publicacaoJaPostada,
} from '../../../editorial/lib/captions';
import {
  alternarDestino,
  destinoMarcado,
  mesmoDestino,
  publicacaoOriginal,
  publicacaoPublicada,
  type DestinoPlataforma,
} from '../../../editorial/lib/destinations';
import {limiteHashtagsDaRede} from '../../../editorial/lib/editorialSettings';
import {hashtagsPadraoForaSerie} from '../../../editorial/lib/hashtagsForaSerie';
import {limiteDeCaracteres, platformShowsField} from '../../../editorial/lib/platformFields';
import {suggestHashtags} from '../../lib/captionHashtags';

export function ensurePlatformRecord(
  plataformas: ContentPlataforma[],
  platformId: string,
  contentId = ''
) {
  const existing = plataformas.find(plataforma => plataforma.platformId === platformId);
  if (existing) return existing;

  return {
    id: generateUUID(),
    contentId,
    platformId,
    legenda: '',
    hashtags: '',
    publishDate: null,
    publishDateEnabled: false,
    status: 'prevista',
    realizadaManualEm: null,
    realizadaApiEm: null,
    postCodigo: null,
    postUrl: null,
    legendaPropria: false,
    contaNaGrade: true,
  } satisfies ContentPlataforma;
}

const contaButtonClass =
  'inline-flex h-10 max-w-full items-center gap-2 rounded-[var(--radius-input)] border bg-[var(--bg-primary)] px-3 t-body transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 pointer-coarse:h-11';

/** "Não foi ao ar" e "Removida" deixam de ser destino: a conta aparece desmarcada e sem aba. */
function emDestino(publicacao: Pick<ContentPlataforma, 'status'>): boolean {
  return publicacao.status !== 'nao_publicada' && publicacao.status !== 'removida';
}

function dataCurta(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return diaVisivel(date);
}

/** "A", "A e B", "A, B e C". */
function juntarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

interface PlatformCopyEditorProps {
  plataformas: ContentPlataforma[];
  pilar: Pilar | null;
  serie: Serie | null;
  disabled?: boolean;
  onChange: (plataformas: ContentPlataforma[]) => void;
  embedded?: boolean;
  contentId?: string;
  /** Texto de origem de publicações antigas que ainda o acompanham. Esta tela não o edita. */
  legendaBase?: string | null;
  titulo?: string;
  onTituloChange?: (value: string) => void;
  /** Status do conteúdo: Postado sem status por publicação conta como realizado. */
  status?: string | null;
  formatoVisual?: string | null;
  writingMode?: Content['writingMode'] | null;
}

/**
 * Legendas do conteúdo. Cada conta marcada é uma publicação com legenda própria:
 * as caixas escolhem as contas, as abas escolhem qual legenda está em edição.
 * "Usar esta legenda em todas" copia o texto aberto para as outras contas; depois
 * da cópia, cada legenda segue independente.
 */
export function PlatformCopyEditor({
  plataformas,
  pilar,
  serie,
  disabled = false,
  onChange,
  embedded = false,
  contentId = '',
  legendaBase = null,
  titulo = '',
  onTituloChange,
  status = null,
  formatoVisual = null,
  writingMode = null,
}: PlatformCopyEditorProps) {
  const {state} = useAppContext();
  const editorial = state.editorial;
  const destinos = useMemo<DestinoPlataforma[]>(() => {
    const ativas = contasAtivas(state.platforms);
    if (ativas.length > 0) return ativas;
    return DEFAULT_PLATFORMS.map(nome => ({id: nome, nome}));
  }, [state.platforms]);
  // Publicações antigas podem estar numa conta inativa: ela ainda precisa de nome e ícone.
  const contas = state.platforms.length > 0 ? state.platforms : destinos;
  const conteudo = useMemo(
    () => ({status, legendaBase, plataformas, formatoVisual, writingMode}),
    [formatoVisual, legendaBase, plataformas, status, writingMode],
  );

  // Conta inativa que já tem publicação continua na lista, para poder ser desmarcada.
  const contasParaMarcar = useMemo<DestinoPlataforma[]>(() => {
    const inativasMarcadas = contas.filter(conta =>
      conta.ativo === false && !destinos.some(destino => destino.id === conta.id) && destinoMarcado(plataformas, conta),
    );
    return [...destinos, ...inativasMarcadas];
  }, [contas, destinos, plataformas]);

  // Abas na ordem das contas; o repost vem logo depois da publicação original.
  const abas = useMemo(() => {
    const ordem = (item: ContentPlataforma) => {
      const indice = contasParaMarcar.findIndex(conta => mesmoDestino(item.platformId, conta));
      return indice === -1 ? contasParaMarcar.length : indice;
    };
    return plataformas
      .map((item, posicao) => ({item, posicao}))
      .filter(({item}) => emDestino(item))
      .sort((a, b) =>
        ordem(a.item) - ordem(b.item)
        || Number(!publicacaoOriginal(a.item)) - Number(!publicacaoOriginal(b.item))
        || a.posicao - b.posicao,
      )
      .map(({item}) => item);
  }, [contasParaMarcar, plataformas]);

  const [ativaId, setAtivaId] = useState<string | null>(null);
  const ativa = abas.find(item => item.id === ativaId) ?? abas[0] ?? null;
  const [confirmarCopia, setConfirmarCopia] = useState(false);
  const [confirmarDesmarcar, setConfirmarDesmarcar] = useState<DestinoPlataforma | null>(null);
  const [copiaFeita, setCopiaFeita] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const contaAtiva = ativa ? contaDaRef(ativa.platformId, contas) : null;
  const redeAtiva = ativa ? redeDaRef(ativa.platformId, contas) : null;
  const chaveDaRede = redeAtiva && redeAtiva !== 'outra' ? redeAtiva : contaAtiva?.nome ?? ativa?.platformId ?? '';
  const rotuloAtiva = contaAtiva ? rotuloConta(contaAtiva) : ativa?.platformId ?? '';
  // As hashtags ficam dentro do texto; as guardadas à parte entram no fim.
  const texto = ativa ? legendaComHashtags(legendaBase, ativa) : '';
  const publicada = ativa ? publicacaoJaPostada(ativa, conteudo) : false;
  const limite = limiteDeCaracteres(chaveDaRede);
  const mostraTitulo = Boolean(ativa) && platformShowsField(redeAtiva ?? '', 'titulo');
  const mostraHashtags = Boolean(ativa) && platformShowsField(chaveDaRede, 'hashtags');
  const destinosDaLegenda = ativa ? destinosDaCopia(abas, ativa.id, conteudo) : [];
  const substituidas = ativa ? legendasQueSeriamSubstituidas(legendaBase, abas, ativa.id, conteudo) : [];
  const sugestao = ativa ? suggestHashtags({platformId: ativa.platformId, serie, pilar, contas}) : [];
  const publicadaEm = dataCurta(ativa?.realizadaApiEm ?? ativa?.realizadaManualEm ?? null);

  // O campo cresce com o texto; trocar de aba recalcula a altura.
  useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [texto, ativa?.id]);

  useEffect(() => {
    if (!copiaFeita) return;
    const timer = window.setTimeout(() => setCopiaFeita(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copiaFeita]);

  useEffect(() => {
    if (!copiado) return;
    const timer = window.setTimeout(() => setCopiado(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copiado]);

  const contaJaPublicada = (conta: DestinoPlataforma) => plataformas.some(item =>
    publicacaoOriginal(item) && mesmoDestino(item.platformId, conta) && publicacaoPublicada(item),
  );

  const alternarConta = (conta: DestinoPlataforma) => {
    if (disabled) return;
    const marcada = destinoMarcado(plataformas, conta);
    if (marcada && contaJaPublicada(conta)) return;
    // Desmarcar apaga a legenda escrita para a conta: pergunta antes.
    if (marcada && legendasQueSeriamApagadas(legendaBase, plataformas, conta).length > 0) {
      setConfirmarDesmarcar(conta);
      return;
    }
    aplicarAlternancia(conta, marcada);
  };

  const aplicarAlternancia = (conta: DestinoPlataforma, marcada: boolean) => {
    const proximas = alternarDestino({publicacoes: plataformas, plataforma: conta, contentId, marcar: !marcada});
    const padraoHashtags = hashtagsPadraoForaSerie({
      seriesId: serie?.id ?? null,
      hashtagsAtuais: '',
      hashtagsForaSeries: editorial.preferencias.hashtagsForaSeries,
    });
    // Conta marcada aqui começa com legenda própria e vazia, sem herdar a legenda-base escondida.
    // Sem série: hashtags padrão dos Ajustes só se o campo ainda estiver vazio.
    onChange(proximas.map(item => (
      plataformas.some(atual => atual.id === item.id)
        ? item
        : {...item, legendaPropria: true, legenda: '', hashtags: padraoHashtags}
    )));
  };

  const rotuloDaAba = (item: ContentPlataforma) => {
    const conta = contaDaRef(item.platformId, contas);
    const rede = redeDaRef(item.platformId, contas);
    const rotulo = conta ? rotuloCurtoConta(conta) : item.platformId;
    const base = item.publicationKind === 'repost' ? `${rotulo} · repost` : rotulo;
    if (rede === 'youtube') {
      const noYt = formatoNoYoutube({ formatoVisual: conteudo?.formatoVisual ?? null, writingMode: conteudo?.writingMode }, item);
      return `${base} · ${noYt.formato === 'short' ? 'Shorts' : 'Vídeo longo'}`;
    }
    return base;
  };

  const usarEmTodas = () => {
    if (!ativa) return;
    onChange(copiarLegendaParaTodas(legendaBase, plataformas, ativa.id, conteudo));
    setCopiaFeita(true);
  };

  const copiar = async () => {
    if (!ativa) return;
    const valor = texto.trim();
    if (!valor) return;
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  const motivoSemCopia = !texto.trim()
    ? 'Escreva a legenda desta conta primeiro.'
    : destinosDaLegenda.length === 0
      ? 'As outras contas já foram publicadas.'
      : undefined;

  return (
    <Surface
      as="section"
      variant="outlined"
      padding="lg"
      className={cn('bg-[var(--bg-elevated)]', embedded && 'h-full')}
    >
      <Text variant="sectionTitle" as="h3">{embedded ? 'Legendas' : 'Preparar distribuição'}</Text>
      <Text variant="secondary" className="mt-1">Cada conta tem sua própria legenda.</Text>

      <div className="mt-4 stack-lg border-t border-[var(--border-color)] pt-4">
        <div className="stack-sm">
          <Text variant="bodyStrong" as="p">Contas para publicação</Text>
          {contasParaMarcar.length === 0 ? (
            <Text variant="secondary">Nenhuma conta ativa. Cadastre em Contas e horários.</Text>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Contas para publicação">
              {contasParaMarcar.map(conta => {
                const marcada = destinoMarcado(plataformas, conta);
                const travada = marcada && contaJaPublicada(conta);
                const complemento = complementoDoRotulo(conta);
                const rede = redeDaConta(conta);
                const pub = marcada ? plataformas.find(p => mesmoDestino(p.platformId, conta) && emDestino(p)) : null;
                const noYt = rede === 'youtube' && pub
                  ? formatoNoYoutube({ formatoVisual: conteudo?.formatoVisual ?? null, writingMode: conteudo?.writingMode }, pub)
                  : null;
                const icone = noYt && noYt.formato === 'short' ? 'youtube-shorts' : iconeDaConta(conta);
                const rotuloFormato = noYt ? (noYt.formato === 'short' ? ' · Shorts' : ' · Vídeo longo') : '';

                return (
                  <button
                    key={conta.id}
                    type="button"
                    role="checkbox"
                    aria-checked={marcada}
                    aria-disabled={travada || undefined}
                    disabled={disabled}
                    title={travada ? 'Já publicada nesta conta. Fica marcada.' : `${rotuloConta(conta)}${rotuloFormato}`}
                    aria-label={`${rotuloConta(conta)}${complemento ? `, ${complemento}` : ''}${rotuloFormato}${travada ? ', já publicada' : ''}`}
                    onClick={() => alternarConta(conta)}
                    className={cn(
                      contaButtonClass,
                      marcada
                        ? 'border-[var(--border-strong)] text-[var(--text-primary)]'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
                      travada && 'cursor-default',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border',
                        marcada
                          ? 'border-[var(--brand-accent-strong)] bg-[var(--brand-accent-strong)] text-[var(--brand-on-accent)]'
                          : 'border-[var(--border-input)]',
                      )}
                    >
                      {marcada ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <PlatformIcon platform={icone} className="h-4 w-4 shrink-0" />
                    <span className="truncate">{rotuloCurtoConta(conta)}{rotuloFormato}</span>
                    {travada ? <Lock className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="stack-sm border-t border-[var(--border-color)] pt-4">
          <Text variant="bodyStrong" as="p">Editar legenda</Text>

          {ativa ? (
            <>
              <SegmentTabs
                ariaLabel="Legenda em edição"
                value={ativa.id}
                onChange={setAtivaId}
                options={abas.map(item => {
                  const conta = contaDaRef(item.platformId, contas);
                  const rede = redeDaRef(item.platformId, contas);
                  const noYt = rede === 'youtube'
                    ? formatoNoYoutube({ formatoVisual: conteudo?.formatoVisual ?? null, writingMode: conteudo?.writingMode }, item)
                    : null;
                  const icone = noYt && noYt.formato === 'short' ? 'youtube-shorts' : (conta ? iconeDaConta(conta) : item.platformId);
                  return {
                    id: item.id,
                    label: rotuloDaAba(item),
                    icon: (
                      <PlatformIcon
                        platform={icone}
                        className="h-4 w-4 shrink-0"
                      />
                    ),
                  };
                })}
              />

              <div
                role="tabpanel"
                id={`legenda-painel-${contentId || 'novo'}`}
                aria-label={`Legenda de ${rotuloAtiva}`}
                className="stack-md pt-2"
              >
                {/* Formato no YouTube quando a conta em edição for do YouTube */}
                {redeAtiva === 'youtube' && ativa ? (() => {
                  const noYoutube = formatoNoYoutube(
                    { formatoVisual: conteudo?.formatoVisual ?? null, writingMode: conteudo?.writingMode },
                    ativa,
                  );
                  return (
                    <div className="flex flex-wrap items-center gap-2.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--surface-subtle)] px-3 py-2">
                      <Text variant="label" as="span" className="text-[var(--text-secondary)]">Formato no YouTube:</Text>
                      <ChoiceChips<FormatoEscolhidoNaPublicacao>
                        label="Formato no YouTube"
                        value={noYoutube.formato}
                        onChange={formato => {
                          onChange(plataformas.map(p =>
                            p.id === ativa.id
                              ? { ...p, formatoPublicacao: noYoutube.origem === 'escolhido' ? formato : (formato ?? noYoutube.formato) }
                              : p
                          ));
                        }}
                        options={[
                          { value: 'short', label: 'Shorts' },
                          { value: 'video-longo', label: 'Vídeo longo' },
                        ]}
                      />
                      <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                        {noYoutube.origem === 'escolhido'
                          ? 'Escolhido nesta publicação (toque de novo para voltar ao automático)'
                          : (noYoutube.origem === 'conteudo'
                            ? 'pelo formato do conteúdo'
                            : 'deduzido: roteiro no modo YouTube é vídeo longo; o resto, Shorts')}
                      </Text>
                    </div>
                  );
                })() : null}
                {mostraTitulo ? (
                  <label className="block">
                    <Text variant="secondary" as="span" className="mb-1.5 block text-[var(--text-secondary)]">
                      {`Título no ${rotuloAtiva}`}
                    </Text>
                    <input
                      value={titulo}
                      disabled={disabled}
                      onChange={event => onTituloChange?.(event.target.value)}
                      className="h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 t-body text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
                    />
                  </label>
                ) : null}

                <div className="stack-xs">
                  <textarea
                    ref={textareaRef}
                    value={texto}
                    disabled={disabled}
                    readOnly={publicada}
                    rows={4}
                    aria-label={`Legenda de ${rotuloAtiva}`}
                    placeholder={`Legenda para ${rotuloAtiva}…`}
                    onChange={event => onChange(editarLegendaDaConta(plataformas, ativa.id, event.target.value, conteudo))}
                    className={cn(
                      'block min-h-28 w-full resize-none overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2.5 t-body leading-6 outline-none placeholder:text-[var(--text-tertiary)] focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60',
                      publicada ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]',
                    )}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {publicada ? (
                      <Text variant="meta" className="inline-flex items-center gap-1.5">
                        <Lock className="h-3 w-3" aria-hidden />
                        {publicadaEm ? `Publicada em ${publicadaEm}. O texto fica preservado.` : 'Publicada. O texto fica preservado.'}
                      </Text>
                    ) : <span />}
                    {publicada ? null : <TextCount value={texto} limit={limite} />}
                  </div>
                </div>

                {mostraHashtags ? (
                  <HashtagsField
                    semLista
                    rotulo={rotuloAtiva}
                    hashtags={hashtagsNaLegenda(texto).join(' ')}
                    sugestao={sugestao}
                    limite={limiteHashtagsDaRede(editorial, ativa.platformId, chaveDaRede)}
                    disabled={disabled || publicada}
                    onChange={hashtags => onChange(editarLegendaDaConta(
                      plataformas,
                      ativa.id,
                      adicionarHashtagsAoFim(texto, hashtags.split(/\s+/)),
                      conteudo,
                    ))}
                  />
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <AppButton
                    size="sm"
                    variant="secondary"
                    disabled={!texto.trim()}
                    disabledReason="Escreva a legenda desta conta primeiro."
                    aria-label={`Copiar legenda de ${rotuloAtiva}`}
                    leftIcon={copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    onClick={() => void copiar()}
                  >
                    {copiado ? 'Legenda copiada' : 'Copiar legenda'}
                  </AppButton>
                  {abas.length > 1 ? (
                    <AppButton
                      size="sm"
                      variant="secondary"
                      disabled={disabled || Boolean(motivoSemCopia)}
                      disabledReason={disabled ? undefined : motivoSemCopia}
                      leftIcon={copiaFeita ? <Check className="h-4 w-4" /> : <CopyPlus className="h-4 w-4" />}
                      onClick={() => (substituidas.length > 0 ? setConfirmarCopia(true) : usarEmTodas())}
                    >
                      {copiaFeita ? 'Legenda aplicada' : 'Usar esta legenda em todas'}
                    </AppButton>
                  ) : null}
                </div>
              </div>
            </>
          ) : contasParaMarcar.length > 0 ? (
            <Text variant="secondary">Marque uma conta para escrever a legenda.</Text>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        open={confirmarCopia}
        message={`${juntarNomes(substituidas.map(item => {
          const conta = contaDaRef(item.platformId, contas);
          return conta ? rotuloConta(conta) : item.platformId;
        }))} já ${substituidas.length === 1 ? 'tem' : 'têm'} legenda. Substituir pelo texto de ${rotuloAtiva}?`}
        confirmLabel="Substituir"
        cancelLabel="Manter"
        onConfirm={() => {
          setConfirmarCopia(false);
          usarEmTodas();
        }}
        onCancel={() => setConfirmarCopia(false)}
      />

      <ConfirmModal
        open={confirmarDesmarcar !== null}
        message={confirmarDesmarcar
          ? `Desmarcar ${rotuloConta(confirmarDesmarcar)}? A legenda escrita para essa conta será apagada.`
          : ''}
        confirmLabel="Desmarcar e apagar"
        cancelLabel="Manter conta"
        onConfirm={() => {
          const conta = confirmarDesmarcar;
          setConfirmarDesmarcar(null);
          if (conta) aplicarAlternancia(conta, true);
        }}
        onCancel={() => setConfirmarDesmarcar(null)}
      />
    </Surface>
  );
}
