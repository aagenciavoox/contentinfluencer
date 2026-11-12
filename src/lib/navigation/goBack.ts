import type { NavigateFunction } from 'react-router-dom';

/** `history` desfaz o último passo; `fallback` abre o destino de reserva. */
export function backStep(historyIndex: unknown): 'history' | 'fallback' {
  return typeof historyIndex === 'number' && historyIndex > 0 ? 'history' : 'fallback';
}

function historyIndex(): unknown {
  return (window.history.state as { idx?: unknown } | null)?.idx;
}

/**
 * O botão Voltar e o voltar do mouse desfazem o mesmo passo.
 * Sem histórico nesta visita (link aberto direto), o destino de reserva substitui a página atual.
 */
export function returnTo(navigate: NavigateFunction, fallback: string) {
  if (backStep(historyIndex()) === 'history') navigate(-1);
  else navigate(fallback, { replace: true });
}

type BackLinkEvent = {
  defaultPrevented: boolean;
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  preventDefault: () => void;
};

/** Clique simples desfaz o histórico. Cmd, Ctrl, Shift e o botão do meio abrem o destino do link. */
export function interceptBackLink(event: BackLinkEvent, navigate: NavigateFunction, fallback: string) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  returnTo(navigate, fallback);
}
