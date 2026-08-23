import {lazy, Suspense} from 'react';
import {useCalendarMode} from '../components/CalendarModeSwitch';

const EditorialCalendarPage = lazy(() =>
  import('./EditorialCalendarPage').then(module => ({default: module.EditorialCalendarPage})),
);
const ProgramacaoPage = lazy(() =>
  import('../../programacao/pages/ProgramacaoPage').then(module => ({default: module.ProgramacaoPage})),
);

function CalendarModeFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)]">
        Carregando calendário...
      </p>
    </div>
  );
}

export function CalendarHubPage() {
  const {mode} = useCalendarMode();
  return (
    <Suspense fallback={<CalendarModeFallback />}>
      {mode === 'agendar' ? <ProgramacaoPage /> : <EditorialCalendarPage />}
    </Suspense>
  );
}
