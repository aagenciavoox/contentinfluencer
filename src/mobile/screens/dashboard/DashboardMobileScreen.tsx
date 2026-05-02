import { CalendarClock, FileText, FolderKanban, Lightbulb, Sparkles, Video } from 'lucide-react';
import type { AgendaItem, Content, Idea, Projeto } from '../../../lib/database';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';

interface DashboardMobileScreenProps {
  contents: Content[];
  ideas: Idea[];
  projetos: Projeto[];
  agendaItems: AgendaItem[];
}

const READY_TO_RECORD = 'Pronto para Gravar';

export function DashboardMobileScreen({
  contents,
  ideas,
  projetos,
  agendaItems,
}: DashboardMobileScreenProps) {
  const readyToRecord = contents.filter((content) => content.status === READY_TO_RECORD);
  const activeIdeas = ideas.filter((idea) => !idea.archived);
  const activeProjects = projetos.filter((project) => project.status !== 'Concluido');
  const upcomingAgenda = [...agendaItems]
    .filter((item) => item.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
    .slice(0, 4);
  const recentContents = [...contents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-blue)]/12 p-3 text-[var(--accent-blue)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Foco do dia</p>
            <p className="t-secondary">O que precisa de ação curta agora, sem abrir o painel completo.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FocusMetric
            icon={Video}
            label="Prontos para gravar"
            value={readyToRecord.length}
            tone="orange"
          />
          <FocusMetric
            icon={Lightbulb}
            label="Ideias ativas"
            value={activeIdeas.length}
            tone="blue"
          />
          <FocusMetric
            icon={FolderKanban}
            label="Projetos ativos"
            value={activeProjects.length}
            tone="green"
          />
          <FocusMetric
            icon={CalendarClock}
            label="Agenda próxima"
            value={upcomingAgenda.length}
            tone="default"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="px-1">
          <p className="t-label text-[var(--text-tertiary)]">Prioridades imediatas</p>
        </div>

        <MobileListCard
          eyebrow="Gravação"
          title="Montar blocos do dia"
          description={`${readyToRecord.length} roteiros já podem entrar na fila de gravação.`}
          trailing={<Video className="h-4 w-4 text-[var(--accent-orange)]" />}
        />

        <MobileListCard
          eyebrow="Ideias"
          title="Revisar captura recente"
          description={`${activeIdeas.length} ideias seguem abertas para promover ou organizar.`}
          trailing={<Lightbulb className="h-4 w-4 text-[var(--accent-blue)]" />}
        />

        <MobileListCard
          eyebrow="Projetos"
          title="Acompanhar entregas em curso"
          description={`${activeProjects.length} projetos ativos pedem checkpoint curto de prazo e status.`}
          trailing={<FolderKanban className="h-4 w-4 text-[var(--accent-green)]" />}
        />
      </section>

      <section className="space-y-4">
        <div className="px-1">
          <p className="t-label text-[var(--text-tertiary)]">Agenda próxima</p>
        </div>

        {upcomingAgenda.length === 0 ? (
          <MobileEmptyState
            title="Agenda livre por enquanto"
            description="Nenhum compromisso futuro encontrado na agenda editorial."
            icon={<CalendarClock className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-3">
            {upcomingAgenda.map((item) => (
              <MobileListCard
                key={item.id}
                eyebrow={item.tipo}
                title={item.title}
                description={[item.date, item.time].filter(Boolean).join(' · ')}
                trailing={<CalendarClock className="h-4 w-4 text-[var(--text-tertiary)]" />}
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="px-1">
          <p className="t-label text-[var(--text-tertiary)]">Movimento recente</p>
        </div>

        {recentContents.length === 0 ? (
          <MobileEmptyState
            title="Sem conteúdos recentes"
            description="Quando o pipeline receber itens novos, eles aparecem aqui em leitura rápida."
            icon={<FileText className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-3">
            {recentContents.map((content) => (
              <MobileListCard
                key={content.id}
                eyebrow={content.status}
                title={content.title || 'Conteúdo sem título'}
                description={content.notes || 'Sem observações adicionais'}
                trailing={<FileText className="h-4 w-4 text-[var(--text-tertiary)]" />}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FocusMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: 'default' | 'orange' | 'blue' | 'green';
}) {
  const toneClass =
    tone === 'orange'
      ? 'bg-[var(--accent-orange)]/12 text-[var(--accent-orange)]'
      : tone === 'blue'
        ? 'bg-[var(--accent-blue)]/12 text-[var(--accent-blue)]'
        : tone === 'green'
          ? 'bg-[var(--accent-green)]/12 text-[var(--accent-green)]'
          : 'bg-[var(--bg-hover)] text-[var(--text-primary)]';

  return (
    <div className="rounded-[1.25rem] bg-[var(--bg-hover)] px-3 py-3">
      <div className={`mb-3 inline-flex rounded-xl p-2 ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="t-label text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
