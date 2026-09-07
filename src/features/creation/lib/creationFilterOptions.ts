export const CREATION_SORT_OPTIONS = [
  {label: 'Mais recentes', value: 'recent'},
  {label: 'Mais antigos', value: 'oldest'},
  {label: 'Título A–Z', value: 'title'},
] as const;

export type CreationSortValue = (typeof CREATION_SORT_OPTIONS)[number]['value'];

export const CREATION_VIEW_MODE_VALUES = ['grid', 'list', 'kanban'] as const;

export const CREATION_VIEW_MODE_LABELS: Record<
  (typeof CREATION_VIEW_MODE_VALUES)[number],
  string
> = {
  grid: 'Grade',
  list: 'Lista',
  kanban: 'Kanban',
};

/** Query keys cleared by the mobile filter sheet "Limpar filtros" action. */
export const CREATION_FILTER_QUERY_KEYS = ['pilar', 'serie', 'origem', 'sort', 'page'] as const;
