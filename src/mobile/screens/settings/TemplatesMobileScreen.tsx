import {useState} from 'react';
import {BottomSheetModal} from '../../../components/feedback/modals/BottomSheetModal';
import type {Platform, Serie, Template} from '../../../lib/database';
import {MobileEmptyState} from '../../components/MobileEmptyState';
import {MobileListCard} from '../../components/MobileListCard';
import {Layout, Plus} from 'lucide-react';
import {generateUUID} from '../../../utils/uuid';

type TemplateTypeFilter = 'roteiro' | 'legenda' | 'outro';

interface TemplatesMobileScreenProps {
  templates: Template[];
  series: Serie[];
  platforms: Platform[];
  onCreate: (template: Template) => void;
  onDelete: (templateId: string) => void;
}

export function TemplatesMobileScreen({
  templates,
  series,
  platforms,
  onCreate,
  onDelete,
}: TemplatesMobileScreenProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<TemplateTypeFilter>('roteiro');
  const [seriesId, setSeriesId] = useState('');
  const [platformId, setPlatformId] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;

    onCreate({
      id: generateUUID(),
      userId: '',
      nome: name.trim(),
      type,
      seriesId: seriesId || null,
      platformId: platformId || null,
      estrutura: [],
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setName('');
    setSeriesId('');
    setPlatformId('');
    setType('roteiro');
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] bg-[var(--accent-blue)]/12 p-3 text-[var(--accent-blue)]">
            <Layout className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Templates</p>
            <p className="t-secondary">Um catálogo único com tags de tipo, série e plataforma.</p>
          </div>
        </div>

        <button type="button" onClick={() => setShowForm(true)} className="button-primary w-full">
          <Plus className="h-4 w-4" />
          Novo template
        </button>
      </section>

      <section className="space-y-4">
        {templates.length === 0 ? (
          <MobileEmptyState
            title="Nenhum template ainda"
            description="Crie o primeiro item para começar a montar seu catálogo reutilizável."
            icon={<Layout className="h-8 w-8" />}
          />
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const serie = series.find((item) => item.id === template.seriesId);
              const platform = platforms.find((item) => item.id === template.platformId);

              return (
                <MobileListCard
                  key={template.id}
                  title={template.nome}
                  description={`${template.estrutura.length} blocos estruturados`}
                  meta={
                    <>
                      <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                        {template.type || 'roteiro'}
                      </span>
                      {serie ? (
                        <span className="rounded-full bg-[var(--accent-purple)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-purple)]">
                          {serie.name}
                        </span>
                      ) : null}
                      {platform ? (
                        <span className="rounded-full bg-[var(--accent-green)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-green)]">
                          {platform.nome}
                        </span>
                      ) : null}
                    </>
                  }
                  trailing={
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(template.id);
                      }}
                      className="rounded-full bg-[var(--accent-pink)]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent-pink)]"
                    >
                      Excluir
                    </button>
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      <BottomSheetModal open={showForm} onClose={() => setShowForm(false)} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="flex h-full flex-col bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <p className="t-section-title text-[var(--text-primary)]">Novo template</p>
            <p className="t-secondary mt-1">Defina o tipo como uma tag, sem separar o catálogo por abas.</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do template"
              className="w-full"
            />

            <select value={type} onChange={(event) => setType(event.target.value as TemplateTypeFilter)} className="w-full">
              <option value="roteiro">Roteiro</option>
              <option value="legenda">Legenda</option>
              <option value="outro">Outro</option>
            </select>

            <select value={seriesId} onChange={(event) => setSeriesId(event.target.value)} className="w-full">
              <option value="">Série (opcional)</option>
              {series.map((serie) => (
                <option key={serie.id} value={serie.id}>
                  {serie.name}
                </option>
              ))}
            </select>

            <select value={platformId} onChange={(event) => setPlatformId(event.target.value)} className="w-full">
              <option value="">Plataforma (opcional)</option>
              {platforms.filter((platform) => platform.ativo).map((platform) => (
                <option key={platform.id} value={platform.id}>
                  {platform.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 border-t border-[var(--border-color)] px-5 py-4 pb-safe">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-[1.25rem] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-secondary)]"
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
