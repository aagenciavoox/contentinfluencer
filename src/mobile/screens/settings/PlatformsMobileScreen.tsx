import { useState } from 'react';
import { MonitorSpeaker, Plus } from 'lucide-react';
import type { Platform } from '../../../lib/database';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobilePillButton } from '../../components/MobilePillButton';

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
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-green)]/12 p-3 text-[var(--accent-green)]">
            <MonitorSpeaker className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Plataformas</p>
            <p className="t-secondary">Ative os canais da operação e preserve a leitura histórica dos dados.</p>
          </div>
        </div>

        <button type="button" onClick={() => setShowForm(true)} className="button-primary w-full">
          <Plus className="h-4 w-4" />
          Adicionar plataforma
        </button>
      </section>

      <section className="space-y-3">
        {platforms.length === 0 ? (
          <MobileEmptyState
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
        <div className="flex h-full flex-col bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <p className="t-section-title text-[var(--text-primary)]">Nova plataforma</p>
            <p className="t-secondary mt-1">Cadastro rápido de um canal adicional.</p>
          </div>

          <div className="flex-1 p-5">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleAdd()}
              placeholder="Nome da plataforma"
              className="min-h-11 w-full"
            />
          </div>

          <div className="flex gap-3 border-t border-[var(--border-color)] px-5 py-4 pb-safe">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex min-h-11 flex-1 items-center justify-center rounded-[1.25rem] border border-[var(--border-color)] text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!name.trim()}
              className="button-primary flex min-h-11 flex-1 items-center justify-center disabled:opacity-40"
            >
              Criar
            </button>
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
}
