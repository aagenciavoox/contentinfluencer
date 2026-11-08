import {useState, type DragEvent} from 'react';
import {useAppContext} from '../../../context/AppContext';
import {useAvisoConcentracao} from './useAvisoConcentracao';
import {changedPostIts, contentById} from '../lib/postItAppearance';
import {levarRoteiroAoDia, roteiroPublicado} from '../lib/postItsNaData';
import {encaixarPostIts, movePostIt, pullExistingContent, type PlanejamentoPostIt} from '../lib/postIt';
import type {Content} from '../../../lib/database';
import type {FiltroCalendario} from '../lib/filtroCalendario';
import {POST_IT_MIME} from '../components/PostItNote';

export function useMovimentacaoPlanejamento(args: {
  postIts: PlanejamentoPostIt[];
  contents: Content[];
  periodoDaSaude: {inicio: string; fim: string};
  filtro: FiltroCalendario;
}) {
  const {dispatch} = useAppContext();
  const {postIts, contents, periodoDaSaude, filtro} = args;
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [pileOver, setPileOver] = useState(false);
  const [pullOpen, setPullOpen] = useState(false);
  const [pullDate, setPullDate] = useState<string | null>(null);
  const [moveId, setMoveId] = useState<string | null>(null);
  const [moveDate, setMoveDate] = useState<string | null>(null);

  const applyList = (next: PlanejamentoPostIt[]) => {
    const {added, updated} = changedPostIts(postIts, next);
    return Promise.all([
      ...added.map(postIt => dispatch({type: 'ADD_POST_IT', payload: postIt})),
      ...updated.map(postIt => dispatch({type: 'UPDATE_POST_IT', payload: postIt})),
    ]);
  };

  const confirmarSeCouber = useAvisoConcentracao(periodoDaSaude, filtro);

  const moveMany = (ids: readonly string[], date: string | null) => {
    const targets: PlanejamentoPostIt[] = [];
    const contentTargets: Content[] = [];

    for (const id of ids) {
      if (id.startsWith('content:')) {
        const cId = id.slice(8);
        const content = contentById(contents, cId);
        if (content && !roteiroPublicado(content) && !contentTargets.some(c => c.id === cId)) {
          contentTargets.push(content);
        }
        continue;
      }

      const postIt = postIts.find(item => item.id === id);
      if (postIt) {
        if (targets.some(item => item.id === id) || postIt.date === date) continue;
        const content = contentById(contents, postIt.contentId);
        if (content && roteiroPublicado(content)) continue;
        targets.push(postIt);
        continue;
      }

      const content = contentById(contents, id);
      if (content && !roteiroPublicado(content) && !contentTargets.some(c => c.id === id)) {
        contentTargets.push(content);
      }
    }

    const movidos = targets.map(postIt => movePostIt(postIt, date));
    const roteirosMovidos = contentTargets.flatMap(content => {
      const movido = levarRoteiroAoDia(content, date);
      return movido ? [movido] : [];
    });
    const porPostIt = new Map(movidos.map(item => [item.id, item]));
    const porConteudo = new Map(roteirosMovidos.map(item => [item.id, item]));
    void confirmarSeCouber({
      date,
      postItIds: movidos.map(item => item.id),
      contentIds: [...movidos.flatMap(item => item.contentId ? [item.contentId] : []), ...porConteudo.keys()],
      depois: {
        postIts: postIts.map(item => porPostIt.get(item.id) ?? item),
        contents: contents.map(item => porConteudo.get(item.id) ?? item),
      },
    }, () => {
      // Post-it só muda o plano. Cartão do Calendário move a data oficial do roteiro.
      const gravacoes: Promise<void>[] = [];
      if (movidos.length > 0) gravacoes.push(dispatch({type: 'UPDATE_POST_ITS', payload: movidos}));
      for (const content of roteirosMovidos) gravacoes.push(dispatch({type: 'UPDATE_CONTENT', payload: content}));
      return Promise.all(gravacoes);
    });
  };

  const encaixarNoDia = (dia: readonly PlanejamentoPostIt[], ids: readonly string[], alvoId: string, antes: boolean) => {
    const presentes = new Set(dia.map(item => item.id));
    if (ids.length === 0 || ids.some(id => !presentes.has(id))) return false;
    const proximos = encaixarPostIts(dia, ids, alvoId, antes);
    const mudados = proximos.filter(item => dia.find(atual => atual.id === item.id)?.ordem !== item.ordem);
    if (mudados.length > 0) void dispatch({type: 'UPDATE_POST_ITS', payload: mudados});
    return true;
  };

  const readDragIds = (event: DragEvent) => {
    const raw = event.dataTransfer.getData(POST_IT_MIME) || event.dataTransfer.getData('text/plain');
    return raw.split('\n').map(id => id.trim()).filter(Boolean);
  };

  const pullOnto = (content: Content, date: string | null) => {
    const result = pullExistingContent({
      postIts,
      content,
      date,
    });
    if (!result.pulled) return;
    void confirmarSeCouber({
      date, postItIds: [], contentIds: [content.id],
      depois: {postIts: result.postIts, contents},
    }, () => {
      const gravacao = applyList(result.postIts);
      setPullOpen(false);
      return gravacao;
    });
  };
  const abrirMover = (postIt: PlanejamentoPostIt) => {
    setMoveDate(postIt.date ?? null);
    setMoveId(postIt.id);
  };

  const abrirMoverPublicacao = (contentId: string) => {
    const content = contentById(contents, contentId);
    const dia = content?.publishDate ? content.publishDate.slice(0, 10) : null;
    setMoveDate(dia);
    setMoveId(`content:${contentId}`);
  };

  const fecharMover = () => setMoveId(null);

  const confirmarMover = () => {
    const id = moveId;
    setMoveId(null);
    if (!id) return;
    if (id.startsWith('content:')) {
      const cId = id.slice(8);
      const content = contentById(contents, cId);
      const currentDia = content?.publishDate ? content.publishDate.slice(0, 10) : null;
      if (!content || currentDia === moveDate) return;
      moveMany([id], moveDate);
      return;
    }
    const postIt = postIts.find(item => item.id === id);
    if (!postIt || (postIt.date ?? null) === moveDate) return;
    // moveMany mantém os avisos de "Passa do editorial".
    moveMany([id], moveDate);
  };


  return {
    dragOverDay, setDragOverDay,
    pileOver, setPileOver,
    pullOpen, setPullOpen,
    pullDate, setPullDate,
    moveId, setMoveId,
    moveDate, setMoveDate,
    applyList,
    confirmarSeCouber,
    moveMany,
    encaixarNoDia,
    readDragIds,
    pullOnto,
    abrirMover,
    abrirMoverPublicacao,
    fecharMover,
    confirmarMover,
  };
}
