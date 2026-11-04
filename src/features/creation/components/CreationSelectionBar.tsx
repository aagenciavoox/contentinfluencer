import { ArrowRightLeft, Check, Download, Layers, Minus, Target, Trash2, X } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { MoreMenu, type MoreMenuItem } from '../../../components/ui/MoreMenu';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { Text } from '../../../components/ui/Text';
import type { CreationExportCopy } from '../lib/exportScriptsDocx';

type Noun = Pick<CreationExportCopy, 'singular' | 'plural' | 'feminine'>;

interface CreationSelectionBarProps {
  selectedCount: number;
  availableCount: number;
  /** Selecionados que estão em outras páginas ou fora da vista atual. */
  hiddenSelectedCount: number;
  /** Nome do que está selecionado (ideia, roteiro ou item). */
  selectedNoun: Noun;
  /** Nome do que o filtro oferece. */
  availableNoun: Noun;
  isExporting: boolean;
  onToggleAll: () => void;
  onChangeStatus: () => void;
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

/** A seleção divide o rodapé com a paginação. */
export function CreationSelectionBar({
  selectedCount, availableCount, hiddenSelectedCount, selectedNoun, availableNoun,
  isExporting, onToggleAll, onChangeStatus, onChangeSeries, onChangePillar,
  onExport, onDelete, onCancel,
}: CreationSelectionBarProps) {
  const isMobile = useIsMobile();
  const allSelected = availableCount > 0 && selectedCount === availableCount;
  const someSelected = selectedCount > 0 && !allSelected;
  const nothingSelected = selectedCount === 0;
  const titleNoun = nothingSelected ? availableNoun : selectedNoun;
  const selectAllLabel = 'Selecionar ' + (availableNoun.feminine ? 'todas' : 'todos') + ' (' + availableCount + ')';
  const menuItems: MoreMenuItem[] = [
    { id: 'status', label: 'Mudar etapa', onClick: onChangeStatus, disabled: nothingSelected },
    { id: 'series', label: 'Mudar série', onClick: onChangeSeries, disabled: nothingSelected },
    { id: 'pillar', label: 'Mudar pilar', onClick: onChangePillar, disabled: nothingSelected },
    { id: 'export', label: isExporting ? 'Gerando Word…' : 'Exportar em Word', onClick: onExport, disabled: nothingSelected || isExporting },
    { id: 'delete', label: 'Mover para a lixeira', onClick: onDelete, tone: 'danger', disabled: nothingSelected },
  ];

  return (
    <section aria-label="Seleção em massa" className="flex flex-wrap items-center gap-2 border-b border-[var(--border-color)] pb-2">
      <div className="min-w-0 flex-1 basis-32">
        <Text variant="bodyStrong" className="truncate" aria-live="polite">
          {selectedTitle(titleNoun, selectedCount, isMobile)}
        </Text>
        <Text variant="meta" as="p" className="truncate">
          {selectionDetail({ selectedCount, availableCount, hiddenSelectedCount, availableNoun })}
        </Text>
      </div>
      <AppButton
        variant="secondary"
        size="sm"
        role="checkbox"
        aria-checked={allSelected ? true : someSelected ? 'mixed' : false}
        aria-label={selectAllLabel}
        onClick={onToggleAll}
        leftIcon={allSelected ? <Check className="h-4 w-4" /> : someSelected ? <Minus className="h-4 w-4" /> : undefined}
      >
        {allSelected ? 'Desmarcar' : 'Todos'}
      </AppButton>
      {isMobile ? (
        <MoreMenu items={menuItems} label="Ações da seleção" trigger={<Text variant="button">Ações</Text>} />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <AppButton variant="secondary" size="sm" leftIcon={<ArrowRightLeft className="h-4 w-4" />} disabled={nothingSelected} onClick={onChangeStatus}>Etapa</AppButton>
          <AppButton variant="secondary" size="sm" leftIcon={<Layers className="h-4 w-4" />} disabled={nothingSelected} onClick={onChangeSeries}>Série</AppButton>
          <AppButton variant="secondary" size="sm" leftIcon={<Target className="h-4 w-4" />} disabled={nothingSelected} onClick={onChangePillar}>Pilar</AppButton>
          <AppButton variant="secondary" size="sm" leftIcon={<Download className="h-4 w-4" />} disabled={nothingSelected || isExporting} onClick={onExport}>{isExporting ? 'Gerando…' : 'Word'}</AppButton>
          <AppButton variant="ghost" size="sm" className="text-[var(--danger)]" leftIcon={<Trash2 className="h-4 w-4" />} disabled={nothingSelected} onClick={onDelete}>Excluir</AppButton>
        </div>
      )}
      <AppButton variant="ghost" size="sm" iconOnly aria-label="Cancelar seleção" title="Cancelar seleção" onClick={onCancel}>
        <X className="h-4 w-4" />
      </AppButton>
    </section>
  );
}
