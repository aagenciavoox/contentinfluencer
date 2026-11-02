import { FilterBar } from '../../../components/ui/FilterBar';
import { BibliotecaItem } from '../../../lib/database';

type BibliotecaTipo = BibliotecaItem['tipo'];
export type BibliotecaCapaFilter = 'Todos' | 'sem' | 'com';

const SORT_OPTIONS = [
  { label: 'Recentes', value: 'recentes' },
  { label: 'Título A–Z', value: 'titulo:asc' },
  { label: 'Autor A–Z', value: 'autor:asc' },
  { label: 'Status A–Z', value: 'status:asc' },
  { label: 'Maior nota', value: 'nota:desc' },
  { label: 'Terminados por último', value: 'fim:desc' },
] as const;

/** Ordens aceitas no endereço da Biblioteca (`?ordem=`). */
export const LIBRARY_SORT_VALUES = SORT_OPTIONS.map(option => option.value);

interface LibraryToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filtroTipo: BibliotecaTipo | 'Todos';
  onFiltroTipoChange: (value: BibliotecaTipo | 'Todos') => void;
  filtroGenero: string;
  onFiltroGeneroChange: (value: string) => void;
  filtroCapa: BibliotecaCapaFilter;
  onFiltroCapaChange: (value: BibliotecaCapaFilter) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  genreOptions: string[];
}

/** Busca, filtros e ordem da Biblioteca. O status fica nos botões acima da grade. */
export function LibraryToolbar({
  searchValue,
  onSearchChange,
  filtroTipo,
  onFiltroTipoChange,
  filtroGenero,
  onFiltroGeneroChange,
  filtroCapa,
  onFiltroCapaChange,
  sortValue,
  onSortChange,
  genreOptions,
}: LibraryToolbarProps) {
  return (
    <FilterBar
      className="library-toolbar-filters"
      size="default"
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      searchPlaceholder="Buscar título, autoria ou tag"
      filters={[
        {
          id: 'tipo',
          label: 'Tipo',
          value: filtroTipo,
          onChange: value => onFiltroTipoChange(value as BibliotecaTipo | 'Todos'),
          options: [
            { label: 'Todos', value: 'Todos' },
            { label: 'Livro', value: 'livro' },
            { label: 'Filme', value: 'filme' },
            { label: 'Série', value: 'série' },
            { label: 'Anime', value: 'anime' },
            { label: 'Mangá', value: 'manga' },
            { label: 'Quadrinho', value: 'quadrinho' },
          ],
        },
        {
          id: 'genero',
          label: 'Gênero',
          value: filtroGenero,
          onChange: onFiltroGeneroChange,
          options: [
            { label: 'Todos', value: 'Todos' },
            ...genreOptions.map(genero => ({ label: genero, value: genero })),
          ],
        },
        {
          id: 'capa',
          label: 'Capa',
          value: filtroCapa,
          onChange: value => onFiltroCapaChange(value as BibliotecaCapaFilter),
          options: [
            { label: 'Todas', value: 'Todos' },
            { label: 'Sem capa', value: 'sem' },
            { label: 'Com capa', value: 'com' },
          ],
        },
      ]}
      sortValue={sortValue}
      onSortChange={onSortChange}
      sortOptions={[...SORT_OPTIONS]}
    />
  );
}
