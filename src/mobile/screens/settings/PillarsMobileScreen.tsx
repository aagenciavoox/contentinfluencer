import { useState } from 'react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import type { Pilar } from '../../../lib/database';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobilePillButton } from '../../components/MobilePillButton';
import { Palette, Plus } from 'lucide-react';

interface PillarsMobileScreenProps {
  pilares: Pilar[];
  onSave: (pilar: Pilar) => void;
  onToggle: (pilar: Pilar) => void;
  onDelete: (pilarId: string) => void;
}

const PRESET_CORES = [
  '#F5C543',
  '#4A90D9',
  '#E8A0BF',
  '#D44C47',
  '#448361',
  '#9065B0',
  '#2EAADC',
  '#D9730D',
];

export function PillarsMobileScreen({
  pilares,
  onSave,
  onToggle,
  onDelete,
}: PillarsMobileScreenProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_CORES[0]);

  const handleCreate = () => {
    if (!name.trim()) return;

    onSave({
      id: crypto.randomUUID(),
      userId: '',
      nome: name.trim(),
      descricao: description.trim(),
      cor: color,
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plataformas: [],
    });

    setName('');
    setDescription('');
    setColor(PRESET_CORES[0]);
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-orange)]/12 p-3 text-[var(--accent-orange)]">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Pilares editoriais</p>
            <p className="t-secondary">Gerencie nome, descrição, cor e ativação em fluxo mobile dedicado.</p>
          </div>
        </div>

        <button type="button" onClick={() => setShowForm(true)} className="button-primary w-full">
          <Plus className="h-4 w-4" />
          Novo pilar
        </button>
      </section>

      <section className="space-y-3">
        {pilares.length === 0 ? (
          <MobileEmptyState
            title="Nenhum pilar cadastrado"
            description="Adicione o primeiro pilar para organizar os temas editoriais."
            icon={<Palette className="h-8 w-8" />}
          />
        ) : (
          pilares.map((pilar) => (
            <MobileListCard
              key={pilar.id}
              title={pilar.nome}
              description={pilar.descricao || 'Sem descrição ainda.'}
              meta={
                <>
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold text-[var(--text-primary)]"
                    style={{ backgroundColor: `${pilar.cor}22` }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pilar.cor }} />
                    Cor
                  </span>
                  <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    {pilar.plataformas.length} plataformas
                  </span>
                </>
              }
              trailing={
                <MobilePillButton
                  tone="danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(pilar.id);
                  }}
                >
                  Excluir
                </MobilePillButton>
              }
              status={
                <MobilePillButton
                  tone={pilar.ativo ? 'success' : 'muted'}
                  onClick={() => onToggle(pilar)}
                >
                  {pilar.ativo ? 'Ativo' : 'Inativo'}
                </MobilePillButton>
              }
            />
          ))
        )}
      </section>

      <BottomSheetModal open={showForm} onClose={() => setShowForm(false)} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="flex h-full flex-col bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <p className="t-section-title text-[var(--text-primary)]">Novo pilar</p>
            <p className="t-secondary mt-1">Cadastro rápido de tema editorial com cor e descrição.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do pilar"
              className="w-full"
            />

            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Descrição curta"
              className="w-full"
            />

            <div className="space-y-2">
              <span className="t-label text-[var(--text-tertiary)]">Cor</span>
              <div className="flex flex-wrap gap-3">
                {PRESET_CORES.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    className={`h-8 w-8 rounded-full border-2 ${color === preset ? 'border-[var(--text-primary)] scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 border-t border-[var(--border-color)] px-5 py-4 pb-safe">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-[1.25rem] border border-[var(--border-color)] py-3 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button type="button" onClick={handleCreate} disabled={!name.trim()} className="button-primary flex-1 disabled:opacity-40">
              Criar
            </button>
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
}
