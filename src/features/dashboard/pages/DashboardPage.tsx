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
import {CONTENT_STATUS, PRODUCTION_TAGS} from '../../contents/lib/contentPipeline';
import {buildContentDetailRoute} from '../../contents/lib/contentDetailRoute';
import {createContentDraft} from '../../contents/lib/createContentDraft';
import {getGentleExperienceSettings} from '../../settings/lib/gentleExperience';
import {validateWeeklyContent} from '../../../utils/pilarRhythm';
import {recommendDailyAction} from '../../recommendations/recommendDailyAction';
import {DailyRecommendationBlock} from '../../recommendations/DailyRecommendationBlock';
import {AppButton} from '../../../components/ui/AppButton';
import {ContentRow, OperationalList} from '../../../components/ui';
import {Text} from '../../../components/ui/Text';
import {EMPTY} from '../../../lib/uiCopy';

export function DashboardPage() {
  const {state, dispatch} = useAppContext();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleNovoRoteiro = () => {
    const newContent = createContentDraft({title: 'Novo Conteudo', status: CONTENT_STATUS.ROTEIRO});
    void dispatch({type: 'ADD_CONTENT', payload: newContent});
    navigate(`${buildContentDetailRoute(newContent.id)}&focus=script`);
  };
  const gentleExperience = getGentleExperienceSettings(state.preferences);

  // Listas operacionais
  const readyToRecord = state.contents.filter(
    c =>
      c.status === CONTENT_STATUS.PRODUCAO &&
      !c.recordedAt &&
      (c.tags.includes(PRODUCTION_TAGS.GRAVAR) || c.tags.length === 0),
  );
  const inProduction = state.contents.filter(c => c.status === CONTENT_STATUS.PRODUCAO);
  const upcomingAgenda = [...state.agendaItems]
    .filter(item => item.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
    .slice(0, 5);

  // Regras de Ouro: validacao da semana atual
  const weekStart = startOfWeek(new Date(), {weekStartsOn: 1});
  const rhythmViolations = validateWeeklyContent(
    state.contents,
    weekStart,
    state.pilares,
    state.platforms,
  );

  // Projetos com deadline nos proximos 7 dias
  const today = new Date().toISOString().slice(0, 10);
  const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const urgentProjects = state.projetos
    .filter(p => p.status !== 'Concluido' && p.dataFim && p.dataFim >= today && p.dataFim <= in7days)
    .sort((a, b) => (a.dataFim! > b.dataFim! ? 1 : -1));

  // Bloco de destaque
  const spotlight = resolveSpotlight({readyToRecord, inProduction, upcomingAgenda});
  const dailyRecommendation =
    !gentleExperience.pauseMode
      ? recommendDailyAction({
          pilares: state.pilares,
          series: state.series,
          contents: state.contents,
        })
      : null;

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <DashboardMobileScreen
          contents={state.contents}
          ideas={state.ideas}
          projetos={state.projetos}
          agendaItems={state.agendaItems}
          pilares={state.pilares}
          series={state.series}
          gentleExperience={gentleExperience}
          onNavigate={navigate}
        />
      </div>
    );
  }

  return (
    <PageLayout
      header={
        <DesktopPageHeader
          section="Central"
          title="Hoje"
          icon={Sparkles}
          className="mb-0"
          actions={
            <AppButton variant="primary" onClick={handleNovoRoteiro} leftIcon={<Plus className="h-4 w-4" />}>
              Novo roteiro
            </AppButton>
          }
        />
      }
    >
      {/* Decisão diária */}
      {dailyRecommendation && gentleExperience.calmSuggestions ? (
        <DailyRecommendationBlock
          recommendation={dailyRecommendation}
          gentleLanguage={gentleExperience.enabled}
        />
      ) : null}

      {/* Bloco de destaque */}
      <SpotlightBlock spotlight={spotlight} onNavigate={navigate} />

      {/* Listas operacionais */}
      <section className="grid-dashboard">
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
              isStatus
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
              isStatus
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

      {/* Alerta de Regras de Ouro */}
      {rhythmViolations.length > 0 && (
        <button
          onClick={() => navigate('/configuracoes/pilares')}
          className="group flex w-full items-center justify-between gap-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--warning-bg)] px-6 py-4 text-left transition-colors hover:bg-[var(--warning-bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning)]" />
            <Text variant="bodyStrong">
              {rhythmViolations.length === 1
                ? '1 alerta de ritmo editorial nos pilares esta semana'
                : `${rhythmViolations.length} alertas de ritmo editorial nos pilares esta semana`}
            </Text>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--warning)]">
            Ver pilares <ArrowRight className="h-3 w-3" />
          </span>
        </button>
      )}

      {/* Projetos com deadline proximo */}
      {urgentProjects.length > 0 && (
        <section className="stack-md">
          <Text variant="eyebrow" as="span">
            <FolderKanban className="h-3.5 w-3.5" />
            Datas combinadas próximas
          </Text>
          <div className="grid-cards-row">
            {urgentProjects.map(project => (
              <button
                key={project.id}
                onClick={() => navigate(`/projetos/${project.id}`)}
                className="editorial-card group flex items-center justify-between gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <div className="min-w-0">
                  <Text variant="bodyStrong" truncate>{project.nome}</Text>
                  <Text variant="meta" className="mt-0.5 truncate">
                    {project.brand ? `${project.brand} · ` : ''}{project.dataFim}
                  </Text>
                </div>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Acoes rapidas */}
      <section className="stack-md">
        <Text variant="eyebrow">Atalhos</Text>
        <div className="flex flex-wrap gap-2">
          <QuickAction label="Novo roteiro" icon={Plus} onClick={handleNovoRoteiro} />
          <QuickAction label="Nova ideia" icon={Lightbulb} onClick={() => navigate('/ideias')} />
          <QuickAction label="Ir para gravação" icon={Video} onClick={() => navigate('/gravacao')} />
          <QuickAction label="Ver calendário" icon={CalendarDays} onClick={() => navigate('/calendario')} />
        </div>
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
  inProduction: {id: string; title?: string | null; status: string; recordedAt?: string | null}[];
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
  const editing = inProduction.filter(c => Boolean(c.recordedAt));
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
      <div className="editorial-card flex items-center justify-between gap-6 p-8">
        <div>
          <Text variant="eyebrow">Próximo passo</Text>
          <Text variant="spotlightTitle" className="mt-3">Tudo em dia</Text>
          <Text variant="body" className="mt-2 text-[var(--text-secondary)]">
            {EMPTY.dashboardSpotlight.description}
          </Text>
        </div>
        <Sparkles className="h-10 w-10 shrink-0 text-[var(--text-tertiary)]" />
      </div>
    );
  }

  if (spotlight.type === 'record') {
    return (
      <button
        onClick={() => onNavigate('/gravacao')}
        className="editorial-card group flex w-full items-center justify-between gap-6 border-l-2 border-[var(--accent-blue)] bg-[var(--bg-secondary)] p-8 text-left shadow-sm transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <div className="min-w-0">
          <Text variant="eyebrow">Próximo passo</Text>
          <Text variant="spotlightTitle" className="mt-3" truncate>
            {spotlight.count === 1
              ? `Gravar: ${spotlight.firstTitle}`
              : `${spotlight.count} roteiros prontos para gravar`}
          </Text>
          <Text variant="body" className="mt-2 text-[var(--text-secondary)]">
            {spotlight.count === 1
              ? 'Este roteiro já pode entrar em sessão de gravação.'
              : `Comece pelo primeiro: ${spotlight.firstTitle}`}
          </Text>
          <SpotlightCta>
            Abrir gravação <ArrowRight className="h-3.5 w-3.5" />
          </SpotlightCta>
        </div>
        <div className="rounded-[var(--radius-card-mobile)] bg-[var(--status-ready-bg)] p-6">
          <Clapperboard className="h-8 w-8 text-[var(--status-ready)]" />
        </div>
      </button>
    );
  }

  if (spotlight.type === 'edit') {
    return (
      <button
        onClick={() => onNavigate(buildContentDetailRoute(spotlight.firstId))}
        className="editorial-card group flex w-full items-center justify-between gap-6 border-l-2 border-[var(--accent-blue)] bg-[var(--bg-secondary)] p-8 text-left shadow-sm transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <div className="min-w-0">
          <Text variant="eyebrow">Próximo passo</Text>
          <Text variant="spotlightTitle" className="mt-3" truncate>
            {spotlight.count === 1
              ? `Editar: ${spotlight.firstTitle}`
              : `${spotlight.count} conteudos aguardando edicao`}
          </Text>
          <Text variant="body" className="mt-2 text-[var(--text-secondary)]">
            {spotlight.count === 1
              ? 'Pronto para entrar em edicao.'
              : `Continue pelo: ${spotlight.firstTitle}`}
          </Text>
          <SpotlightCta>
            Abrir conteúdo <ArrowRight className="h-3.5 w-3.5" />
          </SpotlightCta>
        </div>
        <div className="rounded-[var(--radius-card-mobile)] bg-[var(--status-recorded-bg)] p-6">
          <Scissors className="h-8 w-8 text-[var(--status-recorded)]" />
        </div>
      </button>
    );
  }

  // agenda
  return (
    <button
      onClick={() => onNavigate('/calendario')}
      className="editorial-card group flex w-full items-center justify-between gap-6 border-l-2 border-[var(--accent-blue)] bg-[var(--bg-secondary)] p-8 text-left shadow-sm transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <div className="min-w-0">
        <Text variant="eyebrow">Próximo passo</Text>
        <Text variant="spotlightTitle" className="mt-3" truncate>
          {spotlight.title}
        </Text>
        <Text variant="body" className="mt-2 text-[var(--text-secondary)]">
          {[spotlight.date, spotlight.time].filter(Boolean).join(' · ')}
        </Text>
        <SpotlightCta>
          Ver calendário <ArrowRight className="h-3.5 w-3.5" />
        </SpotlightCta>
      </div>
      <div className="rounded-[var(--radius-card-mobile)] bg-[var(--status-scheduled-bg)] p-6">
        <CalendarDays className="h-8 w-8 text-[var(--status-scheduled)]" />
      </div>
    </button>
  );
}

// --- Componentes ---

function SpotlightCta({children}: {children: React.ReactNode}) {
  return (
    <span className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-input)] border border-[var(--accent)] bg-[var(--accent)] px-3 text-[length:var(--font-size-button)] font-semibold text-[var(--bg-secondary)]">
      {children}
    </span>
  );
}

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
      className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
