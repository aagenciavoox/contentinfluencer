import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Text } from '../../../components/ui/Text';
import { Surface } from '../../../components/ui/Surface';
import { DayPulse } from '../../../features/dashboard/components/DayPulse';
import type { DayPulseSegment } from '../../../features/dashboard/lib/dayPulse';

interface DashboardMobileScreenProps {
  greetingName: string;
  weekdayLabel: string;
  pulseSegments: DayPulseSegment[];
  pauseMode: boolean;
  children: ReactNode;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}

export function DashboardMobileScreen({
  greetingName,
  weekdayLabel,
  pulseSegments,
  pauseMode,
  children,
  onOpenMenu,
  onOpenSearch,
}: DashboardMobileScreenProps) {
  const initial = greetingName.trim().charAt(0).toUpperCase() || 'C';

  return (
    <div>
      {/* Mesmo cabeçalho neutro das outras telas: a faixa rosa deixava o Hoje com cara de outro app
          e o texto branco pequeno sobre ela não passava no contraste mínimo. */}
      <section
        className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Abrir menu"
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left touch-manipulation focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-primary)]"
            >
              {initial}
            </span>
            <Text variant="pageTitle" as="span" truncate>
              {greetingName} · {weekdayLabel}
            </Text>
          </button>

          <button
            type="button"
            aria-label="Abrir busca global"
            onClick={onOpenSearch}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-1 pl-14">
          <DayPulse segments={pulseSegments} />
        </div>
      </section>

      <div className="stack-lg px-4 pt-4 pb-8">
        {pauseMode ? (
          <Surface variant="outlined" padding="md" className="stack-sm">
            <Text variant="bodyStrong">Pausa respeitada</Text>
            <Text variant="secondary">
              Sugestões ficam de lado. A gravação continua disponível se você quiser.
            </Text>
          </Surface>
        ) : null}
        {children}
      </div>
    </div>
  );
}
