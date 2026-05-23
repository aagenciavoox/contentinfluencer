import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {ChevronDown} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import type {Content} from '../../../../lib/database';
import type {ContentPrimaryAction} from '../../lib/contentPipeline';
import {CONTENT_STATUS, ContentStage, getContentStage} from '../../lib/contentPipeline';

const ALL_STATUSES = Object.values(CONTENT_STATUS);

interface ContentDetailHeaderProps {
  content: Content;
  title?: string;
  onTitleChange?: (title: string) => void;
  primaryAction: ContentPrimaryAction;
  onPrimaryAction: () => void;
  onStatusChange?: (status: string) => void;
  isSaving: boolean;
  blockName?: string | null;
  blockOrder?: number | null;
  saveHint?: string;
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleDateString('pt-BR');
}

export function ContentDetailHeader({
  content,
  title,
  onTitleChange,
  primaryAction,
  onPrimaryAction,
  onStatusChange,
  isSaving,
  blockName,
  blockOrder,
  saveHint,
}: ContentDetailHeaderProps) {
  const displayTitle = title ?? content.title;
  const navigate = useNavigate();
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const hasPrimaryAction = primaryAction.id !== 'none';
  const isPosted = getContentStage(content) === ContentStage.POSTADO;

  useEffect(() => {
    if (!statusOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusOpen]);

  const blockLabel = blockName
    ? blockOrder
      ? `${blockName} (ordem ${blockOrder})`
      : blockName
    : 'Sem bloco';

  return (
    <header className="space-y-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {onTitleChange ? (
            <input
              type="text"
              value={displayTitle}
              onChange={event => onTitleChange(event.target.value)}
              placeholder="Titulo do conteudo"
              className="ds-h1 w-full border-0 bg-transparent p-0 text-[length:var(--text-h1)] font-semibold text-[var(--text-primary)] outline-none ring-0 placeholder:text-[var(--text-tertiary)] focus:ring-0"
            />
          ) : (
            <h1 className="ds-h1 break-words">{displayTitle || 'Conteudo sem titulo'}</h1>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--text-meta)] text-[length:var(--text-meta)] text-[var(--text-secondary)]">
            <span>
              <span className="font-semibold text-[var(--text-tertiary)]">Bloco:</span> {blockLabel}
            </span>
            <span aria-hidden className="text-[var(--text-tertiary)]">
              ·
            </span>
            <span>
              <span className="font-semibold text-[var(--text-tertiary)]">Gravacao:</span>{' '}
              {formatDate(content.recordingDate)}
            </span>
            <span aria-hidden className="text-[var(--text-tertiary)]">
              ·
            </span>
            <span>
              <span className="font-semibold text-[var(--text-tertiary)]">Postagem:</span>{' '}
              {formatDate(content.publishDate)}
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div ref={statusRef} className="relative sm:min-w-[180px]">
            <button
              type="button"
              onClick={() => setStatusOpen(prev => !prev)}
              className="ds-input inline-flex h-10 w-full items-center justify-between gap-2 border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-xs font-semibold text-[var(--text-primary)]"
            >
              <span className="truncate">{content.status}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-45" />
            </button>
            {statusOpen ? (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-1 shadow-xl">
                {ALL_STATUSES.map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      onStatusChange?.(status);
                      setStatusOpen(false);
                    }}
                    className={`w-full rounded-[var(--radius-input)] px-3 py-2 text-left text-xs font-medium transition-colors ${
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
          {isPosted ? (
            <AppButton variant="secondary" onClick={() => navigate('/analise')}>
              Ver analise
            </AppButton>
          ) : null}
          {hasPrimaryAction ? (
            <AppButton
              variant="primary"
              onClick={onPrimaryAction}
              disabled={isSaving || primaryAction.disabled}
            >
              {isSaving ? 'Salvando...' : primaryAction.label}
            </AppButton>
          ) : null}
        </div>
      </div>

      {primaryAction.reason ? (
        <p className="text-xs font-medium text-[var(--text-secondary)]">{primaryAction.reason}</p>
      ) : null}
      {saveHint ? (
        <p
          className={`text-xs font-medium ${
            saveHint.includes('erro') || saveHint.includes('Erro')
              ? 'text-red-400'
              : 'text-[var(--text-tertiary)]'
          }`}
        >
          {saveHint}
        </p>
      ) : null}
    </header>
  );
}
