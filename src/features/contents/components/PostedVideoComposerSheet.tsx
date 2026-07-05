import {useMemo, useState} from 'react';
import {format} from 'date-fns';
import {ptBR} from 'date-fns/locale';
import {Send, X} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import type {Content, Platform, PublicationKind} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {generateUUID} from '../../../utils/uuid';
import {getPlatformColor} from '../../programacao/lib/programacao';
import {PostingTimeSuggestions} from '../../settings/components/PostingTimeSuggestions';
import type {PostingTimesSettings} from '../../settings/lib/postingTimes';
import {CONTENT_STATUS} from '../lib/contentPipeline';
import {createContentDraft} from '../lib/createContentDraft';

export interface PostedPlatformEntry {
  platformId: string;
  publicationKind: PublicationKind;
}

interface PostedVideoComposerSheetProps {
  /** yyyy-MM-dd — pré-preenche a data quando o usuário clica em um dia da grade */
  initialDate?: string;
  /** Quando informado, abre em modo edição */
  initialContent?: Content | null;
  platforms: Platform[];
  postingTimes: PostingTimesSettings;
  onSave: (content: Content, options?: {keepOpen?: boolean}) => void | Promise<void>;
  onClose: () => void;
}

function resolvePlatformId(platformRef: string, platforms: Platform[]): string {
  const byId = platforms.find(platform => platform.id === platformRef);
  if (byId) return byId.id;
  const byName = platforms.find(platform => platform.nome === platformRef);
  return byName?.id ?? platformRef;
}

function platformLabel(platformId: string, platforms: Platform[]): string {
  return platforms.find(platform => platform.id === platformId)?.nome ?? platformId;
}

function normalizeDateInput(value: string | null | undefined): string {
  if (!value) return format(new Date(), 'yyyy-MM-dd');
  return value.slice(0, 10);
}

function normalizeTimeInput(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}

function buildInitialPlatformEntries(content: Content | null | undefined, platforms: Platform[]): PostedPlatformEntry[] {
  if (!content?.plataformas.length) return [];
  return content.plataformas.map(plataforma => ({
    platformId: resolvePlatformId(plataforma.platformId, platforms),
    publicationKind: plataforma.publicationKind === 'repost' ? 'repost' : 'post',
  }));
}

export function buildPostedVideoContent(params: {
  title: string;
  date: string;
  time: string | null;
  caption: string;
  platformEntries: PostedPlatformEntry[];
  existingContent?: Content | null;
  notes?: string;
}): Content {
  const contentId = params.existingContent?.id ?? generateUUID();
  const now = new Date().toISOString();

  const plataformas = params.platformEntries.map(entry => {
    const existing = params.existingContent?.plataformas.find(
      plataforma => plataforma.platformId === entry.platformId,
    );

    return {
      id: existing?.id ?? generateUUID(),
      contentId,
      platformId: entry.platformId,
      legenda: params.caption.trim(),
      hashtags: existing?.hashtags ?? '',
      publishDate: params.date,
      publishTime: params.time || null,
      publishDateEnabled: true,
      publicationKind: entry.publicationKind,
    };
  });

  return createContentDraft({
    ...(params.existingContent ?? {}),
    id: contentId,
    title: params.title.trim(),
    status: CONTENT_STATUS.POSTADO,
    formatoVisual: params.existingContent?.formatoVisual ?? 'Video',
    publishDate: params.date,
    publishTime: params.time || null,
    publishDateEnabled: true,
    notes: params.notes ?? params.existingContent?.notes ?? 'Registrado como vídeo já postado.',
    createdAt: params.existingContent?.createdAt ?? now,
    updatedAt: now,
    plataformas,
  });
}

export function PostedVideoComposerSheet({
  initialDate,
  initialContent,
  platforms,
  postingTimes,
  onSave,
  onClose,
}: PostedVideoComposerSheetProps) {
  const activePlatforms = platforms.filter(platform => platform.ativo);
  const isEditing = Boolean(initialContent);

  const [title, setTitle] = useState(initialContent?.title ?? '');
  const [date, setDate] = useState(
    normalizeDateInput(initialContent?.publishDate ?? initialDate ?? format(new Date(), 'yyyy-MM-dd')),
  );
  const [time, setTime] = useState(normalizeTimeInput(initialContent?.publishTime));
  const [caption, setCaption] = useState(initialContent?.plataformas[0]?.legenda ?? '');
  const [platformEntries, setPlatformEntries] = useState<PostedPlatformEntry[]>(() => {
    const fromContent = buildInitialPlatformEntries(initialContent, activePlatforms);
    if (fromContent.length > 0) return fromContent;
    const first = activePlatforms[0];
    return first ? [{platformId: first.id, publicationKind: 'post'}] : [];
  });
  const [isSaving, setIsSaving] = useState(false);

  const selectedIds = useMemo(() => new Set(platformEntries.map(entry => entry.platformId)), [platformEntries]);
  const canSave = Boolean(title.trim() && date && platformEntries.length > 0);

  const togglePlatform = (platformId: string) => {
    setPlatformEntries(current => {
      if (current.some(entry => entry.platformId === platformId)) {
        return current.filter(entry => entry.platformId !== platformId);
      }
      return [...current, {platformId, publicationKind: 'post'}];
    });
  };

  const setPublicationKind = (platformId: string, publicationKind: PublicationKind) => {
    setPlatformEntries(current =>
      current.map(entry => (entry.platformId === platformId ? {...entry, publicationKind} : entry)),
    );
  };

  const resetForAnother = () => {
    setTitle('');
    setCaption('');
    setTime('');
    const first = activePlatforms[0];
    setPlatformEntries(first ? [{platformId: first.id, publicationKind: 'post'}] : []);
  };

  const handleSave = async (keepOpen: boolean) => {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(
        buildPostedVideoContent({
          title,
          date,
          time: time || null,
          caption,
          platformEntries,
          existingContent: initialContent,
        }),
        {keepOpen: !isEditing && keepOpen},
      );
      if (!isEditing && keepOpen) {
        resetForAnother();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="stack-lg p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            {isEditing ? 'Editar registro postado' : 'Vídeo já postado'}
          </p>
          {initialDate && !isEditing ? (
            <p className="mt-1 text-base font-semibold capitalize text-[var(--text-primary)]">
              {format(new Date(`${initialDate}T12:00:00`), "EEEE, d 'de' MMMM", {locale: ptBR})}
            </p>
          ) : (
            <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
              {isEditing ? initialContent?.title : 'Registro de publicação'}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-md text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-[var(--text-tertiary)]">
        Registre em uma ou mais redes e marque se foi postagem original ou repostagem.
      </p>

      <div>
        <label className="text-sm font-medium text-[var(--text-secondary)]">Título do vídeo</label>
        <input
          autoFocus
          type="text"
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Ex: 3 sinais de que..."
          className="mt-2 min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue)]"
          onKeyDown={event => {
            if (event.key === 'Enter' && canSave && !isSaving) void handleSave(false);
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)]">Data postada</label>
          <input
            type="date"
            value={date}
            onChange={event => setDate(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--text-secondary)]">Hora</label>
          <input
            type="time"
            value={time}
            onChange={event => setTime(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
          />
          <PostingTimeSuggestions
            date={date}
            selectedTime={time}
            postingTimes={postingTimes}
            onSelect={setTime}
            className="mt-2"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-[var(--text-secondary)]">Redes publicadas</label>
        {activePlatforms.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-tertiary)]">Cadastre uma rede em Configurações → Plataformas.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activePlatforms.map(platform => {
              const selected = selectedIds.has(platform.id);
              const color = getPlatformColor(platform.nome);
              return (
                <button
                  key={platform.id}
                  type="button"
                  onClick={() => togglePlatform(platform.id)}
                  className={cn(
                    'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors',
                    selected ? color.chip : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]',
                  )}
                >
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full text-2xs font-bold text-white"
                    style={{backgroundColor: color.dot}}
                  >
                    {platform.nome.slice(0, 1).toUpperCase()}
                  </span>
                  {platform.nome}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {platformEntries.length > 0 ? (
        <div className="stack-sm">
          <label className="text-sm font-medium text-[var(--text-secondary)]">Tipo por rede</label>
          {platformEntries.map(entry => (
            <div
              key={entry.platformId}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2"
            >
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {platformLabel(entry.platformId, activePlatforms)}
              </span>
              <select
                value={entry.publicationKind}
                onChange={event => setPublicationKind(entry.platformId, event.target.value as PublicationKind)}
                className="min-h-9 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)]"
              >
                <option value="post">Postada</option>
                <option value="repost">Repostada</option>
              </select>
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <label className="text-sm font-medium text-[var(--text-secondary)]">Legenda publicada (opcional)</label>
        <textarea
          value={caption}
          onChange={event => setCaption(event.target.value)}
          rows={4}
          placeholder="Cole aqui a legenda que foi publicada..."
          className="mt-2 w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium leading-relaxed text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-blue)]"
        />
      </div>

      <div className={cn('grid gap-2', isEditing ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
        <AppButton
          variant="primary"
          fullWidth
          disabled={!canSave || isSaving}
          leftIcon={<Send className="h-4 w-4" />}
          onClick={() => void handleSave(false)}
        >
          {isSaving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Registrar postagem'}
        </AppButton>
        {!isEditing ? (
          <AppButton
            variant="secondary"
            fullWidth
            disabled={!canSave || isSaving}
            leftIcon={<Send className="h-4 w-4" />}
            onClick={() => void handleSave(true)}
          >
            Registrar e adicionar outro
          </AppButton>
        ) : null}
      </div>
    </div>
  );
}
