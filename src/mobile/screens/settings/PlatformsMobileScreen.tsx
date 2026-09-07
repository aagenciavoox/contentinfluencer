import { useState } from 'react';
import { MonitorSpeaker, Plus } from 'lucide-react';
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

interface PlatformsMobileScreenProps {
  platforms: Platform[];
  isPadrao: (name: string) => boolean;
  onAdd: (name: string) => void;
  onToggle: (platform: Platform) => void;
  onDelete: (platformId: string) => void;
}

export function PlatformsMobileScreen({
  platforms,
  isPadrao,
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
          title="Plataformas"
          description="Ative os canais da operação e preserve a leitura histórica dos dados."
        />

        <AppButton variant="primary" fullWidth onClick={() => setShowForm(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Adicionar plataforma
        </AppButton>
      </section>

      <section className="stack-md">
        {platforms.length === 0 ? (
          <EmptyState compact
            title="Nenhuma plataforma cadastrada"
            description="Adicione o primeiro canal para começar a estruturar a operação."
            icon={<MonitorSpeaker className="h-8 w-8" />}
          />
        ) : (
          platforms.map((platform) => {
            const padrao = isPadrao(platform.nome);
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
                title={platform.nome}
                description={
                  padrao
                    ? 'Plataforma padrão do sistema.'
                    : platform.ativo
                      ? 'Ativa para criação e leitura.'
                      : 'Inativa para criação, mas preservada para leitura histórica.'
                }
                trailing={
                  menuItems.length > 0 ? (
                    <MoreMenu
                      size="sm"
                      items={menuItems}
                      triggerClassName="border-transparent bg-transparent"
                    />
                  ) : undefined
                }
                meta={
                  <Text
                    variant="meta"
                    className={
                      platform.ativo
                        ? 'font-semibold text-[var(--accent-green)]'
                        : 'font-semibold text-[var(--text-tertiary)]'
                    }
                  >
                    {platform.ativo ? 'Ativa' : 'Inativa'}
                    {padrao ? ' · Padrão' : ''}
                  </Text>
                }
              />
            );
          })
        )}
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
              placeholder="Ex: Instagram, TikTok"
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
            Criar
          </AppButton>
        </OverlayFooter>
      </BottomSheetModal>
    </div>
  );
}
