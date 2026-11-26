import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Check, CheckCircle2, ChevronDown, Zap } from 'lucide-react';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn, tintedTextColor } from '../../../lib/utils';
import { CONTENT_STATUS, DISPLAY_STATUS } from '../../contents/lib/contentPipeline';
import type { PublishCalendarConta } from '../lib/publishCalendarItems';

/** Estado do card inteiro. Decide a cor do fundo (compacto) e o selo do topo (expandido). */
export type PublishCardEstado = 'previsto' | 'editado' | 'programado' | 'publicado';

type EstadoVisual = {
  rotulo: string;
  /** Token de cor. Sem cor, o card fica neutro. */
  cor: string | null;
  icone: ReactNode;
};

const ESTADOS: Record<PublishCardEstado, EstadoVisual> = {
  previsto: { rotulo: 'Previsto', cor: null, icone: null },
  editado: { rotulo: 'Editado', cor: 'var(--status-edited)', icone: <Check className="h-3 w-3 shrink-0" aria-hidden /> },
  programado: { rotulo: DISPLAY_STATUS.PROGRAMADO, cor: 'var(--status-scheduled)', icone: <Zap className="h-3 w-3 shrink-0" aria-hidden /> },
  publicado: { rotulo: CONTENT_STATUS.POSTADO, cor: 'var(--status-posted)', icone: <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden /> },
};

/** Mesma prioridade da cor que o calendário já usava: postado, programado, editado. */
export function estadoDoCard(entry: { posted?: boolean; scheduled?: boolean; editado?: boolean }): PublishCardEstado {
  if (entry.posted) return 'publicado';
  if (entry.scheduled) return 'programado';
  if (entry.editado) return 'editado';
  return 'previsto';
}

function fundo(cor: string | null): string {
  return cor ? `color-mix(in srgb, ${cor} 12%, var(--bg-elevated))` : 'var(--surface-subtle)';
}

function tinta(cor: string | null): string {
  return cor ? tintedTextColor(cor) : 'var(--text-secondary)';
}

function corDaConta(conta: PublishCalendarConta): string | null {
  if (conta.posted) return 'var(--status-posted)';
  if (conta.cancelled) return 'var(--danger)';
  if (conta.status === DISPLAY_STATUS.PROGRAMADO || conta.programada) return 'var(--status-scheduled)';
  return null;
}

function semLegenda(conta: PublishCalendarConta): boolean {
  return !conta.posted && !conta.cancelled && !conta.legenda.trim();
}

function Ponto({ cor, className }: { cor: string; className?: string }) {
  return <span aria-hidden className={cn('shrink-0 rounded-full', className ?? 'h-1.5 w-1.5')} style={{ backgroundColor: cor }} />;
}

function SeloDaConta({ conta }: { conta: PublishCalendarConta }) {
  const cor = corDaConta(conta);
  const descricao = [conta.platformName, conta.status, conta.time ? `às ${conta.time}` : null].filter(Boolean).join(', ');
  const style: CSSProperties = cor
    ? { backgroundColor: fundo(cor), color: tinta(cor) }
    : { backgroundColor: 'var(--surface-subtle)', color: 'var(--text-secondary)' };
  return (
    <span
      title={descricao}
      aria-label={descricao}
      className="inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5"
      style={style}
    >
      <PlatformIcon platform={conta.platformName} className="h-3.5 w-3.5 shrink-0" />
      <Text variant="meta" as="span" className="texto-herda truncate">
        {conta.status}
        {conta.programada && conta.time && !conta.posted ? ` ${conta.time}` : ''}
      </Text>
    </span>
  );
}

function LinhaDaConta({ conta }: { conta: PublishCalendarConta }) {
  const faltaLegenda = semLegenda(conta);
  return (
    <div className="flex items-start gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-subtle)]">
        <PlatformIcon platform={conta.platformName} className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1 stack-xs">
        <div className="flex min-w-0 items-baseline justify-between gap-2">
          <Text variant="label" as="p" className="min-w-0 truncate text-[var(--text-primary)]">{conta.platformName}</Text>
          <Text variant="meta" as="span" className="shrink-0 tabular-nums">{conta.time ?? 'Sem horário'}</Text>
        </div>
        {faltaLegenda ? (
          <Text variant="meta" as="p" className="texto-erro flex items-center gap-1">
            <Ponto cor="var(--danger)" />
            Sem legenda
          </Text>
        ) : (
          <Text variant="secondary" as="p" className="whitespace-pre-wrap text-[var(--text-primary)]">
            {conta.legenda.trim() ? conta.legenda : 'Sem legenda'}
          </Text>
        )}
      </div>
    </div>
  );
}

type PublishCalendarCardProps = {
  label: string;
  time?: string | null;
  secondary?: string | null;
  contas?: readonly PublishCalendarConta[];
  estado?: PublishCardEstado;
  variant?: 'compact' | 'expanded';
  onOpen?: () => void;
};

const FOCO = 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

/**
 * Card de publicação do calendário.
 * Compacto (célula do mês): fundo no tom do estado, hora, título numa linha e as redes. Um clique abre o dia.
 * Expandido (painel do dia, agenda e mobile): selo de estado, título inteiro, selo por conta e o
 * acordeão "Horário e legenda", que mostra cada conta sem sair do dia.
 */
export function PublishCalendarCard({
  label,
  time,
  secondary,
  contas = [],
  estado = 'previsto',
  variant = 'compact',
  onOpen,
}: PublishCalendarCardProps) {
  const [open, setOpen] = useState(false);
  const visual = ESTADOS[estado];
  const corPonto = visual.cor ?? 'var(--text-tertiary)';
  const corTexto = tinta(visual.cor);
  const resumo = [label, time, secondary, visual.rotulo].filter(Boolean).join(' · ');

  const abrir = (event: MouseEvent) => {
    event.stopPropagation();
    onOpen?.();
  };

  if (variant === 'compact') {
    const redes = contas.slice(0, 3);
    return (
      <button
        type="button"
        title={resumo}
        onClick={abrir}
        className={cn('block w-full min-w-0 rounded-[var(--radius-input)] px-2 py-1.5 text-left transition-[filter] hover:brightness-[0.97]', FOCO)}
        style={{ backgroundColor: fundo(visual.cor) }}
      >
        <span className="flex min-w-0 items-center justify-between gap-1">
          <span className="flex min-w-0 items-center gap-1">
            <Ponto cor={corPonto} />
            <Text variant="meta" as="span" className="texto-herda shrink-0 tabular-nums" style={{ color: corTexto }}>
              {time ?? 'S/h'}
            </Text>
          </span>
          <span className="flex min-w-0 items-center gap-0.5" style={{ color: corTexto }}>
            {visual.icone}
            {estado !== 'publicado' ? (
              <Text variant="meta" as="span" className="texto-herda truncate">{visual.rotulo}</Text>
            ) : null}
          </span>
        </span>
        <Text variant="label" as="span" className="mt-0.5 block truncate text-[var(--text-primary)]">{label}</Text>
        {redes.length > 0 ? (
          <span className="mt-1 flex min-w-0 items-center gap-1" style={{ color: corTexto }}>
            {redes.map(conta => (
              <PlatformIcon key={conta.plataformaId} platform={conta.platformName} className="h-3 w-3 shrink-0" />
            ))}
            {contas.length > 1 ? (
              <Text variant="meta" as="span" className="texto-herda truncate">{contas.length} redes</Text>
            ) : null}
          </span>
        ) : null}
      </button>
    );
  }

  const temContas = contas.length > 0;
  const faltando = contas.filter(semLegenda).length;
  const horas = [...new Set(contas.map(conta => conta.time).filter(Boolean))];
  const horarioUnico = contas.length > 1 && horas.length === 1 && contas.every(conta => conta.time) ? horas[0] : null;

  return (
    <Surface variant="outlined" padding="none" className="w-full overflow-hidden text-left">
      <button type="button" title={resumo} onClick={abrir} className={cn('block w-full p-3 text-left stack-xs', FOCO)}>
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <Ponto cor={corPonto} className="h-2 w-2" />
            <Text
              variant="label"
              as="span"
              className="shrink-0 tabular-nums"
              style={{ color: time ? (visual.cor ? corTexto : 'var(--text-primary)') : 'var(--text-secondary)' }}
            >
              {time ?? 'Sem horário'}
            </Text>
          </span>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5"
            style={{ backgroundColor: fundo(visual.cor), color: corTexto }}
          >
            {visual.icone}
            <Text variant="meta" as="span" className="texto-herda">{visual.rotulo}</Text>
          </span>
        </span>
        <Text variant="bodyStrong" as="span" className="block line-clamp-2">{label}</Text>
        {secondary ? <Text variant="meta" as="span" className="block">{secondary}</Text> : null}
        {temContas ? (
          <span className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {contas.map(conta => <SeloDaConta key={conta.plataformaId} conta={conta} />)}
          </span>
        ) : null}
      </button>
      {temContas ? (
        <div className="mx-3 border-t border-[var(--border-color)]" onClick={event => event.stopPropagation()}>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(value => !value)}
            className={cn('flex min-h-9 w-full items-center justify-between gap-2 text-left pointer-coarse:min-h-11', FOCO)}
          >
            <span className={cn('flex min-w-0 items-center gap-1', open ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]')}>
              <Text variant="meta" as="span" className="texto-herda truncate">
                Horário e legenda{contas.length > 1 ? ` · ${contas.length} contas` : ''}
              </Text>
              <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
            </span>
            {faltando > 0 ? (
              <Text variant="meta" as="span" className="texto-erro shrink-0">
                {faltando === 1 ? '1 sem legenda' : `${faltando} sem legenda`}
              </Text>
            ) : null}
          </button>
          {open ? (
            <div className="mb-3 stack-xs rounded-[var(--radius-input)] bg-[var(--surface-subtle)] p-2">
              {contas.map(conta => <LinhaDaConta key={conta.plataformaId} conta={conta} />)}
              {horarioUnico ? (
                <Text variant="meta" as="p" className="px-0.5">Horário unificado: {horarioUnico}</Text>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Surface>
  );
}
