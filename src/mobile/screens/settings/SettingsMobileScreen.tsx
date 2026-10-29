import {
  ChevronRight,
  Columns2,
  HeartHandshake,
  Layout,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Text } from '../../../components/ui/Text';
import { MobileListCard } from '../../components/MobileListCard';
import { ToggleRow } from '../../../components/ui/ToggleSwitch';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';

interface SettingsMobileScreenProps {
  gentleCards: Array<{
    key: string;
    title: string;
    desc: string;
    enabled: boolean;
    onToggle: () => void;
  }>;
  writingEnabled: boolean;
  onToggleWriting: () => void;
  openDraftByDefault: boolean;
  onToggleOpenDraft: () => void;
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

export function SettingsMobileScreen({
  gentleCards,
  writingEnabled,
  onToggleWriting,
  openDraftByDefault,
  onToggleOpenDraft,
  moduleCards,
  items,
}: SettingsMobileScreenProps) {
  return (
    <div className="stack-lg">
      {/* O título "Configurações" já está no cabeçalho; aqui fica só a frase de apoio. */}
      <Text variant="secondary" className="px-1">Ritmo, escrita e áreas do app.</Text>

      <section className="stack-lg">
        <MobileSectionHeader icon={HeartHandshake} tone="neutral" title="Ritmo" className="px-1" />

        <div className="stack-md">
          {gentleCards.map((item) => (
            <ToggleRow
              key={item.key}
              id={`opcao-celular-${item.key}`}
              enabled={item.enabled}
              onToggle={item.onToggle}
              title={item.title}
              className="gap-4 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
            >
              <span className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--bg-hover)] p-2 text-[var(--text-primary)]">
                  <HeartHandshake className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />
                </span>
                <span>
                  <Text variant="bodyStrong" as="span" className="block">{item.title}</Text>
                  <Text variant="meta" as="span" className="mt-1 block">{item.desc}</Text>
                </span>
              </span>
            </ToggleRow>
          ))}
        </div>
      </section>

      <section className="stack-lg">
        <MobileSectionHeader icon={Columns2} tone="neutral" title="Escrita" className="px-1" />

        <div className="stack-md">
          <ToggleRow
            id="opcao-celular-modo-escrita"
            enabled={writingEnabled}
            onToggle={onToggleWriting}
            title="Modo de escrita"
            className="gap-4 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
          >
            <Text variant="bodyStrong" as="span" className="block">Modo de escrita</Text>
            <Text variant="meta" as="span" className="mt-1 block">
              Separa o roteiro da gestão. Status, agendamento e legendas ficam em outra aba, e você pode abrir uma área de notas ao lado do texto.
            </Text>
          </ToggleRow>
          {writingEnabled ? (
            <ToggleRow
              id="opcao-celular-abrir-rascunho"
              enabled={openDraftByDefault}
              onToggle={onToggleOpenDraft}
              title="Abrir rascunho ao entrar"
              className="gap-4 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
            >
              <Text variant="bodyStrong" as="span" className="block">Abrir rascunho ao entrar</Text>
              <Text variant="meta" as="span" className="mt-1 block">
                Mostra o painel de rascunho ao abrir um roteiro. Fechar durante a edição é só temporário.
              </Text>
            </ToggleRow>
          ) : null}
        </div>
      </section>

      <section className="stack-lg">
        <MobileSectionHeader icon={Layout} tone="neutral" title="Módulos" className="px-1" />

        <div className="stack-md">
          {moduleCards.map((item) => (
            <ToggleRow
              key={item.key}
              id={`modulo-celular-${item.key}`}
              enabled={item.enabled}
              onToggle={item.onToggle}
              title={`Módulo ${item.title}`}
              className="gap-4 rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
            >
              <Text variant="bodyStrong" as="span" className="block">{item.title}</Text>
              <Text variant="meta" as="span" className="mt-1 block">{item.desc}</Text>
            </ToggleRow>
          ))}
        </div>
      </section>

      <section className="stack-lg">
        <MobileSectionHeader icon={SettingsIcon} tone="neutral" title="Áreas" className="px-1" />

        <div className="stack-md">
          {items.map((item) => {
            return (
              <MobileListCard
                key={item.to}
                onClick={item.onOpen}
                title={item.title}
                description={item.desc}
                // O card inteiro abre a área; a seta já diz isso, sem a pílula "Abrir" que parecia um botão à parte.
                trailing={<ChevronRight className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
