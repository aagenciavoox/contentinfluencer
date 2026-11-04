import type { CSSProperties } from 'react';
import { AlertCircle, Check, Clock, MoreVertical } from 'lucide-react';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
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
  onOpen: () => void;
  onMove?: () => void;
  onRemoveFromDate?: () => void;
  onDelete?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  className?: string;
}

export function PlanejamentoContentCard({
  publicacao,
  content,
  serie,
  pilar,
  contas,
  onOpen,
  onMove,
  onRemoveFromDate,
  onDelete,
  draggable = false,
  onDragStart,
  className,
}: PlanejamentoContentCardProps) {
  const posted = publicacao.estado === 'postado';
  const kind = content ? postItKind(null, content) : 'vazio';
  const etapa: EtapaDoCard = posted ? 'postado' : kind === 'vazio' ? 'roteiro' : kind;
  const cor = serie?.cor || pilar?.cor || null;
  const onTirar = onRemoveFromDate ?? onDelete;

  const menuItems: MoreMenuItem[] = [
    {
      id: 'open',
      label: 'Abrir roteiro',
      onClick: onOpen,
    },
    ...(onMove
      ? [
          {
            id: 'move',
            label: 'Mover para outro dia…',
            onClick: onMove,
          },
        ]
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
  // Só mostra o formato quando ele foi preenchido; sem padrão inventado por rede.
  const formato = content?.formatoVisual || (publicacao as any).formato || null;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      style={cor ? ({ '--card-accent': cor } as CSSProperties) : undefined}
      className={cn(
        'planner-card group relative flex flex-col p-2.5 text-left cursor-pointer',
        draggable && 'cursor-grab active:cursor-grabbing',
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
        <div className="line-clamp-2 pr-5 text-xs font-semibold leading-snug text-[var(--text-primary)]">
          {publicacao.titulo}
        </div>
      </div>

      {serie ? (
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: serie.cor || 'var(--text-tertiary)' }}
            aria-hidden
          />
          <Text variant="meta" as="span" className="text-[var(--text-secondary)] truncate max-w-[150px]">
            {serie.name}
          </Text>
        </div>
      ) : pilar ? (
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: pilar.cor || 'var(--text-tertiary)' }}
            aria-hidden
          />
          <Text variant="meta" as="span" className="text-[var(--text-secondary)] truncate max-w-[150px]">
            {pilar.nome}
          </Text>
        </div>
      ) : null}

      {/* Redes (ícones) · formato · horário */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[var(--text-secondary)]">
        <EtapaIcon etapa={etapa} cor={cor} />
        {contas && contas.length > 0 ? contas.map(conta => (
          <span
            key={conta.platformId}
            title={`${conta.nome} · ${conta.rotuloFormato} · ${conta.rotuloSituacao}${conta.programado ? ' · programado' : ''}`}
            aria-label={`${conta.nome}: ${conta.rotuloFormato}, ${conta.rotuloSituacao}`}
            className={cn('inline-flex items-center gap-0.5', conta.situacao !== 'realizada' && 'opacity-70')}
          >
            <PlatformIcon platform={conta.rede ?? conta.nome} className="h-3.5 w-3.5 shrink-0" />
            {/* A situação aparece sem passar o mouse (no celular não há hover): ✓ publicada, ! data passou. */}
            {conta.situacao === 'realizada' ? <Check className="h-3 w-3 shrink-0 text-[var(--accent-green)]" aria-hidden /> : null}
            {conta.situacao === 'vencida' ? <AlertCircle className="h-3 w-3 shrink-0 text-[var(--accent-orange)]" aria-hidden /> : null}
            {conta.rede === 'youtube' ? (
              <Text variant="meta" as="span">{conta.rotuloFormato}</Text>
            ) : null}
          </span>
        )) : publicacao.platformNames.map(nome => (
          <span key={nome} title={nome} className="inline-flex">
            <PlatformIcon platform={nome} className="h-3.5 w-3.5 shrink-0" />
          </span>
        ))}
        {publicacao.platformNames.length > 0 && formato ? (
          <span className="text-[var(--text-tertiary)]">·</span>
        ) : null}
        {formato ? (
          <Text variant="meta" as="span" className="lowercase">
            {formato}
          </Text>
        ) : null}
        {publicacao.estado === 'programado' || contas?.some(conta => conta.programado) ? (
          <Text variant="meta" as="span" className="rounded-[var(--radius-pill)] border border-[var(--border-subtle)] px-1.5 text-[var(--text-secondary)]">
            Programado
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
