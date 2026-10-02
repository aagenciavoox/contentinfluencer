import {Navigate} from 'react-router-dom';

/** Horários de postagem agora ficam em Plataformas. */
export function PostingTimesSettingsPage() {
  return <Navigate to="/configuracoes/plataformas" replace />;
}
