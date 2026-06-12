import {useEffect, useRef, useState} from 'react';
import {useNavigate, Link} from 'react-router-dom';
import {ChevronDown} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {cn} from '../../../../lib/utils';
import type {Content, Pilar} from '../../../../lib/database';
import type {ContentPrimaryAction} from '../../lib/contentPipeline';
import {ContentStage, getAllowedStatuses, getContentStage} from '../../lib/contentPipeline';

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
}: ContentDetailHeaderProps) {
  const displayTitle = title ?? content.title;
  const navigate = useNavigate();
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const hasPrimaryAction = primaryAction.id !== 'none';
  const isPosted = getContentStage(content) === ContentStage.POSTADO;
  const allowedStatuses = getAllowedStatuses(content.status);
  const isSynced = saveHint?.toLowerCase().includes('sincronizado') ?? false;
  const showSaveButton = onSaveDraft && !(compact && isSynced);

  useEffect(() => {
    if (!statusOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusOpen]);

  const breadcrumbStage = content.status?.trim() || 'Roteiro';

  const actionControls = (
    <>
      {saveHint ? (
        <span
          className={cn(
            'text-xs font-medium',
            compact ? 'inline' : 'hidden lg:inline',
            saveHint.includes('erro') || saveHint.includes('Erro')
              ? 'text-[var(--accent-red)]'
              : 'text-[var(--text-tertiary)]',
          )}
        >
          {saveHint}
        </span>
      ) : null}

      <div ref={statusRef} className="relative hidden sm:block">
        <button
          type="button"
          onClick={() => setStatusOpen(prev => !prev)}
          aria-label={`Estágio: ${content.status}`}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)]',
            compact ? 'h-8 px-2 text-xs' : 'h-10 gap-2 px-3 text-sm',
          )}
        >
          {!compact ? <span className="shrink-0 text-[var(--text-tertiary)]">Estágio:</span> : null}
          <span className={cn('truncate', compact ? 'max-w-[96px]' : 'max-w-[120px]')}>{content.status}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
        </button>
            {statusOpen ? (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-lg">
                {allowedStatuses.map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      onStatusChange?.(status);
                      setStatusOpen(false);
                    }}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      content.status === status
                        ? 'bg-[var(--bg-hover)] font-semibold text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            ) : null}
      </div>

      {showSaveButton ? (
        <AppButton variant="secondary" size={compact ? 'xs' : 'md'} onClick={onSaveDraft} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Guardar agora'}
        </AppButton>
      ) : null}

      {isPosted ? (
        <AppButton variant="secondary" size={compact ? 'xs' : 'md'} onClick={() => navigate('/analise')}>
          Ver analise
        </AppButton>
      ) : null}

      {hasPrimaryAction ? (
        <div className={cn('inline-flex', !compact && 'max-w-[220px] flex-col items-end gap-0.5')}>
          <AppButton
            variant="primary"
            size={compact ? 'sm' : 'md'}
            onClick={onPrimaryAction}
            disabled={isSaving || primaryAction.disabled}
            title={primaryAction.disabled && primaryAction.reason ? primaryAction.reason : undefined}
          >
            {isSaving ? 'Salvando...' : primaryAction.label}
          </AppButton>
          {!compact && primaryAction.disabled && primaryAction.reason ? (
            <span className="text-right text-xs leading-tight text-[var(--text-secondary)]">
              {primaryAction.reason}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  return (
    <header className={cn(compact ? 'space-y-1.5' : 'space-y-4 border-b border-[var(--border-color)] pb-6')}>
      {compact ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <nav className="cms-breadcrumb text-xs" aria-label="Breadcrumb">
              <Link to="/conteudos">Pipeline</Link>
              <span className="cms-breadcrumb-sep">/</span>
              {pilar ? (
                <>
                  <span>{pilar.nome}</span>
                  <span className="cms-breadcrumb-sep">/</span>
                </>
              ) : null}
              <span className="text-[var(--text-secondary)]">{breadcrumbStage}</span>
            </nav>
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">{actionControls}</div>
          </div>
          {onTitleChange ? (
            <input
              type="text"
              value={displayTitle}
              onChange={event => onTitleChange(event.target.value)}
              placeholder="Título do conteúdo"
              className="t-page-title w-full border-0 bg-transparent p-0 text-[var(--text-primary)] outline-none ring-0 placeholder:text-[var(--text-tertiary)] focus:ring-0"
            />
          ) : (
            <h1 className="t-page-title break-words text-[var(--text-primary)]">
              {displayTitle || 'Conteudo sem titulo'}
            </h1>
          )}
        </>
      ) : (
        <>
          <nav className="cms-breadcrumb" aria-label="Breadcrumb">
            <Link to="/conteudos">Pipeline</Link>
            <span className="cms-breadcrumb-sep">/</span>
            {pilar ? (
              <>
                <span>{pilar.nome}</span>
                <span className="cms-breadcrumb-sep">/</span>
              </>
            ) : null}
            <span className="text-[var(--text-secondary)]">{breadcrumbStage}</span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              {onTitleChange ? (
                <input
                  type="text"
                  value={displayTitle}
                  onChange={event => onTitleChange(event.target.value)}
                  placeholder="Título do conteúdo"
                  className="t-page-title w-full border-0 bg-transparent p-0 text-[var(--text-primary)] outline-none ring-0 placeholder:text-[var(--text-tertiary)] focus:ring-0"
                />
              ) : (
                <h1 className="t-page-title break-words text-[var(--text-primary)]">{displayTitle || 'Conteudo sem titulo'}</h1>
              )}
              {authorName || pilar ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  {[authorName, pilar?.nome].filter(Boolean).join(' · ')}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">{actionControls}</div>
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
