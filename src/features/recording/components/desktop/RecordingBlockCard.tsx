import type {CSSProperties} from 'react';
import {
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronsRight,
  Info,
  ListPlus,
  Play,
  Plus,
  SkipForward,
} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {MoreMenu, type MoreMenuItem} from '../../../../components/ui/MoreMenu';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {dia} from '../../../../lib/dates';
import type {Content, RecordingBlock} from '../../../../lib/database';
import {cn, tintedTextColor} from '../../../../lib/utils';
import {
  getRecordingBlockProgress,
  isBlockContentComplete,
  resolveRecordingContextSummary,
} from '../../lib/recordingWorkflow';

export type RecordingBlockVisualState = 'empty' | 'pending' | 'recording' | 'completed';

export type RecordingBlockCardProps = {
  block: RecordingBlock;
  contents: Content[];
  onOpen: () => void;
  onRecord?: () => void;
  onDelete: (id: string) => void;
};

const RING_PATH =
  'M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831';

const STATUS_BADGE_STYLE: Record<Exclude<RecordingBlockVisualState, 'empty'>, CSSProperties> = {
  pending: {
    backgroundColor: 'color-mix(in srgb, var(--accent-orange) 12%, var(--bg-elevated))',
    color: tintedTextColor('var(--accent-orange)'),
  },
  recording: {
    backgroundColor: 'color-mix(in srgb, var(--accent-blue) 12%, var(--bg-elevated))',
    color: tintedTextColor('var(--accent-blue)'),
  },
  completed: {
    backgroundColor: 'color-mix(in srgb, var(--accent-green) 12%, var(--bg-elevated))',
    color: tintedTextColor('var(--accent-green)'),
  },
};

function formatBlockDate(value: string): string | null {
  if (!value || Number.isNaN(new Date(value).getTime())) return null;
  return dia(value);
}

function resolveVisualState({
  totalCount,
  completedCount,
  isCompleted,
}: {
  totalCount: number;
  completedCount: number;
  isCompleted: boolean;
}): RecordingBlockVisualState {
  if (totalCount === 0) return 'empty';
  if (isCompleted) return 'completed';
  if (completedCount > 0) return 'recording';
  return 'pending';
}

function findNextUnrecordedContent(block: RecordingBlock, contents: Content[]): Content | null {
  const orderedItems = [...block.contents].sort((left, right) => left.ordem - right.ordem);
  for (const item of orderedItems) {
    const content = contents.find(candidate => candidate.id === item.contentId) ?? null;
    if (content && !isBlockContentComplete(item, content)) {
      return content;
    }
  }
  return contents[0] ?? null;
}

export function RecordingBlockCard({
  block,
  contents,
  onOpen,
  onRecord,
  onDelete,
}: RecordingBlockCardProps) {
  const {completedCount, isCompleted, progressPercentage, readyCount, totalCount} =
    getRecordingBlockProgress(block, contents);
  const visualState = resolveVisualState({totalCount, completedCount, isCompleted});
  const createdLabel = formatBlockDate(block.createdAt);
  const firstContent = contents[0] ?? null;
  const nextPendingContent = findNextUnrecordedContent(block, contents);
  const tagsSummary = resolveRecordingContextSummary({block, content: firstContent});
  const canStartRecording = Boolean(onRecord && (visualState === 'pending' || visualState === 'recording'));

  const menuItems: MoreMenuItem[] = [
    {
      id: 'open',
      label: 'Abrir bloco',
      onClick: onOpen,
    },
    ...(canStartRecording && onRecord
      ? [
          {
            id: 'record',
            label: visualState === 'recording' ? 'Continuar gravação' : 'Iniciar gravação',
            onClick: onRecord,
          },
        ]
      : []),
    {
      id: 'delete',
      label: 'Excluir bloco',
      tone: 'danger' as const,
      onClick: () => onDelete(block.id),
    },
  ];

  const ringStrokeColor =
    visualState === 'completed'
      ? 'var(--accent-green)'
      : visualState === 'recording'
        ? 'var(--accent-blue)'
        : 'var(--accent-orange)';

  const scriptsCountLabel = `${totalCount} ${totalCount === 1 ? 'roteiro' : 'roteiros'}`;

  return (
    <Surface
      as="div"
      variant="interactive"
      padding="md"
      onClick={onOpen}
      aria-label={`Abrir bloco ${block.name}`}
      className={cn(
        'group flex h-full cursor-pointer flex-col justify-between gap-4 select-none',
        visualState === 'completed' && 'opacity-85 hover:opacity-100',
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Cabeçalho: status + ação rápida + menu contextual */}
        <div className="flex items-center justify-between gap-2">
          {visualState === 'empty' ? (
            <Text
              variant="label"
              as="span"
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-hover)] px-2.5 py-1 text-[var(--text-secondary)]"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--text-tertiary)]" aria-hidden="true" />
              Vazio
            </Text>
          ) : visualState === 'completed' ? (
            <Text
              variant="label"
              as="span"
              style={STATUS_BADGE_STYLE.completed}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Gravado
            </Text>
          ) : visualState === 'recording' ? (
            <Text
              variant="label"
              as="span"
              style={STATUS_BADGE_STYLE.recording}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            >
              <span
                className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-blue)]"
                aria-hidden="true"
              />
              Em gravação
            </Text>
          ) : (
            <Text
              variant="label"
              as="span"
              style={STATUS_BADGE_STYLE.pending}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--accent-orange)]" aria-hidden="true" />
              Para gravar
            </Text>
          )}

          <div className="flex items-center gap-1.5">
            {canStartRecording && onRecord ? (
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation();
                  onRecord();
                }}
                className="inline-flex h-7 items-center gap-1 rounded-[var(--radius-input)] bg-[var(--brand-accent-soft)] px-2.5 t-label text-[var(--brand-accent-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--brand-accent-strong)_18%,var(--bg-elevated))] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] pointer-coarse:h-11"
              >
                <Play className="h-3.5 w-3.5 shrink-0 fill-current" aria-hidden="true" />
                <span>{visualState === 'recording' ? 'Continuar' : 'Gravar'}</span>
              </button>
            ) : visualState === 'completed' ? (
              <Text
                variant="meta"
                as="span"
                className="rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-2 py-0.5 text-[var(--text-secondary)]"
              >
                Finalizado
              </Text>
            ) : null}

            <MoreMenu
              items={menuItems}
              size="sm"
              label={`Mais opções para ${block.name}`}
            />
          </div>
        </div>

        {/* Título e metadado de criação */}
        <div className="flex flex-col gap-0.5">
          <Text variant="itemTitle" className="line-clamp-1 leading-snug">
            {block.name}
          </Text>
          {createdLabel ? (
            <Text variant="meta" as="p">
              Criado em {createdLabel}
            </Text>
          ) : null}
        </div>

        {/* Bloco central: anel radial SVG (com roteiros) ou dropzone amigável (vazio) */}
        {visualState === 'empty' ? (
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-[var(--radius-input)] bg-[var(--bg-primary)] px-3 py-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-secondary)]">
              <ListPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <Text variant="meta" as="p" className="max-w-[220px]">
              Adicione roteiros prontos para montar a fila deste bloco.
            </Text>
            <AppButton
              variant="secondary"
              size="xs"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={event => {
                event.stopPropagation();
                onOpen();
              }}
            >
              Adicionar roteiros
            </AppButton>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-[var(--radius-input)] bg-[var(--bg-primary)] p-3">
            <div
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progresso de gravação: ${progressPercentage}%`}
              className="relative flex h-14 w-14 shrink-0 items-center justify-center"
            >
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <path
                  d={RING_PATH}
                  fill="none"
                  stroke="var(--border-strong)"
                  strokeWidth="3.5"
                />
                <path
                  d={RING_PATH}
                  fill="none"
                  stroke={ringStrokeColor}
                  strokeDasharray={`${progressPercentage}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {visualState === 'completed' ? (
                  <Check
                    className="h-5 w-5"
                    style={{color: tintedTextColor('var(--accent-green)')}}
                    aria-hidden="true"
                  />
                ) : (
                  <Text variant="bodyStrong" as="span" className="tabular-nums">
                    {completedCount}/{totalCount}
                  </Text>
                )}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-0.5">
              <Text variant="bodyStrong" as="p">
                {visualState === 'completed'
                  ? '100% concluído'
                  : `${progressPercentage}% gravado`}
              </Text>
              <Text
                variant="meta"
                as="p"
                style={
                  visualState === 'recording'
                    ? {color: tintedTextColor('var(--accent-blue)')}
                    : undefined
                }
              >
                {visualState === 'completed'
                  ? `${completedCount} de ${totalCount} ${totalCount === 1 ? 'gravado' : 'gravados'}`
                  : visualState === 'recording'
                    ? `${readyCount} ${readyCount === 1 ? 'roteiro restante' : 'roteiros restantes'}`
                    : `${readyCount} ${readyCount === 1 ? 'roteiro pendente' : 'roteiros pendentes'}`}
              </Text>
            </div>
          </div>
        )}

        {/* Slot preditivo: primeiro roteiro, próximo na fila, resumo concluído ou aviso vazio */}
        {visualState === 'empty' ? (
          <div className="flex items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 py-2 text-[var(--text-secondary)]">
            <Info className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
            <Text variant="meta" as="span" truncate>
              Aguardando seleção de conteúdo
            </Text>
          </div>
        ) : visualState === 'completed' ? (
          <div className="flex flex-col gap-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-2.5">
            <div
              className="flex items-center gap-1"
              style={{color: tintedTextColor('var(--accent-green)')}}
            >
              <CheckCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <Text variant="eyebrow" as="span" className="text-current">
                Pronto para edição
              </Text>
            </div>
            <Text variant="secondary" as="p" className="line-clamp-1 text-[var(--text-primary)]">
              {totalCount === 1
                ? '1 roteiro finalizado para montagem'
                : `${totalCount} roteiros finalizados para montagem`}
            </Text>
          </div>
        ) : nextPendingContent ? (
          <div className="flex flex-col gap-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-2.5">
            <div
              className="flex items-center gap-1"
              style={
                visualState === 'recording'
                  ? {color: tintedTextColor('var(--accent-blue)')}
                  : undefined
              }
            >
              {visualState === 'recording' ? (
                <SkipForward className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronsRight
                  className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]"
                  aria-hidden="true"
                />
              )}
              <Text
                variant="eyebrow"
                as="span"
                className={visualState === 'recording' ? 'text-current' : undefined}
              >
                {visualState === 'recording' ? 'Próximo na fila' : 'Primeiro roteiro'}
              </Text>
            </div>
            <Text
              variant="secondary"
              as="p"
              className="line-clamp-1 text-[var(--text-primary)]"
            >
              {nextPendingContent.title}
            </Text>
          </div>
        ) : null}
      </div>

      {/* Rodapé técnico */}
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border-color)] pt-3">
        <Text variant="meta" as="span" className="shrink-0">
          {scriptsCountLabel}
        </Text>
        <Text variant="meta" as="span" truncate className="text-right">
          {tagsSummary}
        </Text>
      </div>
    </Surface>
  );
}
