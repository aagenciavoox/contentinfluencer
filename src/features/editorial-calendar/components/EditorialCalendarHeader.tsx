import {Calendar as CalendarIcon, Plus} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';

interface EditorialCalendarHeaderProps {
  onAddAgenda: () => void;
}

export function EditorialCalendarHeader({onAddAgenda}: EditorialCalendarHeaderProps) {
  const isMobile = useIsMobile();

  return (
    <header className="desktop-header-sticky transition-colors duration-300">
      <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Planejamento"
          title="Calendario"
          subtitle="A agenda principal agora desce pelos proximos meses em uma unica superficie."
          icon={CalendarIcon}
          className="mb-0"
          actions={[
            <AppButton
              key="agenda"
              variant="primary"
              size={isMobile ? 'sm' : 'md'}
              onClick={onAddAgenda}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="uppercase tracking-widest"
            >
              Novo evento
            </AppButton>,
          ]}
        />
      </div>
    </header>
  );
}
