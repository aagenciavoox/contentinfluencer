import { Check, Clock, Layers, X } from 'lucide-react';
import { Dialog } from '../../../../components/overlays/Dialog';
import { Text } from '../../../../components/ui/Text';
import { cn } from '../../../../lib/utils';
import type { PrompterSection } from '../../lib/prompterLines';

interface TeleprompterSectionsDialogProps {
  open: boolean;
  onClose: () => void;
  sections: PrompterSection[];
  activeSectionIndex: number;
  onSelectSection: (firstSpokenIndex: number) => void;
  zIndex?: string;
}

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

export function TeleprompterSectionsDialog({
  open,
  onClose,
  sections,
  activeSectionIndex,
  onSelectSection,
  zIndex,
}: TeleprompterSectionsDialogProps) {
  const totalSeconds = sections.reduce((sum, s) => sum + s.estimatedSeconds, 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabel="Seções do roteiro"
      desktopMaxW="md:max-w-[620px]"
      zIndex={zIndex ?? 'z-[140]'}
    >
      <section className="flex max-h-[85vh] flex-col bg-[var(--bg-elevated)] text-[var(--text-primary)]">
        <header className="flex items-center justify-between gap-4 border-b border-[var(--border-color)] px-6 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <Text variant="sectionTitle" as="h2">Seções do roteiro</Text>
              <Text variant="secondary" as="p" className="text-[var(--text-tertiary)]">
                {sections.length} seções · Duração total: {formatDuration(totalSeconds)}
              </Text>
            </div>
          </div>

          <button
            type="button"
            aria-label="Fechar seções"
            onClick={onClose}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
              FOCUS_RING
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex flex-col gap-2">
            {sections.map(section => {
              const isActive = section.index === activeSectionIndex;
              return (
                <button
                  key={section.index}
                  type="button"
                  onClick={() => {
                    onSelectSection(section.firstSpokenIndex);
                    onClose();
                  }}
                  className={cn(
                    'group flex w-full items-center justify-between gap-4 rounded-[var(--radius-card)] border p-4 text-left transition-all',
                    FOCUS_RING,
                    isActive
                      ? 'border-[var(--brand-accent-strong)] bg-[var(--brand-accent-soft)] shadow-sm'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)]'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Text
                        variant="eyebrow"
                        as="span"
                        className={cn(
                          'rounded-[var(--radius-sm)] px-2 py-0.5',
                          isActive
                            ? 'bg-[var(--brand-accent-strong)] text-[var(--brand-on-accent)]'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-tertiary)]'
                        )}
                      >
                        Seção {section.number}
                      </Text>
                      {isActive && (
                        <Text variant="secondary" as="span" className="flex items-center gap-1 text-[var(--brand-accent-text)]">
                          <Check className="h-3 w-3" />
                          Lendo agora
                        </Text>
                      )}
                    </div>

                    <Text
                      variant="itemTitle"
                      as="p"
                      className="mt-1.5 truncate text-[var(--text-primary)]"
                    >
                      {section.title}
                    </Text>

                    <Text variant="secondary" as="div" className="mt-1 flex items-center gap-3 text-[var(--text-tertiary)]">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(section.estimatedSeconds)}
                      </span>
                      <span>·</span>
                      <span>{section.wordCount} palavras</span>
                    </Text>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </Dialog>
  );
}
