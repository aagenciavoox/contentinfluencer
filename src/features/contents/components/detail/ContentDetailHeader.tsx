import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowLeft, ArrowRight, MoreHorizontal, Pencil, Trash2} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {Badge} from '../../../../components/ui/Badge';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {cn} from '../../../../lib/utils';
import type {Content, Pilar} from '../../../../lib/database';
import type {ContentPrimaryAction} from '../../lib/contentPipeline';
import {getDisplayStatus} from '../../lib/contentPipeline';

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

function BackLink({mode}: {mode: 'content' | 'pipeline'}) {
  const destination = mode === 'pipeline' ? '/criacao?tab=roteiros' : '/criacao';
  const label = mode === 'pipeline' ? 'Roteiros' : 'Conteúdos';
  return (
    <nav aria-label="Navegação do roteiro">
      <Link
        to={destination}
        className="inline-flex min-h-8 items-center gap-1.5 rounded-[var(--radius-input)] px-1 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        <Text as="span" variant="meta">
          {label}
        </Text>
      </Link>
    </nav>
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
        size={compact ? 'sm' : 'md'}
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
          className="absolute right-0 top-full z-50 mt-1 min-w-[200px] p-1 shadow-lg"
        >
          <AppButton
            variant="ghost"
            size="sm"
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

  const actionControls = (
    <div className="flex shrink-0 items-center gap-2">
      {hasPrimaryAction ? (
        <AppButton
          variant="primary"
          size={compact ? 'sm' : 'md'}
          onClick={onPrimaryAction}
          disabled={isSaving || primaryAction.disabled}
          aria-describedby={primaryAction.disabled && primaryAction.reason ? 'primary-action-help' : undefined}
          rightIcon={primaryAction.id === 'advance_to_recording' ? <ArrowRight className="h-4 w-4" /> : undefined}
        >
          {isSaving ? 'Salvando…' : primaryAction.label}
        </AppButton>
      ) : null}
      {overflowMenu}
    </div>
  );

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
      size="md"
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

  return (
    <header className={cn(compact ? 'stack-sm' : 'stack-lg border-b border-[var(--border-color)] pb-6')}>
      <BackLink mode={breadcrumbMode} />

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1 stack-sm">
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
          {!compact && (authorName || pilar) ? (
            <Text variant="secondary">
              {[authorName, pilar?.nome].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {actionControls}
          {primaryAction.disabled && primaryAction.reason ? (
            <div id="primary-action-help" className="max-w-72 text-right">
              <Text as="span" variant="meta" className="text-[var(--text-secondary)]">
                {primaryAction.reason}
              </Text>
            </div>
          ) : null}
        </div>
      </div>

      {blockName ? (
        <Text variant="meta">
          Bloco: {blockOrder ? `${blockName} (ordem ${blockOrder})` : blockName}
        </Text>
      ) : null}
    </header>
  );
}
