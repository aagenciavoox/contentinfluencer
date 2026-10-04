import { TagSelect } from '../../../components/ui/TagSelect';
import { Text } from '../../../components/ui/Text';
import type { Projeto } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import {
  PROJETO_TIPO_OPCOES,
  avisoDiasInvalido,
  isProjetoEvento,
  type ProjetoTipoFormulario,
} from '../lib/evento';

const TIPOS = new Set<string>(PROJETO_TIPO_OPCOES.map(option => option.value));

function tipoDoFormulario(value: string | undefined, atual: Projeto['tipo']): ProjetoTipoFormulario {
  if (value && TIPOS.has(value)) return value as ProjetoTipoFormulario;
  if (TIPOS.has(atual)) return atual as ProjetoTipoFormulario;
  return 'publi';
}

export function ProjetoEventoFields({
  tipo,
  avisoDias,
  onTipoChange,
  onAvisoDiasChange,
  inputClassName = 'w-full',
}: {
  tipo: Projeto['tipo'];
  avisoDias: string;
  onTipoChange: (tipo: ProjetoTipoFormulario) => void;
  onAvisoDiasChange: (value: string) => void;
  inputClassName?: string;
}) {
  const evento = isProjetoEvento(tipo);
  const invalido = avisoDiasInvalido(tipo, avisoDias);

  return (
    <div className="stack-md">
      <TagSelect
        label="Tipo"
        values={[tipo === 'campanha' ? 'publi' : tipo]}
        onChange={values => onTipoChange(tipoDoFormulario(values[0], tipo))}
        options={PROJETO_TIPO_OPCOES}
        maxSelections={1}
        placeholder="Escolha o tipo"
      />
      {evento ? (
        <label className="block stack-sm">
          <Text variant="label">Avisar com quantos dias de antecedência</Text>
          <input
            type="number"
            min={0}
            max={120}
            inputMode="numeric"
            value={avisoDias}
            onChange={event => onAvisoDiasChange(event.target.value)}
            placeholder="Ex.: 12"
            className={cn(inputClassName, invalido && 'border-[var(--danger)]')}
            aria-invalid={invalido}
          />
          <Text variant="meta">
            {invalido ? 'Use um número de 0 a 120.' : 'De 0 a 120. Em branco, sem aviso.'}
          </Text>
        </label>
      ) : null}
    </div>
  );
}
