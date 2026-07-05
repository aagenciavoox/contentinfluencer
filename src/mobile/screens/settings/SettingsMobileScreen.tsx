import {
  ChevronRight,
  HeartHandshake,
  Layout,
  MonitorSpeaker,
  Settings as SettingsIcon,
  UserCircle2,
} from 'lucide-react';
import { Text } from '../../../components/ui/Text';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileToggleSwitch } from '../../components/MobileToggleSwitch';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';

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
    <div className="stack-xl">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <MobileSectionHeader
          icon={SettingsIcon}
          tone="blue"
          title="Configurações"
          description="Ajustes do sistema organizados para leitura e ação rápida no mobile."
        />
      </section>

      <section className="stack-lg">
        <MobileSectionHeader icon={HeartHandshake} tone="green" title="Ritmo" className="px-1" />

        <div className="stack-md">
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
                  <Text variant="bodyStrong" className="text-sm">{item.title}</Text>
                  <Text variant="meta" className="mt-1 block">{item.desc}</Text>
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

      <section className="stack-lg">
        <MobileSectionHeader icon={Layout} tone="blue" title="Módulos" className="px-1" />

        <div className="stack-md">
          {moduleCards.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 shadow-sm"
            >
              <div className="min-w-0">
                <Text variant="bodyStrong" className="text-sm">{item.title}</Text>
                <Text variant="meta" className="mt-1 block">{item.desc}</Text>
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

      <section className="stack-lg">
        <MobileSectionHeader icon={SettingsIcon} tone="neutral" title="Áreas" className="px-1" />

        <div className="stack-md">
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
