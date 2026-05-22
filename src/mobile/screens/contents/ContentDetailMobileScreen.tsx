import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, Clock3, Clapperboard, FileText, Layers, Tag } from 'lucide-react';
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const hasPrimaryAction = primaryAction.id !== 'none';
  const isScriptTab = activeTab === 'roteiro';

  useEffect(() => {
    if (!statusOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setStatusOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [statusOpen]);

  if (isScriptTab) {
    return (
      <div className="space-y-3 pb-8">
        <div className="sticky top-0 z-10 -mx-1 space-y-2 rounded-lg border border-[var(--border-color)] bg-[color-mix(in_srgb,var(--bg-primary)_92%,transparent)] px-3 py-2 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-sm font-black text-[var(--text-primary)]">
              {content.title || 'Sem titulo'}
            </p>
            <span className="shrink-0 rounded-md border border-[var(--border-color)] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
              {stageLabel}
            </span>
          </div>

          {hasPrimaryAction ? (
            <AppButton
              variant="primary"
              onClick={onPrimaryAction}
              disabled={isSaving || primaryAction.disabled}
              className="min-h-11 w-full justify-center"
            >
              {isSaving ? 'Salvando...' : primaryAction.label}
            </AppButton>
          ) : null}

          {primaryAction.reason ? (
            <p className="text-[11px] font-semibold text-[var(--text-secondary)]">{primaryAction.reason}</p>
          ) : null}
        </div>

        {section}

        <details className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Pipeline e outras abas
            <ChevronDown className="h-4 w-4" />
          </summary>
          <div className="space-y-3 border-t border-[var(--border-color)] p-3">
            <div className="grid grid-cols-2 gap-2">
              <MetaCard
                icon={<Clapperboard className="h-4 w-4" />}
                label="Bloco"
                value={blockName || 'Sem bloco'}
                helper={blockName && blockOrder ? `Ordem ${blockOrder}` : 'Fila'}
              />
              <MetaCard
                icon={<Clapperboard className="h-4 w-4" />}
                label="Progresso"
                value={blockProgress != null ? `${blockProgress}%` : '—'}
                helper="Execucao"
              />
            </div>
            <MobileSegmentTabs
              rounded="tight"
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
          </div>
        </details>

        <AppButton variant="secondary" onClick={onSave} className="min-h-11 w-full justify-center">
          {isSaving ? 'Salvando...' : 'Salvar rascunho'}
        </AppButton>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {activeTab !== 'roteiro' ? (
        <button
          type="button"
          onClick={() => onTabChange('roteiro')}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[11px] font-black uppercase tracking-[0.12em] text-[var(--text-primary)]"
        >
          <FileText className="h-4 w-4" />
          Ver roteiro
        </button>
      ) : null}

      <details className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[var(--text-primary)]">
              {content.title || 'Conteudo sem titulo'}
            </p>
            <p className="text-[10px] font-semibold text-[var(--text-tertiary)]">{stageLabel}</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
        </summary>

        <div className="space-y-3 border-t border-[var(--border-color)] p-3">
          <div className="flex flex-wrap gap-1.5">
            {seriesName ? (
              <span
                className="rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]"
                style={getEntityTagStyle(seriesColor)}
              >
                <Layers className="mr-1 inline h-3 w-3" />
                {seriesName}
              </span>
            ) : null}
            {pillarName ? (
              <span
                className="rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em]"
                style={getEntityTagStyle(pillarColor)}
              >
                <Tag className="mr-1 inline h-3 w-3" />
                {pillarName}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetaCard
              icon={<Clapperboard className="h-4 w-4" />}
              label="Bloco"
              value={blockName || 'Sem bloco'}
              helper={blockName && blockOrder ? `Ordem ${blockOrder}` : 'Fila'}
            />
            <MetaCard
              icon={<Clapperboard className="h-4 w-4" />}
              label="Progresso"
              value={blockProgress != null ? `${blockProgress}%` : '—'}
              helper="Execucao"
            />
            <MetaCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Gravacao"
              value={formatDate(content.recordingDate)}
              helper="Data"
            />
            <MetaCard
              icon={<CalendarDays className="h-4 w-4" />}
              label="Postagem"
              value={formatDate(content.publishDate)}
              helper="Data"
            />
          </div>

          <div className="flex gap-2">
            <div ref={statusRef} className={`relative min-w-0 ${hasPrimaryAction ? 'flex-[0_0_42%]' : 'flex-1'}`}>
              <button
                type="button"
                onClick={() => setStatusOpen(prev => !prev)}
                className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-[10px] font-black uppercase tracking-[0.12em]"
              >
                <span className="truncate">{content.status}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-45" />
              </button>
              {statusOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-1 shadow-xl">
                  {ALL_STATUSES.map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        onStatusChange?.(status);
                        setStatusOpen(false);
                      }}
                      className={`min-h-11 w-full rounded-md px-3 text-left text-[11px] font-bold ${
                        content.status === status
                          ? 'bg-[var(--bg-hover)] font-black'
                          : 'text-[var(--text-secondary)]'
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
                className="min-h-11 min-w-0 flex-1 justify-center"
              >
                {isSaving ? 'Salvando...' : primaryAction.label}
              </AppButton>
            ) : null}
          </div>
          {primaryAction.reason ? (
            <p className="text-[11px] font-semibold text-[var(--text-secondary)]">{primaryAction.reason}</p>
          ) : null}
        </div>
      </details>

      {postingAlerts.length > 0 ? (
        <section className="grid gap-2">
          {postingAlerts.map((alert) => (
            <article
              key={alert.id}
              className="flex items-start gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-3"
            >
              {alert.tone === 'warning' ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
              ) : (
                <Clock3 className="mt-0.5 h-4 w-4 text-sky-500" />
              )}
              <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.message}</p>
            </article>
          ))}
        </section>
      ) : null}

      <MobileSegmentTabs
        rounded="tight"
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

      <AppButton variant="secondary" onClick={onSave} className="min-h-11 w-full justify-center">
        {isSaving ? 'Salvando...' : 'Salvar'}
      </AppButton>
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
    <article className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-black text-[var(--text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--text-secondary)]">{helper}</p>
    </article>
  );
}
