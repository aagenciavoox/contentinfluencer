import {useEffect, useRef, type ReactNode} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {createPortal} from 'react-dom';
import {PanelLeft} from 'lucide-react';
import {cn} from '../../lib/utils';

interface CalendarDesktopShellProps {
  sidebar: ReactNode;
  toolbar: ReactNode;
  toolbarExtra?: ReactNode;
  children: ReactNode;
  rightPanel?: ReactNode;
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;
  className?: string;
}

export function CalendarDesktopShell({
  sidebar,
  toolbar,
  toolbarExtra,
  children,
  rightPanel,
  sidebarOpen = false,
  onSidebarOpenChange,
  className,
}: CalendarDesktopShellProps) {
  const sidebarPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onSidebarOpenChange?.(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [sidebarOpen, onSidebarOpenChange]);

  const mobileDrawer =
    typeof document !== 'undefined'
      ? createPortal(
          <AnimatePresence>
            {sidebarOpen ? (
              <>
                <motion.div
                  initial={{opacity: 0}}
                  animate={{opacity: 1}}
                  exit={{opacity: 0}}
                  className="fixed inset-0 z-40 bg-[var(--backdrop-medium)] xl:hidden"
                  onClick={() => onSidebarOpenChange?.(false)}
                  aria-hidden
                />
                <motion.aside
                  ref={sidebarPanelRef}
                  initial={{x: '-100%'}}
                  animate={{x: 0}}
                  exit={{x: '-100%'}}
                  transition={{type: 'spring', damping: 28, stiffness: 280}}
                  className="fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] flex-col overflow-y-auto border-r border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 xl:hidden"
                >
                  {sidebar}
                </motion.aside>
              </>
            ) : null}
          </AnimatePresence>,
          document.body,
        )
      : null;

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2">
        <button
          type="button"
          onClick={() => onSidebarOpenChange?.(true)}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] xl:hidden"
          aria-label="Abrir painel lateral"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">{toolbar}</div>
        {toolbarExtra ? <div className="flex items-center gap-2">{toolbarExtra}</div> : null}
      </div>

      <div
        className={cn(
          'grid min-h-0 flex-1 gap-0',
          rightPanel ? 'xl:grid-cols-[260px_minmax(0,1fr)_300px]' : 'xl:grid-cols-[260px_minmax(0,1fr)]',
        )}
      >
        <aside className="hidden shrink-0 overflow-y-auto border-r border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 xl:block">
          {sidebar}
        </aside>

        <main className="min-w-0 overflow-hidden">{children}</main>

        {rightPanel ? (
          <aside className="hidden shrink-0 overflow-y-auto border-l border-[var(--border-color)] bg-[var(--bg-elevated)] xl:block">
            {rightPanel}
          </aside>
        ) : null}
      </div>

      {mobileDrawer}
    </div>
  );
}
