/**
 * Canonical mobile shell surface.
 * AppShell chooses this variant when SHELL_MOBILE_QUERY matches.
 * Safe areas: header (top), bottom nav (pb-safe), main scroll insets.
 */
export { MobileAppShell } from './MobileAppShell';
export { MobileBottomNav } from './MobileBottomNav';
export { MobileHeaderIOS } from './MobileHeaderIOS';
export { MobileActionMenu } from './MobileActionMenu';

export type MobileChromeOutletContext = {
  openSearch: () => void;
};

