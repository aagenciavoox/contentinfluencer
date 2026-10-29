import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, Eraser } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { FilterChips } from '../../../../components/ui/FilterChips';
import { Text } from '../../../../components/ui/Text';
import { DEFAULT_PLATFORMS } from '../../../../constants';
import { useAppContext } from '../../../../context/AppContext';
import { DestinationChips } from '../../../editorial/components/DestinationChips';
import { LegendaBaseField } from '../../../editorial/components/legendas/LegendaBaseField';
import { PublicacaoLegenda } from '../../../editorial/components/legendas/PublicacaoLegenda';
import { definirLegendaCompartilhada } from '../../../editorial/lib/captions';
import { destinosPadraoAtivos, publicacoesDosDestinos, type DestinoPlataforma } from '../../../editorial/lib/destinations';
import { pilarPrincipalDaSerie } from '../../../editorial/lib/pilarDaSerie';
import type { Content, ContentPlataforma, Pilar, Serie } from '../../../../lib/database';
import { htmlToReadableText } from '../../../../lib/utils';
import { generateUUID } from '../../../../utils/uuid';
import { createContentDraft } from '../../../contents/lib/createContentDraft';
import { CONTENT_STATUS } from '../../../contents/lib/contentPipeline';
import { ERRORS } from '../../../../lib/uiCopy';

interface SeriesCreateContentFormProps {
  serie: Serie;
  pilares: Pilar[];
  platformNames: string[];
  mode: 'roteiro' | 'ideia';
  variant?: 'compact' | 'default';
  hideInlineSave?: boolean;
  onCreate: (contents: Content[]) => Promise<void>;
  onSuccess?: (contentId: string, action: 'draft' | 'open') => void;
}

export type SeriesCreateContentFormHandle = {
  saveDraft: () => Promise<void>;
  saveAndOpen: () => Promise<void>;
};

function wordCount(value: string) {
  return htmlToReadableText(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildPlatformRecord(contentId: string, platformId: string, caption: string): ContentPlataforma {
  return {
    id: generateUUID(),
    contentId,
    platformId,
    legenda: caption.trim(),
    hashtags: '',
    publishDate: null,
    publishTime: null,
    publishDateEnabled: false,
    status: 'prevista',
    realizadaManualEm: null,
    realizadaApiEm: null,
    postCodigo: null,
    postUrl: null,
    legendaPropria: false,
    contaNaGrade: true,
  };
}

export const SeriesCreateContentForm = forwardRef<
  SeriesCreateContentFormHandle,
  SeriesCreateContentFormProps
>(function SeriesCreateContentForm(
  {
    serie,
    pilares,
    platformNames,
    mode,
    variant: _variant = 'default',
    hideInlineSave = false,
    onCreate,
    onSuccess,
  },
  ref,
) {
  const { state } = useAppContext();
  const isIdeia = mode === 'ideia';
  const catalogo = useMemo<DestinoPlataforma[]>(() => {
    const ativas = state.platforms
      .filter(platform => platform.ativo)
      .map(platform => ({ id: platform.id, nome: platform.nome }));
    if (ativas.length > 0) return ativas;
    const nomes = platformNames.length > 0 ? platformNames : DEFAULT_PLATFORMS;
    return nomes.map(nome => ({ id: nome, nome }));
  }, [platformNames, state.platforms]);
  const defaultPilarId = pilarPrincipalDaSerie(serie) || '';
  const formatosDaSerie = serie.formatoVisualPadrao ?? [];
  const [formato, setFormato] = useState(formatosDaSerie[0] ?? '');

  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [publicacoes, setPublicacoes] = useState<ContentPlataforma[]>([]);
  const [legendaBase, setLegendaBase] = useState(serie.legendaBase ?? '');
  const [destinosTouched, setDestinosTouched] = useState(false);
  const [includePublish, setIncludePublish] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const openAfterSaveRef = useRef(false);

  const words = useMemo(() => wordCount(script), [script]);
  const canSave = Boolean(title.trim() && (isIdeia || htmlToReadableText(script).trim()));

  useEffect(() => {
    if (destinosTouched) return;
    const destinos = destinosPadraoAtivos(
      state.editorial.destinosPadrao,
      catalogo,
    );
    setPublicacoes(publicacoesDosDestinos({ destinos, contentId: '' }));
  }, [catalogo, destinosTouched, state.preferences]);

  useEffect(() => {
    const textarea = scriptTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [script]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Preencha o título.');
      return null;
    }
    const scriptText = htmlToReadableText(script).trim();
    if (!isIdeia && !scriptText) {
      setError('Preencha o texto do roteiro.');
      return null;
    }

    setError(null);

    try {
      const contentId = generateUUID();
      const plataformas = publicacoes.map(plataforma => ({
        ...plataforma,
        contentId,
        publishDate: includePublish && publishDate ? publishDate : null,
        publishTime: includePublish && publishTime ? publishTime : null,
        publishDateEnabled: includePublish && Boolean(publishDate),
      }));

      const content = createContentDraft({
        id: contentId,
        title: title.trim(),
        status: isIdeia ? CONTENT_STATUS.IDEIA : CONTENT_STATUS.ROTEIRO,
        seriesId: serie.id,
        pilarId: defaultPilarId || null,
        formatoVisual: formato || null,
        energiaNecessaria: serie.energiaPadrao,
        slotType: serie.slotPadrao as Content['slotType'],
        script: isIdeia ? null : script,
        notes: isIdeia && scriptText ? scriptText : null,
        publishDate: includePublish && publishDate ? publishDate : null,
        publishTime: includePublish && publishTime ? publishTime : null,
        plataformas,
        legendaBase: legendaBase.trim() || null,
      }, serie);

      const action = openAfterSaveRef.current ? 'open' : 'draft';
      openAfterSaveRef.current = false;
      if (action === 'open') onSuccess?.(contentId, action);
      void onCreate([content]).catch(err => {
        console.error('[SeriesCreateContentForm] create failed:', err);
        setError(ERRORS.criarRoteiro);
      });
      setTitle('');
      setScript('');
      setLegendaBase(serie.legendaBase ?? '');
      setDestinosTouched(false);
      setIncludePublish(false);
      setPublishDate('');
      setPublishTime('');
      titleInputRef.current?.focus();
      return contentId;
    } catch (err) {
      console.error('[SeriesCreateContentForm] create failed:', err);
      setError(ERRORS.criarRoteiro);
      return null;
    } finally {
      openAfterSaveRef.current = false;
    }
  };

  const saveDraft = async () => {
    openAfterSaveRef.current = false;
    await handleSave();
  };

  const saveAndOpen = async () => {
    openAfterSaveRef.current = true;
    await handleSave();
  };

  useImperativeHandle(ref, () => ({ saveDraft, saveAndOpen }));

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (canSave) void saveDraft();
    }
  };

  const fieldClass =
    'w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]';

  return (
    <div className="flex flex-col gap-[var(--space-xl)]" onKeyDown={handleKeyDown}>
      {error ? (
        <p className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--danger)_30%,var(--border-color))] bg-[color-mix(in_srgb,var(--danger)_10%,var(--bg-elevated))] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
          {error}
        </p>
      ) : null}

      <section className="stack-md">
        <Text variant="label" className="text-[var(--text-tertiary)]">
          Informações básicas
        </Text>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Título</span>
          <input
            ref={titleInputRef}
            value={title}
            onChange={event => {
              setTitle(event.target.value);
              setError(null);
            }}
            placeholder={isIdeia ? 'Título da ideia…' : 'Título do roteiro…'}
            className={fieldClass}
          />
        </label>
      </section>

      {formatosDaSerie.length > 1 ? (
        <section className="stack-md">
          <Text variant="label" className="text-[var(--text-tertiary)]">
            Formato de publicação
          </Text>
          <FilterChips
            value={formato}
            onChange={setFormato}
            options={formatosDaSerie.map(item => ({ id: item, label: item }))}
            ariaLabel="Formato de publicação deste roteiro"
          />
        </section>
      ) : null}

      <section className="stack-md">
        <Text variant="label" className="text-[var(--text-tertiary)]">
          {isIdeia ? 'Descrição da ideia' : 'Texto do roteiro'}
        </Text>
        <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--text-tertiary)]">
              {words} palavras
            </span>
            {script ? (
              <button
                type="button"
                onClick={() => {
                  setScript('');
                  setError(null);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                aria-label={isIdeia ? 'Limpar descrição' : 'Limpar roteiro'}
              >
                <Eraser className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <textarea
            id="series-create-script"
            ref={scriptTextareaRef}
            value={script}
            onChange={event => {
              setScript(event.target.value);
              setError(null);
            }}
            placeholder={isIdeia ? 'Descreva a ideia, referências ou ângulo…' : 'Escreva ou cole o roteiro…'}
            rows={1}
            spellCheck
            className="block w-full min-h-[2.75rem] resize-none overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-input)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)]"
          />
        </div>
      </section>

      <section className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
        <DestinationChips
          platforms={catalogo}
          publications={publicacoes}
          contentId=""
          onChange={next => {
            setDestinosTouched(true);
            setPublicacoes(anteriores => next.map(item => {
              const ja = anteriores.find(atual => atual.id === item.id);
              if (ja) return { ...item, legenda: ja.legenda, legendaPropria: ja.legendaPropria, hashtags: ja.hashtags };
              const versao = serie.plataformas.find(plataforma => plataforma.platformId === item.platformId)?.legenda?.trim();
              if (versao) return { ...item, legenda: versao, legendaPropria: true };
              return { ...item, legenda: legendaBase, legendaPropria: false };
            }));
          }}
        />
        <LegendaBaseField
          id="series-create-legenda-base"
          label="Legenda-base deste roteiro"
          compact
          value={legendaBase}
          descricao="Começa pela legenda da série. Mudar aqui vale só para este roteiro."
          onChange={texto => {
            const resultado = definirLegendaCompartilhada({
              legendaBaseAtual: legendaBase,
              novoTexto: texto,
              publicacoes,
            });
            setLegendaBase(resultado.legendaBase);
            setPublicacoes(resultado.publicacoes);
          }}
        />
        {publicacoes.map(plataforma => (
          <PublicacaoLegenda
            key={plataforma.id}
            publicacao={plataforma}
            conteudo={{ legendaBase, plataformas: publicacoes, status: CONTENT_STATUS.ROTEIRO }}
            contas={state.platforms}
            serie={serie}
            pilar={pilares.find(item => item.id === defaultPilarId) ?? null}
            editorial={state.editorial}
            compact
            onChange={setPublicacoes}
          />
        ))}
      </section>

      <section className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
        <Text variant="label" className="text-[var(--text-tertiary)]">
          Publicação (opcional)
        </Text>
        <label className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3">
          <span className="block text-sm font-semibold text-[var(--text-primary)]">
            Definir data e hora de publicação
          </span>
          <input
            type="checkbox"
            checked={includePublish}
            onChange={event => setIncludePublish(event.target.checked)}
            className="h-5 w-5"
          />
        </label>
        {includePublish ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Data</span>
              <input
                type="date"
                value={publishDate}
                onChange={event => setPublishDate(event.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Hora</span>
              <input
                type="time"
                value={publishTime}
                onChange={event => setPublishTime(event.target.value)}
                className={fieldClass}
              />
            </label>
          </div>
        ) : null}
      </section>

      {!hideInlineSave ? (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <AppButton
            variant="primary"
            onClick={() => void saveDraft()}
            disabled={!canSave}
            leftIcon={<Check className="h-4 w-4" />}
          >
            {isIdeia ? 'Salvar ideia' : 'Salvar roteiro'}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
});
