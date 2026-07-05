import {useState} from 'react';
import {BottomSheetModal} from '../../../components/feedback/modals/BottomSheetModal';
import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';
import type {Platform, Serie, Template} from '../../../lib/database';
import {EmptyState} from '../../../components/ui/EmptyState';
import {MobileListCard} from '../../components/MobileListCard';
import {MobileSectionHeader} from '../../components/MobileSectionHeader';
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
    <div className="stack-xl">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <MobileSectionHeader
          icon={Layout}
          tone="blue"
          title="Templates"
          description="Um catálogo único com tags de tipo, série e plataforma."
        />

        <AppButton variant="primary" fullWidth onClick={() => setShowForm(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Novo template
        </AppButton>
      </section>

      <section className="stack-lg">
        {templates.length === 0 ? (
          <EmptyState compact
            title="Nenhum template ainda"
            description="Crie o primeiro item para começar a montar seu catálogo reutilizável."
            icon={<Layout className="h-8 w-8" />}
          />
        ) : (
          <div className="stack-md">
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
          <div className="border-b border-[var(--border-color)] px-6 py-4">
            <Text variant="sectionTitle">Novo template</Text>
            <p className="t-secondary mt-1">Defina o tipo como uma tag, sem separar o catálogo por abas.</p>
          </div>

          <div className="flex-1 stack-lg overflow-y-auto p-6">
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

          <div className="flex gap-3 border-t border-[var(--border-color)] px-6 py-4 pb-safe">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-secondary)]"
            >
              Cancelar
            </button>
            <AppButton variant="primary" onClick={handleCreate} disabled={!name.trim()} className="flex-1">
              Criar
            </AppButton>
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
}
