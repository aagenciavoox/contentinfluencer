import type { KeyboardEvent } from 'react';

/**
 * Para áreas com clique que não podem virar <button> (um dia de calendário com
 * outros botões dentro): recebe foco e responde a Enter e Espaço como o clique.
 */
export function keyboardActivation(onActivate: () => void, label?: string) {
  return {
    role: 'group' as const,
    tabIndex: 0,
    'aria-label': label,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      onActivate();
    },
  };
}
