import { ValorVazio } from '../../../components/ui/ValorVazio';
import { useState } from 'react';
import { CountBadge } from '../../../components/ui/CountBadge';
import { Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Check, } from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { Look, Cenario } from '../../../lib/database';
import { generateUUID } from '../../../utils/uuid';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { TagSelect } from '../../../components/ui/TagSelect';

type EditingLook = Partial<Look> & { numero: number; descricao: string; ativo: boolean };
type EditingCenario = Partial<Cenario> & { nome: string; descricao: string; tempoSetupMinutos: number; ativo: boolean };

export function LooksSettingsPage() {
  const { state, dispatch } = useAppContext();
  const isMobile = useIsMobile();

  const [editLookId, setEditLookId] = useState<string | null>(null);
  const [editCenarioId, setEditCenarioId] = useState<string | null>(null);
  const [criandoLook, setCriandoLook] = useState(false);
  const [criandoCenario, setCriandoCenario] = useState(false);

  const [lookForm, setLookForm] = useState<EditingLook>({
    numero: (state.looks.length > 0 ? Math.max(...state.looks.map(l => l.numero)) + 1 : 1),
    descricao: '',
    cenarioId: null,
    ativo: true,
  });

  const [cenarioForm, setCenarioForm] = useState<EditingCenario>({
    nome: '',
    descricao: '',
    tempoSetupMinutos: 5,
    ativo: true,
  });

  const saveLook = (form: EditingLook) => {
    if (!form.id) {
      dispatch({ type: 'ADD_LOOK', payload: { ...form, id: generateUUID() } as Look });
    } else {
      dispatch({ type: 'UPDATE_LOOK', payload: form as Look });
    }
    setCriandoLook(false);
    setEditLookId(null);
    setLookForm({ numero: Math.max(...state.looks.map(l => l.numero), 0) + 2, descricao: '', cenarioId: null, ativo: true });

  };

  const saveCenario = (form: EditingCenario) => {
    if (!form.id) {
      dispatch({ type: 'ADD_CENARIO', payload: { ...form, id: generateUUID() } as Cenario });
    } else {
      dispatch({ type: 'UPDATE_CENARIO', payload: form as Cenario });
    }
    setCriandoCenario(false);
    setEditCenarioId(null);
    setCenarioForm({ nome: '', descricao: '', tempoSetupMinutos: 5, ativo: true });
  };

  const activeLooks = [...state.looks].sort((a, b) => a.numero - b.numero);
  const activeCenarios = state.cenarios;

  return (
    <PageLayout
      variant="settings"
      header={
        !isMobile ? (
        <DesktopPageHeader
          section="Configurações"
          title="Looks e cenários"
          backLabel="Configurações"
          backTo="/configuracoes"
        />
        ) : undefined
      }
      mobileHeader={
        isMobile ? (
          <div className="px-1 pb-3 pt-1">
            <Text variant="sectionTitle">Looks e cenários</Text>
            <Text variant="meta" className="mt-1 text-[var(--text-tertiary)]">
              Catálogo de looks e cenários
            </Text>
          </div>
        ) : undefined
      }
    >

        {/* LOOKS */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <Text variant="sectionTitle">
              <span className="inline-flex items-center gap-1.5">Looks <CountBadge count={activeLooks.length} /></span>
            </Text>
            <AppButton
              onClick={() => {
                setCriandoLook(true);
                setLookForm({ numero: Math.max(...state.looks.map(l => l.numero), 0) + 1, descricao: '', ativo: true });
              }}
              variant="primary"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Novo look
            </AppButton>
          </div>

          {criandoLook && (
            <div className="mb-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] p-6 stack-md">
              <div className="flex gap-3">
                <div>
                  <label className="t-label text-[var(--text-tertiary)] block mb-1">Nº</label>
                  <input
                    type="number"
                    value={lookForm.numero}
                    onChange={e => setLookForm(p => ({ ...p, numero: parseInt(e.target.value) || 1 }))}
                    className="w-16 t-body bg-[var(--bg-hover)] border-none rounded-[var(--radius-input)] px-2 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div className="flex-1">
                  <label className="t-label text-[var(--text-tertiary)] block mb-1">Descrição</label>
                  <input
                    type="text"
                    value={lookForm.descricao}
                    onChange={e => setLookForm(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Ex.: Blusa bege, cabelo preso"
                    className="w-full t-body bg-[var(--bg-hover)] border-none rounded-[var(--radius-input)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
              </div>
              <div>
                <Text variant="label" as="span" className="text-[var(--text-tertiary)] block mb-1" aria-hidden>Cenário associado</Text>
                <TagSelect
                  label="Cenário associado"
                  hideLabel
                  id="look-cenario"
                  maxSelections={1}
                  placeholder="—"
                  values={lookForm.cenarioId ? [lookForm.cenarioId] : []}
                  onChange={values => setLookForm(p => ({ ...p, cenarioId: values[0] || undefined }))}
                  options={activeCenarios.map(c => ({ value: c.id, label: c.nome }))}
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <AppButton onClick={() => setCriandoLook(false)} variant="secondary">
                  Cancelar
                </AppButton>
                <AppButton onClick={() => saveLook(lookForm)} variant="primary">
                  Salvar
                </AppButton>
              </div>
            </div>
          )}

          <div className="stack-sm">
            {activeLooks.length === 0 ? (
              <Text variant="label" as="p" className="text-[var(--text-tertiary)] text-center py-8 ">Nenhum look cadastrado ainda</Text>
            ) : activeLooks.map(look => {
              const cenario = look.cenarioId ? state.cenarios.find(c => c.id === look.cenarioId) : null;
              return (
                <div key={look.id} className="flex items-center gap-4 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)]">
                  {editLookId === look.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        defaultValue={look.descricao}
                        onBlur={e => dispatch({ type: 'UPDATE_LOOK', payload: { ...look, descricao: e.target.value } })}
                        className="flex-1 t-body bg-[var(--bg-hover)] border-none rounded-[var(--radius-input)] px-3 py-1.5"
                        autoFocus
                      />
                      <button onClick={() => setEditLookId(null)} aria-label="Concluir edição" className="p-1.5 hover:bg-[var(--bg-hover)] rounded-[var(--radius-input)]">
                        <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Text variant="label" as="span" className="text-[var(--text-tertiary)] w-12 shrink-0">Look {look.numero}</Text>
                      <div className="flex-1 min-w-0">
                        <Text variant="itemTitle" as="p" className="text-[var(--text-primary)] truncate">{look.descricao || <ValorVazio />}</Text>
                        {cenario && <Text variant="meta" className="block">{cenario.nome}</Text>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => dispatch({ type: 'UPDATE_LOOK', payload: { ...look, ativo: !look.ativo } })} aria-label={look.ativo ? `Desativar look ${look.numero}` : `Ativar look ${look.numero}`}>
                          {look.ativo
                            ? <ToggleRight className="w-5 h-5 text-[var(--accent-green)]" />
                            : <ToggleLeft className="w-5 h-5 text-[var(--text-tertiary)]" />
                          }
                        </button>
                        <button onClick={() => setEditLookId(look.id)} aria-label={`Editar look ${look.numero}`} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-[var(--radius-input)]">
                          <Edit2 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        </button>
                        <button onClick={() => dispatch({ type: 'DELETE_LOOK', payload: look.id })} aria-label={`Excluir look ${look.numero}`} className="p-1.5 hover:bg-[var(--accent-pink)]/10 rounded-[var(--radius-input)]">
                          <Trash2 className="w-3.5 h-3.5 text-[var(--accent-pink)] opacity-40 hover:opacity-100" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CENÁRIOS */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <Text variant="sectionTitle">
              <span className="inline-flex items-center gap-1.5">Cenários <CountBadge count={activeCenarios.length} /></span>
            </Text>
            <button
              onClick={() => setCriandoCenario(true)}
              className="t-button t-button-uppercase flex items-center gap-1.5 rounded-[var(--radius-card)] bg-[var(--text-primary)] px-3 py-2 text-[var(--bg-primary)] shadow-sm transition-all hover:scale-[1.02]"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo cenário
            </button>
          </div>

          {criandoCenario && (
            <div className="mb-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] p-6 stack-md">
              <div className="grid-metrics">
                <div>
                  <label className="t-label block mb-1">Nome *</label>
                  <input
                    type="text"
                    value={cenarioForm.nome}
                    onChange={e => setCenarioForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Ex.: Mesa com livros"
                    className="w-full t-body bg-[var(--bg-hover)] border-none rounded-[var(--radius-input)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                  />
                </div>
                <div>
                  <label className="t-label block mb-1">Montagem (min)</label>
                  <input
                    type="number"
                    value={cenarioForm.tempoSetupMinutos}
                    onChange={e => setCenarioForm(p => ({ ...p, tempoSetupMinutos: parseInt(e.target.value) || 0 }))}
                    className="w-full t-body bg-[var(--bg-hover)] border-none rounded-[var(--radius-input)] px-3 py-2 text-[var(--text-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="t-label block mb-1">Descrição</label>
                <input
                  type="text"
                  value={cenarioForm.descricao}
                  onChange={e => setCenarioForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Onde fica, como montar…"
                  className="w-full t-body bg-[var(--bg-hover)] border-none rounded-[var(--radius-input)] px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>
              <div className="flex gap-3">
                <AppButton onClick={() => setCriandoCenario(false)} variant="secondary" className="flex-1">
                  Cancelar
                </AppButton>
                <AppButton
                  onClick={() => cenarioForm.nome.trim() && saveCenario(cenarioForm)}
                  disabled={!cenarioForm.nome.trim()}
                  variant="primary"
                  className="flex-1"
                >
                  Salvar
                </AppButton>
              </div>
            </div>
          )}

          <div className="stack-sm">
            {activeCenarios.length === 0 ? (
              <Text variant="label" as="p" className="text-[var(--text-tertiary)] text-center py-8 ">Nenhum cenário cadastrado ainda</Text>
            ) : activeCenarios.map(cenario => (
              <div key={cenario.id} className="flex items-center gap-4 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)]">
                <div className="flex-1 min-w-0">
                  <Text variant="itemTitle" as="p" className="text-[var(--text-primary)]">{cenario.nome}</Text>
                  <Text variant="meta" className="block">
                    {cenario.descricao}{cenario.descricao && ' · '}{cenario.tempoSetupMinutos} min de montagem
                  </Text>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => dispatch({ type: 'UPDATE_CENARIO', payload: { ...cenario, ativo: !cenario.ativo } })} aria-label={cenario.ativo ? `Desativar cenário ${cenario.nome}` : `Ativar cenário ${cenario.nome}`}>
                    {cenario.ativo
                      ? <ToggleRight className="w-5 h-5 text-[var(--accent-green)]" />
                      : <ToggleLeft className="w-5 h-5 text-[var(--text-tertiary)]" />
                    }
                  </button>
                  <button onClick={() => dispatch({ type: 'DELETE_CENARIO', payload: cenario.id })} aria-label={`Excluir cenário ${cenario.nome}`} className="p-1.5 hover:bg-[var(--accent-pink)]/10 rounded-[var(--radius-input)]">
                    <Trash2 className="w-3.5 h-3.5 text-[var(--accent-pink)] opacity-40 hover:opacity-100" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
    </PageLayout>
  );
}



