import { useAppContext } from '../../../context/AppContext';
import type { Serie } from '../../../lib/database';
import { tipoDaSerie } from '../../settings/lib/serieAgrupamento';
import { unidadesDaRegraDeOuro } from '../lib/regraDeOuro';
import { comFrequencia, frequenciaDoRascunho, textoDoChip, type RascunhoDaFrequencia } from '../lib/frequenciaChip';
import type { ErroDeFrequencia, FrequenciaGravada } from '../lib/metaDaOnda';

/**
 * Store único da frequência da série: lê a série do estado e grava com UPDATE_SERIE
 * nos mesmos campos que a Continuidade usa. O chip da série e o do Planejamento passam por aqui.
 */
export function useFrequenciaDaSerie(serieId: string | null | undefined) {
  const { state, dispatch } = useAppContext();
  const serie: Serie | null = serieId ? state.series.find(item => item.id === serieId) ?? null : null;
  const tipo = serie ? tipoDaSerie(serie.id, state.series) : null;
  // Quadro é sob demanda: o chip só mostra "Sob demanda", sem editar meta.
  const editavel = Boolean(serie) && tipo === 'serie';
  const unidades = serie ? unidadesDaRegraDeOuro(serie.id, state.series) : 1;

  /** Devolve o erro de validação, ou a frequência gravada. Só devolve depois que a gravação confirma. */
  const salvar = async (rascunho: RascunhoDaFrequencia): Promise<ErroDeFrequencia | FrequenciaGravada> => {
    if (!serie || !editavel) return { erro: 'Esta série não tem meta de frequência.', campo: 'quantidade' };
    const frequencia = frequenciaDoRascunho(rascunho, 'serie', unidades);
    if ('erro' in frequencia) return frequencia;
    try {
      await dispatch({ type: 'UPDATE_SERIE', payload: { ...comFrequencia(serie, frequencia), updatedAt: new Date().toISOString() } });
    } catch {
      return { erro: 'A meta não foi salva. O que você digitou continua aqui.', campo: 'quantidade' };
    }
    return frequencia;
  };

  return { serie, editavel, quadro: tipo === 'quadro', texto: serie ? textoDoChip(serie, { quadro: tipo === 'quadro', unidades }) : '', salvar };
}
