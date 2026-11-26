import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { AlertCircle, Check, Clock, MoreVertical } from 'lucide-react';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { RedeIcon } from '../../../components/ui/PlatformIcons';
import type { RedeSocial } from '../../../lib/database';
import { redeDoFiltro } from '../../creation/lib/creationRedeFilter';
import type { RedeDoFiltro } from '../../contas/lib/contas';
import type { FormatoPublicacao } from '../../editorial/lib/publicacoes';
import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';
import type { Content, Pilar, Serie } from '../../../lib/database';
import type { PublicacaoNoDia } from '../lib/publicacoesDoMes';
import { postItKind } from '../lib/postIt';
import { cn } from '../../../lib/utils';
import { EtapaIcon, type EtapaDoCard } from './EtapaBadge';
import type { ContaDoCard } from '../lib/filtroCalendario';

export interface PlanejamentoContentCardProps {
  publicacao: PublicacaoNoDia;
  content?: Content | null;
  serie?: Serie | null;
  pilar?: Pilar | null;
  /** Contas do mesmo conteúdo, ciclo e dia: um ícone por conta, com a situação de cada uma. */
  contas?: readonly ContaDoCard[];
  /** Clique simples (pré-visualização) ou Enter/Espaço. */
  onOpen: () => void;
  /** Duplo clique e "Abrir roteiro" do menu: vai direto à página. Sem ele, o clique abre na hora. */
  onOpenDireto?: () => void;
  /** Manda para um bloco de gravação. Só aparece quando o conteúdo pode ser gravado. */
  onGravacao?: () => void;
  onMove?: () => void;
  onRemoveFromDate?: () => void;
  onDelete?: () => void;
  /** "Salvar no calendário…" do item (o mesmo da seleção múltipla do computador). */
  onSalvarNoCalendario?: () => void;
  /** "Tirar do calendário": só quando o roteiro já tem data de publicação. */
  onTirarDoCalendario?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  /** Ctrl/Cmd + clique entra e sai da seleção (desktop). */
  selected?: boolean;
  onToggleSelect?: () => void;
  /** "3 de 12" quando o conteúdo pertence a uma temporada. */
  episodio?: string | null;
  /** Aviso de roteiro que já foi ao ar, por exemplo "Publicado em 06/11 18:30". */
  aviso?: string | null;
  /** O dia do card cai numa pausa desta série (ou da família dela). */
  pausada?: boolean;
  className?: string;
}

/** Janela em que um segundo clique vira duplo clique. Só vale quando há destino direto. */
const ESPERA_DUPLO_CLIQUE_MS = 220;

/** Shorts e o nome da rede já estão no ícone do filtro. O resto do formato continua escrito. */
function formatoEscritoNoCard(formato: string | null | undefined): string | null {
  const texto = formato?.trim();
  if (!texto) return null;
  const normal = texto.toLowerCase();
  if (normal === 'short' || normal === 'shorts' || normal === 'youtube short' || normal === 'youtube shorts') return null;
  return texto;
}

const ETAPA_ROTULO: Record<EtapaDoCard, string> = {
  ideia: 'Ideia',
  roteiro: 'Roteiro',
  producao: 'Produção',
  edicao: 'Edição',
  postado: 'Publicado',
};

/** Compacta "Publicado em 06/11 18:30" para "06/11 · 18:30" e evita repetir o horário no rodapé. */
function resumoPublicadoNoRodape(aviso: string | null, time: string | null): string | null {
  const avisoLimpo = aviso?.trim();
  const hora = time?.trim() || null;
  if (!avisoLimpo) return hora;
  const semPrefixo = avisoLimpo.replace(/^publicado\s+em\s+/i, '').trim();
  const matchDataHora = semPrefixo.match(/^(\d{2}\/\d{2})\s+(\d{2}:\d{2})$/);
  if (matchDataHora) return `${matchDataHora[1]} · ${matchDataHora[2]}`;
  if (hora && !semPrefixo.includes(hora)) return `${semPrefixo} · ${hora}`;
  return semPrefixo;
}

/** Mesmo ícone do filtro de plataformas: Shorts não usa o ícone do vídeo longo. */
function redeDoIcone(rede: string | null, formato: string): RedeDoFiltro | null {
  if (!rede) return null;
  return redeDoFiltro(rede as RedeSocial, formato as FormatoPublicacao);
}

/** Publicado em TikTok, Instagram ou Shorts: o ícone já diz a rede. Nome e @ ficam na dica. */
function soIconeECheck(rede: RedeDoFiltro | null): boolean {
  return rede === 'tiktok'
    || rede === 'tiktok-video'
    || rede === 'instagram'
    || rede === 'instagram-video'
    || rede === 'instagram-carrossel'
    || rede === 'youtube-shorts';
}

export function PlanejamentoContentCard({
  publicacao,
  content,
  serie,
  pilar,
  contas,
  onOpen,
  onOpenDireto,
  onGravacao,
  onMove,
  onRemoveFromDate,
  onDelete,
  onSalvarNoCalendario,
  onTirarDoCalendario,
  draggable = false,
  onDragStart,
  selected = false,
  onToggleSelect,
  episodio = null,
  aviso = null,
  pausada = false,
  className,
}: PlanejamentoContentCardProps) {
  const posted = publicacao.estado === 'postado';
  const kind = content ? postItKind(null, content) : 'vazio';
  const etapa: EtapaDoCard = posted ? 'postado' : kind === 'vazio' ? 'roteiro' : kind;
  const totalContas = contas?.length ?? 0;
  const contasRealizadas = contas ? contas.filter(conta => conta.situacao === 'realizada').length : 0;
  const contasVencidas = contas ? contas.filter(conta => conta.situacao === 'vencida').length : 0;
  const publicadoParcial = posted && totalContas > 1 && contasRealizadas > 0 && contasRealizadas < totalContas;
  const atrasado = !posted && contasVencidas > 0;
  const programado = !posted && !atrasado && (publicacao.estado === 'programado' || Boolean(contas?.some(conta => conta.programado)));
  const urlPublicacao = posted
    ? content?.plataformas
        ?.map(plataforma => plataforma.postUrl?.trim())
        .find((url): url is string => Boolean(url && /^https?:\/\//i.test(url))) ?? null
    : null;
  const cor = pilar?.cor?.trim() || null;
  const nomePilar = pilar?.nome?.trim() || null;
  const nomeSerie = serie?.name?.trim() || null;
  const onTirar = onRemoveFromDate ?? onDelete;
  const [dragging, setDragging] = useState(false);
  const cliqueAgendado = useRef<number | null>(null);
  useEffect(() => () => {
    if (cliqueAgendado.current !== null) window.clearTimeout(cliqueAgendado.current);
  }, []);

  const aoClicar = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && onToggleSelect) {
      event.preventDefault();
      onToggleSelect();
      return;
    }
    if (!onOpenDireto) {
      onOpen();
      return;
    }
    // O primeiro clique espera um pouco: se vier o segundo, é duplo clique e vai direto ao roteiro.
    if (event.detail >= 2) {
      if (cliqueAgendado.current !== null) {
        window.clearTimeout(cliqueAgendado.current);
        cliqueAgendado.current = null;
      }
      onOpenDireto();
      return;
    }
    if (cliqueAgendado.current !== null) window.clearTimeout(cliqueAgendado.current);
    cliqueAgendado.current = window.setTimeout(() => {
      cliqueAgendado.current = null;
      onOpen();
    }, ESPERA_DUPLO_CLIQUE_MS);
  };

  const menuItems: MoreMenuItem[] = [
    {
      id: 'open',
      label: 'Abrir roteiro',
      onClick: onOpenDireto ?? onOpen,
    },
    ...(urlPublicacao
      ? [
          {
            id: 'open-post-url',
            label: 'Abrir publicação',
            onClick: () => {
              window.open(urlPublicacao, '_blank', 'noopener,noreferrer');
            },
          },
        ]
      : []),
    ...(onGravacao
      ? [
          {
            id: 'gravacao',
            label: 'Mandar para gravação…',
            onClick: onGravacao,
          },
        ]
      : []),
    ...(onMove
      ? [
          {
            id: 'move',
            label: 'Mover para outro dia…',
            onClick: onMove,
          },
        ]
      : []),
    ...(onSalvarNoCalendario
      ? [{ id: 'salvar-calendario', label: 'Salvar no calendário…', onClick: onSalvarNoCalendario }]
      : []),
    ...(onTirarDoCalendario
      ? [{ id: 'tirar-calendario', label: 'Tirar do calendário', onClick: onTirarDoCalendario }]
      : []),
    ...(onTirar
      ? [
          {
            id: 'remove-date',
            label: 'Tirar do planejamento',
            onClick: onTirar,
            tone: 'danger' as const,
          },
        ]
      : []),
  ];

  // O formato da conta já sai no ícone (Shorts, carrossel). O texto fica para o que o ícone não diz.
  const formato = content?.formatoVisual || (publicacao as {formato?: string}).formato || null;
  const formatoEscrito = formatoEscritoNoCard(formato);
  const rotuloEtapa = ETAPA_ROTULO[etapa];
  const rotuloPilarOuSerie = posted
    ? [nomePilar, nomeSerie].filter(Boolean).join(' · ')
    : nomeSerie || nomePilar || null;
  const temSeloContexto = Boolean(episodio || pausada || atrasado || programado || posted);
  const ariaLabel = [
    `Roteiro: ${publicacao.titulo}`,
    nomePilar ? `Pilar: ${nomePilar}` : null,
    `Etapa: ${
      publicadoParcial
        ? `${contasRealizadas} de ${totalContas} publicado`
        : atrasado
          ? 'Atrasado'
          : programado
            ? 'Programado'
            : rotuloEtapa
    }`,
    publicacao.time ? `Horário: ${publicacao.time}` : null,
  ].filter(Boolean).join(', ');
  const resumoRodapePublicado = posted ? resumoPublicadoNoRodape(aviso, publicacao.time) : null;

  const canaisEl = contas && contas.length > 0 ? contas.map(conta => {
    const icone = redeDoIcone(conta.rede, conta.formato);
    const comNome = posted && !soIconeECheck(icone);
    return (
      <span
        key={conta.platformId}
        title={`${conta.nome} · ${conta.rotuloFormato} · ${conta.rotuloSituacao}${conta.programado ? ' · programado' : ''}`}
        aria-label={`${conta.nome}: ${conta.rotuloFormato}, ${conta.rotuloSituacao}`}
        className={cn(
          comNome ? 'inline-flex min-w-0 items-center gap-1' : 'inline-flex items-center gap-0.5',
          conta.situacao !== 'realizada' && 'opacity-75',
        )}
      >
        {icone ? (
          <RedeIcon rede={icone} className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <PlatformIcon platform={conta.nome} className="h-3.5 w-3.5 shrink-0" />
        )}
        {comNome ? (
          <Text variant="meta" as="span" className="min-w-0 truncate">
            {conta.nome}
          </Text>
        ) : null}
        {/* A situação aparece sem passar o mouse (no celular não há hover): ✓ publicada, ! data passou. */}
        {conta.situacao === 'realizada' ? <Check className="h-3 w-3 shrink-0 text-[var(--accent-green)]" aria-hidden /> : null}
        {conta.situacao === 'vencida' ? <AlertCircle className="h-3 w-3 shrink-0 text-[var(--accent-orange)]" aria-hidden /> : null}
      </span>
    );
  }) : publicacao.platformNames.map(nome => {
    const comNome = posted && !soIconeECheck(nome as RedeDoFiltro);
    return (
      <span key={nome} title={nome} className={comNome ? 'inline-flex min-w-0 items-center gap-1' : 'inline-flex items-center gap-0.5'}>
        <PlatformIcon platform={nome} className="h-3.5 w-3.5 shrink-0" />
        {comNome ? (
          <Text variant="meta" as="span" className="min-w-0 truncate">
            {nome}
          </Text>
        ) : null}
      </span>
    );
  });

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={onToggleSelect ? selected : undefined}
      draggable={draggable && !aviso}
      onDragStart={event => {
        // Ctrl/Cmd + arrastar não existe: o gesto é de seleção.
        if ((event.ctrlKey || event.metaKey) && onToggleSelect) {
          event.preventDefault();
          return;
        }
        setDragging(true);
        onDragStart?.(event);
      }}
      onDragEnd={() => setDragging(false)}
      onClick={aoClicar}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      data-estado={publicacao.estado}
      style={cor ? ({ '--card-accent': cor } as CSSProperties) : undefined}
      className={cn(
        'planner-card group relative flex flex-col justify-between p-2.5 text-left cursor-pointer select-none',
        posted
          ? 'planner-card--publicado'
          : atrasado
            ? 'planner-card--atrasado'
            : cor && 'planner-card--pilar',
        draggable && !aviso && 'cursor-grab active:cursor-grabbing',
        selected && 'planner-card--selected',
        dragging && 'planner-card--dragging',
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        {/* Título (até 2 linhas) + menu ⋮ acessível no topo direito */}
        <div className="flex items-start justify-between gap-1">
          <Text
            variant="bodyStrong"
            as="p"
            className={cn(
              'planner-card-title line-clamp-2 min-w-0 flex-1 leading-snug',
              posted ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]',
            )}
          >
            {publicacao.titulo}
          </Text>
          <div
            className="-mr-1 -mt-1 shrink-0"
            onClick={e => e.stopPropagation()}
            onDragStart={e => e.stopPropagation()}
          >
            <MoreMenu
              items={menuItems}
              size="sm"
              label="Opções do conteúdo"
              trigger={<MoreVertical className="h-3.5 w-3.5 text-current" />}
              triggerClassName={cn(
                'h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
                posted && 'opacity-50 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-80',
              )}
            />
          </div>
        </div>

        {/* Bolinha temática + pilar/série */}
        {rotuloPilarOuSerie ? (
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn('h-2 w-2 rounded-full shrink-0', posted && cor && 'opacity-75')}
              style={{ backgroundColor: cor || 'var(--text-tertiary)' }}
              aria-hidden
            />
            <Text
              variant="meta"
              as="span"
              title={rotuloPilarOuSerie}
              className="min-w-0 flex-1 truncate text-[var(--text-secondary)]"
            >
              {rotuloPilarOuSerie}
            </Text>
          </div>
        ) : null}

        {/* Selos de contexto/estado (Wave, Pausa, Atraso, Programado, Publicado) */}
        {temSeloContexto ? (
          <div className="flex flex-wrap items-center gap-1">
            {episodio ? (
              <Badge variant="tag" className="px-1.5 py-0 tabular-nums">
                Wave {episodio}
              </Badge>
            ) : null}
            {pausada ? (
              <Badge variant="neutral" className="px-1.5 py-0">
                Pausa
              </Badge>
            ) : null}
            {atrasado ? (
              <Badge variant="warning" className="inline-flex items-center gap-1 px-1.5 py-0">
                <AlertCircle className="h-2.5 w-2.5 shrink-0" aria-hidden />
                Atraso
              </Badge>
            ) : null}
            {programado ? (
              <Badge variant="success" className="inline-flex items-center gap-1 px-1.5 py-0">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" aria-hidden />
                Programado
              </Badge>
            ) : null}
            {posted ? (
              publicadoParcial && contasVencidas > 0 ? (
                <Badge variant="warning" className="inline-flex items-center gap-1 px-1.5 py-0 tabular-nums">
                  <AlertCircle className="h-2.5 w-2.5 shrink-0" aria-hidden />
                  {contasRealizadas}/{totalContas} publicado
                </Badge>
              ) : publicadoParcial ? (
                <Badge variant="neutral" className="inline-flex items-center gap-1 px-1.5 py-0 tabular-nums">
                  <Check className="h-2.5 w-2.5 shrink-0 text-[var(--success)]" aria-hidden />
                  {contasRealizadas}/{totalContas} publicado
                </Badge>
              ) : (
                <Badge
                  variant="neutral"
                  className="inline-flex items-center gap-1 bg-[color-mix(in_srgb,var(--bg-elevated)_65%,transparent)] px-1.5 py-0 text-[var(--text-secondary)]"
                >
                  <Check className="h-2.5 w-2.5 shrink-0 text-[var(--success)]" aria-hidden />
                  Publicado
                </Badge>
              )
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Rodapé organizado com separador: etapa/horário à esquerda, canais e formato à direita */}
      <div className="planner-card-footer mt-2 flex flex-col gap-1 pt-1.5 text-[var(--text-secondary)]">
        {posted ? (
          <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {canaisEl}
              {formatoEscrito ? (
                <Text variant="meta" as="span" className="lowercase text-[var(--text-secondary)]">
                  {formatoEscrito}
                </Text>
              ) : null}
            </div>
            {resumoRodapePublicado ? (
              <Text
                variant="meta"
                as="span"
                title={aviso ?? undefined}
                className="shrink-0 tabular-nums text-[var(--text-tertiary)]"
              >
                {resumoRodapePublicado}
              </Text>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1">
              <span className="inline-flex min-w-0 items-center gap-1">
                {publicacao.time ? (
                  <>
                    <Clock className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                    <Text variant="meta" as="span" className="tabular-nums text-[var(--text-primary)]">
                      {publicacao.time}
                    </Text>
                  </>
                ) : (
                  <>
                    <EtapaIcon etapa={etapa} cor={cor} />
                    <Text variant="meta" as="span" className="truncate text-[var(--text-secondary)]">
                      {rotuloEtapa}
                    </Text>
                  </>
                )}
              </span>
              <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
                {canaisEl}
                {formatoEscrito ? (
                  <Text variant="meta" as="span" className="lowercase text-[var(--text-secondary)]">
                    {formatoEscrito}
                  </Text>
                ) : null}
              </div>
            </div>
            {aviso ? (
              <Text variant="meta" as="span" title={aviso} className="truncate text-[var(--text-secondary)]">
                {aviso}
              </Text>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
