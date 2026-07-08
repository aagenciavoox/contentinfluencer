import { useState } from 'react';
import { MonitorSpeaker, Plus } from 'lucide-react';
import type { Platform } from '../../../lib/database';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobilePillButton } from '../../components/MobilePillButton';
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

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim());
    setName('');
    setShowForm(false);
  };

  return (
    <div className="stack-xl">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
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
          platforms.map((platform) => (
            <MobileListCard
              key={platform.id}
              title={platform.nome}
              description={
                isPadrao(platform.nome)
                  ? 'Plataforma padrão do sistema.'
                  : platform.ativo
                    ? 'Ativa para criação e leitura.'
                    : 'Inativa para criação, mas preservada para leitura histórica.'
              }
              trailing={
                !isPadrao(platform.nome) ? (
                  <MobilePillButton
                    tone="danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(platform.id);
                    }}
                  >
                    Excluir
                  </MobilePillButton>
                ) : undefined
              }
              meta={
                <MobilePillButton
                  tone={platform.ativo ? 'success' : 'muted'}
                  disabled={isPadrao(platform.nome)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isPadrao(platform.nome)) onToggle(platform);
                  }}
                >
                  {platform.ativo ? 'Ativa' : 'Inativa'}
                </MobilePillButton>
              }
            />
          ))
        )}
      </section>

      <BottomSheetModal open={showForm} onClose={() => setShowForm(false)} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <OverlayHeader
          title="Nova plataforma"
          subtitle="Cadastro rápido de um canal adicional."
        />

        <OverlayBody className="py-6">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
            placeholder="Nome da plataforma"
            className="min-h-11 w-full"
          />
        </OverlayBody>

        <OverlayFooter className="pb-safe">
          <button
            type="button"
            onClick={() => setShowForm(false)}
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
