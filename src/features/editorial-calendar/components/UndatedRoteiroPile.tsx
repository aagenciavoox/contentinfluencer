import {GripVertical} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {Badge} from '../../../components/ui/Badge';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import type {Content} from '../../../lib/database';

export const UNDATED_ROTEIRO_MIME = 'application/x-calendario-roteiro';

export function UndatedRoteiroPile({
  contents,
  onPlace,
  placeLabel = 'Colocar no dia',
}: {
  contents: Content[];
  onPlace?: (content: Content) => void;
  placeLabel?: string;
}) {
  return (
    <Surface variant="outlined" padding="sm" className="stack-sm">
      <div>
        <Text variant="sectionTitle">Roteiros sem data</Text>
        <Text variant="meta" className="mt-1 block text-[var(--text-secondary)]">
          Arraste para um dia do calendário. Isso marca a publicação, sem virar nota de planejamento.
        </Text>
      </div>
      {contents.length === 0 ? (
        <Text variant="meta" className="rounded-[var(--radius-input)] bg-[var(--surface-subtle)] px-3 py-3 text-[var(--text-secondary)]">
          Nenhum roteiro esperando data.
        </Text>
      ) : (
        <ul className="stack-sm">
          {contents.map(content => (
            <li key={content.id}>
              <div
                draggable
                onDragStart={event => {
                  event.dataTransfer.setData(UNDATED_ROTEIRO_MIME, content.id);
                  event.dataTransfer.setData('text/plain', content.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                className="flex items-start gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2 py-2"
              >
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                <div className="min-w-0 flex-1 stack-sm">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {content.title || 'Sem título'}
                  </p>
                  <Badge variant="status" status={content.status}>{content.status}</Badge>
                  {onPlace ? (
                    <AppButton variant="ghost" size="xs" onClick={() => onPlace(content)}>
                      {placeLabel}
                    </AppButton>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Surface>
  );
}
