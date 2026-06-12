import { CalendarClock, FileText, FolderKanban, Lightbulb, Sparkles, Video } from 'lucide-react';
import type { AgendaItem, Content, Idea, Projeto } from '../../../lib/database';
import { CONTENT_STATUS } from '../../../features/contents/lib/contentPipeline';
import type { GentleExperienceSettings } from '../../../features/settings/lib/gentleExperience';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';

interface DashboardMobileScreenProps {
  contents: Content[];
  ideas: Idea[];
  projetos: Projeto[];
  agendaItems: AgendaItem[];
  gentleExperience: GentleExperienceSettings;
}

export function DashboardMobileScreen({
  contents,
  ideas,
  projetos,
  agendaItems,
  gentleExperience,
}: DashboardMobileScreenProps) {
  const useGentleLanguage = gentleExperience.enabled;
  const isPauseMode = gentleExperience.enabled && gentleExperience.pauseMode;
  const readyToRecord = contents.filter((content) => content.status === CONTENT_STATUS.PRONTO_PARA_GRAVAR);
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

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--accent-blue)]/12 p-3 text-[var(--accent-blue)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">
              {isPauseMode ? 'Tudo guardado' : useGentleLanguage ? 'Talvez util hoje' : 'Resumo do dia'}
            </p>
            <p className="t-secondary">
              {useGentleLanguage
                ? isPauseMode
                  ? 'Modo pausa ligado. O sistema fica quieto e preserva seu contexto.'
                  : 'Um resumo leve para escolher o que faz sentido, sem pressa.'
                : 'Um resumo rapido para escolher sem abrir o painel completo.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
          <p className="text-sm font-semibold text-[var(--text-primary)]">Pausa respeitada</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Sugestoes ficam ocultas. Conteudos, ideias e projetos continuam guardados para quando voce quiser voltar.
          </p>
        </section>
      ) : gentleExperience.calmSuggestions ? (
        <section className="space-y-4">
          <div className="px-1">
            <p className="t-label text-[var(--text-tertiary)]">
              Caminhos possiveis
            </p>
          </div>

          <MobileListCard
            eyebrow="Gravacao"
            title={useGentleLanguage ? 'Separar algo para gravar' : 'Montar blocos do dia'}
            description={
              useGentleLanguage
                ? 'Roteiros disponiveis ficam aqui para quando houver energia de camera.'
                : `${readyToRecord.length} roteiros ja podem entrar na fila de gravacao.`
            }
            trailing={<Video className="h-4 w-4 text-[var(--accent-orange)]" />}
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
            />
          ) : null}
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="px-1">
          <p className="t-label text-[var(--text-tertiary)]">
            {useGentleLanguage ? 'Agenda para lembrar' : 'Agenda proxima'}
          </p>
        </div>

        {upcomingAgenda.length === 0 ? (
          <MobileEmptyState
            title={useGentleLanguage ? 'Nada chamando atencao agora' : 'Agenda livre por enquanto'}
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
                description={[item.date, item.time].filter(Boolean).join(' - ')}
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
    <div className="rounded-[1.25rem] bg-[var(--bg-hover)] px-3 py-3">
      <div className={`mb-3 inline-flex rounded-xl p-2 ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="t-label text-[var(--text-tertiary)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{showValue ? value : '...'}</p>
    </div>
  );
}
