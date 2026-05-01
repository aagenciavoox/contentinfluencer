import {useNavigate} from 'react-router-dom';
import {
  ChevronRight,
  Fingerprint,
  Globe,
  Layers,
  Layout,
  MonitorSpeaker,
  Palette,
  Settings as SettingsIcon,
  ShieldCheck,
  Shirt,
} from 'lucide-react';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {AppButton} from '../../../components/ui/AppButton';
import {useAppContext} from '../../../context/AppContext';
import {
  DEFAULT_MODULE_FLAGS,
  getModuleFlags,
  MODULE_FLAGS_PREFERENCE_KEY,
  ModuleFlagKey,
} from '../lib/moduleFlags';

export function SettingsPage() {
  const navigate = useNavigate();
  const {state, dispatch} = useAppContext();
  const moduleFlags = getModuleFlags(state.preferences);

  const items = [
    {
      to: '/configuracoes/dna',
      icon: Fingerprint,
      title: 'DNA da Voz',
      desc: 'Promessa central, público, tom de voz e limites do seu conteúdo',
    },
    {
      to: '/configuracoes/pilares',
      icon: Palette,
      title: 'Pilares Editoriais',
      desc: 'Gerencie os pilares de conteúdo, cores e hashtag combos por plataforma',
    },
    {
      to: '/configuracoes/looks',
      icon: Shirt,
      title: 'Looks & Cenários',
      desc: 'Catálogo de looks de gravação e cenários disponíveis',
    },
    {
      to: '/configuracoes/regras',
      icon: ShieldCheck,
      title: 'Regras de Ouro',
      desc: 'Validações editoriais que garantem consistência e qualidade da grade',
    },
    {
      to: '/configuracoes/series',
      icon: Layers,
      title: 'Séries',
      desc: 'Gerencie séries editoriais recorrentes com estrutura e frequência definidas',
    },
    {
      to: '/configuracoes/plataformas',
      icon: MonitorSpeaker,
      title: 'Plataformas',
      desc: 'Ative ou desative as plataformas onde você publica conteúdo',
    },
    {
      to: '/configuracoes/templates',
      icon: Layout,
      title: 'Templates de Roteiro',
      desc: 'Modelos de roteiro reutilizáveis por série ou formato',
    },
  ];

  const moduleCards: Array<{
    key: ModuleFlagKey;
    title: string;
    desc: string;
  }> = [
    {key: 'library', title: 'Biblioteca', desc: 'Acervo, notas e análises de consumo'},
    {key: 'recording', title: 'Gravação', desc: 'Fila, blocos e modo explosão'},
    {key: 'calendar', title: 'Calendário', desc: 'Agenda e visão mensal editorial'},
    {key: 'projects', title: 'Projetos', desc: 'Campanhas, publis e produções'},
    {key: 'analytics', title: 'Análise', desc: 'Monitoramento e leitura de resultados'},
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

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Sistema"
          title="Configurações"
          subtitle="Centralize as regras e definições que moldam o comportamento do seu sistema."
          icon={SettingsIcon}
        />
      </div>

      <div className="desktop-content-frame space-y-8">
        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--text-tertiary)] opacity-60">
              Módulos
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)]">
              Ligue ou desligue superfícies secundárias
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {moduleCards.map(({key, title, desc}) => (
              <div
                key={key}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4"
              >
                <div>
                  <p className="text-sm font-black text-[var(--text-primary)]">{title}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)] opacity-60">{desc}</p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleModuleFlag(key)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    moduleFlags[key] ? 'bg-[var(--text-primary)]' : 'bg-[var(--bg-hover)]'
                  }`}
                  aria-label={`${moduleFlags[key] ? 'Desativar' : 'Ativar'} módulo ${title}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                      moduleFlags[key] ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          {items.map(({to, icon: Icon, title, desc}) => (
            <AppButton
              key={to}
              onClick={() => navigate(to)}
              variant="ghost"
              size="lg"
              fullWidth
              className="group h-auto justify-start gap-5 border border-[#E5E7EB] px-5 py-4 text-left normal-case tracking-normal"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-hover)]">
                <Icon className="h-5 w-5 text-[var(--text-primary)] opacity-50 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--text-primary)]">{title}</p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)] opacity-50">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-primary)] opacity-20 transition-opacity group-hover:opacity-50" />
            </AppButton>
          ))}
        </section>
      </div>
    </div>
  );
}
