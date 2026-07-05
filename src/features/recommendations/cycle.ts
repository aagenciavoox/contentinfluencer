import { addDays, startOfDay } from 'date-fns';
import type { CycleWindow } from './types.ts';

export const ROLLING_CYCLE_DAYS = 28;

export function getRollingCycleWindow(now: Date = new Date()): CycleWindow {
  const end = startOfDay(now);
  return {
    start: startOfDay(addDays(end, -(ROLLING_CYCLE_DAYS - 1))),
    end,
  };
}
