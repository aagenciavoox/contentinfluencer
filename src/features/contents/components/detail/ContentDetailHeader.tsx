import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Link, useLocation} from 'react-router-dom';
import {ArrowRight, ChevronLeft, MoreHorizontal, Pencil, Trash2} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {Badge} from '../../../../components/ui/Badge';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {cn} from '../../../../lib/utils';
import type {Content, Pilar} from '../../../../lib/database';
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
  /** Itens extras no menu ⋯ (ex.: modo Texto/Carrossel). */
  overflowExtra?: React.ReactNode;
}

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
  overflowExtra,
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

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [menuOpen]);

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

  const overflowMenu = onDelete || onDerivar || overflowExtra ? (
    <div ref={menuRef} className="relative">
      <AppButton
        variant="secondary"
        iconOnly
        onClick={() => setMenuOpen(prev => !prev)}
        disabled={isSaving}
        aria-label={`Mais opções ${contentReference}`}
        leftIcon={<MoreHorizontal className="h-4 w-4" />}
      >
        Mais opções
      </AppButton>
      {menuOpen ? (
        <Surface
          variant="elevated"
          padding="none"
          className="absolute right-0 top-full z-50 mt-1 min-w-[200px] p-1"
        >
          {overflowExtra ? (
            <div
              className="border-b border-[var(--border-color)] p-1"
              onClick={() => setMenuOpen(false)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') setMenuOpen(false);
              }}
            >
              {overflowExtra}
            </div>
          ) : null}
          {onDerivar ? (
            <AppButton
              variant="ghost"
              fullWidth
              onClick={() => {
                onDerivar();
                setMenuOpen(false);
              }}
              className="justify-start"
            >
              Novo a partir deste
            </AppButton>
          ) : null}
          {onDelete ? (
            <AppButton
              variant="ghost"
              fullWidth
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => {
                onDelete();
                setMenuOpen(false);
              }}
              className="justify-start text-[var(--accent-red)] hover:text-[var(--accent-red)]"
            >
              Mover para a lixeira
            </AppButton>
          ) : null}
        </Surface>
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
      className="group -mx-2 inline-flex max-w-full items-center gap-2 rounded-[var(--radius-input)] px-2 py-1 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
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
      section={PAGE_SECTION.criacao}
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
