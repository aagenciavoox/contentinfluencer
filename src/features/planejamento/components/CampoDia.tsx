import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';

/** Dia de um post-it, com a saída para Sem data na mesma linha do campo. */
export function CampoDia({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | null;
  onChange: (date: string | null) => void;
}) {
  return (
    <div className="stack-xs">
      <label htmlFor={id}>
        <Text variant="label" as="span">Dia</Text>
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="date"
          value={value ?? ''}
          onChange={event => onChange(event.target.value || null)}
          className="min-w-0 flex-1"
        />
        {value ? (
          <AppButton variant="secondary" onClick={() => onChange(null)}>
            Tirar data
          </AppButton>
        ) : null}
      </div>
      {value ? null : (
        <Text variant="meta">Sem dia marcado. O post-it fica em Sem data.</Text>
      )}
    </div>
  );
}
