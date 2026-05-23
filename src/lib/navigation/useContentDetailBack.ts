import { useLocation, useNavigate } from 'react-router-dom';
import { resolveContentDetailBack } from './detailBack';

export function useContentDetailBack() {
  const location = useLocation();
  const navigate = useNavigate();

  return () => {
    navigate(resolveContentDetailBack(location.state as { from?: string } | null));
  };
}
