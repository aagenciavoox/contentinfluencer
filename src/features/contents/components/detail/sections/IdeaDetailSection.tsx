import {ArrowRight, BookOpen, Layers, Palette} from 'lucide-react';
import {RichTextEditor} from '../../../../../components/editors/RichTextEditor';
import {AppButton} from '../../../../../components/ui/AppButton';
import {Skeleton} from '../../../../../components/ui/Skeleton';
import {Surface} from '../../../../../components/ui/Surface';
import {Text} from '../../../../../components/ui/Text';
import type {BibliotecaItem, Pilar, Serie} from '../../../../../lib/database';
import {useAppContext} from '../../../../../context/AppContext';
import {DestinationChips} from '../../../../editorial/components/DestinationChips';
import {DraftSaveBar} from '../DraftSaveBar';
import type {ScriptDraft} from './RoteiroSection';

type IdeaDraft = Pick<
  ScriptDraft,
  'title' | 'notes' | 'scriptNotes' | 'pilarId' | 'seriesId' | 'bibliotecaItemId' | 'plataformas'
>;

interface IdeaOrganizationPanelProps {
  draft: IdeaDraft;
  series: Serie[];
  pilares: Pilar[];
  bibliotecaItems: BibliotecaItem[];
  contentId: string;
  onChange: (updates: Partial<ScriptDraft>) => void;
}

const selectClassName =
  'min-h-10 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-blue)]';

export function IdeaOrganizationPanel({
  draft,
  series,
  pilares,
  bibliotecaItems,
  contentId,
  onChange,
}: IdeaOrganizationPanelProps) {
  const {state} = useAppContext();
  const plataformasAtivas = state.platforms
    .filter(platform => platform.ativo)
    .map(platform => ({id: platform.id, nome: platform.nome}));
  return (
    <Surface variant="outlined" padding="md" className="grid gap-4 md:grid-cols-3">
      <div className="stack-sm md:col-span-3">
        <Text variant="sectionTitle">Organização</Text>
        <Text variant="secondary">
          Só o essencial enquanto a ideia ainda está tomando forma.
        </Text>
      </div>

      <label className="stack-sm">
        <Text variant="label" as="span" className="inline-flex items-center gap-2">
          <Palette className="h-3.5 w-3.5" aria-hidden />
          Pilar
        </Text>
        <select
          value={draft.pilarId ?? ''}
          onChange={event => onChange({pilarId: event.target.value || null})}
          className={selectClassName}
        >
          <option value="">Sem pilar</option>
          {pilares.filter(pilar => pilar.ativo).map(pilar => (
            <option key={pilar.id} value={pilar.id}>{pilar.nome}</option>
          ))}
        </select>
      </label>

      <label className="stack-sm">
        <Text variant="label" as="span" className="inline-flex items-center gap-2">
          <Layers className="h-3.5 w-3.5" aria-hidden />
          Série
        </Text>
        <select
          value={draft.seriesId ?? ''}
          onChange={event => onChange({seriesId: event.target.value || null})}
          className={selectClassName}
        >
          <option value="">Sem série</option>
          {series.map(serie => (
            <option key={serie.id} value={serie.id}>{serie.name}</option>
          ))}
        </select>
      </label>

      <label className="stack-sm">
        <Text variant="label" as="span" className="inline-flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5" aria-hidden />
          Origem
        </Text>
        <select
          value={draft.bibliotecaItemId ?? ''}
          onChange={event => onChange({bibliotecaItemId: event.target.value || null})}
          className={selectClassName}
        >
          <option value="">Sem origem</option>
          {bibliotecaItems.filter(item => !item.deletedAt).map(item => (
            <option key={item.id} value={item.id}>{item.titulo}</option>
          ))}
        </select>
      </label>
      <div className="md:col-span-3">
        <DestinationChips
          platforms={plataformasAtivas}
          publications={draft.plataformas}
          contentId={contentId}
          onChange={plataformas => onChange({plataformas})}
        />
      </div>
    </Surface>
  );
}

interface IdeaDetailSectionProps extends IdeaOrganizationPanelProps {
  bodyLoading?: boolean;
  bodyError?: string | null;
  onRetryBody?: () => void;
  mobile?: boolean;
  isSaving?: boolean;
  onPromote: () => void;
  authorName: string;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
}

export function IdeaDetailSection({
  draft,
  series,
  pilares,
  bibliotecaItems,
  contentId,
  onChange,
  bodyLoading = false,
  bodyError = null,
  onRetryBody,
  mobile = false,
  isSaving = false,
  onPromote,
  authorName,
  saveState = 'idle',
  onSave,
  hasUnsavedChanges = false,
}: IdeaDetailSectionProps) {
  const annotationHandlers = {
    onAddAnnotation: (text: string, selection: {from: number; to: number}, comment: string) =>
      onChange({
        scriptNotes: [
          ...(draft.scriptNotes || []),
          {
            id: Math.random().toString(36).slice(2, 11),
            text,
            selection,
            comment,
            color: 'color-mix(in srgb, var(--warning), transparent 50%)',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    onRemoveAnnotation: (id: string) =>
      onChange({scriptNotes: (draft.scriptNotes || []).filter(note => note.id !== id)}),
    onUpdateAnnotation: (id: string, comment: string, color?: string) =>
      onChange({
        scriptNotes: (draft.scriptNotes || []).map(note =>
          note.id === id ? {...note, comment, color} : note
        ),
      }),
  };

  const editor = (
    <Surface
      as="section"
      variant="outlined"
      padding="none"
      className="flex min-h-[640px] flex-col overflow-visible"
    >
      <div className="stack-sm border-b border-[var(--border-color)] px-4 py-4 md:px-6">
        <Text variant="sectionTitle">Texto da ideia</Text>
        <Text variant="secondary">
          Desenvolva o argumento, guarde exemplos e rascunhe o caminho que o roteiro pode seguir.
        </Text>
      </div>

      {bodyLoading ? (
        <div className="stack-sm flex-1 p-4 md:p-6" aria-busy="true" aria-label="Carregando ideia">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ) : bodyError ? (
        <div className="stack-md flex-1 items-center justify-center p-6 text-center">
          <Text variant="sectionTitle">Não foi possível carregar a ideia</Text>
          <Text variant="secondary">{bodyError}</Text>
          {onRetryBody ? (
            <AppButton type="button" variant="secondary" size="sm" onClick={onRetryBody}>
              Tentar novamente
            </AppButton>
          ) : null}
        </div>
      ) : (
        <RichTextEditor
          variant="workspace"
          content={draft.notes ?? ''}
          onChange={html => onChange({notes: html})}
          placeholder="Escreva livremente. Este texto irá junto quando a ideia virar roteiro."
          documentTitle={draft.title?.trim() || 'Nova ideia'}
          authorName={authorName}
          annotations={draft.scriptNotes || []}
          saveState={saveState}
          saveAction={
            onSave ? (
              <DraftSaveBar
                onSave={onSave}
                saveState={saveState}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            ) : null
          }
          editorCanvasClassName="min-h-[500px]"
          editorViewportClassName="overflow-visible"
          className="min-h-[560px] rounded-none border-0"
          compactMobileComposer={mobile}
          {...annotationHandlers}
        />
      )}
    </Surface>
  );

  if (mobile) {
    return (
      <div className="stack-md">
        <Text variant="pageTitle" as="div">
          <input
            value={draft.title === 'Ideia sem título' ? '' : draft.title}
            onChange={event => onChange({title: event.target.value})}
            className="w-full border-0 bg-transparent py-1 font-[inherit] leading-[inherit] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            placeholder="Título da ideia"
            aria-label="Título da ideia"
          />
        </Text>
        {editor}
        <IdeaOrganizationPanel
          draft={draft}
          series={series}
          pilares={pilares}
          bibliotecaItems={bibliotecaItems}
          contentId={contentId}
          onChange={onChange}
        />
        <AppButton
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          rightIcon={<ArrowRight className="h-4 w-4" />}
          disabled={isSaving}
          onClick={onPromote}
        >
          {isSaving ? 'Transformando…' : 'Transformar em roteiro'}
        </AppButton>
      </div>
    );
  }

  return (
    <div className="stack-md">
      {editor}
      <IdeaOrganizationPanel
        draft={draft}
        series={series}
        pilares={pilares}
        bibliotecaItems={bibliotecaItems}
        contentId={contentId}
        onChange={onChange}
      />
    </div>
  );
}
