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

function selectedTitle(noun: Noun, count: number) {
  const final = noun.feminine ? 'a' : 'o';
  if (count === 0) {
    return `${noun.feminine ? 'Nenhuma' : 'Nenhum'} ${noun.singular} selecionad${final}`;
  }
  return `${count} ${nounFor(noun, count)} selecionad${final}${count === 1 ? '' : 's'}`;
}

function selectionDetail({
  selectedCount,
  availableCount,
  hiddenSelectedCount,
  availableNoun,
}: Pick<CreationSelectionBarProps, 'selectedCount' | 'availableCount' | 'hiddenSelectedCount' | 'availableNoun'>) {
  const available = `${availableCount} ${nounFor(availableNoun, availableCount)}`;
  if (selectedCount === 0) return `${available} no filtro atual. Marque os cards, ou a caixa para escolher todos.`;
  if (selectedCount === availableCount) {
    return hiddenSelectedCount > 0
      ? 'Todos os resultados do filtro, incluindo os não exibidos.'
      : 'Todos os resultados do filtro.';
  }
  if (hiddenSelectedCount > 0) {
    return `De ${available} no filtro. ${hiddenSelectedCount} da seleção ${
      hiddenSelectedCount === 1 ? 'não está' : 'não estão'
    } na tela.`;
  }
  return `De ${available} no filtro.`;
}

/** Barra da seleção em massa da Criação: marcar todos, cancelar, série, pilar, excluir e exportar. */
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
  const todos = availableNoun.feminine ? 'todas' : 'todos';
  const toggleAllLabel = allSelected ? `Desmarcar ${todos}` : `Selecionar ${todos}`;

  return (
    <section
      aria-label="Seleção em massa"
      className={cn(
        'flex flex-col gap-3 rounded-[var(--radius-card-mobile)] border p-3 md:rounded-[var(--radius-card)] md:px-4',
        'border-[color-mix(in_srgb,var(--brand-accent),transparent_70%)]',
        'bg-[color-mix(in_srgb,var(--brand-accent-soft),var(--bg-elevated)_80%)]',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggleAll}
          className={cn(
            'relative mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
            "pointer-coarse:before:absolute pointer-coarse:before:-inset-3 pointer-coarse:before:content-['']",
            'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
            nothingSelected
              ? 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-transparent hover:border-[var(--brand-accent-strong)]'
              : 'border-[var(--brand-accent-strong)] bg-[var(--brand-accent-strong)] text-[var(--brand-on-accent)]',
          )}
          role="checkbox"
          aria-checked={allSelected ? true : someSelected ? 'mixed' : false}
          aria-label={toggleAllLabel}
          title={toggleAllLabel}
        >
          {allSelected ? <Check className="h-3 w-3 stroke-[3px]" /> : null}
          {someSelected ? <Minus className="h-3 w-3 stroke-[3px]" /> : null}
        </button>

        <div className="min-w-0 flex-1">
          <p className="t-item-title text-[var(--text-primary)]" aria-live="polite">
            {selectedTitle(nothingSelected ? availableNoun : selectedNoun, selectedCount)}
          </p>
          <Text variant="meta" as="p">
            {selectionDetail({ selectedCount, availableCount, hiddenSelectedCount, availableNoun })}
          </Text>
        </div>

        {/* No celular só o X, para o título não espremer; no desktop, com o texto. */}
        <AppButton
          variant="secondary"
          size="sm"
          className="hidden shrink-0 md:inline-flex"
          leftIcon={<X className="h-4 w-4" />}
          onClick={onCancel}
        >
          Cancelar seleção
        </AppButton>
        <AppButton
          variant="secondary"
          size="sm"
          iconOnly
          className="shrink-0 md:hidden"
          aria-label="Cancelar seleção"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </AppButton>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[color-mix(in_srgb,var(--brand-accent),transparent_85%)] pt-3 md:flex md:items-center md:justify-end">
        <AppButton
          variant="secondary"
          size="sm"
          className="w-full md:w-auto"
          leftIcon={<Layers className="h-4 w-4" />}
          disabled={nothingSelected}
          onClick={onChangeSeries}
        >
          Mudar série
        </AppButton>
        <AppButton
          variant="secondary"
          size="sm"
          className="w-full md:w-auto"
          leftIcon={<Target className="h-4 w-4" />}
          disabled={nothingSelected}
          onClick={onChangePillar}
        >
          Mudar pilar
        </AppButton>
        {/* Rosa forte no claro e rosa claro no escuro: os dois passam de 4.5:1 sobre o fundo do botão. */}
        <AppButton
          variant="secondary"
          size="sm"
          className={cn(
            'w-full md:w-auto',
            'border-[color-mix(in_srgb,var(--brand-accent),transparent_45%)] bg-[color-mix(in_srgb,var(--brand-accent-soft),var(--bg-elevated)_85%)]',
            'text-[var(--brand-accent-strong)] dark:text-[var(--brand-accent)]',
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
          className="w-full md:w-auto"
          leftIcon={<Download className="h-4 w-4" />}
          disabled={nothingSelected || isExporting}
          onClick={onExport}
        >
          {isExporting ? 'Gerando DOCX…' : (
            <>
              {/* No celular, meia largura não cabe "DOCX". */}
              <span className="md:hidden">Exportar ({selectedCount})</span>
              <span className="hidden md:inline">Exportar DOCX ({selectedCount})</span>
            </>
          )}
        </AppButton>
      </div>
    </section>
  );
}
