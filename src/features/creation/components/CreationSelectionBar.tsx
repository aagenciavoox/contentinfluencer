import { Check, Download, Layers, Minus, Target, Trash2, X } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import type { CreationExportCopy } from '../lib/exportScriptsDocx';

type Noun = Pick<CreationExportCopy, 'singular' | 'plural' | 'feminine'>;

interface CreationSelectionBarProps {
  selectedCount: number;
  availableCount: number;
  /** Selecionados que não estão na tela (páginas ainda não carregadas por "Mostrar mais"). */
  hiddenSelectedCount: number;
  /** Nome do que está selecionado (ideia, roteiro ou item). */
  selectedNoun: Noun;
  /** Nome do que o filtro oferece. */
  availableNoun: Noun;
  isExporting: boolean;
  onToggleAll: () => void;
  onChangeSeries: () => void;
  onChangePillar: () => void;
  onExport: () => void;
  onDelete: () => void;
  onCancel: () => void;
}

function nounFor(noun: Noun, count: number) {
  return count === 1 ? noun.singular : noun.plural;
}

function selectedWord(noun: Noun, count: number) {
  return `selecionad${noun.feminine ? 'a' : 'o'}${count === 1 ? '' : 's'}`;
}

/** "3 roteiros selecionados" no desktop; no celular só "3 selecionados", para caber ao lado dos botões. */
function selectedTitle(noun: Noun, count: number, short: boolean) {
  if (count === 0) {
    const none = noun.feminine ? 'Nenhuma' : 'Nenhum';
    return short ? `${none} ${selectedWord(noun, 1)}` : `${none} ${noun.singular} ${selectedWord(noun, 1)}`;
  }
  return short
    ? `${count} ${selectedWord(noun, count)}`
    : `${count} ${nounFor(noun, count)} ${selectedWord(noun, count)}`;
}

function selectionDetail({
  selectedCount,
  availableCount,
  hiddenSelectedCount,
  availableNoun,
}: Pick<CreationSelectionBarProps, 'selectedCount' | 'availableCount' | 'hiddenSelectedCount' | 'availableNoun'>) {
  const available = `${availableCount} ${nounFor(availableNoun, availableCount)}`;
  const offscreen = hiddenSelectedCount > 0 ? ` · ${hiddenSelectedCount} fora da tela` : '';
  if (selectedCount === 0) return `${available} no filtro`;
  if (selectedCount === availableCount) {
    const all = availableNoun.feminine ? 'Todas as' : 'Todos os';
    return `${all} ${available} do filtro${offscreen}`;
  }
  return `De ${available} no filtro${offscreen}`;
}

// No celular os botões viram blocos com ícone sobre o texto (4 por linha); do `md:` em diante, botões normais.
const actionClassName = cn(
  'h-auto min-h-14 w-full flex-col gap-1 px-1 py-2 text-xs',
  'md:h-[var(--app-button-height)] md:min-h-0 md:w-auto md:flex-row md:gap-2 md:px-4 md:py-0 md:text-[length:var(--font-size-button)]',
);

/**
 * Barra da seleção em massa da Criação. Fica presa ao pé da tela enquanto a lista rola
 * (acima da barra inferior no celular) e não empurra a grade para baixo.
 */
export function CreationSelectionBar({
  selectedCount,
  availableCount,
  hiddenSelectedCount,
  selectedNoun,
  availableNoun,
  isExporting,
  onToggleAll,
  onChangeSeries,
  onChangePillar,
  onExport,
  onDelete,
  onCancel,
}: CreationSelectionBarProps) {
  const allSelected = availableCount > 0 && selectedCount === availableCount;
  const someSelected = selectedCount > 0 && !allSelected;
  const nothingSelected = selectedCount === 0;
  const titleNoun = nothingSelected ? availableNoun : selectedNoun;
  const todos = availableNoun.feminine ? 'todas' : 'todos';
  const selectAllLabel = `Selecionar ${todos} (${availableCount})`;

  const cancelButton = (className: string) => (
    <AppButton
      variant="ghost"
      size="sm"
      iconOnly
      className={className}
      aria-label="Cancelar seleção"
      title="Cancelar seleção"
      onClick={onCancel}
    >
      <X className="h-4 w-4" />
    </AppButton>
  );

  return (
    <div
      className={cn(
        'sticky z-30',
        // Mesma altura da barra inferior do shell mobile (.mobile-shell-bottom-spacer) + respiro.
        'bottom-[calc(3.25rem+max(0.75rem,env(safe-area-inset-bottom,0px))+var(--space-sm))]',
        'lg:bottom-[var(--space-lg)]',
      )}
    >
      <section
        aria-label="Seleção em massa"
        className={cn(
          'mx-auto flex w-full flex-col gap-3 p-3',
          'rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-[var(--shadow-dropdown)]',
          'md:w-fit md:max-w-full md:flex-row md:flex-wrap md:items-center md:gap-x-6 md:gap-y-3 md:py-2 md:pl-4 md:pr-2',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1 md:flex-none">
            <p className="t-item-title truncate text-[var(--text-primary)]" aria-live="polite">
              <span className="md:hidden">{selectedTitle(titleNoun, selectedCount, true)}</span>
              <span className="hidden md:inline">{selectedTitle(titleNoun, selectedCount, false)}</span>
            </p>
            <Text variant="meta" as="p" className="truncate">
              {selectionDetail({ selectedCount, availableCount, hiddenSelectedCount, availableNoun })}
            </Text>
          </div>

          {/* A caixa segue o visual das caixas dos cards: preenchida quando marcada, traço quando é parte. */}
          <AppButton
            variant="secondary"
            size="sm"
            className="px-3"
            role="checkbox"
            aria-checked={allSelected ? true : someSelected ? 'mixed' : false}
            aria-label={selectAllLabel}
            leftIcon={(
              <span
                aria-hidden
                className={cn(
                  'inline-flex h-4 w-4 items-center justify-center rounded border transition-colors',
                  nothingSelected
                    ? 'border-[var(--border-strong)] bg-[var(--bg-elevated)]'
                    : 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]',
                )}
              >
                {allSelected ? <Check className="h-3 w-3 stroke-[3px]" /> : null}
                {someSelected ? <Minus className="h-3 w-3 stroke-[3px]" /> : null}
              </span>
            )}
            onClick={onToggleAll}
          >
            <span className="md:hidden">{todos === 'todas' ? 'Todas' : 'Todos'} ({availableCount})</span>
            <span className="hidden md:inline">{selectAllLabel}</span>
          </AppButton>

          {cancelButton('-my-1 -mr-1 md:hidden')}
        </div>

        <div className="grid grid-cols-4 gap-1.5 md:ml-auto md:flex md:items-center md:gap-2">
          <AppButton
            variant="secondary"
            size="sm"
            className={actionClassName}
            leftIcon={<Layers className="h-4 w-4" />}
            aria-label="Mudar série"
            disabled={nothingSelected}
            onClick={onChangeSeries}
          >
            <span className="md:hidden">Série</span>
            <span className="hidden md:inline">Mudar série</span>
          </AppButton>
          <AppButton
            variant="secondary"
            size="sm"
            className={actionClassName}
            leftIcon={<Target className="h-4 w-4" />}
            aria-label="Mudar pilar"
            disabled={nothingSelected}
            onClick={onChangePillar}
          >
            <span className="md:hidden">Pilar</span>
            <span className="hidden md:inline">Mudar pilar</span>
          </AppButton>
          {/* Rosa forte no claro e rosa claro no escuro: os dois passam de 4.5:1 sobre o fundo do botão. */}
          <AppButton
            variant="secondary"
            size="sm"
            className={cn(
              actionClassName,
              'border-[color-mix(in_srgb,var(--brand-accent),transparent_45%)] bg-[color-mix(in_srgb,var(--brand-accent-soft),var(--bg-elevated)_85%)]',
              'text-[var(--brand-accent-text)]',
              'hover:border-[var(--brand-accent-strong)] hover:bg-[var(--brand-accent-soft)]',
            )}
            leftIcon={<Trash2 className="h-4 w-4" />}
            disabled={nothingSelected}
            onClick={onDelete}
          >
            Excluir
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            className={actionClassName}
            leftIcon={<Download className="h-4 w-4" />}
            disabled={nothingSelected || isExporting}
            onClick={onExport}
          >
            {isExporting ? (
              <>
                <span className="md:hidden">Gerando…</span>
                <span className="hidden md:inline">Gerando DOCX…</span>
              </>
            ) : (
              <>
                <span className="md:hidden">Exportar</span>
                <span className="hidden md:inline">Baixar em Word ({selectedCount})</span>
              </>
            )}
          </AppButton>

          <span aria-hidden className="hidden h-6 w-px bg-[var(--border-color)] md:block" />
          {cancelButton('hidden md:inline-flex')}
        </div>
      </section>
    </div>
  );
}
