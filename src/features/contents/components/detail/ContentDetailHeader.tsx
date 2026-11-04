import {useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {
  AlignLeft,
  ArrowRight,
  Check,
  CopyPlus,
  GalleryHorizontalEnd,
  MoreHorizontal,
  Pencil,
  Trash2,
  Youtube,
} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {Badge} from '../../../../components/ui/Badge';
import {Text} from '../../../../components/ui/Text';
import {cn} from '../../../../lib/utils';
import type {Content, Pilar, WritingMode} from '../../../../lib/database';
import {WRITING_MODE_HINTS, WRITING_MODE_LABELS, WRITING_MODES} from '../../lib/carouselSlides';
import type {ContentPrimaryAction, ContentPrimaryActionId} from '../../lib/contentPipeline';
import {getDisplayStatus} from '../../lib/contentPipeline';
import {ContentTemaChips} from '../ContentTemaChips';
import {DesktopPageHeader} from '../../../../layouts/page/DesktopPageHeader';
import {PAGE_SECTION} from '../../../../layouts/navigation/navConfig';
import {labelForDetailBack, resolveContentDetailBack} from '../../../../lib/navigation/detailBack';

interface ContentDetailHeaderProps {
  content: Content;
  title?: string;
  onTitleChange?: (title: string) => void;
  primaryAction: ContentPrimaryAction;
  onPrimaryAction: (actionId?: ContentPrimaryActionId) => void;
  onRetrySave?: () => void;
  onDelete?: () => void;
  /** Cria outro conteúdo com origem_conteudo_id. */
  onDerivar?: () => void;
  isSaving: boolean;
  primaryBusy?: boolean;
  blockName?: string | null;
  blockOrder?: number | null;
  saveHint?: string;
  pilar?: Pilar | null;
  authorName?: string;
  compact?: boolean;
  hideTitle?: boolean;
  breadcrumbMode?: 'content' | 'pipeline';
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  contentKind?: 'idea' | 'script';
  /**
   * document: só "‹ Criação" à esquerda e "Salvo" + "⋯" à direita. O título e o botão
   * de avançar ficam na área de escrita (aba Roteiro com Escrita/Gestão, no computador).
   */
  variant?: 'default' | 'document';
  /** Escolha do modo de escrita no topo do menu ⋯. */
  writingModes?: WritingModeMenu;
}

export type WritingModeMenu = {
  value: WritingMode;
  onChange: (mode: WritingMode) => void;
  /** Modos que o banco ainda não aceita, com o motivo no lugar da descrição. */
  unavailable?: Partial<Record<WritingMode, string>>;
};

const WRITING_MODE_ICONS: Record<WritingMode, typeof AlignLeft> = {
  texto: AlignLeft,
  youtube: Youtube,
  carrossel: GalleryHorizontalEnd,
};

const MENU_ITEM_CLASS = cn(
  'flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors',
  'hover:bg-[var(--bg-hover)] focus-visible:bg-[var(--bg-hover)] focus-visible:outline-none',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
);

/**
 * Botão principal do fluxo (ex.: "Avançar para gravação"), com o rótulo de cada etapa.
 * A ação secundária (ex.: "Dispensar edição") vem antes, mais discreta.
 */
export function ContentPrimaryActionButton({
  primaryAction,
  onPrimaryAction,
  busy = false,
}: {
  primaryAction: ContentPrimaryAction;
  onPrimaryAction: (actionId?: ContentPrimaryActionId) => void;
  busy?: boolean;
}) {
  if (primaryAction.id === 'none') return null;
  const secondary = primaryAction.secondary;
  return (
    <>
      {secondary ? (
        <AppButton variant="secondary" onClick={() => onPrimaryAction(secondary.id)} disabled={busy}>
          {secondary.label}
        </AppButton>
      ) : null}
      <AppButton
        variant="primary"
        onClick={() => onPrimaryAction()}
        disabled={busy || primaryAction.disabled}
        disabledReason={primaryAction.disabled ? primaryAction.reason : undefined}
        rightIcon={primaryAction.id === 'advance_to_recording' || primaryAction.id === 'promote_to_script' ? <ArrowRight className="h-4 w-4" /> : undefined}
      >
        {primaryAction.label}
      </AppButton>
    </>
  );
}

export function ContentDetailHeader({
  content,
  title,
  onTitleChange,
  primaryAction,
  onPrimaryAction,
  onRetrySave,
  onDelete,
  onDerivar,
  isSaving,
  primaryBusy,
  blockName,
  blockOrder,
  saveHint,
  pilar,
  authorName,
  compact = false,
  hideTitle = false,
  breadcrumbMode = 'content',
  saveState = 'idle',
  contentKind = 'script',
  variant = 'default',
  writingModes,
}: ContentDetailHeaderProps) {
  const location = useLocation();
  const displayTitle = title ?? content.title;
  const isIdea = contentKind === 'idea';
  const listLabel = isIdea ? 'Ideias' : breadcrumbMode === 'pipeline' ? 'Roteiros' : 'Criação';
  const listTarget = isIdea ? '/criacao?tab=ideias' : breadcrumbMode === 'pipeline' ? '/criacao?tab=roteiros' : '/criacao';
  const origin = resolveContentDetailBack(location.state as {from?: string} | null);
  const backTo = location.state && typeof location.state === 'object' && 'from' in location.state
    ? origin
    : listTarget;
  const contentReference = isIdea ? 'da ideia' : 'do roteiro';
  const [menuOpen, setMenuOpen] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const hasPrimaryAction = primaryAction.id !== 'none';
  const displayStatus = getDisplayStatus(content);
  const workflowBusy = primaryBusy ?? isSaving;

  useEffect(() => {
    if (!titleEditing) return;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [titleEditing]);

  const menuItems = () => Array.from(
    menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menu"] button:not(:disabled)') ?? [],
  );

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handleClick);
    // Abre com o foco no modo atual (ou no primeiro item), para as setas funcionarem logo.
    const items = menuItems();
    (items.find(item => item.getAttribute('aria-checked') === 'true') ?? items[0])?.focus();
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [menuOpen]);

  const closeMenu = (returnFocus = false) => {
    setMenuOpen(false);
    if (returnFocus) menuRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')?.focus();
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') event.preventDefault();
      closeMenu(event.key === 'Escape');
      return;
    }
    const items = menuItems();
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === 'ArrowDown' ? (index + 1) % items.length
      : event.key === 'ArrowUp' ? (index - 1 + items.length) % items.length
        : event.key === 'Home' ? 0
          : event.key === 'End' ? items.length - 1
            : null;
    if (next === null) return;
    event.preventDefault();
    items[next]?.focus();
  };

  const saveIndicator = saveHint ? (
    <div className="inline-flex min-w-0 items-center gap-1.5">
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          saveState === 'saved' && 'bg-[var(--success)]',
          saveState === 'saving' && 'animate-pulse bg-[var(--accent-blue)]',
          saveState === 'idle' && 'bg-[var(--text-tertiary)]',
          saveState === 'error' && 'bg-[var(--accent-red)]',
        )}
        aria-hidden
      />
      <Text
        as="span"
        variant="meta"
        className={cn(
          'truncate',
          saveState === 'error' ? 'text-[var(--accent-red)]' : 'text-[var(--text-tertiary)]',
        )}
      >
        {saveHint}
      </Text>
      {saveState === 'error' && onRetrySave ? (
        <AppButton
          variant="ghost"
          size="xs"
          onClick={onRetrySave}
          disabled={isSaving}
          className="h-7 px-2 text-[var(--accent-red)] hover:text-[var(--accent-red)]"
        >
          Tentar novamente
        </AppButton>
      ) : null}
    </div>
  ) : null;

  // Menu ⋯ em três grupos: como escrever (escolha única), criar a partir deste e, por último, a lixeira.
  const overflowMenu = onDelete || onDerivar || writingModes ? (
    <div ref={menuRef} className="relative">
      <AppButton
        variant="secondary"
        iconOnly
        onClick={() => setMenuOpen(prev => !prev)}
        disabled={isSaving}
        aria-label={`Mais opções ${contentReference}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        leftIcon={<MoreHorizontal className="h-4 w-4" />}
      >
        Mais opções
      </AppButton>
      {menuOpen ? (
        <div
          role="menu"
          aria-label={`Opções ${contentReference}`}
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-1 w-[17rem] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-dropdown)]"
        >
          {writingModes ? (
            <div role="group" aria-labelledby="content-menu-writing-mode">
              <Text
                id="content-menu-writing-mode"
                variant="meta"
                as="p"
                className="px-2.5 pb-1 pt-1.5 text-[var(--text-tertiary)]"
              >
                Modo de escrita
              </Text>
              {WRITING_MODES.map(mode => {
                const Icon = WRITING_MODE_ICONS[mode];
                const selected = writingModes.value === mode;
                const blockedReason = selected ? undefined : writingModes.unavailable?.[mode];
                return (
                  <button
                    key={mode}
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    disabled={Boolean(blockedReason)}
                    onClick={() => {
                      closeMenu(true);
                      if (!selected) writingModes.onChange(mode);
                    }}
                    className={MENU_ITEM_CLASS}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        selected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <Text as="span" variant={selected ? 'bodyStrong' : 'body'} className="block text-[var(--text-primary)]">
                        {WRITING_MODE_LABELS[mode]}
                      </Text>
                      <Text as="span" variant="meta" className="block text-[var(--text-tertiary)]">
                        {blockedReason ?? WRITING_MODE_HINTS[mode]}
                      </Text>
                    </span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-[var(--text-primary)]" aria-hidden /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
          {writingModes && onDerivar ? <MenuSeparator /> : null}
          {onDerivar ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                onDerivar();
              }}
              className={MENU_ITEM_CLASS}
            >
              <CopyPlus className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
              <Text as="span" variant="body" className="text-[var(--text-primary)]">Novo a partir deste</Text>
            </button>
          ) : null}
          {onDelete && (writingModes || onDerivar) ? <MenuSeparator /> : null}
          {onDelete ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu();
                onDelete();
              }}
              className={cn(MENU_ITEM_CLASS, 'text-[var(--accent-red)]')}
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              <Text as="span" variant="body" className="text-inherit">Mover para a lixeira</Text>
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : null;

  const titleBlock = !hideTitle && onTitleChange && titleEditing ? (
    <div className="min-w-0">
      <input
        ref={titleInputRef}
        type="text"
        value={displayTitle}
        onChange={event => onTitleChange(event.target.value)}
        onBlur={() => setTitleEditing(false)}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        aria-label={`Título ${contentReference}`}
        autoComplete="off"
        placeholder={isIdea ? 'Ideia sem título' : 'Roteiro sem título'}
        className="t-page-title w-full !rounded-none !border-0 !border-b !border-[var(--border-strong)] !bg-transparent !px-0 !py-1 !shadow-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:!border-[var(--accent)] focus:!shadow-none"
      />
    </div>
  ) : !hideTitle && onTitleChange ? (
    // Título editável: fundo no hover e lápis sempre à vista, para dizer que dá para editar.
    <button
      type="button"
      onClick={() => setTitleEditing(true)}
      aria-label={`Editar título ${contentReference}`}
      className="group inline-flex max-w-full items-center gap-2 rounded-[var(--radius-input)] py-1 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <Text as="span" variant="pageTitle" truncate>
        {displayTitle || (isIdea ? 'Ideia sem título' : 'Roteiro sem título')}
      </Text>
      <Pencil className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-colors group-hover:text-[var(--text-primary)]" aria-hidden />
    </button>
  ) : !hideTitle ? (
    <Text variant="pageTitle" className="break-words">
      {displayTitle || (isIdea ? 'Ideia sem título' : 'Roteiro sem título')}
    </Text>
  ) : null;

  const titleContent = titleBlock ? (
    contentKind === 'script' ? (
      <div className="min-w-0 stack-sm">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1">{titleBlock}</div>
          {saveIndicator ? <div className="shrink-0">{saveIndicator}</div> : null}
        </div>
        <ContentTemaChips temaIds={content.temaIds} max={6} />
      </div>
    ) : (
      <div className="min-w-0 stack-sm">
        {titleBlock}
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant="status" status={displayStatus}>
            {displayStatus}
          </Badge>
          <ContentTemaChips temaIds={content.temaIds} max={6} />
          {saveIndicator ? (
            <>
              <span className="text-[var(--border-strong)]" aria-hidden>
                ·
              </span>
              {saveIndicator}
            </>
          ) : null}
        </div>
      </div>
    )
  ) : undefined;

  if (variant === 'document') {
    const crumbLabel = labelForDetailBack(backTo, listLabel);
    return (
      <header className="desktop-page-header">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Link
            to={backTo}
            className="desktop-page-header-crumb desktop-page-header-back transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            {crumbLabel === 'Roteiros' ? 'Criação' : crumbLabel}
          </Link>
          <div className="flex min-w-0 items-center justify-end gap-3">
            {saveIndicator}
            {overflowMenu}
          </div>
        </div>
      </header>
    );
  }

  const meta = [
    authorName,
    pilar?.nome,
    blockName ? (blockOrder ? `${blockName} (ordem ${blockOrder})` : blockName) : null,
  ].filter(Boolean).join(' · ') || undefined;

  return (
    <DesktopPageHeader
      section={PAGE_SECTION.producao}
      title={displayTitle || (isIdea ? 'Ideia sem título' : 'Roteiro sem título')}
      titleContent={titleContent}
      backLabel={labelForDetailBack(backTo, listLabel)}
      backTo={backTo}
      meta={compact ? undefined : meta}
      rowAlign={contentKind === 'script' ? 'center' : 'start'}
      actions={(
        <>
          {hasPrimaryAction ? (
            <ContentPrimaryActionButton
              primaryAction={primaryAction}
              onPrimaryAction={onPrimaryAction}
              busy={workflowBusy}
            />
          ) : null}
          {overflowMenu}
        </>
      )}
    />
  );
}

function MenuSeparator() {
  return <div role="separator" className="mx-1 my-1 h-px bg-[var(--border-color)]" />;
}
