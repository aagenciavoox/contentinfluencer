import {Navigate} from 'react-router-dom';

/** Horários de postagem ficam em Contas e horários. */
export function PostingTimesSettingsPage() {
  return <Navigate to="/contas" replace />;
}
