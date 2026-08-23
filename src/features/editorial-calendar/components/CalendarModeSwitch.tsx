import {useNavigate, useSearchParams} from 'react-router-dom';
import {SegmentTabs} from '../../../components/ui/SegmentTabs';
import {MobileSegmentTabs} from '../../../mobile/components/MobileSegmentTabs';
import {
  CALENDAR_MODE_OPTIONS,
  CALENDAR_MODE_QUERY,
  buildCalendarPath,
  parseCalendarMode,
  type CalendarMode,
} from '../lib/calendarMode';

export function useCalendarMode() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = parseCalendarMode(searchParams.get(CALENDAR_MODE_QUERY));

  const setMode = (next: CalendarMode) => {
    if (next === mode) return;
    navigate(buildCalendarPath(next));
  };

  return {mode, setMode};
}

export function CalendarModeSwitch({variant = 'desktop'}: {variant?: 'desktop' | 'mobile'}) {
  const {mode, setMode} = useCalendarMode();

  if (variant === 'mobile') {
    return (
      <MobileSegmentTabs
        tabs={CALENDAR_MODE_OPTIONS.map(option => ({
          value: option.id,
          label: option.label,
        }))}
        value={mode}
        onChange={setMode}
      />
    );
  }

  return (
    <SegmentTabs
      options={CALENDAR_MODE_OPTIONS}
      value={mode}
      onChange={setMode}
    />
  );
}
