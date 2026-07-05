import {CalendarPeriodNav, type CalendarPeriodViewOption} from '../../../components/calendar';

export type ProgramacaoViewMode = 'week' | 'month';

export type ProgramacaoPeriodControlsProps = {
  viewMode: ProgramacaoViewMode;
  onViewModeChange: (mode: ProgramacaoViewMode) => void;
  anchorDate: Date;
  onAnchorDateChange: (date: Date) => void;
  className?: string;
};

const VIEWS: CalendarPeriodViewOption<ProgramacaoViewMode>[] = [
  {id: 'week', label: 'Semana'},
  {id: 'month', label: 'Mês'},
];

export function ProgramacaoPeriodControls(props: ProgramacaoPeriodControlsProps) {
  return (
    <CalendarPeriodNav
      {...props}
      weekViewId="week"
      weekStartsOn={1}
      views={VIEWS}
    />
  );
}
