import type {ReactNode} from 'react';
import {ChevronRight} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {SegmentTabs} from '../../../components/ui/SegmentTabs';
import {Text} from '../../../components/ui/Text';
import {ToggleRow} from '../../../components/ui/ToggleSwitch';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {PageLayout} from '../../../layouts/page/PageLayout';
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

const ROW_RULE = 'border-b border-[var(--border-color)] py-4';

export function SettingsPage() {
  const navigate = useNavigate();
  const {state, dispatch} = useAppContext();
  const isMobile = useIsMobile();
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

  const experienceRows = [
    {
      id: 'opcao-enabled',
      title: 'Experiência gentil',
      description: 'Preferência salva. O texto das telas não muda com esta chave.',
      enabled: gentleExperience.enabled,
      onToggle: () => updateGentleExperience({enabled: !gentleExperience.enabled}),
    },
    {
      id: 'opcao-pauseMode',
      title: 'Pausar sugestões',
      description: 'Oculta as leituras de próximos passos no Hoje. A gravação continua disponível.',
      enabled: gentleExperience.pauseMode,
      onToggle: () => updateGentleExperience({pauseMode: !gentleExperience.pauseMode}),
    },
    {
      id: 'opcao-calmSuggestions',
      title: 'Sugestões calmas',
      description: 'Mostra no calendário um aviso de roteiros prontos para gravar.',
      enabled: gentleExperience.calmSuggestions,
      onToggle: () => updateGentleExperience({calmSuggestions: !gentleExperience.calmSuggestions}),
    },
    {
      id: 'opcao-dashboardCounts',
      title: 'Mostrar contadores',
      description: 'Exibe quantidades no Hoje, no calendário e nas leituras.',
      enabled: gentleExperience.dashboardCounts,
      onToggle: () => updateGentleExperience({dashboardCounts: !gentleExperience.dashboardCounts}),
    },
    {
      id: 'opcao-realDeadlineHighlights',
      title: 'Destacar compromissos externos',
      description: 'Destaca no início e em Projetos os prazos de entregas combinadas.',
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
    {id: 'modulo-recording', key: 'recording', title: 'Gravação', description: 'Fila, blocos e modo de gravação'},
    {id: 'modulo-calendar', key: 'calendar', title: 'Calendário', description: 'Agenda editorial e Planejamento. Desligar o Calendário também oculta o Planejamento.'},
    {id: 'modulo-projects', key: 'projects', title: 'Projetos', description: 'Campanhas, publis e produções'},
  ];

  const accountLinks = [
    {
      to: '/configuracoes/perfil',
      title: 'Perfil e segurança',
      description: 'Nome, e-mail e senha',
    },
    {
      to: '/contas',
      title: 'Contas e horários',
      description: 'Contas de cada rede e horários de postagem',
    },
  ];

  return (
    <PageLayout variant="settings" contentStack="none">
      <div className="mx-auto w-full min-w-0 max-w-xl stack-2xl">
        {isMobile ? null : (
          <Text variant="pageTitle">Configurações</Text>
        )}

        <SettingsSection label="Aparência">
          <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-3 ${ROW_RULE}`}>
            <Text variant="bodyStrong" className="min-w-0">Tema do app</Text>
            <SegmentTabs<'light' | 'dark'>
              className="ml-auto max-w-full shrink-0"
              ariaLabel="Tema do app"
              options={[
                {id: 'light', label: 'Claro'},
                {id: 'dark', label: 'Escuro'},
              ]}
              value={state.theme === 'dark' ? 'dark' : 'light'}
              onChange={theme => dispatch({type: 'SET_THEME', payload: theme})}
            />
          </div>
        </SettingsSection>

        <SettingsSection label="Experiência">
          {experienceRows.map(row => (
            <SettingsToggle key={row.id} {...row} />
          ))}
        </SettingsSection>

        <SettingsSection label="Escrita">
          {writingRows.map(row => (
            <SettingsToggle key={row.id} {...row} />
          ))}
        </SettingsSection>

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
            description="Sinaliza séries sem pilar, função, recorrência, formato ou esforço."
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

        <SettingsSection label="Conta">
          {accountLinks.map(link => (
            <button
              key={link.to}
              type="button"
              onClick={() => navigate(link.to)}
              className={`flex w-full cursor-pointer items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] ${ROW_RULE}`}
            >
              <span className="min-w-0">
                <Text variant="bodyStrong" as="span" className="block">{link.title}</Text>
                <Text variant="secondary" as="span" className="mt-0.5 block">{link.description}</Text>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
            </button>
          ))}
        </SettingsSection>
      </div>
    </PageLayout>
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
