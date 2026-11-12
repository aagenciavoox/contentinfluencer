import { addDays, format, parseISO } from 'date-fns';
import { ChoiceChips } from '../../../../components/ui/ChoiceChips';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import { semanaDe } from '../../lib/periodoEditorial';
import { domingosParaVigencia } from '../../lib/vigencias';
import { CAMPO_BASE } from './campos';

type Quando = 'esta' | 'proxima' | 'outra';

export function diaMes(dia: string): string {
  return format(parseISO(dia), 'dd/MM');
}

const DIA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

/** "Seg., 09/11". */
export function segundaCurta(dia: string): string {
  const data = parseISO(dia);
  return `${DIA_CURTO[data.getDay()]}., ${format(data, 'dd/MM')}`;
}

/**
 * Quando uma mudança de ritmo começa: sempre numa segunda, nunca antes desta semana.
 * Desta semana vale já no período em curso; de uma segunda futura fica agendada e o de hoje continua até lá.
 */
export function ValeAPartirDe({
  id,
  valor,
  onChange,
  hoje,
  aparencia = 'padrao',
}: {
  id: string;
  /** Segunda escolhida (yyyy-MM-dd). */
  valor: string;
  onChange: (inicioSemana: string) => void;
  hoje: string;
  /** `cartoes`: três opções lado a lado, a marcada na cor da marca. */
  aparencia?: 'padrao' | 'cartoes';
}) {
  const { estaSemana, proxima } = domingosParaVigencia(hoje);
  const quando: Quando = valor === estaSemana ? 'esta' : valor === proxima ? 'proxima' : 'outra';
  const daquiADuas = format(addDays(parseISO(proxima), 7), 'yyyy-MM-dd');
  const escolher = (escolha: Quando) => {
    if (escolha === 'esta') onChange(estaSemana);
    if (escolha === 'proxima') onChange(proxima);
    if (escolha === 'outra') onChange(quando === 'outra' ? valor : daquiADuas);
  };

  if (aparencia === 'cartoes') {
    const opcoes: { value: Quando; label: string; description: string }[] = [
      { value: 'esta', label: 'Esta semana', description: segundaCurta(estaSemana) },
      { value: 'proxima', label: 'Próxima semana', description: segundaCurta(proxima) },
      { value: 'outra', label: 'Outra data', description: quando === 'outra' ? segundaCurta(valor) : 'Escolher segunda' },
    ];
    return (
      <div className="stack-sm">
        <Text variant="bodyStrong" as="span">Vale a partir de</Text>
        <div role="radiogroup" aria-label="Vale a partir de" className="grid grid-cols-3 gap-2">
          {opcoes.map(opcao => {
            const marcada = quando === opcao.value;
            return (
              <button
                key={opcao.value}
                type="button"
                role="radio"
                aria-checked={marcada}
                onClick={() => escolher(opcao.value)}
                className={cn(
                  'flex min-h-16 flex-col items-start justify-center rounded-[var(--radius-input)] border bg-[var(--bg-elevated)] px-3 py-2 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                  marcada
                    ? 'border-[var(--brand-accent-strong)]'
                    : 'border-[var(--border-color)] hover:bg-[var(--bg-hover)]',
                )}
              >
                <Text variant="meta" className={marcada ? 'text-[var(--brand-accent-strong)]' : 'text-[var(--text-primary)]'}>
                  {opcao.label}
                </Text>
                <Text variant="meta" className={marcada ? 'text-[var(--brand-accent-strong)]' : 'text-[var(--text-secondary)]'}>
                  {opcao.description}
                </Text>
              </button>
            );
          })}
        </div>
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
                const inicio = semanaDe(dia).inicio;
                onChange(inicio < estaSemana ? estaSemana : inicio);
              }}
              className={`${CAMPO_BASE} min-h-11`}
            />
          </label>
        ) : null}
        <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
          As semanas encerradas mantêm as metas anteriores.
        </Text>
      </div>
    );
  }

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
          { value: 'esta', label: 'Esta semana', description: `desde seg, ${diaMes(estaSemana)}` },
          { value: 'proxima', label: 'Próxima semana', description: `seg, ${diaMes(proxima)}` },
          { value: 'outra', label: 'Outra data', description: 'uma segunda à frente' },
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
              const inicio = semanaDe(dia).inicio;
              onChange(inicio < estaSemana ? estaSemana : inicio);
            }}
            className={`${CAMPO_BASE} min-h-11`}
          />
        </label>
      ) : null}
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
        {quando === 'esta'
          ? 'Vale já, inclusive no período em curso. Períodos encerrados mantêm o que tinham.'
          : `Começa na segunda ${diaMes(valor)}. Até lá vale o de hoje.`}
      </Text>
    </div>
  );
}
