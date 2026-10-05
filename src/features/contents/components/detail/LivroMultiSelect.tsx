import { TagSelect, type TagSelectProps } from '../../../../components/ui/TagSelect';
import type { BibliotecaItem } from '../../../../lib/database';
import { aplicarLivros, livroIdsEfetivos } from '../../../../lib/livroIds';

interface LivroMultiSelectProps {
  livroIds?: readonly string[] | null;
  bibliotecaItemId?: string | null;
  bibliotecaItems: readonly BibliotecaItem[];
  onChange: (next: { livroIds: string[]; bibliotecaItemId: string | null }) => void;
  selectProps?: Pick<TagSelectProps, 'hideLabel' | 'placeholder' | 'controlClassName' | 'leadingIcon' | 'searchable'>;
}

export function LivroMultiSelect({
  livroIds,
  bibliotecaItemId,
  bibliotecaItems,
  onChange,
  selectProps,
}: LivroMultiSelectProps) {
  const ativos = bibliotecaItems.filter(item => !item.deletedAt);
  const selecionados = livroIdsEfetivos({ livroIds, bibliotecaItemId });
  const conhecidos = new Set(ativos.map(item => item.id));
  const visiveis = ativos.length === 0
    ? selecionados
    : selecionados.filter(id => conhecidos.has(id));

  return (
    <TagSelect
      id="conteudo-livros"
      label="Livros"
      hint="Pode citar mais de um."
      values={visiveis}
      onChange={next => onChange(aplicarLivros({
        livroIds: next,
        bibliotecaItemId: next[0] ?? null,
      }))}
      options={ativos.map(item => ({ value: item.id, label: item.titulo }))}
      placeholder="Escolher livros"
      {...selectProps}
    />
  );
}
