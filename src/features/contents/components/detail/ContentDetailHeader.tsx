import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import {ChevronDown, MoreHorizontal, Pencil, Send} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {Badge} from '../../../../components/ui/Badge';
import {Text} from '../../../../components/ui/Text';
import {cn} from '../../../../lib/utils';
import type {Content, Pilar} from '../../../../lib/database';
import type {ContentPrimaryAction} from '../../lib/contentPipeline';
import {getAllowedStatuses, getDisplayStatus} from '../../lib/contentPipeline';

interface ContentDetailHeaderProps {
  content: Content;
  title?: string;
  onTitleChange?: (title: string) => void;
  primaryAction: ContentPrimaryAction;
  onPrimaryAction: () => void;
  onStatusChange?: (status: string) => void;
  onSaveDraft?: () => void;
  isSaving: boolean;
  blockName?: string | null;
  blockOrder?: number | null;
  saveHint?: string;
  pilar?: Pilar | null;
  authorName?: string;
  compact?: boolean;
  hideTitle?: boolean;
  breadcrumbMode?: 'content' | 'pipeline';
  saveFeedbackUpdatedAt?: number;
}

function formatRelativeSyncTime(updatedAt: number) {
  if (!updatedAt) return null;
  const minutes = Math.max(1, Math.round((Date.now() - updatedAt) / 60000));
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `há ${hours} h`;
}

function Breadcrumb({mode, displayTitle}: {mode: 'content' | 'pipeline'; displayTitle: string}) {
  if (mode === 'pipeline') {
    return (
      <nav className="flex min-w-0 items-center gap-1.5" aria-label="Breadcrumb">
        <Link
          to="/conteudos"
          className="shrink-0 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
        >
          Pipeline
        </Link>
        <span className="shrink-0 text-xs text-[var(--text-tertiary)]">&gt;</span>
        <span className="truncate text-xs font-medium text-[var(--text-secondary)]">Roteiro</span>
      </nav>
    );
  }

  return (
    <nav className="flex min-w-0 items-center gap-1" aria-label="Breadcrumb">
      <Link
        to="/conteudos"
        className="shrink-0 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
      >
        Conteúdos
      </Link>
      <span className="shrink-0 text-xs text-[var(--text-tertiary)]">/</span>
      <span className="truncate text-xs text-[var(--text-primary)] max-w-[180px]">{displayTitle}</span>
    </nav>
  );
}

function StatusDropdown({
  content,
  allowedStatuses,
  onStatusChange,
}: {
  content: Content;
  allowedStatuses: string[];
  onStatusChange?: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayStatus = getDisplayStatus(content);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        aria-label={`Estágio: ${displayStatus}`}
      >
        <Badge variant="status" status={displayStatus}>
          {displayStatus}
        </Badge>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-lg">
          {allowedStatuses.map(status => (
            <button
              key={status}
              type="button"
              onClick={() => {
                onStatusChange?.(status);
                setOpen(false);
              }}
              className={cn(
                'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                content.status === status
                  ? 'bg-[var(--bg-hover)] font-semibold text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
              )}
            >
              {status}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ContentDetailHeader({
  content,
  title,
  onTitleChange,
  primaryAction,
  onPrimaryAction,
  onStatusChange,
  onSaveDraft,
  isSaving,
  blockName,
  blockOrder,
  saveHint,
  pilar,
  authorName,
  compact = false,
  hideTitle = false,
  breadcrumbMode = 'content',
  saveFeedbackUpdatedAt = 0,
}: ContentDetailHeaderProps) {
  const displayTitle = title ?? content.title;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasPrimaryAction = primaryAction.id !== 'none';
  const allowedStatuses = getAllowedStatuses(content.status);
  const isSynced = saveHint?.toLowerCase().includes('sincronizado') ?? false;
  const isError = Boolean(saveHint?.includes('erro') || saveHint?.includes('Erro'));
  const relativeSync = isSynced ? formatRelativeSyncTime(saveFeedbackUpdatedAt) : null;
  const showSaveInMenu = onSaveDraft && !(compact && isSynced);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [menuOpen]);

  const syncIndicator = saveHint ? (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        isError ? 'text-[var(--accent-red)]' : 'text-[var(--text-tertiary)]',
      )}
    >
      {isSynced ? (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--success)]" aria-hidden />
      ) : null}
      {isSynced && relativeSync ? `Sincronizado ${relativeSync}` : saveHint}
    </span>
  ) : null;

  const overflowMenu = (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label="Mais opções"
        className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuOpen ? (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-lg">
          {showSaveInMenu ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                onSaveDraft?.();
                setMenuOpen(false);
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar roteiro'}
            </button>
          ) : null}
          {allowedStatuses.map(status => (
            <button
              key={status}
              type="button"
              onClick={() => {
                onStatusChange?.(status);
                setMenuOpen(false);
              }}
              className={cn(
                'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                content.status === status
                  ? 'bg-[var(--bg-hover)] font-semibold text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
              )}
            >
              Mudar para {status}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  const actionControls = (
    <div className="flex shrink-0 items-center gap-2">
      {overflowMenu}
      {hasPrimaryAction ? (
        <AppButton
          variant="primary"
          size={compact ? 'sm' : 'md'}
          onClick={onPrimaryAction}
          disabled={isSaving || primaryAction.disabled}
          title={primaryAction.disabled && primaryAction.reason ? primaryAction.reason : undefined}
          leftIcon={primaryAction.id === 'advance_to_recording' ? <Send className="h-4 w-4" /> : undefined}
        >
          {isSaving ? 'Salvando...' : primaryAction.label}
        </AppButton>
      ) : null}
    </div>
  );

  const titleBlock = !hideTitle && onTitleChange ? (
    <div className="flex min-w-0 items-center gap-2">
      <input
        type="text"
        value={displayTitle}
        onChange={event => onTitleChange(event.target.value)}
        placeholder="Título do conteúdo"
        className="t-page-title min-w-0 flex-1 border-0 bg-transparent p-0 text-[var(--text-primary)] outline-none ring-0 placeholder:text-[var(--text-tertiary)] focus:ring-0"
      />
      <Pencil className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
    </div>
  ) : !hideTitle ? (
    <Text variant="pageTitle" className="break-words">
      {displayTitle || 'Roteiro sem título'}
    </Text>
  ) : null;

  return (
    <header className={cn(compact ? 'stack-sm' : 'stack-lg border-b border-[var(--border-color)] pb-6')}>
      {compact ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <Breadcrumb mode={breadcrumbMode} displayTitle={displayTitle || 'Roteiro sem título'} />
            {actionControls}
          </div>
          {titleBlock}
          <div className="flex flex-wrap items-center gap-3">
            {syncIndicator}
            <StatusDropdown
              content={content}
              allowedStatuses={allowedStatuses}
              onStatusChange={onStatusChange}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Breadcrumb mode={breadcrumbMode} displayTitle={displayTitle || 'Roteiro sem título'} />
            {actionControls}
          </div>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 stack-sm">
              {titleBlock}
              <div className="flex flex-wrap items-center gap-3">
                {syncIndicator}
                <StatusDropdown
                  content={content}
                  allowedStatuses={allowedStatuses}
                  onStatusChange={onStatusChange}
                />
              </div>
              {authorName || pilar ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  {[authorName, pilar?.nome].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}

      {blockName ? (
        <p className="text-xs text-[var(--text-tertiary)]">
          Bloco: {blockOrder ? `${blockName} (ordem ${blockOrder})` : blockName}
        </p>
      ) : null}
    </header>
  );
}
