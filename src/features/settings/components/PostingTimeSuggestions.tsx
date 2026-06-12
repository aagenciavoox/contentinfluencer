import {getDay, parseISO} from 'date-fns';
import {Clock} from 'lucide-react';
import {cn} from '../../../lib/utils';
import {getTimesForDay, PostingTimesSettings, Weekday} from '../lib/postingTimes';

interface PostingTimeSuggestionsProps {
  /** Data no formato "yyyy-MM-dd" usada para derivar o dia da semana */
  date: string;
  /** Horário atualmente selecionado */
  selectedTime: string;
  /** Configuração vinda de getPostingTimes(state.preferences) */
  postingTimes: PostingTimesSettings;
  onSelect: (time: string) => void;
  className?: string;
}

/**
 * Mostra chips clicáveis com os horários recomendados para o dia da semana
 * da `date` informada. Não renderiza nada se não há horários configurados.
 */
export function PostingTimeSuggestions({
  date,
  selectedTime,
  postingTimes,
  onSelect,
  className,
}: PostingTimeSuggestionsProps) {
  if (!date) return null;

  let weekday: Weekday;
  try {
    weekday = getDay(parseISO(date)) as Weekday;
  } catch {
    return null;
  }

  const times = getTimesForDay(postingTimes, weekday);
  if (times.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <Clock className="h-3 w-3 shrink-0 text-[var(--text-tertiary)] opacity-40" />
      {times.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onSelect(t)}
          className={cn(
            'rounded-lg border px-2.5 py-1 text-xs font-semibold tracking-wide transition-all',
            selectedTime === t
              ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
              : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
