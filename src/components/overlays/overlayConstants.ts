export const Z_INDEX_NAV = 'z-[80]';
export const Z_INDEX_DRAWER_BACKDROP = 'z-[100]';
export const Z_INDEX_MODAL = 'z-[110]';
export const Z_INDEX_CONFIRM = 'z-[200]';

export const MOBILE_MODAL_EDGE_PADDING = '8px';
export const MOBILE_MODAL_MAX_HEIGHT =
  'calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 16px)';

export const MOBILE_PANEL_INITIAL = { opacity: 0, scale: 0.985, y: 24 };
export const MOBILE_PANEL_ANIMATE = { opacity: 1, scale: 1, y: 0 };
export const MOBILE_PANEL_EXIT = { opacity: 0, scale: 0.985, y: 16 };
export const MOBILE_PANEL_TRANSITION = {
  type: 'tween' as const,
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const DESKTOP_PANEL_TRANSITION = {
  type: 'spring' as const,
  damping: 30,
  stiffness: 300,
};

export const DESKTOP_DIALOG_INITIAL = { opacity: 0, scale: 0.96, y: 12 };
export const DESKTOP_DIALOG_ANIMATE = { opacity: 1, scale: 1, y: 0 };
export const DESKTOP_DIALOG_EXIT = { opacity: 0, scale: 0.96, y: 12 };
