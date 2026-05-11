import {type ReactNode, useRef, useState, useEffect} from 'react';
import {CalendarDays, ChevronDown, Clapperboard, Layers, Tag} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import type {Content} from '../../../../lib/database';
import {getEntityTagStyle} from '../../../../lib/utils';
import type {ContentPrimaryAction} from '../../lib/contentPipeline';
import {CONTENT_STATUS} from '../../lib/contentPipeline';

const ALL_STATUSES = Object.values(CONTENT_STATUS);

interface ContentDetailHeaderProps {
  content: Content;
  primaryAction: ContentPrimaryAction;
  onPrimaryAction: () => void;
  onStatusChange?: (status: string) => void;
  isSaving: boolean;
  seriesName?: string;
  seriesColor?: string | null;
  pillarName?: string;
  pillarColor?: string | null;
  blockName?: string | null;
  blockOrder?: number | null;
  blockProgress?: number | null;
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleDateString('pt-BR');
}

export function ContentDetailHeader({
  content,
  primaryAction,
  onPrimaryAction,
  onStatusChange,
  isSaving,
  seriesName,
  seriesColor,
  pillarName,
  pillarColor,
  blockName,
  blockOrder,
  blockProgress,
}: ContentDetailHeaderProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const hasPrimaryAction = primaryAction.id !== 'none';

  useEffect(() => {
    if (!statusOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusOpen]);

  return (
    <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
            Conteudo central
          </p>
          <h1 className="mt-3 break-words text-3xl font-black leading-[1.05] tracking-[-0.04em] text-[var(--text-primary)] md:text-5xl">
            {content.title || 'Conteudo sem titulo'}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {seriesName ? (
              <span
                className="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                style={getEntityTagStyle(seriesColor)}
              >
                <Layers className="mr-1 inline h-3 w-3" />
                {seriesName}
              </span>
            ) : null}
            {pillarName ? (
              <span
                className="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
                style={getEntityTagStyle(pillarColor)}
              >
                <Tag className="mr-1 inline h-3 w-3" />
                {pillarName}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:min-w-[420px]">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Sequencia
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div ref={statusRef} className="relative sm:w-[190px]">
                <button
                  type="button"
                  onClick={() => setStatusOpen(prev => !prev)}
                  className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-primary)] transition-colors hover:border-[var(--text-tertiary)]"
                >
                  <span className="truncate">{content.status}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-45" />
                </button>
                {statusOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 min-w-[190px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-1.5 shadow-xl">
                    {ALL_STATUSES.map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          onStatusChange?.(status);
                          setStatusOpen(false);
                        }}
                        className={`w-full rounded-xl px-3 py-2 text-left text-[11px] font-bold transition-colors ${
                          content.status === status
                            ? 'bg-[var(--bg-hover)] font-black text-[var(--text-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {hasPrimaryAction ? (
                <AppButton
                  className="min-w-0 flex-1"
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
            <p className="text-xs font-semibold text-[var(--text-secondary)]">{primaryAction.reason}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <DetailMeta
          icon={<Clapperboard className="h-4 w-4" />}
          label="Bloco"
          value={blockName || 'Sem bloco'}
          helper={blockName && blockOrder ? `Ordem ${blockOrder}` : 'Disponivel na aba Gravacao'}
        />
        <DetailMeta
          icon={<Clapperboard className="h-4 w-4" />}
          label="Progresso do bloco"
          value={blockProgress != null ? `${blockProgress}%` : 'Sem progresso'}
          helper="Camada operacional"
        />
        <DetailMeta
          icon={<CalendarDays className="h-4 w-4" />}
          label="Gravacao"
          value={formatDate(content.recordingDate)}
          helper="Data principal"
        />
        <DetailMeta
          icon={<CalendarDays className="h-4 w-4" />}
          label="Postagem"
          value={formatDate(content.publishDate)}
          helper="Data principal"
        />
      </div>
    </section>
  );
}

function DetailMeta({
  icon,
  label,
  value,
  helper,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-sm font-black text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{helper}</p>
    </article>
  );
}
