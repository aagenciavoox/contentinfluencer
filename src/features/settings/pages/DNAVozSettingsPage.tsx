import React, { useState } from 'react';
import { Zap, Users, Target, MessageSquare, Ban, ShieldAlert } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { DNAVozMobileScreen } from '../../../mobile/screens/settings/DNAVozMobileScreen';
import { AppButton } from '../../../components/ui/AppButton';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { SettingsArrayInput } from '../../../components/settings/SettingsArrayInput';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';

const fieldTextareaClass =
  'w-full min-h-[72px] resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] p-3 text-sm text-[var(--text-primary)] placeholder:opacity-40 focus:ring-1 focus:ring-[var(--border-strong)]';

export function DNAVozSettingsPage() {
  const { state, dispatch } = useAppContext();
  const isMobile = useIsMobile();
  const [editData, setEditData] = useState(state.dnaVoz ?? {
    id: '',
    userId: '',
    promessaCentral: '',
    publico: '',
    tom: '',
    naoFaco: [] as string[],
    alertas: [] as string[],
    updatedAt: '',
  });

  const handleSave = () => {
    dispatch({ type: 'UPDATE_DNA_VOZ', payload: editData });
  };

  const handleAddItem = (field: 'naoFaco' | 'alertas', value: string) => {
    setEditData(p => ({ ...p, [field]: [...(p?.[field] || []), value] }));
  };

  const removeItem = (field: 'naoFaco' | 'alertas', index: number) => {
    setEditData(p => ({ ...p, [field]: (p?.[field] || []).filter((_: unknown, i: number) => i !== index) }));
  };

  const isDirty = JSON.stringify(editData) !== JSON.stringify(state.dnaVoz);

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <DNAVozMobileScreen
          data={editData}
          pilares={state.pilares.filter(pilar => pilar.ativo)}
          isDirty={isDirty}
          onChange={setEditData}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <SettingsPageScaffold
      compact
      title="DNA da Voz"
      icon={MessageSquare}
      actions={
        isDirty ? (
          <AppButton onClick={handleSave} variant="primary">
            Salvar
          </AppButton>
        ) : null
      }
    >
      <div className={`${SETTINGS_ENTITY_GRID_CLASS} mb-3`}>
        <SettingsGridCard
          title="Promessa Central"
          leading={<Zap className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />}
        >
          <textarea
            value={editData.promessaCentral}
            onChange={e => setEditData(p => ({ ...p, promessaCentral: e.target.value }))}
            placeholder="O que você entrega para quem te segue?"
            className={fieldTextareaClass}
          />
        </SettingsGridCard>

        <SettingsGridCard
          title="Público"
          leading={<Users className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />}
        >
          <textarea
            value={editData.publico}
            onChange={e => setEditData(p => ({ ...p, publico: e.target.value }))}
            placeholder="Para quem você cria?"
            className={fieldTextareaClass}
          />
        </SettingsGridCard>

        <SettingsGridCard
          title="Tom de Voz"
          leading={<MessageSquare className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />}
          className="sm:col-span-2 xl:col-span-3"
        >
          <textarea
            value={editData.tom}
            onChange={e => setEditData(p => ({ ...p, tom: e.target.value }))}
            placeholder="Como você fala?"
            className={fieldTextareaClass}
          />
        </SettingsGridCard>

        <SettingsGridCard
          title="O que não faço"
          leading={<Ban className="h-3.5 w-3.5 text-[var(--accent-pink)]" />}
        >
          <SettingsArrayInput
            items={editData.naoFaco}
            onAdd={val => handleAddItem('naoFaco', val)}
            onRemove={idx => removeItem('naoFaco', idx)}
            placeholder="Novo proibido..."
            bulletColor="var(--accent-pink)"
          />
        </SettingsGridCard>

        <SettingsGridCard
          title="Cuidados de voz"
          leading={<ShieldAlert className="h-3.5 w-3.5 text-[var(--accent-orange)]" />}
        >
          <SettingsArrayInput
            items={editData.alertas}
            onAdd={val => handleAddItem('alertas', val)}
            onRemove={idx => removeItem('alertas', idx)}
            placeholder="Novo cuidado..."
            bulletColor="var(--accent-orange)"
            itemClassName="bg-[var(--accent-orange)]/5 border-[var(--accent-orange)]/10"
          />
        </SettingsGridCard>

        <SettingsGridCard
          title="Pilares de Conteúdo"
          leading={<Target className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />}
          className="sm:col-span-2 xl:col-span-3"
        >
          <div className="flex flex-wrap gap-1.5">
            {state.pilares.filter(p => p.ativo).map(p => (
              <span
                key={p.id}
                className="rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                {p.nome}
              </span>
            ))}
            {state.pilares.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)]">
                Configure seus pilares em Configurações → Pilares.
              </p>
            ) : null}
          </div>
        </SettingsGridCard>
      </div>
    </SettingsPageScaffold>
  );
}
