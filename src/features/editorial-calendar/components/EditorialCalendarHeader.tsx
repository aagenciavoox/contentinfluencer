import {Calendar as CalendarIcon, Plus, Radio} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';

interface EditorialCalendarHeaderProps {
  onAddAgenda: () => void;
  onAddPostedVideo: () => void;
}

export function EditorialCalendarHeader({onAddAgenda, onAddPostedVideo}: EditorialCalendarHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <header className="desktop-header-sticky transition-colors duration-300">
      <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Planejamento"
          title="Calendario Editorial"
          icon={CalendarIcon}
          className="mb-0"
          actions={[
            <AppButton
              key="posted-video"
              variant="secondary"
              size={isMobile ? 'sm' : 'md'}
              onClick={onAddPostedVideo}
              leftIcon={<Radio className="h-3.5 w-3.5" />}
              className="tracking-normal"
            >
              Video postado
            </AppButton>,
            <AppButton
              key="agenda"
              variant="primary"
              size={isMobile ? 'sm' : 'md'}
              onClick={onAddAgenda}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="tracking-normal"
            >
              Novo evento
            </AppButton>,
          ]}
        />
      </div>
    </header>
  );
}
