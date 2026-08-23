import {useNavigate} from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Camera,
  Check,
  ChevronRight,
  Clock,
  Flag,
  FolderKanban,
  Hash,
  HeartHandshake,
  Layout,
  Leaf,
  MonitorSpeaker,
  PauseCircle,
  Settings as SettingsIcon,
  UserCircle2,
} from 'lucide-react';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {Text} from '../../../components/ui/Text';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {MobileToggleSwitch} from '../../../mobile/components/MobileToggleSwitch';
import {SettingsMobileScreen} from '../../../mobile/screens/settings/SettingsMobileScreen';
import {
  DEFAULT_MODULE_FLAGS,
  getModuleFlags,
  MODULE_FLAGS_PREFERENCE_KEY,
  ModuleFlagKey,
} from '../lib/moduleFlags';
import {
  DEFAULT_GENTLE_EXPERIENCE,
  GENTLE_EXPERIENCE_PREFERENCE_KEY,
  GentleExperienceSettings,
  getGentleExperienceSettings,
} from '../lib/gentleExperience';

type ItemStatus = 'complete' | 'partial' | 'empty' | undefined;

export function SettingsPage() {
  const navigate = useNavigate();
  const {state, dispatch} = useAppContext();
  const isMobile = useIsMobile();
  const moduleFlags = getModuleFlags(state.preferences);
  const gentleExperience = getGentleExperienceSettings(state.preferences);

  const getItemStatus = (key: string): ItemStatus => {
    switch (key) {
      case 'perfil': return 'complete';
      case 'plataformas': return (state.platforms?.filter((p: {ativo: boolean}) => p.ativo).length ?? 0) > 0 ? 'complete' : 'empty';
      case 'templates': return (state.templates?.length ?? 0) > 0 ? 'complete' : 'empty';
      case 'pilares': return (state.pilares?.length ?? 0) > 0 ? 'complete' : 'empty';
      case 'series': return (state.series?.length ?? 0) > 0 ? 'complete' : 'empty';
      case 'horarios': return 'complete';
      default: return undefined;
    }
  };

  const items = [
    {
      key: 'perfil',
      to: '/configuracoes/perfil',
      icon: UserCircle2,
      title: 'Perfil e Seguranca',
      desc: 'Atualize nome, email da conta e senha para desktop e mobile',
    },
    {
      key: 'plataformas',
      to: '/configuracoes/plataformas',
      icon: MonitorSpeaker,
      title: 'Plataformas',
      desc: 'Ative ou desative as plataformas onde você publica conteúdo',
    },
    {
      key: 'templates',
      to: '/configuracoes/templates',
      icon: Layout,
      title: 'Templates de Roteiro',
      desc: 'Modelos de roteiro reutilizáveis por série ou formato',
    },
    {
      key: 'pilares',
      to: '/configuracoes/pilares',
      icon: Leaf,
      title: 'Pilares',
      desc: 'Temas editoriais, metas de ciclo e hashtags por plataforma',
    },
    {
      key: 'series',
      to: '/configuracoes/series',
      icon: Hash,
      title: 'Séries',
      desc: 'Quadros recorrentes e roteiros vinculados a cada série',
    },
    {
      key: 'horarios',
      to: '/configuracoes/horarios',
      icon: Clock,
      title: 'Horários de Postagem',
      desc: 'Janelas recomendadas de publicação por dia da semana',
    },
    ...(moduleFlags.projects
      ? [
          {
            key: 'projetos',
            to: '/projetos',
            icon: FolderKanban,
            title: 'Projetos',
            desc: 'Campanhas, publis e produções editoriais',
          },
        ]
      : []),
  ].map(item => ({...item, status: getItemStatus(item.key)}));

  const moduleCards: Array<{
    key: ModuleFlagKey;
    title: string;
    desc: string;
    icon: React.ElementType;
  }> = [
    {key: 'library', title: 'Biblioteca', desc: 'Acervo e notas de consumo', icon: BookOpen},
    {key: 'recording', title: 'Gravação', desc: 'Fila, blocos e modo explosão', icon: Camera},
    {key: 'calendar', title: 'Calendário', desc: 'Agenda e visão mensal editorial', icon: Calendar},
    {key: 'projects', title: 'Projetos', desc: 'Campanhas, publis e produções', icon: FolderKanban},
  ];

  const toggleModuleFlag = (key: ModuleFlagKey) => {
    dispatch({
      type: 'SET_PREFERENCE',
      payload: {
        key: MODULE_FLAGS_PREFERENCE_KEY,
        value: {
          ...DEFAULT_MODULE_FLAGS,
          ...moduleFlags,
          [key]: !moduleFlags[key],
        },
      },
    });
  };

  const updateGentleExperience = (patch: Partial<GentleExperienceSettings>) => {
    dispatch({
      type: 'SET_PREFERENCE',
      payload: {
        key: GENTLE_EXPERIENCE_PREFERENCE_KEY,
        value: {
          ...DEFAULT_GENTLE_EXPERIENCE,
          ...gentleExperience,
          ...patch,
        },
      },
    });
  };

  const gentleCards = [
    {
      key: 'enabled',
      icon: HeartHandshake,
      title: 'Experiencia gentil',
      desc: 'Troca cobrancas por linguagem de apoio e escolhas sem pressa',
      enabled: gentleExperience.enabled,
      onToggle: () => updateGentleExperience({enabled: !gentleExperience.enabled}),
    },
    {
      key: 'pauseMode',
      icon: PauseCircle,
      title: 'Modo pausa',
      desc: 'Guarda tudo sem sugerir proximos movimentos no dashboard',
      enabled: gentleExperience.pauseMode,
      onToggle: () => updateGentleExperience({pauseMode: !gentleExperience.pauseMode}),
    },
    {
      key: 'calmSuggestions',
      icon: Leaf,
      title: 'Sugestoes calmas',
      desc: 'Mostra caminhos possiveis em vez de destaques fortes',
      enabled: gentleExperience.calmSuggestions,
      onToggle: () => updateGentleExperience({calmSuggestions: !gentleExperience.calmSuggestions}),
    },
    {
      key: 'dashboardCounts',
      icon: Hash,
      title: 'Numeros no dashboard',
      desc: 'Permite ocultar contadores quando voce quiser uma leitura mais leve',
      enabled: gentleExperience.dashboardCounts,
      onToggle: () => updateGentleExperience({dashboardCounts: !gentleExperience.dashboardCounts}),
    },
    {
      key: 'realDeadlineHighlights',
      icon: Flag,
      title: 'Destacar prazos reais',
      desc: 'Reserva destaque forte apenas para compromissos externos e entregas combinadas',
      enabled: gentleExperience.realDeadlineHighlights,
      onToggle: () => updateGentleExperience({realDeadlineHighlights: !gentleExperience.realDeadlineHighlights}),
    },
  ];

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <SettingsMobileScreen
          gentleCards={gentleCards}
          moduleCards={moduleCards.map(({key, title, desc}) => ({
            key,
            title,
            desc,
            enabled: moduleFlags[key],
            onToggle: () => toggleModuleFlag(key),
          }))}
          items={items.map((item) => ({
            ...item,
            onOpen: () => navigate(item.to),
          }))}
        />
      </div>
    );
  }

  return (
    <PageLayout
      variant="settings"
      header={
        <DesktopPageHeader
          section="Sistema"
          title="Configurações"
          icon={SettingsIcon}
        />
      }
    >
        <section className="stack-md">
          <div>
            <p className="text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)] opacity-60">
              Ritmo
            </p>
            <Text variant="sectionTitle" className="mt-1 tracking-tight">
              Ajuste como o sistema conversa com você
            </Text>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {gentleCards.map(({key, icon: CardIcon, title, desc, enabled, onToggle}) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-[var(--border-strong)]"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-hover)] text-[var(--text-primary)]">
                    <CardIcon className="h-4 w-4 opacity-50" />
                  </div>
                  <div className="min-w-0">
                    <p className="t-secondary font-semibold leading-snug text-[var(--text-primary)] truncate">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)] opacity-60 line-clamp-2">{desc}</p>
                  </div>
                </div>

                <div className="shrink-0 scale-90">
                  <MobileToggleSwitch
                    enabled={enabled}
                    onToggle={onToggle}
                    label={title}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="stack-md">
          <div>
            <p className="text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)] opacity-60">
              Módulos
            </p>
            <Text variant="sectionTitle" className="mt-1 tracking-tight">
              Ligue ou desligue superfícies secundárias
            </Text>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {moduleCards.map(({key, icon: CardIcon, title, desc}) => (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-[var(--border-strong)]"
              >
                <div className="flex min-w-0 items-start gap-2.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-hover)] text-[var(--text-primary)]">
                    <CardIcon className="h-4 w-4 opacity-50" />
                  </div>
                  <div className="min-w-0">
                    <p className="t-secondary font-semibold leading-snug text-[var(--text-primary)] truncate">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)] opacity-60 line-clamp-2">{desc}</p>
                  </div>
                </div>

                <div className="shrink-0 scale-90">
                  <MobileToggleSwitch
                    enabled={moduleFlags[key]}
                    onToggle={() => toggleModuleFlag(key)}
                    label={`módulo ${title}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="stack-md">
          <div>
            <p className="text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)] opacity-60">
              Diretrizes & Grade
            </p>
            <Text variant="sectionTitle" className="mt-1 tracking-tight">
              Gerencie a base e os parÃ¢metros da sua criação
            </Text>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => {
              const {to, icon: Icon, title, desc, status} = item;
              return (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="group flex flex-col justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-blue)] cursor-pointer min-h-[130px]"
                >
                  <div className="flex flex-col h-full w-full justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-hover)] text-[var(--text-primary)] transition-all duration-300 group-hover:bg-[var(--text-primary)] group-hover:text-[var(--bg-primary)]">
                          <Icon className="h-4.5 w-4.5 opacity-60 transition-opacity group-hover:opacity-100" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            if (status === 'complete') return <Check className="h-3.5 w-3.5 text-[var(--accent-green)]" />;
                            if (status === 'empty') return <span className="rounded px-1.5 py-0.5 text-xs font-semibold bg-[var(--accent-pink)]/10 text-[var(--accent-pink)]">Vazio</span>;
                            if (status === 'partial') return <span className="rounded px-1.5 py-0.5 text-xs font-semibold bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]">Parcial</span>;
                            return null;
                          })()}
                          <ChevronRight className="h-3.5 w-3.5 text-[var(--text-primary)] opacity-20 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-60" />
                        </div>
                      </div>
                      <Text variant="itemTitle" truncate className="tracking-tight leading-snug">
                        {title}
                      </Text>
                      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)] opacity-60 line-clamp-2">
                        {desc}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
    </PageLayout>
  );
}
