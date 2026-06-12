import {useState} from 'react';
import {BottomSheetModal} from '../../../components/feedback/modals/BottomSheetModal';
import type {DnaVoz, Pilar} from '../../../lib/database';
import {MobileEmptyState} from '../../components/MobileEmptyState';
import {Ban, MessageSquare, Plus, ShieldAlert, Target, Trash2, Users, Zap} from 'lucide-react';

interface DNAVozMobileScreenProps {
  data: DnaVoz;
  pilares: Pilar[];
  isDirty: boolean;
  onChange: (data: DnaVoz) => void;
  onSave: () => void;
}

type ListField = 'naoFaco' | 'alertas';

const FIELD_META: Record<ListField, {title: string; placeholder: string; accent: string; icon: typeof Ban}> = {
  naoFaco: {
    title: 'O que nao faco',
    placeholder: 'Adicionar limite editorial',
    accent: 'var(--accent-pink)',
    icon: Ban,
  },
  alertas: {
    title: 'Cuidados de voz',
    placeholder: 'Adicionar cuidado de consistencia',
    accent: 'var(--accent-orange)',
    icon: ShieldAlert,
  },
};

export function DNAVozMobileScreen({data, pilares, isDirty, onChange, onSave}: DNAVozMobileScreenProps) {
  const [listField, setListField] = useState<ListField | null>(null);
  const [listValue, setListValue] = useState('');

  const updateField = (field: keyof DnaVoz, value: string | string[]) => {
    onChange({...data, [field]: value});
  };

  const handleAddListItem = () => {
    if (!listField || !listValue.trim()) return;
    updateField(listField, [...data[listField], listValue.trim()]);
    setListValue('');
    setListField(null);
  };

  const handleRemoveListItem = (field: ListField, index: number) => {
    updateField(
      field,
      data[field].filter((_, itemIndex) => itemIndex !== index)
    );
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--accent-orange)]/12 p-3 text-[var(--accent-orange)]">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="t-section-title text-[var(--text-primary)]">DNA da Voz</p>
            <p className="t-secondary">
              Identidade editorial mobile para promessa, publico, tom e limites da marca.
            </p>
          </div>
        </div>

        <button type="button" onClick={onSave} disabled={!isDirty} className="button-primary w-full disabled:opacity-40">
          Salvar identidade
        </button>
      </section>

      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
          <Zap className="h-4 w-4" />
          <p className="t-label">Promessa central</p>
        </div>
        <textarea
          value={data.promessaCentral}
          onChange={event => updateField('promessaCentral', event.target.value)}
          placeholder="O que voce entrega para quem te segue?"
          className="min-h-[112px] w-full resize-none rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
        />
      </section>

      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
          <Users className="h-4 w-4" />
          <p className="t-label">Publico</p>
        </div>
        <textarea
          value={data.publico}
          onChange={event => updateField('publico', event.target.value)}
          placeholder="Para quem voce cria?"
          className="min-h-[112px] w-full resize-none rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
        />
      </section>

      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
          <Target className="h-4 w-4" />
          <p className="t-label">Pilares ativos</p>
        </div>

        {pilares.length === 0 ? (
          <MobileEmptyState
            title="Nenhum pilar ativo"
            description="Configure pilares editoriais para conectar a identidade da voz aos temas principais."
            icon={<Target className="h-8 w-8" />}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {pilares.map(pilar => (
              <span
                key={pilar.id}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                style={{backgroundColor: `${pilar.cor}22`}}
              >
                <span className="h-2 w-2 rounded-full" style={{backgroundColor: pilar.cor}} />
                {pilar.nome}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-[var(--text-secondary)]">
          <MessageSquare className="h-4 w-4" />
          <p className="t-label">Tom de voz</p>
        </div>
        <textarea
          value={data.tom}
          onChange={event => updateField('tom', event.target.value)}
          placeholder="Como a marca fala e como evita soar?"
          className="min-h-[128px] w-full resize-none rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
        />
      </section>

      {(['naoFaco', 'alertas'] as ListField[]).map(field => {
        const meta = FIELD_META[field];
        const Icon = meta.icon;

        return (
          <section
            key={field}
            className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Icon className="h-4 w-4" />
                <p className="t-label">{meta.title}</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setListField(field);
                  setListValue('');
                }}
                className="rounded-full bg-[var(--bg-primary)] p-2 text-[var(--text-primary)]"
                aria-label={`Adicionar item em ${meta.title}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {data[field].length === 0 ? (
                <p className="rounded-[1.25rem] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                  Nenhum item adicionado ainda.
                </p>
              ) : (
                data[field].map((item, index) => (
                  <div
                    key={`${field}-${index}`}
                    className="flex items-start gap-3 rounded-[1.25rem] bg-[var(--bg-primary)] px-4 py-3"
                  >
                    <div
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{backgroundColor: meta.accent}}
                    />
                    <p className="min-w-0 flex-1 text-sm text-[var(--text-primary)]">{item}</p>
                    <button
                      type="button"
                      onClick={() => handleRemoveListItem(field, index)}
                      className="rounded-full bg-black/5 p-2 text-[var(--text-secondary)]"
                      aria-label="Remover item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}

      <BottomSheetModal
        open={listField !== null}
        onClose={() => {
          setListField(null);
          setListValue('');
        }}
        desktopMaxW="max-w-xl"
        zIndex="z-[110]"
      >
        <div className="flex h-full flex-col bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <p className="t-section-title text-[var(--text-primary)]">
              {listField ? FIELD_META[listField].title : 'Novo item'}
            </p>
            <p className="t-secondary mt-1">Adicione uma referencia curta para manter a voz consistente no mobile.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <textarea
              autoFocus
              value={listValue}
              onChange={event => setListValue(event.target.value)}
              placeholder={listField ? FIELD_META[listField].placeholder : 'Digite o item'}
              className="min-h-[140px] w-full resize-none rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
            />
          </div>

          <div className="flex gap-3 border-t border-[var(--border-color)] px-5 py-4 pb-safe">
            <button
              type="button"
              onClick={() => {
                setListField(null);
                setListValue('');
              }}
              className="flex-1 rounded-[1.25rem] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddListItem}
              disabled={!listValue.trim()}
              className="button-primary flex-1 disabled:opacity-40"
            >
              Adicionar
            </button>
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
}
