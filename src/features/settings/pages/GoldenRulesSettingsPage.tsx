import React, { useState } from 'react';
import { Info, Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { startOfWeek } from 'date-fns';
import { useAppContext } from '../../../context/AppContext';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { CONFIRM, GLOSSARY, type ConfirmState } from '../../../lib/uiCopy';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { validateWeeklyContent } from '../../../utils/goldenRules';
import { GoldenRulesMobileScreen } from '../../../mobile/screens/settings/GoldenRulesMobileScreen';
import { generateUUID } from '../../../utils/uuid';
import { GoldenRule } from '../../../lib/database';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { Dialog } from '../../../components/overlays/Dialog';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { AppButton } from '../../../components/ui/AppButton';
import { cn } from '../../../lib/utils';

const EMPTY_GOLDEN_RULES_DRAFT = {
  titulo: '',
  descricao: '',
  cor: '#6366f1',
  tipo: 'publi' as GoldenRule['tipo'],
  condicao: 'recomendado' as GoldenRule['condicao'],
  periodo: 'semana' as GoldenRule['periodo'],
  minimo: '',
  maximo: '',
};
const CONDITION_OPTIONS: GoldenRule['condicao'][] = ['recomendado', 'impedir'];
const PERIOD_OPTIONS: GoldenRule['periodo'][] = ['semana', 'quinzena', 'mensal'];
const TYPE_OPTIONS: GoldenRule['tipo'][] = ['pilar', 'série', 'formato', 'publi', 'plataforma'];

const CONDITION_LABEL: Record<GoldenRule['condicao'], string> = {
  recomendado: 'Recomendado',
  impedir: 'Avisar antes de agendar',
};

const ICON_BY_CONDITION: Record<GoldenRule['condicao'], React.ElementType> = {
  impedir: ShieldAlert,
  recomendado: Info,
};

const STYLE_BY_CONDITION: Record<string, string> = {
  impedir: 'text-[var(--accent-pink)] bg-[var(--accent-pink)]/5',
  recomendado: 'text-[var(--accent-orange)] bg-[var(--accent-orange)]/5',
};

function GoldenRuleForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<GoldenRule>;
  onSave: (rule: GoldenRule) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState({
    titulo: initial.titulo || '',
    descricao: initial.descricao || '',
    cor: initial.cor || '#6366f1',
    tipo: initial.tipo || 'publi' as GoldenRule['tipo'],
    condicao: initial.condicao || 'recomendado' as GoldenRule['condicao'],
    periodo: initial.periodo || 'semana' as GoldenRule['periodo'],
    minimo: initial.minimo?.toString() || '',
    maximo: initial.maximo?.toString() || '',
  });

  const handleSave = () => {
    if (!draft.titulo.trim()) return;
    onSave({
      id: initial.id || generateUUID(),
      userId: initial.userId || '',
      titulo: draft.titulo.trim(),
      descricao: draft.descricao.trim() || draft.titulo.trim(),
      cor: draft.cor || null,
      tipo: draft.tipo,
      condicao: draft.condicao,
      periodo: draft.periodo,
      valor: Number(draft.maximo || draft.minimo || 0),
      minimo: draft.minimo ? Number(draft.minimo) : null,
      maximo: draft.maximo ? Number(draft.maximo) : null,
      ativa: initial.ativa ?? true,
      createdAt: initial.createdAt || new Date().toISOString(),
    });
  };

  return (
    <div className="stack-xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="stack-xs">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Título</label>
          <input
            type="text"
            value={draft.titulo}
            onChange={event => setDraft(prev => ({ ...prev, titulo: event.target.value }))}
            placeholder="Ex: Limite de hashtags"
            className="w-full h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 text-sm font-bold text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
          />
        </div>
        <div className="stack-xs">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Tipo</label>
          <select
            value={draft.tipo}
            onChange={event => setDraft(prev => ({ ...prev, tipo: event.target.value as GoldenRule['tipo'] }))}
            className="w-full h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 text-sm font-bold text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
          >
            {TYPE_OPTIONS.map(tipo => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="stack-xs">
        <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Descrição</label>
        <textarea
          rows={3}
          value={draft.descricao}
          onChange={event => setDraft(prev => ({ ...prev, descricao: event.target.value }))}
          placeholder="Contexto e orientação da regra..."
          className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] p-4 text-sm font-medium text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="stack-xs">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Condição</label>
          <select
            value={draft.condicao}
            onChange={event => setDraft(prev => ({ ...prev, condicao: event.target.value as GoldenRule['condicao'] }))}
            className="w-full h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 text-sm font-bold text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
          >
            {CONDITION_OPTIONS.map(option => (
              <option key={option} value={option}>
                {CONDITION_LABEL[option]}
              </option>
            ))}
          </select>
        </div>

        <div className="stack-xs">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Período</label>
          <select
            value={draft.periodo}
            onChange={event => setDraft(prev => ({ ...prev, periodo: event.target.value as GoldenRule['periodo'] }))}
            className="w-full h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 text-sm font-bold text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
          >
            {PERIOD_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="stack-xs">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Mínimo</label>
          <input
            type="number"
            value={draft.minimo}
            onChange={event => setDraft(prev => ({ ...prev, minimo: event.target.value }))}
            className="w-full h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 text-sm font-bold text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
          />
        </div>

        <div className="stack-xs">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Máximo</label>
          <input
            type="number"
            value={draft.maximo}
            onChange={event => setDraft(prev => ({ ...prev, maximo: event.target.value }))}
            className="w-full h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 text-sm font-bold text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
          />
        </div>
      </div>

      <div className="stack-xs">
        <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Cor</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={draft.cor}
            onChange={event => setDraft(prev => ({ ...prev, cor: event.target.value }))}
            className="h-11 w-16 cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
          />
          <span className="text-xs font-bold text-[var(--text-secondary)] opacity-60">{draft.cor}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <AppButton onClick={onCancel} variant="secondary" className="flex-1">
          Cancelar
        </AppButton>
        <AppButton onClick={handleSave} disabled={!draft.titulo.trim()} variant="primary" className="flex-1">
          Salvar
        </AppButton>
      </div>
    </div>
  );
}

export function GoldenRulesSettingsPage() {
  const { state, dispatch } = useAppContext();
  const isMobile = useIsMobile();
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const violations = validateWeeklyContent(state.contents, weekStart, state.pilares, state.goldenRules);

  const editingRule = state.goldenRules.find(rule => rule.id === editingId) ?? null;

  const toggleRegra = (id: string, ativa: boolean) => {
    const regra = state.goldenRules.find(rule => rule.id === id);
    if (!regra) return;
    dispatch({ type: 'UPDATE_GOLDEN_RULE', payload: { ...regra, ativa } });
  };

  const handleSave = (rule: GoldenRule) => {
    const exists = state.goldenRules.find(item => item.id === rule.id);
    if (exists) {
      dispatch({ type: 'UPDATE_GOLDEN_RULE', payload: rule });
    } else {
      dispatch({ type: 'ADD_GOLDEN_RULE', payload: rule });
    }
    setPanelMode(null);
    setEditingId(null);
  };

  const handleDeleteRule = (id: string) => {
    setConfirm({
      ...CONFIRM.excluirRegra,
      onConfirm: () => dispatch({ type: 'DELETE_GOLDEN_RULE', payload: id }),
    });
  };

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <GoldenRulesMobileScreen
            rules={state.goldenRules}
            violations={violations}
            draft={EMPTY_GOLDEN_RULES_DRAFT}
            onDraftChange={() => {}}
            onCreate={() => setPanelMode('create')}
            onToggle={rule => toggleRegra(rule.id, !rule.ativa)}
            onDelete={handleDeleteRule}
          />
        </div>
        <ConfirmModal
          open={!!confirm}
          message={confirm?.message || ''}
          confirmLabel={confirm?.confirmLabel}
          cancelLabel={confirm?.cancelLabel}
          onConfirm={() => {
            confirm?.onConfirm();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      </>
    );
  }

  return (
    <SettingsPageScaffold
      compact
      title={GLOSSARY.ritmoEditorial}
      icon={ShieldCheck}
      actions={
        <AppButton
          onClick={() => {
            setEditingId(null);
            setPanelMode('create');
          }}
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nova Regra
        </AppButton>
      }
    >
      {violations.length > 0 && (
        <div className="mb-3 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--warning)]/25 bg-[var(--warning)]/10/50 p-3">
          <p className="mb-3 text-xs font-semibold  text-orange-700">
            {violations.length} alerta{violations.length > 1 ? 's' : ''} para revisar esta semana
          </p>
          <div className="stack-xs">
            {violations.map((violation, index) => (
              <div key={index} className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 text-orange-500" />
                <p className="text-xs font-bold text-orange-800">{violation.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={SETTINGS_ENTITY_GRID_CLASS}>
        {state.goldenRules.length === 0 ? (
          <div className="col-span-full py-10 text-center">
            <ShieldCheck className="mx-auto mb-2 h-8 w-8 opacity-10" />
            <p className="text-sm font-medium opacity-40">Nenhuma regra configurada</p>
          </div>
        ) : (
          state.goldenRules.map(rule => {
            const Icon = ICON_BY_CONDITION[rule.condicao] || Info;
            const matchingViolations = violations.filter(item => item.ruleId === rule.id);

            return (
              <SettingsGridCard
                key={rule.id}
                title={rule.titulo || rule.descricao}
                description={rule.descricao}
                active={rule.ativa}
                dimmed={!rule.ativa}
                leading={
                  <div
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-[var(--radius-input)]',
                      !rule.cor && (STYLE_BY_CONDITION[rule.condicao] || STYLE_BY_CONDITION.recomendado)
                    )}
                    style={rule.cor ? { backgroundColor: `${rule.cor}15`, color: rule.cor } : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                }
                onToggle={() => toggleRegra(rule.id, !rule.ativa)}
                onEdit={() => {
                  setEditingId(rule.id);
                  setPanelMode('edit');
                }}
                onDelete={() => handleDeleteRule(rule.id)}
                badges={
                  <>
                    <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                      {rule.tipo}
                    </span>
                    <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                      {rule.periodo}
                    </span>
                    {matchingViolations.length > 0 ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        {matchingViolations.length} alerta{matchingViolations.length > 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </>
                }
              />
            );
          })
        )}
      </div>

      <Dialog
        open={panelMode !== null}
        onClose={() => {
          setPanelMode(null);
          setEditingId(null);
        }}
        desktopMaxW="md:max-w-2xl"
      >
        <OverlayHeader
          title={panelMode === 'edit' ? 'Editar regra' : 'Nova regra de ouro'}
          onClose={() => {
            setPanelMode(null);
            setEditingId(null);
          }}
        />
        <OverlayBody>
          <GoldenRuleForm
            initial={editingRule ?? {}}
            onSave={handleSave}
            onCancel={() => {
              setPanelMode(null);
              setEditingId(null);
            }}
          />
        </OverlayBody>
      </Dialog>

      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsPageScaffold>
  );
}
