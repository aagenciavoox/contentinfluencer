import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, FileText, Lightbulb, Mic, MoreVertical, Play, Settings, type LucideIcon } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { cn } from '../../../lib/utils';

// Mesmos ícones dos contadores do topo da aba: postado, ideia e o resto "em produção".
const ETAPA_ICONE: Record<string, LucideIcon> = {
  Ideia: Lightbulb,
  Postado: Play,
};

/** "30 de out." */
function formatShortDate(value: string) {
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "d 'de' MMM", { locale: ptBR });
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
            <span className="line-clamp-2 t-body-strong font-semibold leading-snug text-[var(--text-primary)] hover:underline hover:underline-offset-2">
              {title || 'Roteiro sem título'}
            </span>
          </button>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-2">
              <EtapaIcone className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
              <span className={cn('inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium', statusClass)}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                {status}
              </span>
            </span>
            {pilarName ? <span className="t-secondary text-[var(--text-tertiary)]">{pilarName}</span> : null}
            {publishLabel ? (
              <span className="inline-flex items-center gap-1 t-secondary text-[var(--text-tertiary)]" title="Publicação">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                {publishLabel}
              </span>
            ) : null}
            {recordingLabel ? (
              <span className="inline-flex items-center gap-1 t-secondary text-[var(--text-tertiary)]" title="Gravação">
                <Mic className="h-3.5 w-3.5" aria-hidden />
                {recordingLabel}
              </span>
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
