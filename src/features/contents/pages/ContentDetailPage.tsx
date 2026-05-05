import {Navigate, useParams} from 'react-router-dom';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {ContentDetailShell} from '../components/detail/ContentDetailShell';

export function ContentDetailPage() {
  const {id} = useParams<{id: string}>();
  const {state} = useAppContext();
  const isMobile = useIsMobile();

  const content = state.contents.find(item => item.id === id);

  if (!id) {
    return <Navigate to="/conteudos" replace />;
  }

  if (!content) {
    return <Navigate to="/conteudos" replace />;
  }

  return <ContentDetailShell content={content} mode={isMobile ? 'mobile' : 'desktop'} />;
}
