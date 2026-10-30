import { TextCount } from '../../../../components/ui/TextCount';
import {useEffect, useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {Calendar, ChevronDown, Clock, FileText, Flag, Layers, Library, Search, Tag, Target} from 'lucide-react';
import {PropertyDatePicker} from '../../../../components/ui/PropertyDatePicker';
import {AppButton} from '../../../../components/ui/AppButton';
import {SelectField} from '../../../../components/ui/SelectField';
import {selectOptionsFromChildren} from '../../../../components/ui/SelectMenu';
import {TagSelect} from '../../../../components/ui/TagSelect';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {useAppContext} from '../../../../context/AppContext';
import type {Pilar, Serie} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {CONTENT_STATUS, getStatusOptions, normalizeContentStatus} from '../../lib/contentPipeline';
import {aplicarEscolhasDaSerie, marcarEscolhaManual} from '../../../editorial/lib/escolhasSerie';
import {caminhoDaSerie} from '../../../editorial/lib/serieArvore';
import {escopoTemporadas, temporadaNoEscopo, temporadasDoEscopo} from '../../../editorial/lib/temporadas';
import {FuncaoEditorialFields} from './ContentOperationalPanel';
import {AvisoTrocaSerieModal} from './DerivarConteudoDialog';
import {LivroMultiSelect} from './LivroMultiSelect';
import {PlatformCopyEditor} from './PlatformCopyEditor';
import {TemaField} from './TemaField';
import type {ScriptDraft} from './sections/RoteiroSection';

const NOTES_MAX = 500;

const fieldClass =
  'h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 t-body text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60';

const selectClass =
  'h-11 w-full appearance-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 pr-9 t-body text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60';

interface ContentManageWorkspaceProps {
  contentId: string;
  draft: ScriptDraft;
  disabled?: boolean;
  series: Serie[];
  pilares: Pilar[];
  onChange: (updates: Partial<ScriptDraft>) => void;
}

function toIsoDate(dateOnly: string | null) {
  return dateOnly ? `${dateOnly}T12:00:00.000Z` : null;
}

function clockInputValue(value: string | null | undefined) {
  const match = /^(\d{2}):(\d{2})/.exec(value?.trim() ?? '');
  return match ? `${match[1]}:${match[2]}` : '';
}

function FieldLabel({icon, children}: {icon?: ReactNode; children: string}) {
  return (
    <Text variant="secondary" as="span" className="mb-1.5 flex items-center gap-2 text-[var(--text-secondary)]">
      {icon}
      {children}
    </Text>
  );
}

function ManageSelect({
  value,
  onChange,
  children,
  ariaLabel,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel: string;
  disabled?: boolean;
}) {
  // Lista do design system (flutuante no mouse, folha no toque); as opções vêm dos `<option>` filhos.
  return (
    <SelectField
      block
      ariaLabel={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={onChange}
      options={selectOptionsFromChildren(children)}
      className="min-h-11 md:min-h-11"
    />
  );
}

function ScheduleMoment({
  label,
  date,
  time,
  disabled,
  onDate,
  onTime,
}: {
  label: string;
  date: string | null;
  time: string | null | undefined;
  disabled: boolean;
  onDate: (date: string | null) => void;
  onTime: (time: string | null) => void;
}) {
  return (
    <div className="min-w-0">
      <Text variant="bodyStrong" as="p">{label}</Text>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0">
          <FieldLabel icon={<Calendar className="h-4 w-4" />}>Data</FieldLabel>
          <PropertyDatePicker
            variant="field"
            placeholder="Selecionar data"
            disabled={disabled}
            className="h-11 bg-[var(--bg-primary)] py-0"
            value={date}
            onChange={onDate}
          />
        </label>
        <label className="block min-w-0">
          <FieldLabel icon={<Clock className="h-4 w-4" />}>Horário</FieldLabel>
          <input
            type="time"
            aria-label={`Horário de ${label.toLowerCase()}`}
            disabled={disabled}
            step={60}
            value={clockInputValue(time)}
            onChange={event => onTime(event.target.value || null)}
            className={fieldClass}
          />
        </label>
      </div>
    </div>
  );
}

export function ContentManageWorkspace({
  contentId,
  draft,
  disabled = false,
  series,
  pilares,
  onChange,
}: ContentManageWorkspaceProps) {
  const {state, ensureDataDomains} = useAppContext();
  const navigate = useNavigate();
  const linkedPilar = draft.pilarId ? pilares.find(item => item.id === draft.pilarId) ?? null : null;
  const linkedSerie = draft.seriesId ? series.find(item => item.id === draft.seriesId) ?? null : null;
  const temporadas = state.temporadas ?? [];
  const escopo = draft.seriesId ? escopoTemporadas(draft.seriesId, series) : null;
  const temporadasDisponiveis = escopo ? temporadasDoEscopo(escopo.id, temporadas) : [];
  const temporadaFora = Boolean(draft.temporadaId && (
    !draft.seriesId || !temporadaNoEscopo(draft.temporadaId, draft.seriesId, series, temporadas)
  ));
  const caminhoSerie = draft.seriesId
    ? caminhoDaSerie(draft.seriesId, series).map(item => item.name).join(' · ')
    : '';
  const publishDateOnly = draft.publishDate ? draft.publishDate.slice(0, 10) : '';
  const currentStatus = normalizeContentStatus(draft.status);
  const etapas = getStatusOptions(draft.status);
  // Observações começam recolhidas; abertas quando já há texto.
  const [notesOpen, setNotesOpen] = useState(() => Boolean(draft.notes?.trim()));
  const [seriePendenteId, setSeriePendenteId] = useState<string | null | undefined>(undefined);

  const aplicarSerie = (serieId: string | null) => {
    onChange({
      ...aplicarEscolhasDaSerie(draft, series.find(item => item.id === serieId) ?? null, series),
      seriesId: serieId,
      temporadaId: null,
    });
  };

  const pedirTrocaSerie = (serieId: string | null) => {
    if (disabled || serieId === (draft.seriesId ?? null)) return;
    if (draft.seriesId) {
      setSeriePendenteId(serieId);
      return;
    }
    aplicarSerie(serieId);
  };

  useEffect(() => {
    void ensureDataDomains(['library', 'production']);
  }, [ensureDataDomains]);

  return (
    <div className="stack-lg">
      <AvisoTrocaSerieModal
        open={seriePendenteId !== undefined}
        onConfirm={() => {
          aplicarSerie(seriePendenteId ?? null);
          setSeriePendenteId(undefined);
        }}
        onCancel={() => setSeriePendenteId(undefined)}
      />
      <Text variant="sectionTitle" as="h2" className="sr-only">Gestão do conteúdo</Text>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
        <PlatformCopyEditor
          embedded
          plataformas={draft.plataformas}
          pilar={linkedPilar}
          serie={linkedSerie}
          disabled={disabled}
          contentId={contentId}
          status={draft.status}
          legendaBase={draft.legendaBase}
          titulo={draft.title}
          onTituloChange={title => onChange({title})}
          onChange={plataformas => onChange({plataformas})}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <Surface variant="outlined" padding="lg" className="bg-[var(--bg-elevated)]">
            <Text variant="sectionTitle" as="h3">Organização</Text>
            <div className="mt-4 stack-md">
              <label className="block">
                <FieldLabel>Etapa</FieldLabel>
                <ManageSelect
                  ariaLabel="Etapa"
                  disabled={disabled}
                  value={currentStatus}
                  onChange={status => onChange({status})}
                >
                  {/* Todas as etapas, na ordem. Dá para pular ou voltar. */}
                  {etapas.map(etapa => (
                    <option key={etapa.status} value={etapa.status} disabled={!etapa.disponivel}>
                      {etapa.atual ? `${etapa.status} (atual)` : etapa.status}
                    </option>
                  ))}
                </ManageSelect>
                <Text variant="meta" as="p" className="mt-1.5 text-[var(--text-secondary)]">
                  Dá para pular ou voltar etapas.
                  {currentStatus !== CONTENT_STATUS.POSTADO ? ' Publicado pede a data e o link de cada conta.' : ''}
                </Text>
              </label>

              <div className="border-t border-[var(--border-color)]" aria-hidden />

              <div className="block">
                <FieldLabel icon={<Layers className="h-4 w-4" />}>Série</FieldLabel>
                <TagSelect
                  label="Série"
                  hideLabel
                  id="content-manage-serie"
                  disabled={disabled}
                  maxSelections={1}
                  placeholder="Selecionar série…"
                  values={draft.seriesId ? [draft.seriesId] : []}
                  onChange={values => pedirTrocaSerie(values[0] ?? null)}
                  options={series.map(item => ({
                    value: item.id,
                    label: caminhoDaSerie(item.id, series).map(node => node.name).join(' · '),
                  }))}
                  controlClassName="min-h-11"
                />
                {linkedSerie?.parentId ? (
                  <Text variant="meta" as="p" className="mt-1.5 text-[var(--text-secondary)]">
                    {caminhoSerie}
                  </Text>
                ) : null}
              </div>

              <div className="block">
                  <FieldLabel icon={<Layers className="h-4 w-4" />}>Temporada</FieldLabel>
                  <ManageSelect
                    ariaLabel="Temporada"
                    disabled={disabled || (!escopo && !draft.temporadaId)}
                    value={draft.temporadaId ?? ''}
                    onChange={temporadaId => onChange({temporadaId: temporadaId || null})}
                  >
                    <option value="">Sem temporada</option>
                    {temporadasDisponiveis.map(temporada => (
                      <option key={temporada.id} value={temporada.id}>{temporada.nome}</option>
                    ))}
                    {temporadaFora && draft.temporadaId ? (
                      <option value={draft.temporadaId}>
                        {temporadas.find(item => item.id === draft.temporadaId)?.nome ?? 'Temporada anterior'} (reorganizar)
                      </option>
                    ) : null}
                  </ManageSelect>
                  {!draft.seriesId || !escopo || temporadasDisponiveis.length === 0 ? (
                    <Text variant="meta" as="p" className="mt-1.5 text-[var(--text-secondary)]">
                      {!draft.seriesId
                        ? 'Selecione uma série para escolher a temporada.'
                        : !escopo
                          ? 'Esta série ainda não usa temporadas.'
                          : 'Esta série ainda não tem temporadas cadastradas.'}
                    </Text>
                  ) : null}
                  {linkedSerie && (!escopo || temporadasDisponiveis.length === 0) && !disabled ? (
                    <AppButton
                      variant="ghost"
                      size="sm"
                      className="mt-1"
                      onClick={() => navigate(`/series/${escopo?.id ?? linkedSerie.id}/editar`)}
                    >
                      Configurar temporadas
                    </AppButton>
                  ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="block min-w-0">
                  <FieldLabel icon={<Target className="h-4 w-4" />}>Pilar</FieldLabel>
                  <TagSelect
                    label="Pilar"
                    hideLabel
                    id="content-manage-pilar"
                    disabled={disabled}
                    maxSelections={1}
                    placeholder="Selecionar pilar…"
                    values={draft.pilarId ? [draft.pilarId] : []}
                    onChange={values => onChange(marcarEscolhaManual(draft, 'pilar', values[0] ?? null))}
                    options={pilares
                      .filter(item => item.ativo || item.id === draft.pilarId)
                      .map(item => ({value: item.id, label: item.nome}))}
                    controlClassName="min-h-11"
                  />
                </div>
                <div className="min-w-0">
                  <FuncaoEditorialFields
                    draft={draft}
                    serie={linkedSerie}
                    onChange={onChange}
                    variant="form"
                    formPart="funcao"
                    formLabel={<FieldLabel icon={<Flag className="h-4 w-4" />}>Objetivo do conteúdo</FieldLabel>}
                    formInputClass={selectClass}
                  />
                </div>
              </div>

              <div>
                <FieldLabel icon={<Tag className="h-4 w-4" />}>Temas</FieldLabel>
                <TemaField
                  temaIds={draft.temaIds}
                  onChange={temaIds => onChange({temaIds})}
                  selectProps={{
                    hideLabel: true,
                    placeholder: 'Adicionar tema, ex.: Halloween',
                    controlClassName: 'min-h-11',
                  }}
                />
              </div>


              <div className="border-t border-[var(--border-color)]" aria-hidden />

              <FuncaoEditorialFields
                draft={draft}
                serie={linkedSerie}
                onChange={onChange}
                variant="form"
                formPart="grade"
              />
            </div>
          </Surface>

          <Surface variant="outlined" padding="lg" className="bg-[var(--bg-elevated)]">
            <div className="flex items-start gap-3">
              <Library className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-primary)]" aria-hidden />
              <div className="min-w-0">
                <Text variant="sectionTitle" as="h3">Mídias citadas</Text>
                <Text variant="meta" className="mt-0.5 block text-[var(--text-secondary)]">
                  Vincule um ou mais itens da biblioteca.
                </Text>
              </div>
            </div>
            <div className="mt-4">
              <LivroMultiSelect
                livroIds={draft.livroIds}
                bibliotecaItemId={draft.bibliotecaItemId}
                bibliotecaItems={state.bibliotecaItems}
                onChange={onChange}
                selectProps={{
                  hideLabel: true,
                  searchable: true,
                  placeholder: 'Buscar na biblioteca...',
                  leadingIcon: <Search className="h-4 w-4" />,
                  controlClassName: 'min-h-11',
                }}
              />
            </div>
          </Surface>
        </div>
      </div>

      <Surface variant="outlined" padding="lg" className="bg-[var(--bg-elevated)]">
        <Text variant="sectionTitle" as="h3">Gravação e publicação</Text>
        <Text variant="secondary" className="mt-1">
          Dia e horário de cada etapa.
        </Text>
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-6">
          <ScheduleMoment
            label="Gravação"
            date={draft.recordingDate ? draft.recordingDate.slice(0, 10) : null}
            time={draft.recordingTime}
            disabled={disabled}
            onDate={date => onChange({recordingDate: toIsoDate(date)})}
            onTime={recordingTime => onChange({recordingTime})}
          />
          <span className="hidden w-px bg-[var(--border-color)] lg:block" aria-hidden />
          <ScheduleMoment
            label="Publicação"
            date={publishDateOnly || null}
            time={draft.publishTime}
            disabled={disabled}
            onDate={date => onChange({publishDate: toIsoDate(date)})}
            onTime={publishTime => onChange({publishTime})}
          />
        </div>
      </Surface>

      <Surface variant="outlined" padding="none" className="bg-[var(--bg-elevated)]">
        <button
          type="button"
          aria-expanded={notesOpen}
          aria-controls={`observacoes-${contentId || 'novo'}`}
          onClick={() => setNotesOpen(open => !open)}
          className="flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-card)] px-6 py-3 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <FileText className="h-5 w-5 shrink-0 text-[var(--text-primary)]" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <Text variant="sectionTitle" as="span">Observações</Text>
            <Text variant="meta" className="text-[var(--text-secondary)]">
              {!(draft.notes ?? '').trim() ? 'Adicione observações, referências e links.' : null}
            </Text>
          </span>
          <ChevronDown
            className={cn('h-5 w-5 shrink-0 text-[var(--text-secondary)] transition-transform', notesOpen && 'rotate-180')}
            aria-hidden
          />
        </button>
        {notesOpen ? (
          <div id={`observacoes-${contentId || 'novo'}`} className="relative px-6 pb-6">
            <textarea
              value={draft.notes ?? ''}
              disabled={disabled}
              aria-label="Observações"
              onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
              placeholder="Ex.: link dos arquivos, instruções de edição, capa, cortes"
              className="block min-h-36 w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-3 t-body leading-6 text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
            />
            <TextCount value={draft.notes ?? ''} limit={NOTES_MAX} />
          </div>
        ) : null}
      </Surface>
    </div>
  );
}
