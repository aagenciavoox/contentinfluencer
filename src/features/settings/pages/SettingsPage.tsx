import type { ReactNode } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Palette,
  PenLine,
  UserCircle2,
  Video,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { ToggleRow } from '../../../components/ui/ToggleSwitch';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PAGE_SECTION } from '../../../layouts/navigation/navConfig';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { APP_VERSION } from '../../../lib/appVersion';
import type { AppTheme } from '../../../lib/themeStorage';
import { cn } from '../../../lib/utils';
import { atualizarPreferencias } from '../../editorial/lib/editorialSettings';
import {
  DEFAULT_GENTLE_EXPERIENCE,
  GENTLE_EXPERIENCE_PREFERENCE_KEY,
  getGentleExperienceSettings,
  type GentleExperienceSettings,
} from '../lib/gentleExperience';
import {
  DEFAULT_MODULE_FLAGS,
  getModuleFlags,
  MODULE_FLAGS_PREFERENCE_KEY,
  type ModuleFlagKey,
} from '../lib/moduleFlags';
import {
  DEFAULT_WRITING_WORKSPACE,
  WRITING_WORKSPACE_PREFERENCE_KEY,
  getWritingWorkspaceSettings,
} from '../lib/writingWorkspace';

const ROW_DIVIDER = 'border-b border-[var(--border-subtle)] py-3.5 first:pt-0 last:border-b-0 last:pb-0';

/** Carimbo do build (ISO) como data legível; em desenvolvimento não há versão. */
function formatBuildVersion(version: string): string | null {
  const date = new Date(version);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function iniciaisDoUsuario(nome: string, email: string): string {
  const base = nome.trim() || email.split('@')[0] || 'U';
  const partes = base.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export function SettingsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { state, dispatch } = useAppContext();
  const { user, signOut } = useAuth();
  const moduleFlags = getModuleFlags(state.preferences);
  const gentleExperience = getGentleExperienceSettings(state.preferences);
  const writingWorkspace = getWritingWorkspaceSettings(state.preferences);

  const userName = String(user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '').trim();
  const userEmail = user?.email ?? '';
  const displayName = userName || userEmail.split('@')[0] || 'Sua conta';
  const initials = iniciaisDoUsuario(userName, userEmail);

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

  const updateWritingWorkspace = (patch: Partial<typeof writingWorkspace>) => {
    dispatch({
      type: 'SET_PREFERENCE',
      payload: {
        key: WRITING_WORKSPACE_PREFERENCE_KEY,
        value: {
          ...DEFAULT_WRITING_WORKSPACE,
          ...writingWorkspace,
          ...patch,
        },
      },
    });
  };

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

  const aparenciaRows = [
    {
      id: 'opcao-dashboardCounts',
      title: 'Mostrar contadores',
      description: 'Exibe quantidades no Hoje, no calendário e nas leituras.',
      enabled: gentleExperience.dashboardCounts,
      onToggle: () => updateGentleExperience({ dashboardCounts: !gentleExperience.dashboardCounts }),
    },
    {
      id: 'opcao-pauseMode',
      title: 'Pausar sugestões',
      description: 'Oculta as leituras de próximos passos. A gravação continua disponível.',
      enabled: gentleExperience.pauseMode,
      onToggle: () => updateGentleExperience({ pauseMode: !gentleExperience.pauseMode }),
    },
  ];

  const producaoRows = [
    ...(!isMobile
      ? [
          {
            id: 'opcao-modo-escrita',
            title: 'Separar escrita e gestão',
            description: 'No computador, separa o roteiro da gestão e permite notas ao lado do texto.',
            enabled: writingWorkspace.enabled,
            onToggle: () => updateWritingWorkspace({ enabled: !writingWorkspace.enabled }),
          },
          ...(writingWorkspace.enabled
            ? [
                {
                  id: 'opcao-abrir-rascunho',
                  title: 'Abrir rascunho ao entrar',
                  description: 'Abre o rascunho de apoio ao entrar num roteiro. Fechar na edição não muda esta opção.',
                  enabled: writingWorkspace.openDraftByDefault,
                  onToggle: () =>
                    updateWritingWorkspace({ openDraftByDefault: !writingWorkspace.openDraftByDefault }),
                },
              ]
            : []),
        ]
      : []),
    {
      id: 'opcao-criacao-rapida',
      title: 'Criação rápida de séries',
      description: 'Crie com nome e cor e complete os detalhes depois.',
      enabled: state.editorial.quickSeriesCreate,
      onToggle: () =>
        dispatch({
          type: 'SET_EDITORIAL',
          payload: atualizarPreferencias(
            {
              ...state.editorial,
              quickSeriesCreate: !state.editorial.quickSeriesCreate,
            },
            {},
          ),
        }),
    },
    {
      id: 'opcao-avisos-abertos',
      title: 'Avisar sobre informações em aberto',
      description: 'Sinaliza séries sem pilar, objetivo, recorrência, formato ou esforço.',
      enabled: state.editorial.openInfoNotices,
      onToggle: () =>
        dispatch({
          type: 'SET_EDITORIAL',
          payload: atualizarPreferencias(
            {
              ...state.editorial,
              openInfoNotices: !state.editorial.openInfoNotices,
            },
            {},
          ),
        }),
    },
  ];

  const alertasRows = [
    ...(moduleFlags.calendar
      ? [
          {
            id: 'opcao-calmSuggestions',
            title: 'Avisar o que falta para postar',
            description: 'Mostra no Calendário e no Hoje o que ainda falta nas postagens salvas.',
            enabled: gentleExperience.calmSuggestions,
            onToggle: () => updateGentleExperience({ calmSuggestions: !gentleExperience.calmSuggestions }),
          },
        ]
      : []),
    ...(moduleFlags.projects
      ? [
          {
            id: 'opcao-realDeadlineHighlights',
            title: 'Destacar compromissos externos',
            description: 'Destaca no Hoje e em Projetos os prazos de entregas combinadas.',
            enabled: gentleExperience.realDeadlineHighlights,
            onToggle: () =>
              updateGentleExperience({ realDeadlineHighlights: !gentleExperience.realDeadlineHighlights }),
          },
        ]
      : []),
  ];

  const moduleRows: Array<{
    id: string;
    key: ModuleFlagKey;
    title: string;
    description: string;
    icon: ReactNode;
  }> = [
    {
      id: 'modulo-library',
      key: 'library',
      title: 'Biblioteca',
      description: 'Obras, anotações de leitura e conversão em roteiros.',
      icon: <BookOpen className="h-4 w-4" aria-hidden />,
    },
    {
      id: 'modulo-recording',
      key: 'recording',
      title: 'Gravação',
      description: 'Blocos, teleprompter e modo gravação.',
      icon: <Video className="h-4 w-4" aria-hidden />,
    },
    {
      id: 'modulo-calendar',
      key: 'calendar',
      title: 'Calendário',
      description: 'Visão de publicações e Planejamento editorial.',
      icon: <CalendarDays className="h-4 w-4" aria-hidden />,
    },
    {
      id: 'modulo-projects',
      key: 'projects',
      title: 'Projetos',
      description: 'Campanhas, publis e produções.',
      icon: <FolderKanban className="h-4 w-4" aria-hidden />,
    },
    {
      id: 'modulo-analises',
      key: 'analyses',
      title: 'Análises',
      description: 'Desempenho das publicações por rede (em preparação).',
      icon: <BarChart3 className="h-4 w-4" aria-hidden />,
    },
  ];

  const buildVersion = formatBuildVersion(APP_VERSION);

  return (
    <PageLayout
      variant="default"
      contentStack="none"
      header={
        <DesktopPageHeader
          section={PAGE_SECTION.configuracoes}
          title="Configurações"
          subtitle="Gerencie a experiência de uso, preferências de escrita, módulos do menu e sua conta."
          actions={
            <span className="inline-flex items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--success)]" aria-hidden />
              <Text variant="label" as="span" className="text-[var(--text-secondary)]">
                Alterações salvas automaticamente
              </Text>
            </span>
          }
        />
      }
    >
      <div className="w-full min-w-0 stack-lg">
        <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-2">
          {/* COLUNA 1 */}
          <div className="min-w-0 stack-lg">
            {/* 1. Aparência do Sistema */}
            <SettingsCard
              title="Aparência do sistema"
              description="Defina o tom visual da sua bancada de trabalho."
              icon={<Palette className="h-4 w-4" aria-hidden />}
            >
              <ThemeSelectorCards
                value={state.theme}
                onChange={theme => dispatch({ type: 'SET_THEME', payload: theme })}
              />

              <div className="h-px w-full bg-[var(--border-subtle)]" aria-hidden />

              <div>
                {aparenciaRows.map(row => (
                  <SettingsToggle key={row.id} {...row} />
                ))}
              </div>
            </SettingsCard>

            {/* 2. Experiência de Produção */}
            <SettingsCard
              title="Experiência de produção"
              description="Parâmetros de escrita, rascunhos e criação de séries."
              icon={<PenLine className="h-4 w-4" aria-hidden />}
            >
              <div>
                {producaoRows.map(row => (
                  <SettingsToggle key={row.id} {...row} />
                ))}
              </div>
            </SettingsCard>

            {/* 3. Alertas e Prazos */}
            {alertasRows.length > 0 ? (
              <SettingsCard
                title="Alertas e prazos"
                description="Controle os lembretes exibidos no Hoje, Calendário e Projetos."
                icon={<Bell className="h-4 w-4" aria-hidden />}
              >
                <div>
                  {alertasRows.map(row => (
                    <SettingsToggle key={row.id} {...row} />
                  ))}
                </div>
              </SettingsCard>
            ) : null}
          </div>

          {/* COLUNA 2 */}
          <div className="min-w-0 stack-lg">
            {/* 4. Áreas do Sistema */}
            <SettingsCard
              title="Áreas do sistema"
              description="Desligar esconde a área no menu. Os dados continuam salvos."
              icon={<LayoutGrid className="h-4 w-4" aria-hidden />}
            >
              <div>
                {moduleRows.map(row => (
                  <SettingsToggle
                    key={row.id}
                    id={row.id}
                    title={row.title}
                    description={row.description}
                    icon={row.icon}
                    enabled={moduleFlags[row.key]}
                    onToggle={() => toggleModuleFlag(row.key)}
                  />
                ))}
              </div>
            </SettingsCard>

            {/* 5. Sua Conta */}
            <SettingsCard
              title="Sua conta"
              description="Credenciais de acesso, perfil e sessão ativa."
              icon={<UserCircle2 className="h-4 w-4" aria-hidden />}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    aria-hidden
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-accent-strong)] text-[var(--brand-on-accent)]"
                  >
                    <Text variant="bodyStrong" as="span" className="text-current">
                      {initials}
                    </Text>
                  </div>
                  <div className="min-w-0">
                    <Text variant="bodyStrong" as="p" className="truncate text-[var(--text-primary)]">
                      {displayName}
                    </Text>
                    {userEmail ? (
                      <Text variant="meta" as="p" className="truncate text-[var(--text-secondary)]">
                        {userEmail}
                      </Text>
                    ) : null}
                  </div>
                </div>

                <AppButton
                  variant="secondary"
                  size="xs"
                  onClick={() => navigate('/configuracoes/perfil')}
                >
                  Editar perfil
                </AppButton>
              </div>

              <button
                type="button"
                onClick={() => navigate('/configuracoes/perfil')}
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3.5 py-3 text-left transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <span className="min-w-0">
                  <Text variant="bodyStrong" as="span" className="block text-[var(--text-primary)]">
                    Nome, e-mail e senha
                  </Text>
                  <Text variant="meta" as="span" className="mt-0.5 block text-[var(--text-secondary)]">
                    Atualize seu nome de exibição, endereço de acesso ou redefina a senha.
                  </Text>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
              </button>

              <div className="h-px w-full bg-[var(--border-subtle)]" aria-hidden />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5">
                <div className="min-w-0">
                  <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)]">
                    Sair da conta
                  </Text>
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    Encerra a sessão ativa neste dispositivo.
                  </Text>
                </div>
                <AppButton
                  variant="secondary"
                  size="xs"
                  leftIcon={<LogOut className="h-3.5 w-3.5" />}
                  onClick={() => void signOut()}
                >
                  Sair da conta
                </AppButton>
              </div>
            </SettingsCard>
          </div>
        </div>

        {buildVersion ? (
          <div className="flex justify-end">
            <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
              Versão de {buildVersion}
            </Text>
          </div>
        ) : null}
      </div>
    </PageLayout>
  );
}

function SettingsCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Surface
      as="section"
      variant="outlined"
      padding="md"
      className="bg-[var(--bg-elevated)] p-4 sm:p-6 stack-md"
    >
      <div className="flex items-start gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
        >
          {icon}
        </div>
        <div className="min-w-0">
          <Text variant="sectionTitle" as="h2" className="leading-snug text-[var(--text-primary)]">
            {title}
          </Text>
          <Text variant="meta" as="p" className="mt-0.5 text-[var(--text-secondary)]">
            {description}
          </Text>
        </div>
      </div>

      <div className="stack-md">{children}</div>
    </Surface>
  );
}

const THEME_OPTIONS: Array<{
  id: AppTheme;
  label: string;
  description: string;
}> = [
  { id: 'light', label: 'Claro', description: 'Contraste nítido para trabalho diurno' },
  { id: 'dark', label: 'Escuro', description: 'Fundo profundo para sessões noturnas' },
  { id: 'system', label: 'Sistema', description: 'Acompanha a aparência do aparelho' },
];

function ThemePreviewThumb({ theme }: { theme: AppTheme }) {
  if (theme === 'light') {
    return (
      <div
        aria-hidden
        className="mb-2.5 flex h-14 w-full flex-col gap-1 overflow-hidden rounded-[var(--radius-sm)] border p-1.5"
        style={{ backgroundColor: '#F6F5F3', borderColor: '#E5E5E1' }}
      >
        <div className="flex h-2 w-full items-center rounded-[var(--radius-sm)] px-1" style={{ backgroundColor: '#FFFFFF' }}>
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: '#D7D7D2' }} />
        </div>
        <div className="flex flex-1 gap-1">
          <div className="h-full w-1/4 rounded-[var(--radius-sm)]" style={{ backgroundColor: '#FFFFFF' }} />
          <div className="flex h-full flex-1 flex-col gap-1 rounded-[var(--radius-sm)] p-1" style={{ backgroundColor: '#FFFFFF' }}>
            <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: '#E5E5E1' }} />
            <div className="h-1 w-1/2 rounded-full" style={{ backgroundColor: '#E5E5E1' }} />
          </div>
        </div>
      </div>
    );
  }

  if (theme === 'dark') {
    return (
      <div
        aria-hidden
        className="mb-2.5 flex h-14 w-full flex-col gap-1 overflow-hidden rounded-[var(--radius-sm)] border p-1.5"
        style={{ backgroundColor: '#0F0F0E', borderColor: '#2A2A26' }}
      >
        <div className="flex h-2 w-full items-center rounded-[var(--radius-sm)] px-1" style={{ backgroundColor: '#1B1B19' }}>
          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: '#52524E' }} />
        </div>
        <div className="flex flex-1 gap-1">
          <div className="h-full w-1/4 rounded-[var(--radius-sm)]" style={{ backgroundColor: '#1B1B19' }} />
          <div className="flex h-full flex-1 flex-col gap-1 rounded-[var(--radius-sm)] p-1" style={{ backgroundColor: '#1B1B19' }}>
            <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: '#33332F' }} />
            <div className="h-1 w-1/2 rounded-full" style={{ backgroundColor: '#33332F' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="mb-2.5 flex h-14 w-full flex-col gap-1 overflow-hidden rounded-[var(--radius-sm)] border p-1.5"
      style={{
        background: 'linear-gradient(90deg, #F6F5F3 0%, #F6F5F3 50%, #161614 50%, #161614 100%)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex h-2 w-full items-center rounded-[var(--radius-sm)] px-1" style={{ backgroundColor: 'rgba(255,255,255,0.65)' }}>
        <span className="h-1 w-1 rounded-full" style={{ backgroundColor: '#8A8A81' }} />
      </div>
      <div className="flex flex-1 gap-1">
        <div className="h-full w-1/4 rounded-[var(--radius-sm)]" style={{ backgroundColor: 'rgba(255,255,255,0.75)' }} />
        <div className="flex h-full flex-1 flex-col gap-1 rounded-[var(--radius-sm)] p-1" style={{ backgroundColor: 'rgba(27,27,25,0.55)' }}>
          <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.45)' }} />
          <div className="h-1 w-1/2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
        </div>
      </div>
    </div>
  );
}

function ThemeSelectorCards({
  value,
  onChange,
}: {
  value: AppTheme;
  onChange: (theme: AppTheme) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Tema do app" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {THEME_OPTIONS.map(option => {
        const active = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex flex-col rounded-[var(--radius-card)] p-3 text-left transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
              active
                ? 'border-2 border-[var(--text-primary)] bg-[var(--bg-elevated)]'
                : 'border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)]',
            )}
          >
            <ThemePreviewThumb theme={option.id} />
            <div className="flex items-center justify-between gap-2">
              <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
                {option.label}
              </Text>
              {active ? (
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-elevated)]">
                  <Check className="h-2.5 w-2.5" aria-hidden />
                </span>
              ) : null}
            </div>
            <Text variant="meta" as="p" className="mt-1 leading-snug text-[var(--text-secondary)]">
              {option.description}
            </Text>
          </button>
        );
      })}
    </div>
  );
}

function SettingsToggle({
  id,
  title,
  description,
  icon,
  enabled,
  onToggle,
}: {
  id: string;
  title: string;
  description: string;
  icon?: ReactNode;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <ToggleRow
      id={id}
      enabled={enabled}
      onToggle={onToggle}
      title={title}
      className={cn('gap-4', ROW_DIVIDER)}
    >
      <div className="flex items-start gap-3">
        {icon ? (
          <span
            aria-hidden
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)]"
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0">
          <Text variant="bodyStrong" as="span" className="block text-[var(--text-primary)]">
            {title}
          </Text>
          <Text variant="meta" as="span" className="mt-0.5 block text-[var(--text-secondary)]">
            {description}
          </Text>
        </span>
      </div>
    </ToggleRow>
  );
}
