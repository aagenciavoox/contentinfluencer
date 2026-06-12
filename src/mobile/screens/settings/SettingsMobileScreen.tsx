import {
  ChevronRight,
  HeartHandshake,
  Layout,
  MonitorSpeaker,
  Settings as SettingsIcon,
  UserCircle2,
} from 'lucide-react';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileToggleSwitch } from '../../components/MobileToggleSwitch';

interface SettingsMobileScreenProps {
  gentleCards: Array<{
    key: string;
    title: string;
    desc: string;
    enabled: boolean;
    onToggle: () => void;
  }>;
  moduleCards: Array<{
    key: string;
    title: string;
    desc: string;
    enabled: boolean;
    onToggle: () => void;
  }>;
  items: Array<{
    to: string;
    title: string;
    desc: string;
    onOpen: () => void;
  }>;
}

const ICON_BY_ROUTE: Record<string, React.ElementType> = {
  '/configuracoes/perfil': UserCircle2,
  '/configuracoes/plataformas': MonitorSpeaker,
  '/configuracoes/templates': Layout,
};

export function SettingsMobileScreen({
  gentleCards,
  moduleCards,
  items,
}: SettingsMobileScreenProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--accent-blue)]/12 p-3 text-[var(--accent-blue)]">
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Configurações</p>
            <p className="t-secondary">Ajustes do sistema organizados para leitura e ação rápida no mobile.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="px-1">
          <p className="t-label text-[var(--text-tertiary)]">Ritmo</p>
        </div>

        <div className="space-y-3">
          {gentleCards.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 shadow-sm"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--bg-hover)] p-2 text-[var(--text-primary)]">
                  <HeartHandshake className="h-4 w-4 opacity-60" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              </div>

              <MobileToggleSwitch
                enabled={item.enabled}
                onToggle={item.onToggle}
                label={item.title}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="px-1">
          <p className="t-label text-[var(--text-tertiary)]">Módulos</p>
        </div>

        <div className="space-y-3">
          {moduleCards.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 shadow-sm"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.desc}</p>
              </div>

              <MobileToggleSwitch
                enabled={item.enabled}
                onToggle={item.onToggle}
                label={`módulo ${item.title}`}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="px-1">
          <p className="t-label text-[var(--text-tertiary)]">Áreas</p>
        </div>

        <div className="space-y-3">
          {items.map((item) => {
            const Icon = ICON_BY_ROUTE[item.to] || SettingsIcon;

            return (
              <MobileListCard
                key={item.to}
                onClick={item.onOpen}
                title={item.title}
                description={item.desc}
                trailing={<ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" />}
                meta={
                  <span className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    <Icon className="h-3.5 w-3.5" />
                    Abrir
                  </span>
                }
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
