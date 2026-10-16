import { TagSelect } from '../../../components/ui/TagSelect';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import {
  PROJETO_TIPO_OPCOES,
  avisoDiasInvalido,
  isProjetoEvento,
  tiposPersonalizadosUsados,
  type ProjetoTipoFormulario,
} from '../lib/evento';

export function ProjetoEventoFields({
  tipo,
  avisoDias,
  tipoPersonalizado,
  tiposSalvos = [],
  incluirProducao = false,
  onTipoChange,
  onAvisoDiasChange,
  onTipoPersonalizadoChange,
  inputClassName = 'w-full',
}: {
  tipo: ProjetoTipoFormulario | string;
  avisoDias: string;
  tipoPersonalizado: string;
  tiposSalvos?: string[];
  incluirProducao?: boolean;
  onTipoChange: (tipo: ProjetoTipoFormulario) => void;
  onAvisoDiasChange: (value: string) => void;
  onTipoPersonalizadoChange: (value: string) => void;
  inputClassName?: string;
}) {
  const evento = isProjetoEvento(tipo);
  const invalido = avisoDiasInvalido(tipo, avisoDias);
  const salvos = tiposPersonalizadosUsados([
    ...tiposSalvos.map(nome => ({tipo: 'outro', tipoPersonalizado: nome})),
    {tipo: 'outro', tipoPersonalizado},
  ]);
  const nomeAtual = tipoPersonalizado.trim();
  const valorSalvo = nomeAtual
    ? salvos.find(nome => nome.toLocaleLowerCase('pt-BR') === nomeAtual.toLocaleLowerCase('pt-BR'))
    : undefined;
  const valorSelecionado = tipo === 'campanha'
    ? 'publi'
    : tipo === 'outro' && valorSalvo
      ? `pers:${valorSalvo}`
      : tipo === 'producao' || tipo === 'publi' || tipo === 'parceria' || tipo === 'evento' || tipo === 'maratona'
        ? tipo
        : 'outro';

  const opcoes = [
    ...PROJETO_TIPO_OPCOES.filter(opcao => opcao.value !== 'outro'),
    ...(incluirProducao ? [{value: 'producao' as const, label: 'Produção'}] : []),
    ...salvos
      .filter(nome => nome.toLocaleLowerCase('pt-BR') !== nomeAtual.toLocaleLowerCase('pt-BR') || Boolean(nomeAtual))
      .map(nome => ({value: `pers:${nome}`, label: nome})),
    {value: 'outro', label: 'Outro'},
  ];

  const escolherTipo = (valor: string | undefined) => {
    if (!valor) return;
    if (valor.startsWith('pers:')) {
      onTipoChange('outro');
      onTipoPersonalizadoChange(valor.slice(5));
      return;
    }
    onTipoChange(valor as ProjetoTipoFormulario);
    if (valor !== 'outro') onTipoPersonalizadoChange('');
  };

  return (
    <div className="stack-md">
      <TagSelect
        label="Tipo"
        values={[valorSelecionado]}
        onChange={values => escolherTipo(values[0])}
        options={opcoes}
        maxSelections={1}
        placeholder="Escolha o tipo"
      />
      {tipo === 'outro' ? (
        <label className="block stack-sm">
          <Text variant="label">Tipo personalizado</Text>
          <input
            value={tipoPersonalizado}
            onChange={event => onTipoPersonalizadoChange(event.target.value)}
            placeholder="Ex.: Collab com editora"
            className={inputClassName}
          />
          <Text variant="meta">Esse nome fica disponível nos próximos projetos.</Text>
        </label>
      ) : null}
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
