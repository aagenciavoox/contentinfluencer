import { addDays, format, parseISO } from 'date-fns';
import { ChoiceChips } from '../../../../components/ui/ChoiceChips';
import { Text } from '../../../../components/ui/Text';
import { semanaDe } from '../../lib/periodoEditorial';
import { domingosParaVigencia } from '../../lib/vigencias';
import { CAMPO_BASE } from './campos';

type Quando = 'esta' | 'proxima' | 'outra';

export function diaMes(dia: string): string {
  return format(parseISO(dia), 'dd/MM');
}

/**
 * Quando uma mudança de ritmo começa: sempre num domingo, nunca antes desta semana.
 * Desta semana vale já no período em curso; de um domingo futuro fica agendada e o de hoje continua até lá.
 */
export function ValeAPartirDe({
  id,
  valor,
  onChange,
  hoje,
}: {
  id: string;
  /** Domingo escolhido (yyyy-MM-dd). */
  valor: string;
  onChange: (domingo: string) => void;
  hoje: string;
}) {
  const { estaSemana, proxima } = domingosParaVigencia(hoje);
  const quando: Quando = valor === estaSemana ? 'esta' : valor === proxima ? 'proxima' : 'outra';
  const daquiADuas = format(addDays(parseISO(proxima), 7), 'yyyy-MM-dd');

  return (
    <div className="stack-sm">
      <Text variant="bodyStrong" as="span">Vale a partir de</Text>
      <ChoiceChips<Quando>
        label="Vale a partir de"
        value={quando}
        onChange={escolha => {
          if (escolha === 'esta') onChange(estaSemana);
          if (escolha === 'proxima') onChange(proxima);
          if (escolha === 'outra') onChange(daquiADuas);
        }}
        options={[
          { value: 'esta', label: 'Esta semana', description: `desde dom, ${diaMes(estaSemana)}` },
          { value: 'proxima', label: 'Próxima semana', description: `dom, ${diaMes(proxima)}` },
          { value: 'outra', label: 'Outra data', description: 'um domingo à frente' },
        ]}
      />
      {quando === 'outra' ? (
        <label className="flex flex-wrap items-center gap-2" htmlFor={`${id}-data`}>
          <Text variant="meta" as="span" className="text-[var(--text-secondary)]">A semana de</Text>
          <input
            id={`${id}-data`}
            type="date"
            min={proxima}
            value={valor}
            onChange={event => {
              const dia = event.target.value;
              if (!dia) return;
              const domingo = semanaDe(dia).inicio;
              onChange(domingo < estaSemana ? estaSemana : domingo);
            }}
            className={`${CAMPO_BASE} min-h-11`}
          />
        </label>
      ) : null}
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
        {quando === 'esta'
          ? 'Vale já, inclusive no período em curso. Períodos encerrados mantêm o que tinham.'
          : `Começa no domingo ${diaMes(valor)}. Até lá vale o de hoje.`}
      </Text>
    </div>
  );
}
