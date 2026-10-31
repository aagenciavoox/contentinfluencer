import {useMemo} from 'react';
import {useAppContext} from '../../../context/AppContext';
import type {PlanejamentoPostIt} from '../lib/postIt';
import {postItsNaDataDoRoteiro} from '../lib/postItsNaData';

/** Post-its com o dia do roteiro ligado. Toda tela que lê post-it por data usa este. */
export function usePostItsNaData(): PlanejamentoPostIt[] {
  const {state} = useAppContext();
  const redeReferenciaId = state.editorial.preferencias.redeReferenciaId;
  return useMemo(() => postItsNaDataDoRoteiro({
    postIts: state.postIts ?? [],
    contents: state.contents,
    series: state.series,
    redeReferenciaId,
    platforms: state.platforms,
  }), [state.postIts, state.contents, state.series, redeReferenciaId, state.platforms]);
}
