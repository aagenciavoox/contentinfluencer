import {useEffect, useState, type ReactNode} from 'react';
import {useNavigate} from 'react-router-dom';
import {Clapperboard, Search} from 'lucide-react';
import {PropertyDatePicker} from '../../../../components/ui/PropertyDatePicker';
import {AppButton} from '../../../../components/ui/AppButton';
import {SelectField} from '../../../../components/ui/SelectField';
import {selectOptionsFromChildren} from '../../../../components/ui/SelectMenu';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {useAppContext} from '../../../../context/AppContext';
import type {Pilar, Serie} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {CONTENT_STATUS, getContentBlockSummary, getStatusOptions, normalizeContentStatus} from '../../lib/contentPipeline';
import {aplicarEscolhasDaSerie, marcarEscolhaManual} from '../../../editorial/lib/escolhasSerie';
import {pilarDoConteudo} from '../../../editorial/lib/herancaSerie';
import {caminhoDaSerie, filhosDaSerie} from '../../../editorial/lib/serieArvore';
import {escopoTemporadas, temporadaNoEscopo, temporadasDoEscopo} from '../../../editorial/lib/temporadas';
import {tipoDaSerie} from '../../../settings/lib/serieAgrupamento';
import {FuncaoEditorialFields} from './ContentOperationalPanel';
import {AvisoTrocaSerieModal} from './DerivarConteudoDialog';
import {LivroMultiSelect} from './LivroMultiSelect';
import {PlatformCopyEditor} from './PlatformCopyEditor';
import {TemaField} from './TemaField';
import type {ScriptDraft} from './sections/RoteiroSection';

interface ContentManageWorkspaceProps {
  contentId: string;
  draft: ScriptDraft;
  disabled?: boolean;
  series: Serie[];
  pilares: Pilar[];
  onChange: (updates: Partial<ScriptDraft>) => void;
  /** Abre a escolha de bloco. Usado ao entrar em Produção. */
  onAddToBlock?: () => void;
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
  idPrefix,
  label,
  date,
  time,
  disabled,
  onDate,
  onTime,
}: {
  idPrefix: string;
  label: string;
  date: string | null;
  time: string | null | undefined;
  disabled: boolean;
  onDate: (date: string | null) => void;
  onTime: (time: string | null) => void;
}) {
  const timeId = `${idPrefix}-time`;
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-[minmax(0,1fr)_8rem] gap-2">
        <PropertyDatePicker
          variant="field"
          ariaLabel={`Data de ${label.toLowerCase()}`}
          placeholder="Selecionar data"
          disabled={disabled}
          className={cn(
            'input flex h-11 items-center py-0',
            !date && 'text-[var(--text-tertiary)]',
          )}
          value={date}
          onChange={onDate}
        />
        <div className="min-w-0">
          <label htmlFor={timeId} className="sr-only">
            {`Horário de ${label.toLowerCase()}`}
          </label>
          <input
            id={timeId}
            type="time"
            disabled={disabled}
            step={60}
            value={clockInputValue(time)}
            onChange={event => onTime(event.target.value || null)}
            className="input h-11 w-full disabled:opacity-60"
          />
        </div>
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
  onAddToBlock,
}: ContentManageWorkspaceProps) {
  const {state, ensureDataDomains} = useAppContext();
  const navigate = useNavigate();
  const pilarEfetivoId = pilarDoConteudo(draft, series);
  const linkedPilar = pilarEfetivoId ? pilares.find(item => item.id === pilarEfetivoId) ?? null : null;
  const linkedSerie = draft.seriesId ? series.find(item => item.id === draft.seriesId) ?? null : null;
  const tipoLinked = linkedSerie ? tipoDaSerie(linkedSerie.id, series) : null;
  const seriePrincipal = tipoLinked === 'quadro' && linkedSerie?.parentId
    ? series.find(item => item.id === linkedSerie.parentId) ?? linkedSerie
    : linkedSerie;
  const quadrosDaSerie = seriePrincipal
    ? filhosDaSerie(seriePrincipal.id, series)
        .map(no => series.find(item => item.id === no.id))
        .filter((item): item is Serie => Boolean(item && tipoDaSerie(item.id, series) === 'quadro'))
    : [];
  const seriesPrincipais = series.filter(item => {
    const t = tipoDaSerie(item.id, series);
    return t === 'serie' || item.id === seriePrincipal?.id;
  });
  const temporadas = state.temporadas ?? [];
  const escopo = draft.seriesId ? escopoTemporadas(draft.seriesId, series) : null;
  const temporadasDisponiveis = escopo ? temporadasDoEscopo(escopo.id, temporadas) : [];
  const temporadaFora = Boolean(draft.temporadaId && (
    !draft.seriesId || !temporadaNoEscopo(draft.temporadaId, draft.seriesId, series, temporadas)
  ));
  const temQuadros = Boolean(seriePrincipal && quadrosDaSerie.length > 0);
  const publishDateOnly = draft.publishDate ? draft.publishDate.slice(0, 10) : '';
  const currentStatus = normalizeContentStatus(draft.status);
  const pilarExibidoId = pilarDoConteudo(draft, series);
  const etapas = getStatusOptions(draft.status);
  const [seriePendenteId, setSeriePendenteId] = useState<string | null | undefined>(undefined);

  const aplicarSerie = (serieId: string | null) => {
    const manterTemporada = Boolean(
      draft.temporadaId && serieId && temporadaNoEscopo(draft.temporadaId, serieId, series, temporadas),
    );
    onChange({
      ...aplicarEscolhasDaSerie(draft, series.find(item => item.id === serieId) ?? null, series),
      seriesId: serieId,
      temporadaId: manterTemporada ? draft.temporadaId : null,
    });
  };

  // Publicado trava o resto da gestão. Série, quadro e pilar continuam editáveis.
  const pedirTrocaSerie = (serieId: string | null) => {
    if (serieId === (seriePrincipal?.id ?? null)) return;
    if (draft.seriesId) {
      setSeriePendenteId(serieId);
      return;
    }
    aplicarSerie(serieId);
  };

  useEffect(() => {
    void ensureDataDomains(['library', 'production', 'recording']);
  }, [ensureDataDomains]);

  const bloco = contentId ? getContentBlockSummary(contentId, state.recordingBlocks) : null;
  const carrossel = draft.writingMode === 'carrossel';
  const emProducao = currentStatus === CONTENT_STATUS.PRODUCAO;

  const mudarEtapa = (status: string) => {
    onChange({status});
    if (
      status === CONTENT_STATUS.PRODUCAO
      && currentStatus !== CONTENT_STATUS.PRODUCAO
      && !carrossel
      && !bloco
    ) {
      onAddToBlock?.();
    }
  };

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
      <Text variant="sectionTitle" as="h2" className="sr-only">Gestão do roteiro</Text>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
        <PlatformCopyEditor
          embedded
          plataformas={draft.plataformas}
          pilar={linkedPilar}
          serie={linkedSerie}
          disabled={disabled}
          contentId={contentId}
          status={draft.status}
          formatoVisual={draft.formatoVisual}
          writingMode={draft.writingMode}
          legendaBase={draft.legendaBase}
          titulo={draft.title}
          onTituloChange={title => onChange({title})}
          onChange={plataformas => onChange({plataformas})}
        />

        <Surface variant="outlined" padding="lg" className="bg-[var(--bg-elevated)]">
          <Text variant="sectionTitle" as="h3">Organização</Text>
          <div className="mt-4 stack-md">
            <label className="block">
              <FieldLabel>Etapa</FieldLabel>
              <ManageSelect
                ariaLabel="Etapa"
                disabled={disabled}
                value={currentStatus}
                onChange={mudarEtapa}
              >
                {/* Todas as etapas, na ordem. Dá para pular ou voltar. */}
                {etapas.map(etapa => (
                  <option key={etapa.status} value={etapa.status} disabled={!etapa.disponivel}>
                    {etapa.atual ? `${etapa.status} (atual)` : etapa.status}
                  </option>
                ))}
              </ManageSelect>
            </label>

            <div className="border-t border-[var(--border-color)]" aria-hidden />

            <label className="block">
              <FieldLabel>Série</FieldLabel>
              <ManageSelect
                ariaLabel="Série"
                value={seriePrincipal?.id ?? ''}
                onChange={value => pedirTrocaSerie(value || null)}
              >
                <option value="">Sem série</option>
                {seriesPrincipais.map(item => (
                  <option key={item.id} value={item.id}>
                    {caminhoDaSerie(item.id, series).map(node => node.name).join(' · ')}
                  </option>
                ))}
              </ManageSelect>
            </label>

            <div className={cn(temQuadros ? 'grid gap-3 sm:grid-cols-2' : 'block')}>
              {temQuadros && seriePrincipal ? (
                <label className="block min-w-0">
                  <FieldLabel>Quadro</FieldLabel>
                  <ManageSelect
                    ariaLabel="Quadro"
                    value={tipoLinked === 'quadro' && linkedSerie ? linkedSerie.id : ''}
                    onChange={quadroId => aplicarSerie(quadroId || seriePrincipal.id)}
                  >
                    <option value="">Sem quadro</option>
                    {quadrosDaSerie.map(quadro => (
                      <option key={quadro.id} value={quadro.id}>{quadro.name}</option>
                    ))}
                  </ManageSelect>
                </label>
              ) : null}

              <div className="block min-w-0">
                <label className="block">
                  <FieldLabel>Temporada</FieldLabel>
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
                </label>
                {linkedSerie && (!escopo || temporadasDisponiveis.length === 0) && !disabled ? (
                  <AppButton
                    variant="ghost"
                    size="xs"
                    className="mt-1"
                    onClick={() => navigate(`/series/${escopo?.id ?? linkedSerie.id}?nova=temporada`)}
                  >
                    Criar temporada
                  </AppButton>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block min-w-0">
                <FieldLabel>Pilar</FieldLabel>
                <ManageSelect
                  ariaLabel="Pilar"
                  value={pilarExibidoId ?? ''}
                  onChange={value => onChange(marcarEscolhaManual(draft, 'pilar', value || null))}
                >
                  <option value="">Sem pilar</option>
                  {pilares
                    .filter(item => item.ativo || item.id === pilarExibidoId)
                    .map(item => (
                      <option key={item.id} value={item.id}>{item.nome}</option>
                    ))}
                </ManageSelect>
              </label>
              <div className="min-w-0">
                <FuncaoEditorialFields
                  draft={draft}
                  serie={linkedSerie}
                  onChange={onChange}
                  variant="form"
                  formPart="funcao"
                  formLabel={<FieldLabel>Objetivo</FieldLabel>}
                />
              </div>
            </div>

            <div>
              <FieldLabel>Temas</FieldLabel>
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
          <Text variant="sectionTitle" as="h3">Datas</Text>
          {emProducao && !carrossel ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div className="min-w-0">
                <Text variant="bodyStrong" as="p">Bloco de gravação</Text>
                <Text variant="meta" as="p" className="mt-1 text-[var(--text-secondary)]">
                  {bloco
                    ? `No bloco ${bloco.block.name}`
                    : 'Este roteiro ainda não está em um bloco.'}
                </Text>
              </div>
              {!bloco && onAddToBlock ? (
                <AppButton
                  type="button"
                  variant="secondary"
                  disabled={disabled}
                  leftIcon={<Clapperboard className="h-4 w-4" />}
                  onClick={onAddToBlock}
                >
                  Adicionar a um bloco
                </AppButton>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-6">
            <ScheduleMoment
              idPrefix={`gravacao-${contentId || 'novo'}`}
              label="Gravação"
              date={draft.recordingDate ? draft.recordingDate.slice(0, 10) : null}
              time={draft.recordingTime}
              disabled={disabled}
              onDate={date => onChange({recordingDate: toIsoDate(date)})}
              onTime={recordingTime => onChange({recordingTime})}
            />
            <span className="hidden w-px bg-[var(--border-color)] xl:block" aria-hidden />
            <ScheduleMoment
              idPrefix={`publicacao-${contentId || 'novo'}`}
              label="Publicação"
              date={publishDateOnly || null}
              time={draft.publishTime}
              disabled={disabled}
              onDate={date => onChange({publishDate: toIsoDate(date)})}
              onTime={publishTime => onChange({publishTime})}
            />
          </div>
        </Surface>

        <Surface variant="outlined" padding="lg" className="bg-[var(--bg-elevated)]">
          <Text variant="sectionTitle" as="h3">Mídias citadas</Text>
          <div className="mt-3">
            <LivroMultiSelect
              livroIds={draft.livroIds}
              bibliotecaItemId={draft.bibliotecaItemId}
              bibliotecaItems={state.bibliotecaItems}
              onChange={onChange}
              selectProps={{
                hideLabel: true,
                searchable: true,
                placeholder: 'Buscar na biblioteca…',
                leadingIcon: <Search className="h-4 w-4" />,
                controlClassName: 'min-h-11',
              }}
            />
          </div>
        </Surface>
      </div>
    </div>
  );
}
