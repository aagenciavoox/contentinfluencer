import type { ReactNode } from 'react';
import { FilterBar } from '../../../components/ui/FilterBar';
import { BibliotecaItem } from '../../../lib/database';

type StatusLeitura = BibliotecaItem['status'];
type BibliotecaTipo = BibliotecaItem['tipo'];

interface LibraryToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filtroTipo: BibliotecaTipo | 'Todos';
  onFiltroTipoChange: (value: BibliotecaTipo | 'Todos') => void;
  filtroStatus: StatusLeitura | 'Todos';
  onFiltroStatusChange: (value: StatusLeitura | 'Todos') => void;
  filtroGenero: string;
  onFiltroGeneroChange: (value: string) => void;
  sortValue: string;
  onSortChange: (value: string) => void;
  statusOptions: StatusLeitura[];
  genreOptions: string[];
  tabs?: ReactNode;
}

export function LibraryToolbar({
  searchValue,
  onSearchChange,
  filtroTipo,
  onFiltroTipoChange,
  filtroStatus,
  onFiltroStatusChange,
  filtroGenero,
  onFiltroGeneroChange,
  sortValue,
  onSortChange,
  statusOptions,
  genreOptions,
  tabs,
}: LibraryToolbarProps) {
  return (
    <FilterBar
      className="library-toolbar-filters"
      size="compact"
      leading={tabs}
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
            { label: 'Tipo', value: 'Todos' },
            { label: 'Livro', value: 'livro' },
            { label: 'Filme', value: 'filme' },
            { label: 'Série', value: 'série' },
            { label: 'Anime', value: 'anime' },
            { label: 'Mangá', value: 'manga' },
          ],
        },
        {
          id: 'status',
          label: 'Status',
          value: filtroStatus,
          onChange: value => onFiltroStatusChange(value as StatusLeitura | 'Todos'),
          options: [
            { label: 'Status', value: 'Todos' },
            ...statusOptions.map(status => ({ label: status, value: status })),
          ],
        },
        {
          id: 'genero',
          label: 'Gênero',
          value: filtroGenero,
          onChange: onFiltroGeneroChange,
          options: [
            { label: 'Gênero', value: 'Todos' },
            ...genreOptions.map(genero => ({ label: genero, value: genero })),
          ],
        },
      ]}
      sortValue={sortValue}
      onSortChange={onSortChange}
      sortOptions={[
        { label: 'Recentes', value: 'recentes' },
        { label: 'Título A-Z', value: 'titulo:asc' },
        { label: 'Autor A-Z', value: 'autor:asc' },
        { label: 'Status A-Z', value: 'status:asc' },
      ]}
    />
  );
}
