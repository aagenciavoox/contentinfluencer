import {useEffect, useMemo, useState} from 'react';
import {useAppContext} from '../../../context/AppContext';
import {contentById} from '../lib/postItAppearance';
import {entraNoBloco} from '../../recording/lib/blocoDeGravacao';
import type {Content} from '../../../lib/database';
import type {PlanejamentoPostIt} from '../lib/postIt';

export function useSelecaoETeclado(args: {
  postIts: PlanejamentoPostIt[];
  contents: Content[];
  isMobile: boolean;
  openId: string | null;
  pullOpen: boolean;
  preview: {contentId: string; postItId: string | null; dia: string | null} | null;
  setPreview: (preview: {contentId: string; postItId: string | null; dia: string | null} | null) => void;
  setEditing: (editing: boolean) => void;
  setOpenId: (id: string | null) => void;
  closePostIt: () => void;
}) {
  const {dispatch, state} = useAppContext();
  const {
    postIts, contents, isMobile, openId, pullOpen, preview, setPreview, setEditing, setOpenId, closePostIt,
  } = args;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [blocoAlvo, setBlocoAlvo] = useState<Content[] | null>(null);

  useEffect(() => {
    if (isMobile) setSelectedIds(new Set());
  }, [isMobile]);

  const toggleSelected = (id: string) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const removeSelected = () => {
    const alive = new Set(postIts.map(postIt => postIt.id));
    const targets = [...selectedIds].filter(id => alive.has(id));
    if (targets.length === 0) {
      clearSelection();
      return;
    }
    if (openId && targets.includes(openId)) closePostIt();
    clearSelection();
    dispatch({type: 'DELETE_POST_ITS', payload: targets});
  };

  useEffect(() => {
    if (isMobile || selectedIds.size === 0) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }
      if (event.key === 'Escape') {
        clearSelection();
        return;
      }
      if (openId || pullOpen || preview || blocoAlvo) return;
      // Enter com um só selecionado abre: pré-visualização se tem conteúdo, o post-it se é reserva.
      if (event.key === 'Enter' && selectedIds.size === 1) {
        const [id] = [...selectedIds];
        const postIt = postIts.find(item => item.id === id);
        if (!postIt) return;
        event.preventDefault();
        if (postIt.contentId && contentById(contents, postIt.contentId)) {
          setPreview({contentId: postIt.contentId, postItId: postIt.id, dia: postIt.date});
        } else {
          setEditing(false);
          setOpenId(postIt.id);
        }
        return;
      }
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      event.preventDefault();
      removeSelected();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobile, selectedIds, openId, pullOpen, preview, blocoAlvo, postIts, contents]);
  /** Post-its selecionados que têm conteúdo: são eles que podem ir para um bloco de gravação. */
  const conteudosSelecionados = useMemo(
    () => [...selectedIds].flatMap(id => {
      const postIt = postIts.find(item => item.id === id);
      const content = contentById(contents, postIt?.contentId ?? null);
      return content && entraNoBloco(content, state.recordingBlocks) ? [content] : [];
    }),
    [selectedIds, postIts, contents, state.recordingBlocks],
  );

  return {
    selectedIds,
    setSelectedIds,
    blocoAlvo,
    setBlocoAlvo,
    toggleSelected,
    clearSelection,
    removeSelected,
    conteudosSelecionados,
  };
}
