import { TagSelect } from '../../../../components/ui/TagSelect';
import { useAppContext } from '../../../../context/AppContext';
import { useAuth } from '../../../../context/AuthContext';
import { sincronizarTemasDoRoteiro } from '../../lib/temas';
import { generateUUID } from '../../../../utils/uuid';

interface TemaFieldProps {
  temaIds?: readonly string[] | null;
  onChange: (temaIds: string[]) => void;
}

export function TemaField({ temaIds, onChange }: TemaFieldProps) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const selecionados = temaIds ?? [];
  const nomes = selecionados.map(id => state.temas.find(tema => tema.id === id)?.nome ?? id);

  async function aplicar(next: string[]) {
    const result = sincronizarTemasDoRoteiro(state.temas, next, {
      userId: user?.id ?? '',
      now: new Date().toISOString(),
      novoId: generateUUID,
    }, selecionados);
    for (const tema of result.criados) {
      await dispatch({ type: 'ADD_TEMA', payload: tema }, { silent: true });
    }
    onChange(result.temaIds);
  }

  return (
    <TagSelect
      id="roteiro-temas"
      label="Temas"
      hint="Um rótulo leve, como Halloween. Não é uma série."
      creatable
      values={nomes}
      options={[...state.temas]
        .sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR'))
        .map(tema => ({ value: tema.nome, label: tema.nome }))}
      placeholder="Adicionar tema"
      onChange={next => {
        void aplicar(next);
      }}
    />
  );
}
