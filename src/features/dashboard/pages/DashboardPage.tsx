import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clapperboard,
  FolderKanban,
  Lightbulb,
  Plus,
  Scissors,
  Sparkles,
  Video,
} from 'lucide-react';
import {startOfWeek} from 'date-fns';
import {useNavigate} from 'react-router-dom';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DashboardMobileScreen} from '../../../mobile/screens/dashboard/DashboardMobileScreen';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline';
import {buildContentDetailRoute} from '../../contents/lib/contentDetailRoute';
import {getGentleExperienceSettings} from '../../settings/lib/gentleExperience';
import {validateWeeklyContent} from '../../../utils/goldenRules';

export function DashboardPage() {
  const {state} = useAppContext();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const gentleExperience = getGentleExperienceSettings(state.preferences);

  // Listas operacionais
  const readyToRecord = state.contents.filter(c => c.status === CONTENT_STATUS.PRONTO_PARA_GRAVAR);
  const inProduction = state.contents.filter(
    c =>
      c.status === CONTENT_STATUS.GRAVADO ||
      c.status === CONTENT_STATUS.A_EDITAR ||
      c.status === CONTENT_STATUS.EDITADO,
  );
  const upcomingAgenda = [...state.agendaItems]
    .filter(item => item.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
    .slice(0, 5);

  // Regras de Ouro: violacoes da semana atual
  const weekStart = startOfWeek(new Date(), {weekStartsOn: 1});
  const goldenRuleViolations = validateWeeklyContent(
    state.contents,
    weekStart,
    state.pilares,
    state.goldenRules,
  );

  // Projetos com deadline nos proximos 7 dias
  const today = new Date().toISOString().slice(0, 10);
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const urgentProjects = state.projetos
    .filter(p => p.status !== 'Concluido' && p.dataFim && p.dataFim >= today && p.dataFim <= in7days)
    .sort((a, b) => (a.dataFim! > b.dataFim! ? 1 : -1));

  // Bloco de destaque
  const spotlight = resolveSpotlight({readyToRecord, inProduction, upcomingAgenda});

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <DashboardMobileScreen
          contents={state.contents}
          ideas={state.ideas}
          projetos={state.projetos}
          agendaItems={state.agendaItems}
          gentleExperience={gentleExperience}
        />
      </div>
    );
  }

  return (
    <PageLayout
      contentWidth="full"
      contentClassName="space-y-8 pb-24 md:pb-10"
      header={
        <DesktopPageHeader
          section="Central"
          title="Início"
          icon={Sparkles}
          className="mb-0"
        />
      }
    >
      {/* Bloco de destaque */}
      <SpotlightBlock spotlight={spotlight} onNavigate={navigate} />

      {/* Alerta de Regras de Ouro */}
      {goldenRuleViolations.length > 0 && (
        <button
          onClick={() => navigate('/configuracoes/regras')}
          className="group flex w-full items-center justify-between gap-4 rounded-[var(--radius-card-mobile)] border border-amber-500/30 bg-amber-500/5 px-5 py-4 text-left transition-opacity hover:opacity-80"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {goldenRuleViolations.length === 1
                ? '1 regra editorial precisa de atencao esta semana'
                : `${goldenRuleViolations.length} regras editoriais precisam de atencao esta semana`}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold  text-amber-500">
            Ver regras <ArrowRight className="h-3 w-3" />
          </span>
        </button>
      )}

      {/* Projetos com deadline proximo */}
      {urgentProjects.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-[var(--text-tertiary)]" />
            <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
              Deadline nos proximos 7 dias
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {urgentProjects.map(project => (
              <button
                key={project.id}
                onClick={() => navigate(`/projetos/${project.id}`)}
                className="group flex items-center justify-between gap-4 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-5 py-4 text-left transition-opacity hover:opacity-70"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{project.nome}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {project.brand ? `${project.brand} · ` : ''}{project.dataFim}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Acoes rapidas */}
      <section className="flex flex-wrap gap-3">
        <QuickAction label="Novo conteúdo" icon={Plus} onClick={() => navigate('/conteudos')} />
        <QuickAction label="Nova ideia" icon={Lightbulb} onClick={() => navigate('/ideias')} />
        <QuickAction label="Ir para gravação" icon={Video} onClick={() => navigate('/gravacao')} />
        <QuickAction label="Ver calendário" icon={CalendarDays} onClick={() => navigate('/calendario')} />
      </section>

      {/* Listas operacionais */}
      <section className="grid gap-6 xl:grid-cols-3">
        <OperationalList
          title="Fila de gravação"
          icon={Video}
          empty="Nenhum roteiro pronto para gravar."
          seeAllHref="/gravacao"
          seeAllLabel="Abrir gravação"
        >
          {readyToRecord.slice(0, 5).map(content => (
            <ContentRow
              key={content.id}
              title={content.title || '(sem titulo)'}
              meta={content.status}
              onClick={() => navigate(buildContentDetailRoute(content.id))}
            />
          ))}
        </OperationalList>

        <OperationalList
          title="Em produção"
          icon={Scissors}
          empty="Nenhum conteúdo em edição ou gravado."
          seeAllHref="/conteudos"
          seeAllLabel="Ver conteúdos"
        >
          {inProduction.slice(0, 5).map(content => (
            <ContentRow
              key={content.id}
              title={content.title || '(sem titulo)'}
              meta={content.status}
              onClick={() => navigate(buildContentDetailRoute(content.id))}
            />
          ))}
        </OperationalList>

        <OperationalList
          title="Agenda próxima"
          icon={BookOpen}
          empty="Nenhum item futuro na agenda."
          seeAllHref="/calendario"
          seeAllLabel="Ver calendario"
        >
          {upcomingAgenda.map(item => (
            <ContentRow
              key={item.id}
              title={item.title}
              meta={[item.date, item.time].filter(Boolean).join(' · ')}
              onClick={() => navigate('/calendario')}
            />
          ))}
        </OperationalList>
      </section>
    </PageLayout>
  );
}

// --- Spotlight ---

type SpotlightData =
  | {type: 'record'; count: number; firstId: string; firstTitle: string}
  | {type: 'edit'; count: number; firstId: string; firstTitle: string}
  | {type: 'agenda'; title: string; date: string; time?: string}
  | {type: 'empty'};

function resolveSpotlight({
  readyToRecord,
  inProduction,
  upcomingAgenda,
}: {
  readyToRecord: {id: string; title?: string | null}[];
  inProduction: {id: string; title?: string | null; status: string}[];
  upcomingAgenda: {title: string; date: string; time?: string}[];
}): SpotlightData {
  if (readyToRecord.length > 0) {
    return {
      type: 'record',
      count: readyToRecord.length,
      firstId: readyToRecord[0].id,
      firstTitle: readyToRecord[0].title || '(sem titulo)',
    };
  }
  const editing = inProduction.filter(
    c => c.status === CONTENT_STATUS.A_EDITAR || c.status === CONTENT_STATUS.GRAVADO,
  );
  if (editing.length > 0) {
    return {
      type: 'edit',
      count: editing.length,
      firstId: editing[0].id,
      firstTitle: editing[0].title || '(sem titulo)',
    };
  }
  if (upcomingAgenda.length > 0) {
    return {
      type: 'agenda',
      title: upcomingAgenda[0].title,
      date: upcomingAgenda[0].date,
      time: upcomingAgenda[0].time,
    };
  }
  return {type: 'empty'};
}

function SpotlightBlock({
  spotlight,
  onNavigate,
}: {
  spotlight: SpotlightData;
  onNavigate: (path: string) => void;
}) {
  if (spotlight.type === 'empty') {
    return (
      <div className="flex items-center justify-between gap-6 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8">
        <div>
          <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
            Próximo passo
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">Tudo em dia</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Nenhuma ação pendente no momento. Comece criando um conteudo ou capturando uma ideia.
          </p>
        </div>
        <Sparkles className="h-10 w-10 shrink-0 text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (spotlight.type === 'record') {
    return (
      <button
        onClick={() => onNavigate('/gravacao')}
        className="group flex w-full items-center justify-between gap-6 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-left transition-opacity hover:opacity-80"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
            Próximo passo
          </p>
          <h2 className="mt-3 truncate text-2xl font-semibold text-[var(--text-primary)]">
            {spotlight.count === 1
              ? `Gravar: ${spotlight.firstTitle}`
              : `${spotlight.count} roteiros prontos para gravar`}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {spotlight.count === 1
              ? 'Este roteiro ja pode entrar em sessao de gravacao.'
              : `Comece pelo primeiro: ${spotlight.firstTitle}`}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold  text-[var(--text-primary)]">
            Abrir gravação <ArrowRight className="h-3 w-3" />
          </span>
        </div>
        <div className="rounded-[var(--radius-card-mobile)] bg-amber-500/10 p-5">
          <Clapperboard className="h-8 w-8 text-amber-500" />
        </div>
      </button>
    );
  }

  if (spotlight.type === 'edit') {
    return (
      <button
        onClick={() => onNavigate(buildContentDetailRoute(spotlight.firstId))}
        className="group flex w-full items-center justify-between gap-6 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-left transition-opacity hover:opacity-80"
      >
        <div className="min-w-0">
          <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
            Próximo passo
          </p>
          <h2 className="mt-3 truncate text-2xl font-semibold text-[var(--text-primary)]">
            {spotlight.count === 1
              ? `Editar: ${spotlight.firstTitle}`
              : `${spotlight.count} conteudos aguardando edicao`}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {spotlight.count === 1
              ? 'Pronto para entrar em edicao.'
              : `Continue pelo: ${spotlight.firstTitle}`}
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold  text-[var(--text-primary)]">
            Abrir conteúdo <ArrowRight className="h-3 w-3" />
          </span>
        </div>
        <div className="rounded-[var(--radius-card-mobile)] bg-violet-500/10 p-5">
          <Scissors className="h-8 w-8 text-violet-500" />
        </div>
      </button>
    );
  }

  // agenda
  return (
    <button
      onClick={() => onNavigate('/calendario')}
      className="group flex w-full items-center justify-between gap-6 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-left transition-opacity hover:opacity-80"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
          Próximo passo
        </p>
        <h2 className="mt-3 truncate text-2xl font-semibold text-[var(--text-primary)]">
          {spotlight.title}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {[spotlight.date, spotlight.time].filter(Boolean).join(' · ')}
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold  text-[var(--text-primary)]">
          Ver calendario <ArrowRight className="h-3 w-3" />
        </span>
      </div>
      <div className="rounded-[var(--radius-card-mobile)] bg-sky-500/10 p-5">
        <CalendarDays className="h-8 w-8 text-sky-500" />
      </div>
    </button>
  );
}

// --- Componentes ---

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-xs font-semibold  text-[var(--text-secondary)] transition-opacity hover:opacity-70"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function OperationalList({
  title,
  icon: Icon,
  empty,
  seeAllHref,
  seeAllLabel,
  children,
}: {
  title: string;
  icon: React.ElementType;
  empty: string;
  seeAllHref: string;
  seeAllLabel: string;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const items = React.Children.toArray(children);

  return (
    <div className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />
      </div>

      <div className="space-y-2">
        {items.length > 0 ? (
          items
        ) : (
          <p className="rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
            {empty}
          </p>
        )}
      </div>

      <button
        onClick={() => navigate(seeAllHref)}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-[1.2rem] border border-[var(--border-color)] py-2.5 text-xs font-semibold  text-[var(--text-tertiary)] transition-opacity hover:opacity-70"
      >
        {seeAllLabel}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function ContentRow({
  title,
  meta,
  onClick,
}: {
  title: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-left transition-opacity hover:opacity-70"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{title}</p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{meta}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
    </button>
  );
}
