import {useEffect, useRef, useState} from 'react';
import {ArrowRight, MoreHorizontal, Pencil, Trash2} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {Badge} from '../../../../components/ui/Badge';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {cn} from '../../../../lib/utils';
import type {Content, Pilar} from '../../../../lib/database';
import type {ContentPrimaryAction} from '../../lib/contentPipeline';
import {getDisplayStatus} from '../../lib/contentPipeline';
import {DesktopPageHeader} from '../../../../layouts/page/DesktopPageHeader';
import {PAGE_SECTION} from '../../../../layouts/navigation/navConfig';

interface ContentDetailHeaderProps {
  content: Content;
  title?: string;
  onTitleChange?: (title: string) => void;
  primaryAction: ContentPrimaryAction;
  onPrimaryAction: () => void;
  onRetrySave?: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  blockName?: string | null;
  blockOrder?: number | null;
  saveHint?: string;
  pilar?: Pilar | null;
  authorName?: string;
  compact?: boolean;
  hideTitle?: boolean;
  breadcrumbMode?: 'content' | 'pipeline';
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
}

export function ContentDetailHeader({
  content,
  title,
  onTitleChange,
  primaryAction,
  onPrimaryAction,
  onRetrySave,
  onDelete,
  isSaving,
  blockName,
  blockOrder,
  saveHint,
  pilar,
  authorName,
  compact = false,
  hideTitle = false,
  breadcrumbMode = 'content',
  saveState = 'idle',
}: ContentDetailHeaderProps) {
  const displayTitle = title ?? content.title;
  const [menuOpen, setMenuOpen] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const hasPrimaryAction = primaryAction.id !== 'none';
  const displayStatus = getDisplayStatus(content);

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

  const overflowMenu = onDelete ? (
    <div ref={menuRef} className="relative">
      <AppButton
        variant="secondary"
        iconOnly
        onClick={() => setMenuOpen(prev => !prev)}
        disabled={isSaving}
        aria-label="Mais opções do roteiro"
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
        aria-label="Título do roteiro"
        autoComplete="off"
        placeholder="Roteiro sem título"
        className="t-page-title w-full !rounded-none !border-0 !border-b !border-[var(--border-strong)] !bg-transparent !px-0 !py-1 !shadow-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:!border-[var(--accent)] focus:!shadow-none"
      />
    </div>
  ) : !hideTitle && onTitleChange ? (
    <AppButton
      variant="ghost"
      onClick={() => setTitleEditing(true)}
      aria-label="Editar título do roteiro"
      rightIcon={
        <Pencil
          className="h-4 w-4 text-[var(--text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        />
      }
      className="group h-auto max-w-full justify-start px-0 py-1 text-left hover:bg-transparent"
    >
      <Text as="span" variant="pageTitle" truncate>
        {displayTitle || 'Roteiro sem título'}
      </Text>
    </AppButton>
  ) : !hideTitle ? (
    <Text variant="pageTitle" className="break-words">
      {displayTitle || 'Roteiro sem título'}
    </Text>
  ) : null;

  const titleContent = titleBlock ? (
    <div className="min-w-0 stack-sm">
      {titleBlock}
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Badge variant="status" status={displayStatus}>
          {displayStatus}
        </Badge>
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
  ) : undefined;

  const meta = [
    authorName,
    pilar?.nome,
    blockName ? (blockOrder ? `${blockName} (ordem ${blockOrder})` : blockName) : null,
  ].filter(Boolean).join(' · ') || undefined;

  return (
    <DesktopPageHeader
      section={PAGE_SECTION.criacao}
      title={displayTitle || 'Roteiro sem título'}
      titleContent={titleContent}
      backLabel={breadcrumbMode === 'pipeline' ? 'Roteiros' : 'Conteúdos'}
      backTo={breadcrumbMode === 'pipeline' ? '/criacao?tab=roteiros' : '/criacao'}
      meta={compact ? undefined : meta}
      actions={(
        <>
          {hasPrimaryAction ? (
            <AppButton
              variant="primary"
              onClick={onPrimaryAction}
              disabled={isSaving || primaryAction.disabled}
              title={primaryAction.disabled && primaryAction.reason ? primaryAction.reason : undefined}
              rightIcon={primaryAction.id === 'advance_to_recording' ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              {isSaving ? 'Salvando…' : primaryAction.label}
            </AppButton>
          ) : null}
          {overflowMenu}
        </>
      )}
    />
  );
}
