import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, Hash, Layers, Palette, Plus, Quote, Type } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { AppButton } from '../../../components/ui/AppButton';
import {
  PropertyInput,
  PropertyRow,
  PropertySection,
  PropertySelect,
  PropertyTextarea,
} from '../../../components/ui/PropertyRow';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { ToolbarSearchInput } from '../../../components/ui/ToolbarSearchInput';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { SeriesMobileScreen } from '../../../mobile/screens/settings/SeriesMobileScreen';
import type { Serie } from '../../../lib/database';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { generateUUID } from '../../../utils/uuid';
import { SerieProductionMetricsPanel } from '../components/SerieProductionMetricsPanel';
import type { Content } from '../../../lib/database';

const FREQUENCIAS = ['Semanal', 'Quinzenal', 'Mensal', 'Sob demanda'] as const;

type SeriesFilter = 'todas' | 'ativas' | 'inativas';

function formatRoteiroCount(count: number) {
  return `${count} roteiro${count === 1 ? '' : 's'}`;
}

function seriesMetaLine(serie: Serie, roteiroCount: number) {
  const frequency = serie.frequenciaRecomendada || 'Sob demanda';
  const activeLabel = serie.ativa ? null : 'Inativa';
  return [frequency, formatRoteiroCount(roteiroCount), activeLabel]
    .filter(Boolean)
    .join(' · ');
}

export function SeriesForm({
  initial,
  onSave,
  onCancel,
  platformNames,
  contents = [],
}: {
  initial: Partial<Serie>;
  onSave: (serie: Serie) => void;
  onCancel: () => void;
  platformNames: string[];
  contents?: Content[];
}) {
  const [form, setForm] = useState<Serie>(() => ({
    id: initial.id || generateUUID(),
    userId: initial.userId || '',
    name: initial.name || '',
    template: initial.template || '',
    notes: initial.notes || '',
    slotPadrao: initial.slotPadrao || null,
    formatoVisualPadrao: initial.formatoVisualPadrao || null,
    estruturaRoteiro: initial.estruturaRoteiro || null,
    bordao: initial.bordao || null,
    cor: initial.cor || '#6366f1',
    ativa: initial.ativa ?? true,
    frequenciaRecomendada: initial.frequenciaRecomendada || 'Semanal',
    createdAt: initial.createdAt || new Date().toISOString(),
    updatedAt: initial.updatedAt || new Date().toISOString(),
    pilarIds: initial.pilarIds || [],
    plataformas: initial.plataformas || [],
  }));

  const updatePlatformHashtags = (platformId: string, hashtags: string) => {
    const current = [...form.plataformas];
    const index = current.findIndex(item => item.platformId === platformId);

    if (!hashtags.trim()) {
      if (index >= 0) current.splice(index, 1);
    } else if (index >= 0) {
      current[index] = { ...current[index], hashtags: hashtags.trim() };
    } else {
      current.push({ serieId: form.id, platformId, hashtags: hashtags.trim() });
    }

    setForm(previous => ({ ...previous, plataformas: current }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-7">
      <PropertySection label="Identidade">
        <PropertyRow label="Nome *" icon={<Type />}>
          <PropertyInput
            type="text"
            value={form.name}
            onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))}
            placeholder="Nome da série"
            className={form.name ? '' : 'property-row-value--empty'}
          />
        </PropertyRow>

        <PropertyRow label="Frequência" icon={<CalendarClock />}>
          <PropertySelect
            value={form.frequenciaRecomendada || 'Semanal'}
            onChange={event =>
              setForm(previous => ({ ...previous, frequenciaRecomendada: event.target.value }))
            }
          >
            {FREQUENCIAS.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </PropertySelect>
        </PropertyRow>

        <PropertyRow label="Bordão" icon={<Quote />}>
          <PropertyInput
            type="text"
            value={form.bordao || ''}
            onChange={event => setForm(previous => ({ ...previous, bordao: event.target.value || null }))}
            placeholder="Ex: vamos destrinchar isso"
            className={form.bordao ? '' : 'property-row-value--empty'}
          />
        </PropertyRow>

        <PropertyRow label="Cor" icon={<Palette />}>
          <input
            type="color"
            value={form.cor || '#6366f1'}
            onChange={event => setForm(previous => ({ ...previous, cor: event.target.value }))}
            className="h-6 w-10 cursor-pointer rounded-[var(--radius-input)] border border-[var(--border-color)] bg-transparent p-0.5"
          />
        </PropertyRow>
      </PropertySection>

      <PropertySection label="Estrutura do roteiro">
        <PropertyTextarea
          rows={6}
          value={form.estruturaRoteiro || ''}
          onChange={event =>
            setForm(previous => ({ ...previous, estruturaRoteiro: event.target.value || null }))
          }
          placeholder="Estrutura base para roteiros desta série..."
          className="min-h-[140px] leading-relaxed"
        />
      </PropertySection>

      <PropertySection label="Hashtags por plataforma">
        {platformNames.map(platform => (
          <PropertyRow key={platform} label={platform} icon={<Hash />}>
            <PropertyInput
              type="text"
              value={form.plataformas.find(item => item.platformId === platform)?.hashtags || ''}
              onChange={event => updatePlatformHashtags(platform, event.target.value)}
              placeholder="#hashtag1 #hashtag2"
              className={
                form.plataformas.find(item => item.platformId === platform)?.hashtags
                  ? ''
                  : 'property-row-value--empty'
              }
            />
          </PropertyRow>
        ))}
      </PropertySection>

      {initial.id ? (
        <SerieProductionMetricsPanel
          serie={{
            id: form.id,
            userId: form.userId,
            name: form.name,
            template: form.template,
            notes: form.notes,
            slotPadrao: form.slotPadrao,
            formatoVisualPadrao: form.formatoVisualPadrao,
            estruturaRoteiro: form.estruturaRoteiro,
            bordao: form.bordao,
            cor: form.cor,
            ativa: form.ativa,
            frequenciaRecomendada: form.frequenciaRecomendada,
            pilarIds: form.pilarIds,
            plataformas: form.plataformas,
            createdAt: form.createdAt,
            updatedAt: form.updatedAt,
          }}
          contents={contents}
        />
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-2">
        <AppButton onClick={onCancel} variant="secondary">
          Cancelar
        </AppButton>
        <AppButton onClick={handleSave} disabled={!form.name.trim()} variant="primary">
          Salvar
        </AppButton>
      </div>
    </div>
  );
}

export function SeriesSettingsPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SeriesFilter>('todas');

  const openEditPage = (serieId: string) => {
    navigate(`/configuracoes/series/${serieId}/editar`);
  };

  const openCreatePage = () => {
    navigate('/configuracoes/series/nova');
  };

  const handleSave = (serie: Serie) => {
    const payload = { ...serie, userId: serie.userId || user?.id || '' };
    const exists = state.series.find(item => item.id === payload.id);

    if (exists) {
      dispatch({ type: 'UPDATE_SERIE', payload });
    } else {
      dispatch({ type: 'ADD_SERIE', payload });
    }
  };

  const handleToggleActive = (serie: Serie) => {
    dispatch({
      type: 'UPDATE_SERIE',
      payload: { ...serie, ativa: !serie.ativa, updatedAt: new Date().toISOString() },
    });
  };

  const handleDelete = (id: string) => {
    setConfirm({
      ...CONFIRM.excluirSerie,
      onConfirm: () => dispatch({ type: 'DELETE_SERIE', payload: id }),
    });
  };

  const roteiroCountBySerie = useMemo(() => {
    const map = new Map<string, number>();
    for (const content of state.contents) {
      if (content.seriesId) map.set(content.seriesId, (map.get(content.seriesId) || 0) + 1);
    }
    return map;
  }, [state.contents]);

  const filteredSeries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.series
      .filter(serie => {
        if (filter === 'ativas' && !serie.ativa) return false;
        if (filter === 'inativas' && serie.ativa) return false;
        if (!query) return true;
        const haystack = [
          serie.name,
          serie.bordao,
          serie.estruturaRoteiro,
          serie.frequenciaRecomendada,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort((a, b) => {
        if (a.ativa !== b.ativa) return a.ativa ? -1 : 1;
        return a.name.localeCompare(b.name, 'pt-BR');
      });
  }, [filter, search, state.series]);

  const filterCounts = useMemo(() => {
    const ativas = state.series.filter(serie => serie.ativa).length;
    return {
      todas: state.series.length,
      ativas,
      inativas: state.series.length - ativas,
    };
  }, [state.series]);

  const openBulkPage = (serieId: string) => {
    navigate(`/configuracoes/series/${serieId}/roteiros`);
  };

  if (isMobile) {
    const platformNames = state.platforms
      .filter(platform => platform.ativo)
      .map(platform => platform.nome);

    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <SeriesMobileScreen
            series={state.series}
            roteiroCountBySerie={roteiroCountBySerie}
            platformNames={platformNames}
            contents={state.contents}
            onSave={handleSave}
            onToggle={handleToggleActive}
            onDelete={(serieId) => handleDelete(serieId)}
            onOpen={openBulkPage}
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
      title="Séries"
      icon={Layers}
      actions={
        <AppButton
          onClick={openCreatePage}
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nova série
        </AppButton>
      }
    >
      {state.series.length > 0 ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar série..."
            className="w-full sm:max-w-xs"
          />
          <SegmentTabs<SeriesFilter>
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'todas', label: `Todas ${filterCounts.todas}` },
              { id: 'ativas', label: `Ativas ${filterCounts.ativas}` },
              { id: 'inativas', label: `Inativas ${filterCounts.inativas}` },
            ]}
          />
        </div>
      ) : null}

      <div className={SETTINGS_ENTITY_GRID_CLASS}>
        {state.series.length === 0 ? (
          <div className="col-span-full py-10 text-center">
            <Layers className="mx-auto mb-2 h-8 w-8 opacity-10" />
            <p className="text-sm font-medium opacity-40">Nenhuma série criada</p>
          </div>
        ) : filteredSeries.length === 0 ? (
          <div className="col-span-full py-10 text-center">
            <p className="text-sm font-medium opacity-40">Nenhuma série encontrada</p>
          </div>
        ) : (
          filteredSeries.map(serie => {
            const roteiroCount = roteiroCountBySerie.get(serie.id) || 0;
            const structure = serie.estruturaRoteiro?.trim();

            return (
              <SettingsGridCard
                key={serie.id}
                compact
                colorAccent="bar"
                title={serie.name}
                description={structure || undefined}
                color={serie.cor || '#6366f1'}
                active={serie.ativa}
                dimmed={!serie.ativa}
                onOpen={() => openBulkPage(serie.id)}
                onToggle={() => handleToggleActive(serie)}
                onEdit={() => openEditPage(serie.id)}
                onDelete={() => handleDelete(serie.id)}
                meta={seriesMetaLine(serie, roteiroCount)}
              />
            );
          })
        )}
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
    </SettingsPageScaffold>
  );
}
