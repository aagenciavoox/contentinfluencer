import {useAppContext} from '../../../context/AppContext';
import type {PlanejamentoPostIt} from '../lib/postIt';

/**
 * Post-its com o dia que está gravado neles.
 * O dia do roteiro no Calendário é outro campo: só muda em "Salvar no calendário".
 */
export function usePostItsNaData(): PlanejamentoPostIt[] {
  const {state} = useAppContext();
  return state.postIts ?? [];
}
