import { Check, Download, Layers, Minus, Target } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { MoreMenu } from '../../../components/ui/MoreMenu';
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
  if (selectedCount === 0) return `${available} no filtro atual. Marque os cards para escolher.`;
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

/** Barra da seleção em massa da Criação: marcar todos, série, pilar, exportar e excluir. */
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
        'flex flex-col gap-3 rounded-[var(--radius-card-mobile)] border p-3 md:flex-row md:items-center md:gap-4 md:rounded-[var(--radius-card)] md:px-4',
        'border-[color-mix(in_srgb,var(--brand-accent),transparent_70%)]',
        'bg-[color-mix(in_srgb,var(--brand-accent-soft),var(--bg-elevated)_80%)]',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
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
        >
          {allSelected ? <Check className="h-3 w-3 stroke-[3px]" /> : null}
          {someSelected ? <Minus className="h-3 w-3 stroke-[3px]" /> : null}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <p className="t-item-title text-[var(--text-primary)]" aria-live="polite">
              {selectedTitle(nothingSelected ? availableNoun : selectedNoun, selectedCount)}
            </p>
            {/* No escuro, o rosa forte não chega a 4.5:1 sobre o fundo rosado; o rosa claro chega. */}
            <button
              type="button"
              onClick={onToggleAll}
              className="text-[length:var(--font-size-secondary)] font-medium text-[var(--brand-accent-strong)] underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] dark:text-[var(--brand-accent)] pointer-coarse:py-2"
            >
              {toggleAllLabel}
            </button>
          </div>
          <Text variant="meta" as="p">
            {selectionDetail({ selectedCount, availableCount, hiddenSelectedCount, availableNoun })}
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0 md:items-center">
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
        {/* No celular, exportar e ••• dividem a segunda linha; no desktop, tudo numa fila. */}
        <div className="col-span-2 flex gap-2 md:contents">
          <AppButton
            variant="primary"
            size="sm"
            className="min-w-0 flex-1 md:flex-none"
            leftIcon={<Download className="h-4 w-4" />}
            disabled={nothingSelected || isExporting}
            onClick={onExport}
          >
            {isExporting ? 'Gerando DOCX…' : `Exportar DOCX (${selectedCount})`}
          </AppButton>
          <MoreMenu
            label="Mais ações da seleção"
            className="shrink-0"
            items={[
              {
                id: 'delete',
                label: 'Mover para a lixeira',
                tone: 'danger',
                disabled: nothingSelected,
                onClick: onDelete,
              },
              { id: 'cancel', label: 'Sair da seleção', onClick: onCancel },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
