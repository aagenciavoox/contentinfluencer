import type {ReactNode} from 'react';
import {ChevronRight, LogOut} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {AppButton} from '../../../components/ui/AppButton';
import {SegmentTabs} from '../../../components/ui/SegmentTabs';
import {Text} from '../../../components/ui/Text';
import {ToggleRow} from '../../../components/ui/ToggleSwitch';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {APP_VERSION} from '../../../lib/appVersion';
import type {AppTheme} from '../../../lib/themeStorage';
import {atualizarPreferencias} from '../../editorial/lib/editorialSettings';
import {
  DEFAULT_MODULE_FLAGS,
  getModuleFlags,
  MODULE_FLAGS_PREFERENCE_KEY,
  type ModuleFlagKey,
} from '../lib/moduleFlags';
import {
  DEFAULT_GENTLE_EXPERIENCE,
  GENTLE_EXPERIENCE_PREFERENCE_KEY,
  getGentleExperienceSettings,
  type GentleExperienceSettings,
} from '../lib/gentleExperience';
import {
  DEFAULT_WRITING_WORKSPACE,
  WRITING_WORKSPACE_PREFERENCE_KEY,
  getWritingWorkspaceSettings,
} from '../lib/writingWorkspace';

const ROW_RULE = 'border-b border-[var(--border-color)] py-4 last:border-b-0';

/** Carimbo do build (ISO) como data legível; em desenvolvimento não há versão. */
function formatBuildVersion(version: string): string | null {
  const date = new Date(version);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});
}

export function SettingsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {state, dispatch} = useAppContext();
  const {signOut} = useAuth();
  const moduleFlags = getModuleFlags(state.preferences);
  const gentleExperience = getGentleExperienceSettings(state.preferences);
  const writingWorkspace = getWritingWorkspaceSettings(state.preferences);

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

  // As chaves de experiência ficam agrupadas pela tela em que agem.
  // "Experiência gentil" (gentleExperience.enabled) não é lida em lugar nenhum; a chave saiu da tela.
  const hojeRows = [
    {
      id: 'opcao-pauseMode',
      title: 'Pausar sugestões',
      description: 'Oculta as leituras de próximos passos. A gravação continua disponível.',
      enabled: gentleExperience.pauseMode,
      onToggle: () => updateGentleExperience({pauseMode: !gentleExperience.pauseMode}),
    },
    {
      id: 'opcao-dashboardCounts',
      title: 'Mostrar contadores',
      description: 'Exibe quantidades no Hoje, no calendário e nas leituras.',
      enabled: gentleExperience.dashboardCounts,
      onToggle: () => updateGentleExperience({dashboardCounts: !gentleExperience.dashboardCounts}),
    },
  ];

  const calendarioRows = [
    {
      id: 'opcao-calmSuggestions',
      title: 'Avisar o que falta para postar',
      description: 'Mostra no Calendário e no Hoje o que ainda falta nas postagens salvas.',
      enabled: gentleExperience.calmSuggestions,
      onToggle: () => updateGentleExperience({calmSuggestions: !gentleExperience.calmSuggestions}),
    },
  ];

  const projetosRows = [
    {
      id: 'opcao-realDeadlineHighlights',
      title: 'Destacar compromissos externos',
      description: 'Destaca no Hoje e em Projetos os prazos de entregas combinadas.',
      enabled: gentleExperience.realDeadlineHighlights,
      onToggle: () => updateGentleExperience({realDeadlineHighlights: !gentleExperience.realDeadlineHighlights}),
    },
  ];

  const writingRows = [
    {
      id: 'opcao-modo-escrita',
      title: 'Separar escrita e gestão',
      description: 'No computador, separa o roteiro da gestão e permite notas ao lado do texto.',
      enabled: writingWorkspace.enabled,
      onToggle: () => updateWritingWorkspace({enabled: !writingWorkspace.enabled}),
    },
    ...(writingWorkspace.enabled
      ? [{
          id: 'opcao-abrir-rascunho',
          title: 'Abrir rascunho ao entrar',
          description: 'Abre o rascunho de apoio ao entrar num roteiro. Fechar na edição não muda esta opção.',
          enabled: writingWorkspace.openDraftByDefault,
          onToggle: () => updateWritingWorkspace({openDraftByDefault: !writingWorkspace.openDraftByDefault}),
        }]
      : []),
  ];

  const moduleRows: Array<{
    id: string;
    key: ModuleFlagKey;
    title: string;
    description: string;
  }> = [
    {id: 'modulo-library', key: 'library', title: 'Biblioteca', description: 'Obras e anotações'},
    {id: 'modulo-recording', key: 'recording', title: 'Gravação', description: 'Blocos e modo gravação'},
    {id: 'modulo-calendar', key: 'calendar', title: 'Calendário', description: 'Calendário e Planejamento'},
    {id: 'modulo-projects', key: 'projects', title: 'Projetos', description: 'Campanhas, publis e produções'},
    {id: 'modulo-analises', key: 'analyses', title: 'Análises', description: 'Desempenho das publicações por rede (em preparação)'},
  ];

  const accountLinks = [
    {
      to: '/configuracoes/perfil',
      title: 'Perfil',
      description: 'Nome, e-mail e senha',
    },
  ];


  const buildVersion = formatBuildVersion(APP_VERSION);

  return (
    <PageLayout
      variant="settings"
      contentStack="none"
      header={(
        <DesktopPageHeader
          section="Configurações"
          title="Configurações"
        />
      )}
    >
      <div className="w-full min-w-0 max-w-2xl stack-2xl">
        <SettingsSection label="Aparência">
          <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 ${ROW_RULE}`}>
            <Text variant="bodyStrong" className="min-w-0">Tema do app</Text>
            <SegmentTabs<AppTheme>
              className="ml-auto max-w-full shrink-0"
              ariaLabel="Tema do app"
              options={[
                {id: 'light', label: 'Claro'},
                {id: 'dark', label: 'Escuro'},
                {id: 'system', label: 'Sistema'},
              ]}
              value={state.theme}
              onChange={theme => dispatch({type: 'SET_THEME', payload: theme})}
            />
          </div>
        </SettingsSection>

        <SettingsSection label="Hoje">
          {hojeRows.map(row => (
            <SettingsToggle key={row.id} {...row} />
          ))}
        </SettingsSection>

        {moduleFlags.calendar ? (
          <SettingsSection label="Calendário">
            {calendarioRows.map(row => (
              <SettingsToggle key={row.id} {...row} />
            ))}
          </SettingsSection>
        ) : null}

        {moduleFlags.projects ? (
          <SettingsSection label="Projetos">
            {projetosRows.map(row => (
              <SettingsToggle key={row.id} {...row} />
            ))}
          </SettingsSection>
        ) : null}

        {/* As chaves de escrita só mudam o editor do computador. */}
        {!isMobile ? (
          <SettingsSection label="Escrita">
            {writingRows.map(row => (
              <SettingsToggle key={row.id} {...row} />
            ))}
          </SettingsSection>
        ) : null}

        <SettingsSection
          label="Áreas do app"
          note="Desligar esconde a área no menu. Os dados continuam salvos."
        >
          {moduleRows.map(row => (
            <SettingsToggle
              key={row.id}
              id={row.id}
              title={row.title}
              description={row.description}
              enabled={moduleFlags[row.key]}
              onToggle={() => toggleModuleFlag(row.key)}
            />
          ))}
        </SettingsSection>

        <SettingsSection label="Séries">
          <SettingsToggle
            id="opcao-criacao-rapida"
            title="Criação rápida de séries"
            description="Crie com nome e cor e complete os detalhes depois."
            enabled={state.editorial.quickSeriesCreate}
            onToggle={() => dispatch({
              type: 'SET_EDITORIAL',
              payload: atualizarPreferencias({
                ...state.editorial,
                quickSeriesCreate: !state.editorial.quickSeriesCreate,
              }, {}),
            })}
          />
          <SettingsToggle
            id="opcao-avisos-abertos"
            title="Avisar sobre informações em aberto"
            description="Sinaliza séries sem pilar, objetivo, recorrência, formato ou esforço."
            enabled={state.editorial.openInfoNotices}
            onToggle={() => dispatch({
              type: 'SET_EDITORIAL',
              payload: atualizarPreferencias({
                ...state.editorial,
                openInfoNotices: !state.editorial.openInfoNotices,
              }, {}),
            })}
          />
        </SettingsSection>

        <SettingsSection label="Sua conta">
          {accountLinks.map(link => (
            <SettingsLinkRow key={link.to} {...link} onOpen={navigate} />
          ))}
        </SettingsSection>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-color)] pt-6">
          <AppButton
            variant="secondary"
            size="sm"
            leftIcon={<LogOut className="h-4 w-4" />}
            onClick={() => void signOut()}
          >
            Sair da conta
          </AppButton>
          {buildVersion ? (
            <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
              Versão de {buildVersion}
            </Text>
          ) : null}
        </div>
      </div>
    </PageLayout>
  );
}

function SettingsLinkRow({
  to,
  title,
  description,
  onOpen,
}: {
  to: string;
  title: string;
  description: string;
  onOpen: (to: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(to)}
      className={`flex w-full cursor-pointer items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${ROW_RULE}`}
    >
      <span className="min-w-0">
        <Text variant="bodyStrong" as="span" className="block">{title}</Text>
        <Text variant="secondary" as="span" className="mt-0.5 block">{description}</Text>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
    </button>
  );
}

function SettingsSection({
  label,
  note,
  children,
}: {
  label: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="stack-md">
      <div className="stack-xs">
        <Text variant="eyebrow">{label}</Text>
        {note ? <Text variant="secondary">{note}</Text> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

function SettingsToggle({
  id,
  title,
  description,
  enabled,
  onToggle,
}: {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <ToggleRow
      id={id}
      enabled={enabled}
      onToggle={onToggle}
      title={title}
      className={`gap-4 ${ROW_RULE}`}
    >
      <Text variant="bodyStrong" as="span" className="block">{title}</Text>
      <Text variant="secondary" as="span" className="mt-0.5 block">{description}</Text>
    </ToggleRow>
  );
}
