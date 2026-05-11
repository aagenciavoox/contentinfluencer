import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, Clock3, Clapperboard, Layers, Tag } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import type { Content } from '../../../lib/database';
import { getEntityTagStyle } from '../../../lib/utils';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import { CONTENT_STATUS } from '../../../features/contents/lib/contentPipeline';
import type { ContentDetailTab, ContentPrimaryAction, PostingAlert } from '../../../features/contents/lib/contentPipeline';

const ALL_STATUSES = Object.values(CONTENT_STATUS);

interface ContentDetailMobileScreenProps {
  content: Content;
  activeTab: ContentDetailTab;
  onTabChange: (tab: ContentDetailTab) => void;
  primaryAction: ContentPrimaryAction;
  onPrimaryAction: () => void;
  onStatusChange?: (status: string) => void;
  isSaving: boolean;
  postingAlerts: PostingAlert[];
  stageLabel: string;
  seriesName?: string;
  seriesColor?: string | null;
  pillarName?: string;
  pillarColor?: string | null;
  blockName?: string | null;
  blockOrder?: number | null;
  blockProgress?: number | null;
  section: React.ReactNode;
  onSave: () => void;
}

function formatDate(value: string | null) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleDateString('pt-BR');
}

export function ContentDetailMobileScreen({
  content,
  activeTab,
  onTabChange,
  primaryAction,
  onPrimaryAction,
  onStatusChange,
  isSaving,
  postingAlerts,
  stageLabel,
  seriesName,
  seriesColor,
  pillarName,
  pillarColor,
  blockName,
  blockOrder,
  blockProgress,
  section,
  onSave,
}: ContentDetailMobileScreenProps) {
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
    <div className="space-y-4 pb-8">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="t-label text-[var(--text-tertiary)]">Conteudo</p>
            <h1 className="mt-2 text-[1.9rem] font-black leading-[1.02] tracking-[-0.05em] text-[var(--text-primary)]">
              {content.title || 'Conteudo sem titulo'}
            </h1>
          </div>
          <div className="rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text-primary)]">
            {stageLabel}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {seriesName ? (
            <span
              className="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
              style={getEntityTagStyle(seriesColor)}
            >
              <Layers className="mr-1 inline h-3 w-3" />
              {seriesName}
            </span>
          ) : null}
          {pillarName ? (
            <span
              className="rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
              style={getEntityTagStyle(pillarColor)}
            >
              <Tag className="mr-1 inline h-3 w-3" />
              {pillarName}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MetaCard
            icon={<Clapperboard className="h-4 w-4" />}
            label="Bloco"
            value={blockName || 'Sem bloco'}
            helper={blockName && blockOrder ? `Ordem ${blockOrder}` : 'Fila de gravacao'}
          />
          <MetaCard
            icon={<Clapperboard className="h-4 w-4" />}
            label="Progresso"
            value={blockProgress != null ? `${blockProgress}%` : 'Sem progresso'}
            helper="Execucao atual"
          />
          <MetaCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Gravacao"
            value={formatDate(content.recordingDate)}
            helper="Data principal"
          />
          <MetaCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Postagem"
            value={formatDate(content.publishDate)}
            helper="Data principal"
          />
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="mb-2 t-label text-[var(--text-tertiary)]">Sequencia</p>
            <div className="flex gap-2">
              <div ref={statusRef} className={`relative min-w-0 ${hasPrimaryAction ? 'flex-[0_0_42%]' : 'flex-1'}`}>
                <button
                  type="button"
                  onClick={() => setStatusOpen(prev => !prev)}
                  className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--text-primary)] transition-colors hover:border-[var(--text-tertiary)]"
                >
                  <span className="truncate">{content.status}</span>
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-45" />
                </button>
                {statusOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 min-w-[180px] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-1.5 shadow-xl">
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
                  variant="primary"
                  onClick={onPrimaryAction}
                  disabled={isSaving || primaryAction.disabled}
                  className="min-w-0 flex-1 justify-center"
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
      </section>

      {postingAlerts.length > 0 ? (
        <section className="grid gap-3">
          {postingAlerts.map((alert) => (
            <article
              key={alert.id}
              className="flex items-start gap-3 rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
            >
              {alert.tone === 'warning' ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
              ) : (
                <Clock3 className="mt-0.5 h-5 w-5 text-sky-500" />
              )}
              <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.message}</p>
            </article>
          ))}
        </section>
      ) : null}

      <MobileSegmentTabs
        tabs={[
          { value: 'roteiro', label: 'Roteiro' },
          { value: 'gravacao', label: 'Gravacao' },
          { value: 'producao', label: 'Producao' },
          { value: 'postagem', label: 'Postagem' },
          { value: 'historico', label: 'Historico' },
        ]}
        value={activeTab}
        onChange={onTabChange}
      />

      {section}

      <section className="rounded-[1.4rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--accent-green)]" />
          <div className="min-w-0 flex-1">
            <p className="t-section-title text-[var(--text-primary)]">Salvar rascunho</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Roteiro, gravacao, producao, postagem e historico seguem na mesma fonte de verdade.
            </p>
          </div>
        </div>
        <AppButton variant="secondary" onClick={onSave} className="mt-4 w-full justify-center">
          {isSaving ? 'Salvando...' : 'Salvar agora'}
        </AppButton>
      </section>
    </div>
  );
}

function MetaCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <article className="rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-black text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{helper}</p>
    </article>
  );
}
