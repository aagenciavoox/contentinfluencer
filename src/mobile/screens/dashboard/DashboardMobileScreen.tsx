import { CalendarClock, FileText, FolderKanban, Lightbulb, Sparkles, Video } from 'lucide-react';
import type { AgendaItem, Content, Idea, Pilar, Projeto, Serie } from '../../../lib/database';
import { CONTENT_STATUS, PRODUCTION_TAGS } from '../../../features/contents/lib/contentPipeline';
import type { GentleExperienceSettings } from '../../../features/settings/lib/gentleExperience';
import { recommendDailyAction } from '../../../features/recommendations/recommendDailyAction';
import { DailyRecommendationBlock } from '../../../features/recommendations/DailyRecommendationBlock';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Text } from '../../../components/ui/Text';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';

interface DashboardMobileScreenProps {
  contents: Content[];
  ideas: Idea[];
  projetos: Projeto[];
  agendaItems: AgendaItem[];
  pilares: Pilar[];
  series: Serie[];
  gentleExperience: GentleExperienceSettings;
  onNavigate: (path: string) => void;
}

export function DashboardMobileScreen({
  contents,
  ideas,
  projetos,
  agendaItems,
  pilares,
  series,
  gentleExperience,
  onNavigate,
}: DashboardMobileScreenProps) {
  const useGentleLanguage = gentleExperience.enabled;
  const isPauseMode = gentleExperience.enabled && gentleExperience.pauseMode;
  const readyToRecord = contents.filter(
    (content) =>
      content.status === CONTENT_STATUS.PRODUCAO &&
      !content.recordedAt &&
      (content.tags.includes(PRODUCTION_TAGS.GRAVAR) || content.tags.length === 0),
  );
  const activeIdeas = ideas.filter((idea) => !idea.archived);
  const activeProjects = projetos.filter((project) => project.status !== 'Concluido');
  const realDeadlineProjects = projetos
    .filter((project) => Boolean(project.brand || project.value || project.dataFim))
    .filter((project) => project.status !== 'Concluido')
    .slice(0, 3);
  const upcomingAgenda = [...agendaItems]
    .filter((item) => item.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))
    .slice(0, 4);
  const recentContents = [...contents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  const dailyRecommendation =
    !isPauseMode
      ? recommendDailyAction({ pilares, series, contents })
      : null;

  return (
    <div className="stack-xl">
      {dailyRecommendation && gentleExperience.calmSuggestions ? (
        <DailyRecommendationBlock
          recommendation={dailyRecommendation}
          gentleLanguage={useGentleLanguage}
        />
      ) : null}

      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <MobileSectionHeader
          icon={Sparkles}
          tone="blue"
          title={isPauseMode ? 'Tudo guardado' : useGentleLanguage ? 'Talvez util hoje' : 'Resumo do dia'}
          description={
            useGentleLanguage
              ? isPauseMode
                ? 'Modo pausa ligado. O sistema fica quieto e preserva seu contexto.'
                : 'Um resumo leve para escolher o que faz sentido, sem pressa.'
              : 'Um resumo rapido para escolher sem abrir o painel completo.'
          }
        />

        <div className="grid-metrics">
          <FocusMetric
            icon={Video}
            label={useGentleLanguage ? 'Para gravar' : 'Prontos para gravar'}
            value={readyToRecord.length}
            tone="orange"
            showValue={gentleExperience.dashboardCounts && !isPauseMode}
          />
          <FocusMetric
            icon={Lightbulb}
            label="Ideias ativas"
            value={activeIdeas.length}
            tone="blue"
            showValue={gentleExperience.dashboardCounts && !isPauseMode}
          />
          <FocusMetric
            icon={FolderKanban}
            label={useGentleLanguage ? 'Projetos abertos' : 'Projetos ativos'}
            value={activeProjects.length}
            tone="green"
            showValue={gentleExperience.dashboardCounts && !isPauseMode}
          />
          <FocusMetric
            icon={CalendarClock}
            label={useGentleLanguage ? 'Para lembrar' : 'Agenda proxima'}
            value={upcomingAgenda.length}
            tone="default"
            showValue={gentleExperience.dashboardCounts && !isPauseMode}
          />
        </div>
      </section>

      {isPauseMode ? (
        <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
          <Text variant="bodyStrong">Pausa respeitada</Text>
          <Text variant="secondary" className="mt-2">
            Sugestoes ficam ocultas. Conteudos, ideias e projetos continuam guardados para quando voce quiser voltar.
          </Text>
        </section>
      ) : gentleExperience.calmSuggestions ? (
        <section className="stack-lg">
          <div className="px-1">
            <Text variant="label">Caminhos possiveis</Text>
          </div>

          <MobileListCard
            eyebrow="Gravacao"
            title={useGentleLanguage ? 'Separar algo para gravar' : 'Montar blocos do dia'}
            description={
              useGentleLanguage
                ? 'Roteiros disponiveis ficam aqui para quando houver energia de camera.'
                : `${readyToRecord.length} roteiros já podem entrar na fila de gravação.`
            }
            trailing={<Video className="h-4 w-4 text-[var(--accent-orange)]" />}
            onClick={() => onNavigate('/gravacao')}
          />

          <MobileListCard
            eyebrow="Ideias"
            title={useGentleLanguage ? 'Passear pelas ideias' : 'Revisar captura recente'}
            description={
              useGentleLanguage
                ? 'Capturas abertas podem ser revisitadas sem precisar virar tarefa agora.'
                : `${activeIdeas.length} ideias seguem abertas para promover ou organizar.`
            }
            trailing={<Lightbulb className="h-4 w-4 text-[var(--accent-blue)]" />}
            onClick={() => onNavigate('/ideias')}
          />

          <MobileListCard
            eyebrow="Projetos"
            title={useGentleLanguage ? 'Rever uma frente aberta' : 'Acompanhar entregas em curso'}
            description={
              useGentleLanguage
                ? 'Projetos ficam reunidos para ajudar a lembrar o contexto.'
                : `${activeProjects.length} projetos ativos com contexto para revisar.`
            }
            trailing={<FolderKanban className="h-4 w-4 text-[var(--accent-green)]" />}
            onClick={() => onNavigate('/projetos')}
          />

          {gentleExperience.realDeadlineHighlights ? (
            <MobileListCard
              eyebrow="Combinados"
              title={useGentleLanguage ? 'Compromissos externos guardados' : 'Prazos reais'}
              description={
                useGentleLanguage
                  ? 'Somente projetos com marca, valor ou data final aparecem com mais presenca.'
                  : `${realDeadlineProjects.length} projetos tem contexto externo marcado.`
              }
              trailing={<CalendarClock className="h-4 w-4 text-[var(--text-tertiary)]" />}
              onClick={() => onNavigate(realDeadlineProjects[0] ? `/projetos/${realDeadlineProjects[0].id}` : '/projetos')}
            />
          ) : null}
        </section>
      ) : null}

      <section className="stack-lg">
        <div className="px-1">
          <Text variant="label">
            {useGentleLanguage ? 'Agenda para lembrar' : 'Agenda proxima'}
          </Text>
        </div>

        {upcomingAgenda.length === 0 ? (
          <EmptyState compact
            title={useGentleLanguage ? 'Nada chamando atenção agora' : 'Agenda livre por enquanto'}
            description="Nenhum compromisso futuro encontrado na agenda editorial."
            icon={<CalendarClock className="h-8 w-8" />}
          />
        ) : (
          <div className="stack-md">
            {upcomingAgenda.map((item) => (
              <MobileListCard
                key={item.id}
                eyebrow={item.tipo}
                title={item.title}
                description={[item.date, item.time].filter(Boolean).join(' - ')}
                trailing={<CalendarClock className="h-4 w-4 text-[var(--text-tertiary)]" />}
              />
            ))}
          </div>
        )}
      </section>

      <section className="stack-lg">
        <div className="px-1">
          <Text variant="label">Movimento recente</Text>
        </div>

        {recentContents.length === 0 ? (
          <EmptyState compact
            title="Sem conteúdos recentes"
            description="Quando houver roteiros novos, eles aparecem aqui em leitura rápida."
            icon={<FileText className="h-8 w-8" />}
          />
        ) : (
          <div className="stack-md">
            {recentContents.map((content) => (
              <MobileListCard
                key={content.id}
                eyebrow={content.status}
                title={content.title || 'Conteudo sem titulo'}
                description={content.notes || 'Sem observacoes adicionais'}
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
  showValue = true,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: 'default' | 'orange' | 'blue' | 'green';
  showValue?: boolean;
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
    <div className="rounded-[var(--radius-md)] bg-[var(--bg-hover)] px-3 py-3">
      <div className={`mb-3 inline-flex rounded-[var(--radius-card)] p-2 ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <Text variant="label">{label}</Text>
      <Text variant="bodyStrong" className="mt-2 text-2xl">{showValue ? value : '...'}</Text>
    </div>
  );
}
