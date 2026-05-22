import { useState } from 'react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import type { Serie } from '../../../lib/database';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobilePillButton } from '../../components/MobilePillButton';
import { Layers, Plus } from 'lucide-react';

interface SeriesMobileScreenProps {
  series: Serie[];
  onSave: (serie: Serie) => void;
  onToggle: (serie: Serie) => void;
  onDelete: (serieId: string) => void;
}

const FREQUENCIAS = ['Semanal', 'Quinzenal', 'Mensal', 'Sob demanda'] as const;

export function SeriesMobileScreen({
  series,
  onSave,
  onToggle,
  onDelete,
}: SeriesMobileScreenProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<string>('Semanal');
  const [bordao, setBordao] = useState('');
  const [color, setColor] = useState('#6366f1');

  const handleCreate = () => {
    if (!name.trim()) return;

    onSave({
      id: crypto.randomUUID(),
      userId: '',
      name: name.trim(),
      template: '',
      notes: '',
      slotPadrao: null,
      formatoVisualPadrao: null,
      estruturaRoteiro: null,
      bordao: bordao.trim() || null,
      cor: color,
      ativa: true,
      frequenciaRecomendada: frequency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pilarIds: [],
      plataformas: [],
    });

    setName('');
    setFrequency('Semanal');
    setBordao('');
    setColor('#6366f1');
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-purple)]/12 p-3 text-[var(--accent-purple)]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Séries</p>
            <p className="t-secondary">Gerencie quadros recorrentes com identidade básica em fluxo mobile.</p>
          </div>
        </div>

        <button type="button" onClick={() => setShowForm(true)} className="button-primary w-full">
          <Plus className="h-4 w-4" />
          Nova série
        </button>
      </section>

      <section className="space-y-3">
        {series.length === 0 ? (
          <MobileEmptyState
            title="Nenhuma série criada"
            description="Adicione a primeira série recorrente para estruturar o calendário editorial."
            icon={<Layers className="h-8 w-8" />}
          />
        ) : (
          series.map((serie) => (
            <MobileListCard
              key={serie.id}
              title={serie.name}
              description={serie.estruturaRoteiro || serie.notes || 'Sem estrutura de roteiro ainda.'}
              meta={
                <>
                  <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                    {serie.frequenciaRecomendada || 'Sem frequência'}
                  </span>
                  <span className="rounded-full bg-[var(--accent-purple)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--accent-purple)]">
                    {serie.bordao || 'Sem bordão'}
                  </span>
                </>
              }
              trailing={
                <MobilePillButton
                  tone="danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(serie.id);
                  }}
                >
                  Excluir
                </MobilePillButton>
              }
              status={
                <MobilePillButton
                  tone={serie.ativa ? 'success' : 'muted'}
                  onClick={() => onToggle(serie)}
                >
                  {serie.ativa ? 'Ativa' : 'Inativa'}
                </MobilePillButton>
              }
            />
          ))
        )}
      </section>

      <BottomSheetModal open={showForm} onClose={() => setShowForm(false)} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="flex h-full flex-col bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <p className="t-section-title text-[var(--text-primary)]">Nova série</p>
            <p className="t-secondary mt-1">Cadastro rápido de identidade para um quadro recorrente.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome da série"
              className="w-full"
            />

            <select value={frequency} onChange={(event) => setFrequency(event.target.value)} className="w-full">
              {FREQUENCIAS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              value={bordao}
              onChange={(event) => setBordao(event.target.value)}
              placeholder="Bordão"
              className="w-full"
            />

            <div className="space-y-2">
              <span className="t-label text-[var(--text-tertiary)]">Cor</span>
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-12 w-16 cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent"
              />
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
