import { useId } from 'react';
import { SelectField } from '../../../../components/ui/SelectField';
import { Text } from '../../../../components/ui/Text';
import { unidadeDaMeta, type UnidadeDaMeta } from '../../lib/metaDaOnda';
import { CAMPO } from './campos';

export const UNIDADES = [
  { value: 'semana', label: 'por semana' },
  { value: 'quinzena', label: 'a cada 14 dias' },
  { value: 'mes', label: 'por mês' },
];

/** Quantidade, período e início da meta: Continuidade e chip de frequência. */
export function CamposDaMeta({
  vezes,
  unidade,
  inicio,
  onVezes,
  onUnidade,
  onInicio,
}: {
  vezes: string;
  unidade: UnidadeDaMeta;
  inicio: string;
  onVezes: (valor: string) => void;
  onUnidade: (valor: UnidadeDaMeta) => void;
  onInicio: (valor: string) => void;
}) {
  const base = useId();
  return (
    <div className="grid-form">
      <label className="flex flex-col gap-1" htmlFor={`${base}-quantidade`}>
        <Text variant="meta" as="span">Quantidade</Text>
        <input
          id={`${base}-quantidade`}
          type="text"
          inputMode="numeric"
          aria-label="Quantidade"
          className={CAMPO}
          value={vezes}
          onChange={event => onVezes(event.target.value.replace(/\D/g, '').slice(0, 2))}
        />
      </label>
      <div className="flex flex-col gap-1">
        <Text variant="meta" as="span">Período</Text>
        <SelectField
          block
          ariaLabel="Período"
          value={unidade}
          onChange={valor => onUnidade(unidadeDaMeta(valor))}
          options={UNIDADES}
        />
      </div>
      <label className="flex flex-col gap-1" htmlFor={`${base}-inicio`}>
        <Text variant="meta" as="span">Data de início{unidade === 'quinzena' ? '' : ' (opcional)'}</Text>
        <input
          id={`${base}-inicio`}
          type="date"
          aria-label="Data de início"
          className={CAMPO}
          value={inicio}
          onChange={event => onInicio(event.target.value)}
        />
      </label>
    </div>
  );
}
