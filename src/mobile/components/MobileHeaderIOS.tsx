import type { ReactNode } from 'react';
import { ChevronLeft, Menu, Search } from 'lucide-react';
import { Text } from '../../components/ui/Text';
import { cn } from '../../lib/utils';

interface MobileHeaderIOSProps {
  title: string;
  subtitle?: string;
  mode?: 'menu' | 'back';
  titleVariant?: 'default' | 'compact-center';
  showBrandLogo?: boolean;
  isHidden?: boolean;
  leftActionLabel?: string;
  rightActionLabel?: string;
  onLeftAction?: () => void;
  onRightAction?: () => void;
  rightActionIcon?: ReactNode;
}

/** Botão redondo do cabeçalho mobile (menu, voltar, busca). 44px, com moldura. */
export const MOBILE_HEADER_ACTION_CLASS = cn(
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)]',
  'bg-[var(--bg-secondary)] text-[var(--text-primary)] touch-manipulation active:scale-95',
  'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
);

export function MobileHeaderIOS({
  title,
  subtitle,
  mode = 'menu',
  titleVariant = 'default',
  showBrandLogo = false,
  isHidden = false,
  leftActionLabel,
  rightActionLabel,
  onLeftAction,
  onRightAction,
  rightActionIcon,
}: MobileHeaderIOSProps) {
  const leftLabel = leftActionLabel ?? (mode === 'back' ? 'Voltar' : 'Abrir menu');
  const isCompactCenter = titleVariant === 'compact-center';

  // iOS: com um campo de texto em foco, o primeiro toque só tira o foco e o clique se perde,
  // e o menu pedia dois toques. Por isso o menu abre no pointerup do toque (abrir é idempotente) e o
  // clique sintético é cancelado no touchend. Voltar continua só no clique para não navegar duas vezes.
  return (
    <header
      className="fixed inset-x-0 top-0 z-[70] transition-transform duration-300 ease-out motion-reduce:transition-none"
      style={{
        // Escondido, o header deixa a faixa da área segura: com a barra de status translúcida
        // do iOS, o conteúdo não passa por baixo do relógio.
        transform: isHidden ? 'translateY(calc(-100% + env(safe-area-inset-top, 0px)))' : 'translateY(0)',
      }}
    >
      <div
        className="border-b border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_92%,transparent)] px-4 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex h-14 max-h-14 items-center gap-2">
          <button
            type="button"
            aria-label={leftLabel}
            onPointerUp={mode === 'menu' ? event => {
              if (event.pointerType === 'touch') onLeftAction?.();
            } : undefined}
            onTouchEnd={mode === 'menu' ? event => {
              // Sem o clique sintético: o drawer já abriu no pointerup e esse clique cairia no fundo
              // escuro do drawer, fechando-o. Tira o foco do campo para o teclado não ficar por cima.
              event.preventDefault();
              if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            } : undefined}
            onClick={onLeftAction}
            className={MOBILE_HEADER_ACTION_CLASS}
          >
            {mode === 'back' ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {showBrandLogo ? (
            <img
              src="/brand/criaki-logo-light.png"
              alt="Criaki"
              className="mx-auto h-7 w-auto max-w-[7rem] object-contain object-center"
            />
          ) : (
            <div className={cn('flex min-w-0 flex-1 flex-col justify-center', isCompactCenter ? 'items-center text-center' : 'items-start text-left')}>
              <Text
                variant="pageTitle"
                truncate
                className="w-full font-bold tracking-tight text-[var(--text-primary)]"
              >
                {title}
              </Text>
              {subtitle ? (
                <Text variant="meta" truncate className="w-full leading-tight">
                  {subtitle}
                </Text>
              ) : null}
            </div>
          )}

          <button
            type="button"
            aria-label={rightActionLabel ?? 'Buscar'}
            onClick={onRightAction}
            className={MOBILE_HEADER_ACTION_CLASS}
          >
            {rightActionIcon ?? <Search className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
