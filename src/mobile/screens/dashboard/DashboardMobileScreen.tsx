import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Text } from '../../../components/ui/Text';
import { Surface } from '../../../components/ui/Surface';
import { cn } from '../../../lib/utils';
import { MOBILE_HEADER_ACTION_CLASS } from '../../components/MobileHeaderIOS';
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
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* O avatar abre o menu (mesma posição do botão de menu das outras telas). O título
                fica fora do botão para a tela ter um h1 e o nome do botão bater com o que ele faz. */}
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Abrir menu"
              className={cn(MOBILE_HEADER_ACTION_CLASS, 't-body-strong ')}
            >
              <span aria-hidden>{initial}</span>
            </button>
            <Text variant="pageTitle" as="h1" truncate className="min-w-0">
              {greetingName} · {weekdayLabel}
            </Text>
          </div>

          <button
            type="button"
            aria-label="Abrir busca global"
            onClick={onOpenSearch}
            className={MOBILE_HEADER_ACTION_CLASS}
          >
            <Search className="h-4 w-4" aria-hidden />
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
