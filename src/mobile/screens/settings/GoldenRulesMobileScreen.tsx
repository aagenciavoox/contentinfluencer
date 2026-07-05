import {useMemo, useState} from 'react';
import {BottomSheetModal} from '../../../components/feedback/modals/BottomSheetModal';
import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';
import type {GoldenRule} from '../../../lib/database';
import type {Violation} from '../../../utils/goldenRules';
import {EmptyState} from '../../../components/ui/EmptyState';
import {MobileIconButton} from '../../components/MobileIconButton';
import {MobileListCard} from '../../components/MobileListCard';
import {MobileSectionHeader} from '../../components/MobileSectionHeader';
import {MobileSegmentTabs} from '../../components/MobileSegmentTabs';
import React from 'react';
import {AlertTriangle, Info, Plus, ShieldAlert, ShieldCheck, ToggleLeft, ToggleRight, Trash2} from 'lucide-react';

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

const TONE_BY_CONDITION: Record<GoldenRule['condicao'], string> = {
  impedir: 'text-[var(--accent-pink)] bg-[var(--accent-pink)]/10',
  recomendado: 'text-[var(--accent-orange)] bg-[var(--accent-orange)]/10',
};

type RuleFilter = 'ativas' | 'violacoes' | 'inativas';

interface GoldenRulesDraft {
  titulo: string;
  descricao: string;
  cor: string;
  tipo: GoldenRule['tipo'];
  condicao: GoldenRule['condicao'];
  periodo: GoldenRule['periodo'];
  minimo: string;
  maximo: string;
}

interface GoldenRulesMobileScreenProps {
  rules: GoldenRule[];
  violations: Violation[];
  draft: GoldenRulesDraft;
  onDraftChange: (draft: GoldenRulesDraft) => void;
  onCreate: () => void;
  onToggle: (rule: GoldenRule) => void;
  onDelete: (ruleId: string) => void;
}

export function GoldenRulesMobileScreen({
  rules,
  violations,
  draft,
  onDraftChange,
  onCreate,
  onToggle,
  onDelete,
}: GoldenRulesMobileScreenProps) {
  const [filter, setFilter] = useState<RuleFilter>('ativas');
  const [showForm, setShowForm] = useState(false);

  const violationsByRule = useMemo(() => {
    const map = new Map<string, Violation[]>();
    violations.forEach(violation => {
      const current = map.get(violation.ruleId) || [];
      current.push(violation);
      map.set(violation.ruleId, current);
    });
    return map;
  }, [violations]);

  const filteredRules = useMemo(() => {
    if (filter === 'violacoes') {
      return rules.filter(rule => (violationsByRule.get(rule.id) || []).length > 0);
    }

    if (filter === 'inativas') {
      return rules.filter(rule => !rule.ativa);
    }

    return rules.filter(rule => rule.ativa);
  }, [filter, rules, violationsByRule]);

  const resetAndClose = () => {
    onDraftChange({
      titulo: '',
      descricao: '',
      cor: '',
      tipo: 'publi',
      condicao: 'recomendado',
      periodo: 'semana',
      minimo: '',
      maximo: '',
    });
    setShowForm(false);
  };

  return (
    <div className="stack-xl">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <MobileSectionHeader
          icon={ShieldCheck}
          tone="blue"
          title="Ritmo Editorial"
          description="Limites editoriais em fluxo mobile, com leitura rapida dos pontos da semana."
        />

        <div className="grid-metrics">
          <div className="rounded-[var(--radius-md)] bg-[var(--bg-primary)] p-3">
            <p className="t-label text-[var(--text-tertiary)]">Ativas</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
              {rules.filter(rule => rule.ativa).length}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] bg-[var(--bg-primary)] p-3">
            <p className="t-label text-[var(--text-tertiary)]">Revisoes</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--accent-orange)]">{violations.length}</p>
          </div>
        </div>

        <AppButton variant="primary" fullWidth onClick={() => setShowForm(true)} className="mt-4" leftIcon={<Plus className="h-4 w-4" />}>
          Nova regra
        </AppButton>
      </section>

      {violations.length > 0 ? (
        <section className="rounded-[var(--radius-card)] border border-[var(--warning)]/25 bg-[var(--warning)]/10 p-4">
          <div className="mb-3 flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-xs font-semibold ">
              {violations.length} ponto{violations.length > 1 ? 's' : ''} para revisar nesta semana
            </p>
          </div>

          <div className="stack-sm">
            {violations.slice(0, 3).map((violation, index) => (
              <div key={`${violation.ruleId}-${index}`} className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--bg-elevated)]/70 px-3 py-2">
                <p className="text-xs font-semibold text-orange-800">{violation.message}</p>
              </div>
            ))}
            {violations.length > 3 ? (
              <p className="px-1 text-xs font-semibold text-orange-700">
                +{violations.length - 3} itens adicionais monitorados nesta semana.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="stack-lg">
        <MobileSegmentTabs
          tabs={[
            {
              value: 'ativas',
              label: 'Ativas',
              count: rules.filter(rule => rule.ativa).length,
            },
            {
              value: 'violacoes',
              label: 'Revisoes',
              count: rules.filter(rule => (violationsByRule.get(rule.id) || []).length > 0).length,
            },
            {
              value: 'inativas',
              label: 'Inativas',
              count: rules.filter(rule => !rule.ativa).length,
            },
          ]}
          value={filter}
          onChange={value => setFilter(value as RuleFilter)}
        />

        {filteredRules.length === 0 ? (
          <EmptyState compact
            title="Nenhuma regra neste recorte"
            description="Crie uma regra ou troque o filtro para continuar a leitura editorial no mobile."
            icon={<ShieldCheck className="h-8 w-8" />}
          />
        ) : (
          <div className="stack-md">
            {filteredRules.map(rule => {
              const Icon = ICON_BY_CONDITION[rule.condicao] || Info;
              const matchingViolations = violationsByRule.get(rule.id) || [];

              return (
                <MobileListCard
                  key={rule.id}
                  title={rule.titulo || rule.descricao}
                  description={rule.descricao}
                  eyebrow={`${rule.tipo} · ${rule.periodo}`}
                  meta={
                    <>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${TONE_BY_CONDITION[rule.condicao]}`}
                        style={rule.cor ? {backgroundColor: `${rule.cor}18`, color: rule.cor} : undefined}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {CONDITION_LABEL[rule.condicao]}
                      </span>
                      <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                        min {rule.minimo ?? '-'}
                      </span>
                      <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                        max {rule.maximo ?? '-'}
                      </span>
                      {matchingViolations.length > 0 ? (
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                          {matchingViolations.length} ponto{matchingViolations.length > 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </>
                  }
                  status={
                    matchingViolations.length > 0 ? (
                      <div className="stack-sm rounded-[var(--radius-md)] bg-[var(--warning)]/10 p-3">
                        {matchingViolations.slice(0, 2).map((violation, index) => (
                          <p key={`${rule.id}-status-${index}`} className="text-xs font-medium text-orange-800">
                            {violation.message}
                          </p>
                        ))}
                      </div>
                    ) : null
                  }
                  trailing={
                    <div className="flex flex-col items-end gap-2">
                      <MobileIconButton
                        label={rule.ativa ? 'Desativar regra' : 'Ativar regra'}
                        onClick={() => onToggle(rule)}
                      >
                        {rule.ativa ? (
                          <ToggleRight className="h-5 w-5 text-[var(--accent-green)]" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-[var(--text-tertiary)]" />
                        )}
                      </MobileIconButton>

                      <MobileIconButton
                        label="Excluir regra"
                        onClick={() => onDelete(rule.id)}
                        className="border-[var(--accent-pink)]/20 text-[var(--accent-pink)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </MobileIconButton>
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <BottomSheetModal open={showForm} onClose={resetAndClose} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="flex h-full flex-col bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-color)] px-6 py-4">
            <Text variant="sectionTitle">Nova regra</Text>
            <p className="t-secondary mt-1">Crie limites minimos ou maximos para manter a operacao editorial consistente.</p>
          </div>

          <div className="flex-1 stack-lg overflow-y-auto p-6">
            <input
              autoFocus
              value={draft.titulo}
              onChange={event => onDraftChange({...draft, titulo: event.target.value})}
              placeholder="Titulo da regra"
              className="w-full"
            />

            <input
              value={draft.descricao}
              onChange={event => onDraftChange({...draft, descricao: event.target.value})}
              placeholder="Descricao e contexto"
              className="w-full"
            />

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={draft.cor || '#6366f1'}
                onChange={event => onDraftChange({...draft, cor: event.target.value})}
                className="h-11 w-16 cursor-pointer rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1"
              />
              <span className="text-sm font-bold text-[var(--text-tertiary)]">
                {draft.cor || 'Cor da regra'}
              </span>
            </div>

            <select
              value={draft.tipo}
              onChange={event => onDraftChange({...draft, tipo: event.target.value as GoldenRule['tipo']})}
              className="w-full"
            >
              {TYPE_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <div className="grid-metrics">
              <select
                value={draft.condicao}
                onChange={event =>
                  onDraftChange({...draft, condicao: event.target.value as GoldenRule['condicao']})
                }
                className="w-full"
              >
                {CONDITION_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {CONDITION_LABEL[option]}
                  </option>
                ))}
              </select>

              <select
                value={draft.periodo}
                onChange={event =>
                  onDraftChange({...draft, periodo: event.target.value as GoldenRule['periodo']})
                }
                className="w-full"
              >
                {PERIOD_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-metrics">
              <input
                type="number"
                inputMode="numeric"
                value={draft.minimo}
                onChange={event => onDraftChange({...draft, minimo: event.target.value})}
                placeholder="Minimo"
                className="w-full"
              />

              <input
                type="number"
                inputMode="numeric"
                value={draft.maximo}
                onChange={event => onDraftChange({...draft, maximo: event.target.value})}
                placeholder="Maximo"
                className="w-full"
              />
            </div>
          </div>

          <div className="flex gap-3 border-t border-[var(--border-color)] px-6 py-4 pb-safe">
            <button
              type="button"
              onClick={resetAndClose}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <AppButton
              variant="primary"
              onClick={() => {
                onCreate();
                resetAndClose();
              }}
              disabled={!draft.titulo.trim()}
              className="flex-1"
            >
              Criar
            </AppButton>
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
}
