import { useState, type ReactNode } from 'react';
import { ChevronLeft, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { Text } from '../../../components/ui/Text';
import { ValorVazio } from '../../../components/ui/ValorVazio';
import { cn } from '../../../lib/utils';

export interface BookDetailTab<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface BookDetailHeaderProps<T extends string> {
  title: string;
  creator?: string;
  typeLabel: string;
  status?: string;
  coverUrl?: string | null;
  icon: LucideIcon;
  backLabel: string;
  backTo: string;
  tabs: BookDetailTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  actions?: ReactNode;
}

// Ponto do selo de status: rosa em andamento, verde concluído, cinza no resto (quero ler, abandonado).
const STATUS_DOT: Record<string, string> = {
  Lendo: 'bg-[var(--brand-accent)]',
  Assistindo: 'bg-[var(--brand-accent)]',
  Consumindo: 'bg-[var(--brand-accent)]',
  Lido: 'bg-[var(--accent-green)]',
  Assistido: 'bg-[var(--accent-green)]',
  'Concluído': 'bg-[var(--accent-green)]',
};

/** Capa pequena do cabeçalho; sem capa (ou com URL quebrada), o ícone do tipo. */
function HeaderCover({ coverUrl, title, icon: Icon }: { coverUrl?: string | null; title: string; icon: LucideIcon }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(coverUrl) && !failed;

  return (
    <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-hover)]">
      {showImage ? (
        <img src={coverUrl ?? undefined} alt={`Capa de ${title}`} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[linear-gradient(160deg,var(--bg-hover),var(--bg-elevated))]" aria-hidden>
          <Icon className="h-8 w-8 text-[var(--text-tertiary)]" strokeWidth={1.5} />
          <span className="h-px w-10 bg-[var(--border-strong)]" />
        </div>
      )}
      {/* Lombada: uma faixa escura na borda esquerda, como num livro. */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)]" />
    </div>
  );
}

/**
 * Cabeçalho do item da Biblioteca no desktop: capa, título, autor/tipo/status e as abas.
 * As abas ficam sobre a linha de baixo do cabeçalho, com o sublinhado da aba ativa em cima dela.
 */
export function BookDetailHeader<T extends string>({
  title,
  creator,
  typeLabel,
  status,
  coverUrl,
  icon,
  backLabel,
  backTo,
  tabs,
  activeTab,
  onTabChange,
  actions,
}: BookDetailHeaderProps<T>) {
  return (
    <header className="desktop-page-header">
      <Link
        to={backTo}
        className="desktop-page-header-crumb desktop-page-header-back transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <ChevronLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {backLabel}
      </Link>

      <div className="mt-4 flex items-start gap-6">
        <HeaderCover coverUrl={coverUrl} title={title} icon={icon} />

        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Text variant="display" className="truncate">{title}</Text>
              <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 t-body text-[var(--text-secondary)]">
                <span className="truncate">{creator?.trim() ? creator : <ValorVazio />}</span>
                <span aria-hidden className="text-[var(--text-tertiary)]">•</span>
                <span>{typeLabel}</span>
                {status ? (
                  <>
                    <span aria-hidden className="text-[var(--text-tertiary)]">•</span>
                    <Text variant="secondary" as="span" className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-[var(--bg-hover)] px-2.5 py-1 text-[var(--text-primary)]">
                      <span aria-hidden className={cn('h-2 w-2 rounded-full', STATUS_DOT[status] ?? 'bg-[var(--text-tertiary)]')} />
                      {status}
                    </Text>
                  </>
                ) : null}
              </div>
            </div>
            {actions ? <div className="flex shrink-0 items-start gap-2">{actions}</div> : null}
          </div>

          {/* A margem negativa leva as abas até a borda de baixo do cabeçalho (padding do .desktop-header-frame). */}
          <div className="mt-auto -mb-[var(--space-xl)] flex items-end gap-2 pt-4">
            <SegmentTabs<T>
              ariaLabel={`Seções de ${title}`}
              value={activeTab}
              onChange={onTabChange}
              options={tabs.map(tab => ({
                id: tab.id,
                label: tab.label,
                count: tab.count,
              }))}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
