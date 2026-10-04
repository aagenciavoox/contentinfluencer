import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Check, Eraser, Sparkles } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { Text } from '../../../../components/ui/Text';
import { DEFAULT_PLATFORMS } from '../../../../constants';
import { useAppContext } from '../../../../context/AppContext';
import { DestinationChips } from '../../../editorial/components/DestinationChips';
import { destinosPadraoAtivos, publicacoesDosDestinos, type DestinoPlataforma } from '../../../editorial/lib/destinations';
import { getEditorialSettings } from '../../../editorial/lib/editorialSettings';
import type { Content, ContentPlataforma, Pilar, Serie } from '../../../../lib/database';
import { htmlToReadableText } from '../../../../lib/utils';
import { generateUUID } from '../../../../utils/uuid';
import { createContentDraft } from '../../../contents/lib/createContentDraft';
import { CONTENT_STATUS } from '../../../contents/lib/contentPipeline';
import { ERRORS, LOADING } from '../../../../lib/uiCopy';

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
    status: 'agendada',
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
    pilares: _pilares,
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
  const defaultPilarId = serie.pilarIds[0] || '';
  const defaultFormato = serie.formatoVisualPadrao || '';

  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [publicacoes, setPublicacoes] = useState<ContentPlataforma[]>([]);
  const [legendaBase, setLegendaBase] = useState('');
  const [adapted, setAdapted] = useState<Record<string, string>>({});
  const [destinosTouched, setDestinosTouched] = useState(false);
  const [includePublish, setIncludePublish] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const openAfterSaveRef = useRef(false);

  const words = useMemo(() => wordCount(script), [script]);
  const canSave = Boolean(title.trim() && (isIdeia || htmlToReadableText(script).trim())) && !isSaving;

  useEffect(() => {
    if (destinosTouched) return;
    const destinos = destinosPadraoAtivos(
      getEditorialSettings(state.preferences).destinosPadrao,
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

    setIsSaving(true);
    setError(null);

    try {
      const contentId = generateUUID();
      const plataformas = publicacoes.map(plataforma => {
        const propria = Object.prototype.hasOwnProperty.call(adapted, plataforma.platformId);
        return {
          ...plataforma,
          contentId,
          legenda: propria ? (adapted[plataforma.platformId] ?? '') : legendaBase.trim(),
          legendaPropria: propria,
          publishDate: includePublish && publishDate ? publishDate : null,
          publishTime: includePublish && publishTime ? publishTime : null,
          publishDateEnabled: includePublish && Boolean(publishDate),
        };
      });

      const content = createContentDraft({
        id: contentId,
        title: title.trim(),
        status: isIdeia ? CONTENT_STATUS.IDEIA : CONTENT_STATUS.ROTEIRO,
        seriesId: serie.id,
        pilarId: defaultPilarId || null,
        formatoVisual: defaultFormato || null,
        energiaNecessaria: serie.energiaPadrao,
        slotType: serie.slotPadrao as Content['slotType'],
        script: isIdeia ? null : script,
        notes: isIdeia && scriptText ? scriptText : null,
        publishDate: includePublish && publishDate ? publishDate : null,
        publishTime: includePublish && publishTime ? publishTime : null,
        plataformas,
        legendaBase: legendaBase.trim() || null,
      }, serie);

      await onCreate([content]);
      const action = openAfterSaveRef.current ? 'open' : 'draft';
      onSuccess?.(contentId, action);
      setTitle('');
      setScript('');
      setLegendaBase('');
      setAdapted({});
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
      setIsSaving(false);
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
        <p className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
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
            className="block w-full min-h-[2.75rem] resize-none overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm leading-7 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)]"
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
            setPublicacoes(next);
          }}
        />
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Legenda compartilhada</span>
          <textarea
            value={legendaBase}
            onChange={event => setLegendaBase(event.target.value)}
            placeholder="A mesma legenda vale para as redes marcadas, até adaptar uma delas."
            rows={4}
            className="min-h-[110px] w-full resize-y rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)]"
          />
        </label>
        {publicacoes.map(plataforma => {
          const destino = catalogo.find(item => item.id === plataforma.platformId || item.nome === plataforma.platformId);
          const nome = destino?.nome || plataforma.platformId;
          const propria = Object.prototype.hasOwnProperty.call(adapted, plataforma.platformId);
          return (
            <div key={plataforma.id} className="stack-sm">
              {propria ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Legenda para {nome}</span>
                  <textarea
                    value={adapted[plataforma.platformId] ?? ''}
                    onChange={event => setAdapted(current => ({ ...current, [plataforma.platformId]: event.target.value }))}
                    rows={3}
                    className="min-h-[88px] w-full resize-y rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)]"
                  />
                </label>
              ) : (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center self-start rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-xs font-semibold text-[var(--text-primary)]"
                  onClick={() => setAdapted(current => ({ ...current, [plataforma.platformId]: legendaBase }))}
                >
                  Adaptar para {nome}
                </button>
              )}
            </div>
          );
        })}
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
            leftIcon={isSaving ? <Sparkles className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          >
            {isSaving ? LOADING.salvandoAlteracoes : isIdeia ? 'Salvar ideia' : 'Salvar roteiro'}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
});
