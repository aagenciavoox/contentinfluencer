import type {FiltroCalendario} from '../lib/filtroCalendario';
import {useAppContext} from '../../../context/AppContext';
import {notifySaveFeedback} from '../../../lib/saveFeedback';
import {colocarEAvisarConcentracao, type PlanoDaConcentracao} from '../lib/concentracaoAoColocar';

/** O commit começa imediatamente. O aviso vem só depois de salvar, sem pedir confirmação. */
export function useAvisoConcentracao(periodo: {inicio: string; fim: string}, filtro?: FiltroCalendario) {
  const {state} = useAppContext();
  return (acao: {
    depois: PlanoDaConcentracao;
    date: string | null;
    postItIds: readonly string[];
    contentIds: readonly string[];
  }, commit: () => void | Promise<unknown>) => colocarEAvisarConcentracao({
    ...acao, periodo, filtro,
    // Snapshot: dispatch é otimista e pode renderizar de novo durante a persistência.
    antes: {postIts: state.postIts ?? [], contents: state.contents},
    series: state.series, temas: state.temas, obras: state.bibliotecaItems,
    platforms: state.platforms, settings: state.editorial,
  }, commit, avisos => {
    // Um único toast para toda a seleção; permanece até dispensar, para dar tempo de ler.
    notifySaveFeedback({status: 'info', message: 'Para lembrar', detail: avisos.map(aviso => aviso.texto).join(' '), persistent: true});
  });
}
