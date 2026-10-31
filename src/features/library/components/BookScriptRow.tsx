import { Text } from '../../../components/ui/Text';
import { CalendarDays, FileText, Lightbulb, Mic, MoreVertical, Play, Settings, type LucideIcon } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { dia } from '../../../lib/dates';
import { cn } from '../../../lib/utils';

// Mesmos ícones dos contadores do topo da aba: postado, ideia e o resto "em produção".
const ETAPA_ICONE: Record<string, LucideIcon> = {
  Ideia: Lightbulb,
  Publicado: Play,
};

/** Data visível. Valor só com dia fica no calendário local, sem pular de fuso. */
function formatShortDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return dia(value);
  if (Number.isNaN(new Date(value).getTime())) return null;
  return dia(value);
}

interface BookScriptRowProps {
  title: string;
  status: string;
  statusClass: string;
  pilarName?: string | null;
  publishDate?: string | null;
  recordingDate?: string | null;
  menuItems: MoreMenuItem[];
  onOpen: () => void;
}

/**
 * Roteiro na aba Roteiros do item: etapa, datas e "Abrir roteiro" sempre à vista.
 * Em tela estreita os botões descem para uma linha própria, abaixo do título.
 */
export function BookScriptRow({
  title,
  status,
  statusClass,
  pilarName,
  publishDate,
  recordingDate,
  menuItems,
  onOpen,
}: BookScriptRowProps) {
  const EtapaIcone = ETAPA_ICONE[status] ?? Settings;
  const publishLabel = publishDate ? formatShortDate(publishDate) : null;
  const recordingLabel = recordingDate ? formatShortDate(recordingDate) : null;

  return (
    <article className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]"
          aria-hidden
        >
          <FileText className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpen}
            className="block max-w-full rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Text variant="bodyStrong" as="span" className="line-clamp-2 leading-snug text-[var(--text-primary)] hover:underline hover:underline-offset-2">
              {title || 'Roteiro sem título'}
            </Text>
          </button>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-2">
              <EtapaIcone className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
              <Text variant="label" as="span" className={cn('inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 ', statusClass)}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                {status}
              </Text>
            </span>
            {pilarName ? <Text variant="secondary" as="span" className="text-[var(--text-tertiary)]">{pilarName}</Text> : null}
            {publishLabel ? (
              <Text variant="secondary" as="span" className="inline-flex items-center gap-1 text-[var(--text-tertiary)]" title="Publicação">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {publishLabel}
              </Text>
            ) : null}
            {recordingLabel ? (
              <Text variant="secondary" as="span" className="inline-flex items-center gap-1 text-[var(--text-tertiary)]" title="Gravação">
                <Mic className="h-3.5 w-3.5" aria-hidden />
                {recordingLabel}
              </Text>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <AppButton variant="primary" leftIcon={<Play className="h-4 w-4" />} onClick={onOpen} className="flex-1 sm:flex-none">
          Abrir roteiro
        </AppButton>
        <MoreMenu
          items={menuItems}
          label="Mais ações do roteiro"
          trigger={<MoreVertical className="h-[18px] w-[18px]" />}
        />
      </div>
    </article>
  );
}
