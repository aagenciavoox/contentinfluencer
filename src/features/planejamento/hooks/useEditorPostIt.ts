import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useAppContext} from '../../../context/AppContext';
import {contentById} from '../lib/postItAppearance';
import {buildContentDetailRoute} from '../../contents/lib/contentDetailRoute';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';
import {
  createEmptyPostIt,
  postItEditDraft,
  postItMudou,
  savePostItEdit,
  transformPostIt,
  type PlanejamentoPostIt,
  type PostItEdit,
} from '../lib/postIt';
import type {Content} from '../../../lib/database';

export function useEditorPostIt(args: {
  postIts: PlanejamentoPostIt[];
  contents: Content[];
  confirmarSeCouber: (
    acao: {
      depois: {postIts: PlanejamentoPostIt[]; contents: Content[]};
      date: string | null;
      postItIds: readonly string[];
      contentIds: readonly string[];
    },
    commit: () => void | Promise<unknown>,
  ) => void;
  retornoPlanejamento: string;
  setMonth: (data: Date) => void;
}) {
  const {dispatch, state} = useAppContext();
  const navigate = useNavigate();
  const {postIts, contents, confirmarSeCouber, retornoPlanejamento, setMonth} = args;
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [dateDraft, setDateDraft] = useState<string | null>(null);
  const [classeDraft, setClasseDraft] = useState<PostItEdit>({texto: '', date: null});
  const [encaixeId, setEncaixeId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{contentId: string; postItId: string | null; dia: string | null} | null>(null);
  const [rapidoDate, setRapidoDate] = useState<string | null | undefined>(undefined);
  const editarAoAbrir = useRef(false);
  const openPostIt = postIts.find(postIt => postIt.id === openId) ?? null;
  const openContent = contentById(contents, openPostIt?.contentId ?? null);
  const openPostItId = openPostIt?.id ?? null;
  const encaixePostIt = postIts.find(postIt => postIt.id === encaixeId) ?? null;

  useEffect(() => {
    if (openPostItId && editarAoAbrir.current) {
      editarAoAbrir.current = false;
      setEditing(true);
      return;
    }
    setEditing(false);
  }, [openPostItId]);
  // Novo post-it abre primeiro o formulário rápido. O dia clicado vai junto, sem campo de data.
  const addEmpty = (date: string | null) => {
    setRapidoDate(date);
  };

  const fecharRapido = () => setRapidoDate(undefined);

  const criarDoRapido = async (draft: PostItEdit): Promise<PlanejamentoPostIt> => {
    const postIt = savePostItEdit(createEmptyPostIt({date: rapidoDate ?? null}), draft);
    await dispatch({type: 'ADD_POST_IT', payload: postIt});
    return postIt;
  };

  const salvarRapido = async (draft: PostItEdit) => {
    try {
      const postIt = await criarDoRapido(draft);
      fecharRapido();
      if (postIt.date) setMonth(new Date(`${postIt.date}T12:00:00`));
    } catch {
      // O aviso de erro já saiu. O diálogo rápido continua aberto.
    }
  };

  /** Abre o post-it já no editor completo ("Mais opções" do rápido, "Editar reserva" do cartão). */
  const abrirEmEdicao = (postIt: PlanejamentoPostIt) => {
    const edit = postItEditDraft(postIt);
    setNoteDraft(edit.texto);
    setDateDraft(edit.date);
    setClasseDraft(edit);
    if (openId === postIt.id) {
      setEditing(true);
      return;
    }
    editarAoAbrir.current = true;
    setOpenId(postIt.id);
  };

  const maisOpcoesDoRapido = async (draft: PostItEdit) => {
    try {
      const postIt = await criarDoRapido(draft);
      fecharRapido();
      abrirEmEdicao(postIt);
    } catch {
      // O aviso de erro já saiu. O diálogo rápido continua aberto.
    }
  };

  /** Fecha o post-it. Em edição, descarta o rascunho: Esc, fundo, "X" e Cancelar fecham tudo. */
  const closePostIt = () => {
    setEditing(false);
    setOpenId(null);
  };

  const startEdit = () => {
    if (!openPostIt) return;
    const draft = postItEditDraft(openPostIt);
    setNoteDraft(draft.texto);
    setDateDraft(draft.date);
    setClasseDraft(draft);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!openPostIt) return;
    // Com conteúdo ligado, a classificação é a do conteúdo: o post-it não grava a dele.
    const classe = openContent
      ? {redes: classeDraft.redes ?? []}
      : {serieId: classeDraft.serieId, pilarId: classeDraft.pilarId, objetivo: classeDraft.objetivo, redes: classeDraft.redes ?? []};
    const saved = savePostItEdit(openPostIt, {texto: noteDraft, date: dateDraft, ...classe});
    void confirmarSeCouber({
      date: saved.date !== openPostIt.date ? saved.date : null,
      postItIds: [saved.id], contentIds: saved.contentId ? [saved.contentId] : [],
      depois: {postIts: postIts.map(item => item.id === saved.id ? saved : item), contents},
    }, async () => {
      if (postItMudou(openPostIt, saved)) {
        await dispatch({type: 'UPDATE_POST_IT', payload: saved});
      }
      setNoteDraft(saved.texto);
      setDateDraft(saved.date);
      setEditing(false);
    });
  };
  /** Vai direto à página do roteiro (duplo clique, "Abrir roteiro" do menu e da pré-visualização). */
  const abrirRoteiro = (contentId: string) => {
    setPreview(null);
    navigate(buildContentDetailRoute(contentId, 'roteiro'), buildDetailBackState(retornoPlanejamento));
  };

  /** Transforma o post-it aberto ou, pelo menu do cartão, o post-it indicado. */
  const commitTransform = (target: 'ideia' | 'roteiro', alvo: PlanejamentoPostIt | null = openPostIt) => {
    if (!alvo || (alvo.id === openPostIt?.id && editing)) return;
    const result = transformPostIt({
      postIt: alvo,
      contents,
      target,
      contas: state.platforms,
    });
    if (!result.ok) return;
    void (async () => {
      try {
        await dispatch({
          type: result.mode === 'create' ? 'ADD_CONTENT' : 'UPDATE_CONTENT',
          payload: result.content,
        });
        await dispatch({type: 'UPDATE_POST_IT', payload: result.postIt});
      } catch {
        return;
      }
      if (openPostIt?.id === alvo.id) setOpenId(null);
      setPreview(null);
      if (result.openScript) {
        navigate(
          buildContentDetailRoute(result.content.id, 'roteiro'),
          buildDetailBackState(retornoPlanejamento),
        );
      }
    })();
  };

  const desenvolverReserva = (postIt: PlanejamentoPostIt) => {
    const result = transformPostIt({
      postIt,
      contents,
      target: 'roteiro',
      contas: state.platforms,
    });
    if (!result.ok) {
      setEditing(false);
      setOpenId(postIt.id);
      return;
    }
    void (async () => {
      try {
        await dispatch({
          type: result.mode === 'create' ? 'ADD_CONTENT' : 'UPDATE_CONTENT',
          payload: result.content,
        });
        await dispatch({type: 'UPDATE_POST_IT', payload: result.postIt});
      } catch {
        return;
      }
      if (result.openScript) {
        navigate(
          buildContentDetailRoute(result.content.id, 'roteiro'),
          buildDetailBackState(retornoPlanejamento),
        );
      }
    })();
  };
  // Post-it aberto em leitura: E entra na edição, como o botão Editar.
  useEffect(() => {
    if (!openPostItId || editing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'e' && event.key !== 'E') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }
      event.preventDefault();
      startEdit();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPostItId, editing, startEdit]);

  return {
    openId, setOpenId,
    editing, setEditing,
    noteDraft, setNoteDraft,
    dateDraft, setDateDraft,
    classeDraft, setClasseDraft,
    encaixeId, setEncaixeId,
    preview, setPreview,
    rapidoDate, setRapidoDate,
    editarAoAbrir,
    openPostIt, openContent, openPostItId, encaixePostIt,
    addEmpty, fecharRapido, criarDoRapido, salvarRapido, abrirEmEdicao, maisOpcoesDoRapido,
    closePostIt, startEdit, saveEdit,
    abrirRoteiro, commitTransform, desenvolverReserva,
  };
}
