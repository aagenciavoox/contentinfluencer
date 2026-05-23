import React from 'react';
import {BarChart3, BookOpen, CalendarClock, FileText, FolderKanban, Lightbulb, Sparkles, Video} from 'lucide-react';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageScaffold} from '../../../layouts/page/PageScaffold';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {STATUS_STAGES} from '../../../constants';
import {cn} from '../../../lib/utils';
import {DashboardMobileScreen} from '../../../mobile/screens/dashboard/DashboardMobileScreen';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline';

export function DashboardPage() {
  const {state} = useAppContext();
  const isMobile = useIsMobile();

  const totalContents = state.contents.length;
  const readyToRecord = state.contents.filter(content => content.status === CONTENT_STATUS.PRONTO_PARA_GRAVAR).length;
  const activeIdeas = state.ideas.filter(idea => !idea.archived).length;
  const activeProjects = state.projetos.filter(project => project.status !== 'Concluido').length;

  const pipeline = STATUS_STAGES.map(status => ({
    status,
    count: state.contents.filter(content => content.status === status).length,
  }));

  const maxPipelineCount = Math.max(...pipeline.map(item => item.count), 1);

  const recentContents = [...state.contents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const recentIdeas = [...state.ideas]
    .filter(idea => !idea.archived)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const upcomingAgenda = [...state.agendaItems]
    .filter(item => item.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
    .slice(0, 4);

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <DashboardMobileScreen
          contents={state.contents}
          ideas={state.ideas}
          projetos={state.projetos}
          agendaItems={state.agendaItems}
        />
      </div>
    );
  }

  return (
    <PageScaffold
      contentWidth="full"
      contentClassName="space-y-8 pb-24 md:pb-10"
      header={
        <DesktopPageHeader
          section="Central"
          title="Dashboard"
          icon={Sparkles}
          className="mb-0"
        />
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Conteudos no sistema"
          value={totalContents}
          helper="Tudo que esta em circulacao no pipeline"
          icon={FileText}
        />
        <StatCard
          label="Prontos para gravar"
          value={readyToRecord}
          helper="Fila que ja pode entrar na pagina Gravacao"
          icon={Video}
          tone="amber"
        />
        <StatCard
          label="Ideias ativas"
          value={activeIdeas}
          helper="Banco de temas ainda nao promovidos"
          icon={Lightbulb}
          tone="blue"
        />
        <StatCard
          label="Projetos em andamento"
          value={activeProjects}
          helper="Campanhas e entregas em curso"
          icon={FolderKanban}
          tone="green"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                Pipeline
              </p>
              <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                Distribuicao por etapa
              </h2>
            </div>
            <BarChart3 className="h-5 w-5 text-[var(--text-tertiary)]" />
          </div>

          <div className="space-y-4">
            {pipeline.map(item => (
              <div key={item.status} className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-black text-[var(--text-primary)]">{item.status}</span>
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-hover)]">
                  <div
                    className="h-full rounded-full bg-[var(--text-primary)] transition-all"
                    style={{width: `${(item.count / maxPipelineCount) * 100}%`}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                Proximas acoes
              </p>
              <h2 className="mt-2 text-2xl font-black text-[var(--text-primary)]">
                Foco do dia
              </h2>
            </div>
            <CalendarClock className="h-5 w-5 text-[var(--text-tertiary)]" />
          </div>

          <div className="space-y-3">
            <ActionCard
              title="Montar blocos de gravacao"
              value={`${readyToRecord} roteiros prontos`}
              helper="Tudo que ja saiu de Conteudos e entrou na fila de Gravacao."
            />
            <ActionCard
              title="Revisar ideias recentes"
              value={`${recentIdeas.length} ideias novas`}
              helper="Boas candidatas para virar roteiro ou serie."
            />
            <ActionCard
              title="Acompanhar agenda"
              value={`${upcomingAgenda.length} compromissos proximos`}
              helper="Use calendario e projetos para manter a operacao alinhada."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="Conteudos recentes"
          icon={FileText}
          empty="Nenhum conteudo cadastrado ainda."
        >
          {recentContents.map(content => (
            <RowItem
              key={content.id}
              title={content.title || '(sem titulo)'}
              subtitle={content.status}
            />
          ))}
        </Panel>

        <Panel
          title="Ideias em aberto"
          icon={Lightbulb}
          empty="Nenhuma ideia ativa no momento."
        >
          {recentIdeas.map(idea => (
            <RowItem
              key={idea.id}
              title={idea.text}
              subtitle={new Date(idea.createdAt).toLocaleDateString('pt-BR')}
            />
          ))}
        </Panel>

        <Panel
          title="Agenda proxima"
          icon={BookOpen}
          empty="Nenhum item futuro na agenda."
        >
          {upcomingAgenda.map(item => (
            <RowItem
              key={item.id}
              title={item.title}
              subtitle={[item.date, item.time].filter(Boolean).join(' · ')}
            />
          ))}
        </Panel>
      </section>
    </PageScaffold>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ElementType;
  tone?: 'default' | 'amber' | 'blue' | 'green';
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-amber-500/10 text-amber-500'
      : tone === 'blue'
        ? 'bg-sky-500/10 text-sky-500'
        : tone === 'green'
          ? 'bg-emerald-500/10 text-emerald-500'
          : 'bg-[var(--bg-hover)] text-[var(--text-primary)]';

  return (
    <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            {label}
          </p>
          <p className="mt-4 text-4xl font-black tracking-tight text-[var(--text-primary)]">{value}</p>
        </div>
        <div className={cn('rounded-2xl p-3', toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{helper}</p>
    </div>
  );
}

function ActionCard({title, value, helper}: {title: string; value: string; helper: string}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
      <p className="text-sm font-black text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{helper}</p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  empty,
  children,
}: {
  title: string;
  icon: React.ElementType;
  empty: string;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children);

  return (
    <div className="rounded-[2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-black text-[var(--text-primary)]">{title}</h2>
        <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />
      </div>

      <div className="space-y-3">
        {items.length > 0 ? items : <p className="text-sm text-[var(--text-secondary)]">{empty}</p>}
      </div>
    </div>
  );
}

function RowItem({title, subtitle}: {title: string; subtitle: string}) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3">
      <p className="line-clamp-2 text-sm font-black text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>
    </div>
  );
}


