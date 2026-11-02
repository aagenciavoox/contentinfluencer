import { ArrowRight, Clock, MoreVertical } from 'lucide-react';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Text } from '../../../components/ui/Text';
import type { Content, Serie } from '../../../lib/database';
import type { PublicacaoNoDia } from '../lib/publicacoesDoMes';
import { cn } from '../../../lib/utils';

export interface PlanejamentoContentCardProps {
  publicacao: PublicacaoNoDia;
  content?: Content | null;
  serie?: Serie | null;
  onOpen: () => void;
  onDelete?: () => void;
  className?: string;
}

export function PlanejamentoContentCard({
  publicacao,
  content,
  serie,
  onOpen,
  onDelete,
  className,
}: PlanejamentoContentCardProps) {
  const posted = publicacao.estado === 'postado';
  const scheduled = !posted && Boolean(publicacao.time || publicacao.estado === 'programado');
  const stage = (content?.status || (publicacao as any).etapa || (scheduled ? 'producao' : 'roteiro')).toLowerCase();
  const cor = serie?.cor || null;

  const menuItems: MoreMenuItem[] = [
    {
      id: 'open',
      label: 'Abrir roteiro',
      onClick: onOpen,
    },
    ...(onDelete
      ? [
          {
            id: 'delete',
            label: 'Remover da data',
            onClick: onDelete,
            tone: 'danger' as const,
          },
        ]
      : []),
  ];

  // Badge da etapa no topo
  const renderStageBadge = () => {
    if (posted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] border border-[#86efac] bg-[#f0fdf4] text-[#16a34a] dark:bg-[#14532d]/20 dark:border-[#22c55e]/30 dark:text-[#4ade80]">
          <span>✓</span>
          <Text variant="meta" as="span" className="text-[#16a34a] dark:text-[#4ade80]">
            Publicado
          </Text>
        </span>
      );
    }
    if (stage === 'producao' || stage === 'gravacao') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] border border-[#86efac] bg-[#f0fdf4] text-[#16a34a] dark:bg-[#14532d]/20 dark:border-[#22c55e]/30 dark:text-[#4ade80]">
          <span>🎬</span>
          <Text variant="meta" as="span" className="text-[#16a34a] dark:text-[#4ade80]">
            Produção
          </Text>
        </span>
      );
    }
    if (stage === 'edicao') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--radius-pill)] border border-[#93c5fd] bg-[#eff6ff] text-[#2563eb] dark:bg-[#1e3a8a]/20 dark:border-[#3b82f6]/30 dark:text-[#60a5fa]">
          <span>✂️</span>
          <Text variant="meta" as="span" className="text-[#2563eb] dark:text-[#60a5fa]">
            Edição
          </Text>
        </span>
      );
    }
    // Roteiro ou Ideia
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] border border-[#f472b6] bg-[#fdf2f8] text-[#db2777] dark:bg-[#831843]/20 dark:border-[#ec4899]/30 dark:text-[#f472b6]">
        <Text variant="meta" as="span" className="text-[#db2777] dark:text-[#f472b6]">
          {stage === 'ideia' ? 'Ideia' : 'Roteiro'}
        </Text>
      </span>
    );
  };

  const redePrincipal = publicacao.platformNames?.[0] ?? 'Rede';
  const formato = content?.formatoVisual || (publicacao as any).formato || (redePrincipal.toLowerCase() === 'tiktok' ? 'tiktok' : 'reels');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      style={cor ? { borderLeft: `3.5px solid ${cor}` } : undefined}
      className={cn(
        'group flex flex-col justify-between rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 shadow-[var(--shadow-soft)] hover:border-[var(--border-strong)] hover:shadow-md transition-all text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
        className,
      )}
    >
      <div>
        {/* Header do Card: Tag da Etapa + Menu ⋮ */}
        <div className="flex items-center justify-between gap-1">
          {renderStageBadge()}

          <div onClick={e => e.stopPropagation()}>
            <MoreMenu
              items={menuItems}
              size="sm"
              label="Opções do conteúdo"
              trigger={<MoreVertical className="h-3.5 w-3.5 text-current opacity-70" />}
              triggerClassName="h-6 w-6 p-0 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* Título do Conteúdo */}
        <div className="mt-1.5 leading-snug">
          <Text variant="itemTitle" as="div" className="line-clamp-2 text-[var(--text-primary)]">
            {publicacao.titulo}
          </Text>
        </div>

        {/* Agrupamento Editorial / Série se houver */}
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
        ) : null}

        {/* Metadados: Rede · Formato · Horário */}
        <div className="flex items-center gap-1 text-[var(--text-secondary)] mt-1.5 flex-wrap">
          {publicacao.platformNames.map(nome => (
            <PlatformIcon key={nome} platform={nome} className="h-3 w-3 shrink-0" />
          ))}
          <Text variant="meta" as="span" className="capitalize">
            {redePrincipal}
          </Text>
          <span className="text-[var(--text-tertiary)]">·</span>
          <Text variant="meta" as="span" className="lowercase">
            {formato}
          </Text>
          {publicacao.time ? (
            <>
              <span className="text-[var(--text-tertiary)]">·</span>
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5 text-[var(--text-tertiary)]" />
                <Text variant="meta" as="span" className="tabular-nums">
                  {publicacao.time}
                </Text>
              </span>
            </>
          ) : null}
        </div>
      </div>

      {/* Rodapé: Status (Previsto / Programado) + Link Abrir → */}
      <div className="flex items-center justify-between gap-2 mt-2.5 pt-1.5 border-t border-[var(--border-subtle)]">
        <div>
          {scheduled ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-sm)] border border-[#fde68a] bg-[#fef3c7] text-[#92400e] dark:bg-[#78350f]/25 dark:border-[#d97706]/30 dark:text-[#fde68a]">
              <Clock className="h-2.5 w-2.5 text-[#d97706]" />
              <Text variant="meta" as="span" className="text-[#92400e] dark:text-[#fde68a]">
                Programado
              </Text>
            </span>
          ) : (
            <Text variant="meta" as="span" className="text-[var(--text-tertiary)] font-normal">
              {posted ? 'Publicado' : 'Previsto'}
            </Text>
          )}
        </div>

        <span className="inline-flex items-center gap-0.5 text-[var(--text-primary)] group-hover:underline">
          <Text variant="meta" as="span">
            Abrir
          </Text>
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </div>
  );
}
