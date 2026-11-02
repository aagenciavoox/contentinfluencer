import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, ChevronDown, ChevronUp, Pin } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { readStoredJson, writeStoredJson } from '../../../lib/browserStorage';
import type { Pilar, Serie } from '../../../lib/database';
import type { GradeCounts } from '../../editorial/lib/gradeCounts';
import type { PreparoDoPeriodo } from '../lib/monthHealth';
import { cn } from '../../../lib/utils';

const STORAGE_EXPANDED_KEY = 'content-os:saude-editorial-expanded';

export interface SaudeEditorialPanelProps {
  currentDate: Date;
  counts: GradeCounts & {
    preparo?: PreparoDoPeriodo;
    limite?: number | null;
    previsto?: number;
    postIts?: number;
  };
  series?: readonly Serie[];
  pilares: readonly Pilar[];
  onAddReserva: () => void;
  onOpenGravacao: () => void;
  className?: string;
}

export function SaudeEditorialPanel({
  currentDate,
  counts,
  series = [],
  pilares,
  onAddReserva,
  onOpenGravacao,
  className,
}: SaudeEditorialPanelProps) {
  const [expanded, setExpandedRaw] = useState(() => readStoredJson(STORAGE_EXPANDED_KEY, false));

  const toggleExpanded = () => {
    setExpandedRaw(prev => {
      const next = !prev;
      writeStoredJson(STORAGE_EXPANDED_KEY, next);
      return next;
    });
  };

  const mesAno = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  const mesFormatado = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);

  const preenchidos = counts.previsto ?? counts.somaPlanejado ?? 0;
  const metaTotal = counts.limite ?? (counts.totalMeta && counts.totalMeta > 0 ? counts.totalMeta : 12);
  const percentualGeral = metaTotal > 0 ? Math.min(100, Math.round((preenchidos / metaTotal) * 100)) : 0;

  const preparo = counts.preparo;
  const gravacao = preparo?.gravacao ?? 0;
  const escrita = preparo?.escrita ?? 0;
  const edicao = preparo?.edicao ?? 0;
  const prontosOuProgramados = preparo ? preparo.prontas + preparo.publicadas : Math.max(0, preenchidos - (counts.postIts ?? 0));
  const reservasEmPostIt = counts.postIts ?? Math.max(0, preenchidos - prontosOuProgramados);

  const pilaresAtivos = pilares.filter(p => p.ativo !== false);
  const faltamParaMeta = Math.max(0, metaTotal - preenchidos);

  return (
    <Surface
      variant="outlined"
      padding="none"
      className={cn('w-full overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border-[var(--border-subtle)] shadow-[var(--shadow-soft)] p-4 sm:p-6', className)}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="h-2.5 w-2.5 rounded-full bg-[#10b981] shrink-0" aria-hidden />
          <Text variant="sectionTitle" as="h2" className="text-[var(--text-primary)]">
            Saúde Editorial — {mesFormatado}
          </Text>
          <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            <Text variant="meta" as="span">{preenchidos}/{metaTotal} espaços</Text>
          </span>
        </div>

        <button
          type="button"
          onClick={toggleExpanded}
          className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)] px-2 py-1"
        >
          <Text variant="meta" as="span">{expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</Text>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="stack-md mt-4 pt-1 border-t border-[var(--border-subtle)]">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Volume Editorial */}
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <Text variant="label" as="span" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                    1. Volume Editorial
                  </Text>
                  <Text variant="bodyStrong" as="span" className="text-[var(--text-secondary)]">
                    {percentualGeral}%
                  </Text>
                </div>
                <div className="mt-1.5">
                  <Text variant="sectionTitle" as="div" className="text-[var(--text-primary)]">
                    {preenchidos} de {metaTotal} espaços
                  </Text>
                </div>
                <div className="mt-0.5">
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    {prontosOuProgramados} prontos ou programados · {reservasEmPostIt} reserva(s) em post-it
                  </Text>
                </div>
              </div>
              <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] mt-3 overflow-hidden">
                <div
                  className="h-full bg-[var(--text-primary)] rounded-[var(--radius-pill)] transition-all duration-300"
                  style={{ width: `${percentualGeral}%` }}
                />
              </div>
            </div>

            {/* Card 2: Preparo das Peças */}
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between">
              <div>
                <Text variant="label" as="div" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                  2. Preparo das Peças
                </Text>
                <div className="mt-1.5">
                  <Text variant="sectionTitle" as="div" className="text-[var(--text-primary)]">
                    {gravacao} roteiro(s) para gravar
                  </Text>
                </div>
                <div className="mt-0.5">
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    {escrita} ideia(s) em escrita · {edicao} em edição
                  </Text>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenGravacao}
                className="mt-3 flex items-center gap-1.5 text-[#be185d] hover:text-[#9d174d] hover:underline transition-colors w-fit focus-visible:outline-none"
              >
                <Pin className="h-3.5 w-3.5 rotate-45" />
                <Text variant="meta" as="span" className="text-[#be185d]">
                  Preparar sessão de gravação
                </Text>
              </button>
            </div>

            {/* Card 3: Distribuição por Pilar */}
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between">
              <div>
                <Text variant="label" as="div" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                  3. Distribuição por Pilar
                </Text>
                <div className="mt-1.5">
                  <Text variant="sectionTitle" as="div" className="text-[var(--text-primary)]">
                    {pilaresAtivos.length} pilares ativos
                  </Text>
                </div>
                <div className="mt-0.5">
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    todas as séries ativas com pauta
                  </Text>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                {pilaresAtivos.map(pilar => (
                  <span
                    key={pilar.id}
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: pilar.cor || '#10b981' }}
                    title={pilar.nome}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Seção: Distribuição de Conteúdo por Pilar */}
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
            <div className="flex items-center justify-between mb-3">
              <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
                Distribuição de Conteúdo por Pilar
              </Text>
              <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                Comparativo entre ritmo atual e meta planejada
              </Text>
            </div>

            <div className="stack-sm">
              {pilaresAtivos.map((pilar, index) => {
                const linha = counts.pilares.find(lp => lp.id === pilar.id);
                const pautas = linha?.planejado ?? 0;
                const atualPct = preenchidos > 0 ? Math.round((pautas / preenchidos) * 100) : 0;
                const fallbackMetaPct = Math.round(100 / (pilaresAtivos.length || 1));
                const metaPct = metaTotal > 0 && linha?.meta ? Math.round((linha.meta / metaTotal) * 100) : fallbackMetaPct;
                const barColor = pilar.cor || (index === 0 ? '#84cc16' : index === 1 ? '#ec4899' : '#374151');

                return (
                  <div key={pilar.id} className="stack-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: barColor }}
                          aria-hidden
                        />
                        <Text variant="body" as="span" className="text-[var(--text-primary)] truncate">
                          {pilar.nome}
                        </Text>
                      </div>
                      <Text variant="meta" as="span" className="text-[var(--text-secondary)] shrink-0 tabular-nums">
                        {pautas} {pautas === 1 ? 'pauta' : 'pautas'} · Atual: {atualPct}% (Meta: {metaPct}%)
                      </Text>
                    </div>
                    <div className="h-2 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] overflow-hidden">
                      <div
                        className="h-full rounded-[var(--radius-pill)] transition-all duration-300"
                        style={{
                          width: `${Math.min(100, Math.max(atualPct, pautas > 0 ? 5 : 0))}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Banners */}
          <div className="stack-sm">
            {/* Banner 1: Espaços e Reserva */}
            {faltamParaMeta > 0 && (
              <div className="rounded-[var(--radius-card)] border border-[#fde68a] bg-[#fffbeb] dark:bg-[#78350f]/15 dark:border-[#b45309]/30 p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#92400e] dark:text-[#fde68a]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#d97706]" />
                  <Text variant="body" as="span" className="text-[#92400e] dark:text-[#fde68a]">
                    {preenchidos} de {metaTotal} espaços preenchidos ({faltamParaMeta} reserva(s) necessária(s) para atingir a meta do mês).
                  </Text>
                </div>
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={onAddReserva}
                  className="border-[#d97706] text-[#92400e] hover:bg-[#fef3c7] dark:border-[#b45309] dark:text-[#fde68a] shrink-0"
                >
                  Adicionar reserva
                </AppButton>
              </div>
            )}

            {/* Banner 2: Gravações Pendentes */}
            {gravacao > 0 && (
              <div className="rounded-[var(--radius-card)] border border-[#fbcfe8] bg-[#fdf2f8] dark:bg-[#831843]/15 dark:border-[#db2777]/30 p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#9d174d] dark:text-[#fbcfe8]">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[#db2777]" />
                  <Text variant="body" as="span" className="text-[#9d174d] dark:text-[#fbcfe8]">
                    {gravacao} roteiro(s) agendado(s) para este mês aguardam sessão de gravação.
                  </Text>
                </div>
                <AppButton
                  variant="secondary"
                  size="sm"
                  onClick={onOpenGravacao}
                  className="border-[#db2777] text-[#9d174d] hover:bg-[#fce7f3] dark:border-[#be185d] dark:text-[#fbcfe8] shrink-0"
                >
                  Abrir gravação
                </AppButton>
              </div>
            )}
          </div>
        </div>
      )}
    </Surface>
  );
}
