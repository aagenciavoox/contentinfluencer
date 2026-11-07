import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
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
import { cn, hexContrastRatio } from '../../../lib/utils';
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

function misturarComBranco(hex: string, parte: number): string {
  const full = hex.replace('#', '');
  const canais = [0, 2, 4].map(offset => {
    const valor = parseInt(full.slice(offset, offset + 2), 16);
    return Math.round(valor * parte + 255 * (1 - parte));
  });
  return `#${canais.map(canal => canal.toString(16).padStart(2, '0')).join('')}`;
}

/** Luminância relativa a partir do contraste com o branco. */
function luminancia(hex: string): number | null {
  const contraBranco = hexContrastRatio('#ffffff', hex);
  if (contraBranco === null) return null;
  return 1.05 / contraBranco - 0.05;
}

/**
 * Fundo claro na cor do pilar. O tom mais colorido que ainda fica claro:
 * o amarelo vira manteiga, e ciano, verde e lima não entram inteiros.
 */
function fundoDaCorDoPilar(cor: string): { fundo: string; textoEscuro: boolean } {
  const hex = cor.trim();
  const leve = `color-mix(in srgb, ${hex} 22%, var(--bg-elevated))`;
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return { fundo: leve, textoEscuro: false };

  for (let passo = 70; passo >= 10; passo -= 1) {
    const fundo = misturarComBranco(hex, passo / 100);
    const luz = luminancia(fundo);
    if (luz !== null && luz >= 0.78 && (hexContrastRatio('#5F5F5A', fundo) ?? 0) >= 4.5) {
      return { fundo, textoEscuro: true };
    }
  }
  return { fundo: misturarComBranco(hex, 0.12), textoEscuro: true };
}

/** Mesmo ícone do filtro de plataformas: Shorts não usa o ícone do vídeo longo. */
function redeDoIcone(rede: string | null, formato: string): RedeDoFiltro | null {
  if (!rede) return null;
  return redeDoFiltro(rede as RedeSocial, formato as FormatoPublicacao);
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
  className,
}: PlanejamentoContentCardProps) {
  const posted = publicacao.estado === 'postado';
  const kind = content ? postItKind(null, content) : 'vazio';
  const etapa: EtapaDoCard = posted ? 'postado' : kind === 'vazio' ? 'roteiro' : kind;
  const cor = pilar?.cor?.trim() || null;
  const nomePilar = pilar?.nome?.trim() || null;
  const nomeSerie = serie?.name?.trim() || null;
  // Publicado fica cinza: a cor do pilar não pode fazer o card parecer pauta ainda em aberto.
  const papel = !posted && cor ? fundoDaCorDoPilar(cor) : null;
  const onTirar = onRemoveFromDate ?? onDelete;
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

  const redePrincipal = publicacao.platformNames?.[0] ?? 'Rede';
  // O formato da conta já sai no ícone (Shorts, carrossel). O texto fica para o que o ícone não diz.
  const formato = content?.formatoVisual || (publicacao as {formato?: string}).formato || null;
  const formatoEscrito = formatoEscritoNoCard(formato);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={onToggleSelect ? selected : undefined}
      draggable={draggable && !aviso}
      onDragStart={event => {
        // Ctrl/Cmd + arrastar não existe: o gesto é de seleção.
        if ((event.ctrlKey || event.metaKey) && onToggleSelect) {
          event.preventDefault();
          return;
        }
        onDragStart?.(event);
      }}
      onClick={aoClicar}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      data-estado={publicacao.estado}
      style={posted
        ? (cor ? ({'--card-accent': cor} as CSSProperties) : undefined)
        : cor && papel ? ({
          '--card-accent': cor,
          background: papel.fundo,
          ...(papel.textoEscuro ? {
            '--text-primary': '#111111',
            '--text-secondary': '#3F3F3A',
            '--text-tertiary': '#4A4A45',
          } : {}),
        } as CSSProperties) : undefined}
      className={cn(
        'planner-card group relative flex flex-col p-2.5 text-left cursor-pointer',
        posted ? 'planner-card--publicado' : cor && 'planner-card--pilar',
        draggable && 'cursor-grab active:cursor-grabbing',
        selected && 'ring-2 ring-[var(--text-primary)]',
        className,
      )}
    >
      {/* Etapa + menu ⋮ */}
      <div className="absolute right-1 top-1 z-20 flex items-center justify-end gap-1 rounded-[var(--radius-pill)] opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:static [@media(hover:none)]:opacity-100">
        

        <div className="-mr-1 shrink-0" onClick={e => e.stopPropagation()} onDragStart={e => e.stopPropagation()}>
          <MoreMenu
            items={menuItems}
            size="sm"
            label="Opções do conteúdo"
            trigger={<MoreVertical className="h-3.5 w-3.5 text-current opacity-70" />}
            triggerClassName="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          />
        </div>
      </div>

      <div className="leading-snug">
        <Text variant="bodyStrong" as="p" className="planner-card-title line-clamp-2 pr-6 leading-snug text-[var(--text-primary)]">
          {publicacao.titulo}
        </Text>
      </div>

      {nomeSerie || nomePilar || episodio ? (
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1">
          {nomeSerie || nomePilar ? (
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: cor || 'var(--text-tertiary)' }}
              aria-hidden
            />
          ) : null}
          {posted ? (
            <Text variant="meta" as="span" className="min-w-0 flex-1 break-words text-[var(--text-secondary)]">
              {[nomePilar, nomeSerie].filter(Boolean).join(' · ')}
            </Text>
          ) : nomeSerie ? (
            <Text variant="meta" as="span" className="min-w-0 truncate text-[var(--text-secondary)]">
              {nomeSerie}
            </Text>
          ) : nomePilar ? (
            <Text variant="meta" as="span" className="min-w-0 truncate text-[var(--text-secondary)]">
              {nomePilar}
            </Text>
          ) : null}
          {episodio ? (
            <>
              <Badge variant="tag" className="px-1.5 py-0">
                Wave
              </Badge>
              <Text variant="meta" as="span" className="shrink-0 tabular-nums text-[var(--text-secondary)]">
                {episodio}
              </Text>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Redes (ícones) · formato · horário */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[var(--text-secondary)]">
        <EtapaIcon etapa={etapa} cor={posted ? null : cor} />
        {contas && contas.length > 0 ? contas.map(conta => {
          const icone = redeDoIcone(conta.rede, conta.formato);
          return (
          <span
            key={conta.platformId}
            title={`${conta.nome} · ${conta.rotuloFormato} · ${conta.rotuloSituacao}${conta.programado ? ' · programado' : ''}`}
            aria-label={`${conta.nome}: ${conta.rotuloFormato}, ${conta.rotuloSituacao}`}
            className={cn(
              posted ? 'flex w-full min-w-0 items-center gap-1' : 'inline-flex items-center gap-0.5',
              conta.situacao !== 'realizada' && 'opacity-70',
            )}
          >
            {icone ? (
              <RedeIcon rede={icone} className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <PlatformIcon platform={conta.nome} className="h-3.5 w-3.5 shrink-0" />
            )}
            {posted ? (
              <Text variant="meta" as="span" className="min-w-0 flex-1 break-words">
                {conta.nome}
              </Text>
            ) : null}
            {/* A situação aparece sem passar o mouse (no celular não há hover): ✓ publicada, ! data passou. */}
            {conta.situacao === 'realizada' ? <Check className="h-3 w-3 shrink-0 text-[var(--accent-green)]" aria-hidden /> : null}
            {conta.situacao === 'vencida' ? <AlertCircle className="h-3 w-3 shrink-0 text-[var(--accent-orange)]" aria-hidden /> : null}
          </span>
          );
        }) : publicacao.platformNames.map(nome => (
          <span key={nome} title={nome} className={posted ? 'flex w-full min-w-0 items-center gap-1' : 'inline-flex items-center gap-0.5'}>
            <PlatformIcon platform={nome} className="h-3.5 w-3.5 shrink-0" />
            {posted ? (
              <Text variant="meta" as="span" className="min-w-0 flex-1 break-words">
                {nome}
              </Text>
            ) : null}
          </span>
        ))}
        {(contas?.length || publicacao.platformNames.length > 0) && formatoEscrito ? (
          <span className="text-[var(--text-tertiary)]">·</span>
        ) : null}
        {formatoEscrito ? (
          <Text variant="meta" as="span" className="lowercase">
            {formatoEscrito}
          </Text>
        ) : null}
        {publicacao.estado === 'programado' || contas?.some(conta => conta.programado) ? (
          <Text variant="meta" as="span" className="rounded-[var(--radius-pill)] border border-[var(--border-subtle)] px-1.5 text-[var(--text-secondary)]">
            Programado
          </Text>
        ) : null}
        {aviso ? (
          <Text variant="meta" as="span" className="basis-full text-[var(--text-secondary)]">
            {aviso}
          </Text>
        ) : null}
        {publicacao.time ? (
          <>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5 text-[var(--text-tertiary)]" aria-hidden />
              <Text variant="meta" as="span" className="tabular-nums">
                {publicacao.time}
              </Text>
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
