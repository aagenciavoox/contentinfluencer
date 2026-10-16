import {Text} from '../../../components/ui/Text';
import {cn} from '../../../lib/utils';
import {corProjetoValida, PROJECT_COLORS} from '../lib/projetoCores';

export function ProjetoCorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const personalizada = corProjetoValida(value) && !PROJECT_COLORS.some(cor => cor.toLowerCase() === value.toLowerCase());

  return (
    <div className="stack-sm">
      <Text variant="label">Cor do projeto</Text>
      <div className="flex flex-wrap items-center gap-2">
        {PROJECT_COLORS.map(cor => (
          <button
            key={cor}
            type="button"
            onClick={() => onChange(cor)}
            className={cn(
              'h-7 w-7 rounded-full border-2 transition-all',
              value.toLowerCase() === cor.toLowerCase()
                ? 'scale-110 border-[var(--text-primary)]'
                : 'border-transparent opacity-70 hover:opacity-100',
            )}
            style={{backgroundColor: cor}}
            aria-label={`Cor ${cor}`}
            aria-pressed={value.toLowerCase() === cor.toLowerCase()}
          />
        ))}
        <label className="inline-flex items-center gap-2">
          <span className="sr-only">Cor personalizada</span>
          <input
            type="color"
            value={corProjetoValida(value) ? value : '#78716c'}
            onChange={event => onChange(event.target.value)}
            className={cn(
              'h-7 w-7 cursor-pointer rounded-full border-2 bg-transparent p-0',
              personalizada ? 'scale-110 border-[var(--text-primary)]' : 'border-[var(--border-color)]',
            )}
            aria-label="Escolher uma cor personalizada"
          />
          <Text variant="meta">Personalizada</Text>
        </label>
      </div>
    </div>
  );
}
