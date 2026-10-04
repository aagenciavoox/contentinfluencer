import { useState } from 'react';
import { Clock, Lock, MonitorSpeaker, Plus } from 'lucide-react';
import { PostingTimesEditor } from '../../../features/settings/components/PostingTimesEditor';
import type { Platform } from '../../../lib/database';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { Text } from '../../../components/ui/Text';
import { CONFIRM } from '../../../lib/uiCopy';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';
import { MobileToggleSwitch } from '../../components/MobileToggleSwitch';
import { platformDisplayName } from '../../../components/ui/platformName';

interface PlatformsMobileScreenProps {
  platforms: Platform[];
  isPadrao: (name: string) => boolean;
  padraoLockReason: string;
  historicalReadingMeta: string;
  onAdd: (name: string) => void;
  onToggle: (platform: Platform) => void;
  onDelete: (platformId: string) => void;
}

export function PlatformsMobileScreen({
  platforms,
  isPadrao,
  padraoLockReason,
  historicalReadingMeta,
  onAdd,
  onToggle,
  onDelete,
}: PlatformsMobileScreenProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const closeForm = () => {
    setShowForm(false);
    setName('');
  };

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
    setShowForm(false);
  };

  return (
    <div className="stack-lg">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <MobileSectionHeader
          icon={MonitorSpeaker}
          tone="green"
          title="Plataformas e horários"
          description="Canais da operação e janelas de postagem no mesmo lugar."
        />

        <AppButton variant="primary" fullWidth onClick={() => setShowForm(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Adicionar plataforma
        </AppButton>
      </section>

      <section className="stack-md">
        {platforms.length === 0 ? (
          <EmptyState compact
            title="Nenhuma plataforma cadastrada"
            description="Adicione a primeira rede onde você publica."
            icon={<MonitorSpeaker className="h-8 w-8" />}
          />
        ) : (
          platforms.map((platform) => {
            const padrao = isPadrao(platform.nome);
            const displayName = platformDisplayName(platform.nome);
            const lockedOn = padrao || platform.ativo;
            const menuItems = [
              ...(!padrao
                ? [
                    {
                      label: platform.ativo ? 'Desativar' : 'Ativar',
                      tone: (platform.ativo ? 'default' : 'success') as 'default' | 'success',
                      onClick: () => onToggle(platform),
                    },
                  ]
                : []),
              ...(!padrao
                ? [
                    {
                      label: CONFIRM.excluirPlataforma.confirmLabel,
                      tone: 'danger' as const,
                      onClick: () => onDelete(platform.id),
                    },
                  ]
                : []),
            ];

            return (
              <MobileListCard
                key={platform.id}
                title={displayName}
                description={
                  padrao
                    ? padraoLockReason
                    : platform.ativo
                      ? 'Ativa para criação e leitura.'
                      : 'Inativa para criação, mas preservada para leitura histórica.'
                }
                trailing={
                  padrao ? (
                    <div className="flex items-center gap-1.5" title={padraoLockReason}>
                      <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                      <MobileToggleSwitch
                        enabled
                        onToggle={() => undefined}
                        label={displayName}
                        className="pointer-events-none"
                      />
                    </div>
                  ) : menuItems.length > 0 ? (
                    <MoreMenu
                      size="sm"
                      items={menuItems}
                      triggerClassName="border-transparent bg-transparent"
                    />
                  ) : undefined
                }
                meta={
                  <Text variant="meta" className="font-semibold text-[var(--text-secondary)]">
                    {lockedOn ? 'Ativa' : 'Inativa'}
                    {padrao ? ' · Padrão' : ''}
                  </Text>
                }
              />
            );
          })
        )}
        <Text variant="meta" className="block px-1">
          {historicalReadingMeta}
        </Text>
      </section>

      <section className="stack-md">
        <MobileSectionHeader
          icon={Clock}
          tone="blue"
          title="Horários de postagem"
          description="Global vale para todos os canais. Uma aba da plataforma substitui o dia correspondente."
        />
        <PostingTimesEditor />
      </section>

      <BottomSheetModal open={showForm} onClose={closeForm} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <OverlayHeader
          title="Nova plataforma"
          subtitle="Cadastro rápido de um canal adicional."
          onClose={closeForm}
        />

        <OverlayBody className="stack-lg">
          <div className="stack-sm">
            <label htmlFor="mobile-nova-plataforma-nome" className="t-label text-[var(--text-tertiary)]">
              Nome
            </label>
            <input
              id="mobile-nova-plataforma-nome"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
              placeholder="Ex.: Instagram, TikTok"
              className="min-h-11 w-full"
              aria-label="Nome da plataforma"
            />
          </div>
        </OverlayBody>

        <OverlayFooter className="pb-safe">
          <button
            type="button"
            onClick={closeForm}
            className="flex min-h-11 flex-1 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-color)] text-xs font-semibold  text-[var(--text-secondary)]"
          >
            Cancelar
          </button>
          <AppButton variant="primary" size="lg" onClick={handleAdd} disabled={!name.trim()} className="flex-1">
            Adicionar plataforma
          </AppButton>
        </OverlayFooter>
      </BottomSheetModal>
    </div>
  );
}
