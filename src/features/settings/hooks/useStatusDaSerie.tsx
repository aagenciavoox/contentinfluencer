import { useCallback, useState } from 'react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { useAppContext } from '../../../context/AppContext';
import type { Serie } from '../../../lib/database';
import { comStatus, statusDaSerie, textoDaAtivacao, type StatusSerie } from '../lib/statusSerie';

/**
 * Troca o status da série (rascunho, ativa, arquivada) mantendo `ativa` coerente.
 * Antes de ativar, avisa quanto a série vai pedir por semana neste mês.
 */
export function useStatusDaSerie() {
  const { state, dispatch } = useAppContext();
  const [ativando, setAtivando] = useState<Serie | null>(null);

  const gravar = useCallback((serie: Serie, status: StatusSerie) => {
    void dispatch({
      type: 'UPDATE_SERIE',
      payload: { ...comStatus(serie, status), updatedAt: new Date().toISOString() },
    });
  }, [dispatch]);

  const mudarStatus = useCallback((serieId: string, status: StatusSerie) => {
    const serie = state.series.find(item => item.id === serieId);
    if (!serie || statusDaSerie(serie) === status) return;
    if (status === 'ativa') {
      setAtivando(serie);
      return;
    }
    gravar(serie, status);
  }, [gravar, state.series]);

  /** Ativa vira arquivada; rascunho e arquivada viram ativa (com o aviso). */
  const alternarAtiva = useCallback((serieId: string) => {
    const serie = state.series.find(item => item.id === serieId);
    if (!serie) return;
    mudarStatus(serieId, statusDaSerie(serie) === 'ativa' ? 'arquivada' : 'ativa');
  }, [mudarStatus, state.series]);

  const modalAtivacao = (
    <ConfirmModal
      open={Boolean(ativando)}
      message={ativando ? textoDaAtivacao(ativando) : ''}
      confirmLabel="Ativar"
      cancelLabel="Agora não"
      onConfirm={() => {
        if (ativando) gravar(ativando, 'ativa');
        setAtivando(null);
      }}
      onCancel={() => setAtivando(null)}
    />
  );

  return { mudarStatus, alternarAtiva, modalAtivacao };
}
