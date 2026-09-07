import type { ReactNode } from 'react';
import { CalendarClock, FolderKanban, Search } from 'lucide-react';
import type { AgendaItem, Projeto } from '../../../lib/database';
import { Text } from '../../../components/ui/Text';
import { MobileListCard } from '../../components/MobileListCard';

interface DashboardMobileScreenProps {
  greetingName: string;
  pauseMode: boolean;
  agendaToday: AgendaItem[];
  urgentProjects: Projeto[];
  errorMessage: string | null;
  recordingEnabled: boolean;
  children: ReactNode;
  onNavigate: (path: string) => void;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}

export function DashboardMobileScreen({
  greetingName,
  pauseMode,
  agendaToday,
  urgentProjects,
  errorMessage,
  recordingEnabled,
  children,
  onNavigate,
  onOpenMenu,
  onOpenSearch,
}: DashboardMobileScreenProps) {
  const initial = greetingName.trim().charAt(0).toUpperCase() || 'C';

  return (
    <div>
      <section
        className="bg-[var(--brand-accent)] px-4 pb-6"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Abrir menu"
            className="flex min-h-11 min-w-0 items-center gap-3 text-left touch-manipulation focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]"
          >
            <span
              aria-hidden
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-on-accent)] text-sm font-semibold text-[var(--brand-accent)]"
            >
              {initial}
            </span>
            <span className="min-w-0">
<Text variant="pageTitle" as="p" className="text-[var(--brand-on-accent)]">
                  Sessão do dia
                </Text>
              <Text variant="label" uppercase className="mt-1 !text-[var(--brand-on-accent)]">
                {greetingName}
              </Text>
            </span>
          </button>

          <button
            type="button"
            aria-label="Abrir busca global"
            onClick={onOpenSearch}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring-brand)]"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        <Text variant="body" className="text-[var(--brand-on-accent)] opacity-90">
          {recordingEnabled
            ? 'Escolha roteiros e grave em sequência.'
            : 'Ative gravação nas configurações para montar a sessão.'}
        </Text>
      </section>

      <div className="stack-lg px-4 pt-4">
        {!recordingEnabled ? (
          <button
            type="button"
            onClick={() => onNavigate('/configuracoes')}
            className="w-full rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-left"
          >
            <Text variant="bodyStrong">Gravação desligada</Text>
            <Text variant="secondary" className="mt-1">
              Abrir configurações
            </Text>
          </button>
        ) : (
          children
        )}

        {errorMessage ? (
          <Text variant="meta" className="text-[var(--danger)]">
            {errorMessage}
          </Text>
        ) : null}

        {pauseMode ? (
          <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
            <Text variant="bodyStrong">Pausa respeitada</Text>
            <Text variant="secondary" className="mt-2">
              Sugestões ficam de lado. A sessão continua disponível quando você quiser gravar.
            </Text>
          </section>
        ) : null}

        {agendaToday.length > 0 ? (
          <section className="stack-lg">
            <div className="px-1">
              <Text variant="label">Para lembrar hoje</Text>
            </div>
            <div className="stack-md">
              {agendaToday.map(item => (
                <MobileListCard
                  key={item.id}
                  eyebrow={item.tipo}
                  title={item.title}
                  description={[item.date, item.time].filter(Boolean).join(' · ')}
                  trailing={<CalendarClock className="h-4 w-4 text-[var(--text-tertiary)]" />}
                  onClick={() => onNavigate('/calendario')}
                />
              ))}
            </div>
          </section>
        ) : null}

        {urgentProjects.length > 0 ? (
          <section className="stack-lg">
            <div className="px-1">
              <Text variant="label">Datas combinadas</Text>
            </div>
            <div className="stack-md">
              {urgentProjects.map(project => (
                <MobileListCard
                  key={project.id}
                  eyebrow={project.brand || 'Projeto'}
                  title={project.nome}
                  description={project.dataFim || undefined}
                  trailing={<FolderKanban className="h-4 w-4 text-[var(--text-tertiary)]" />}
                  onClick={() => onNavigate(`/projetos/${project.id}`)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
