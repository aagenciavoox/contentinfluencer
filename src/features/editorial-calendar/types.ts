import React from 'react';

export type EditorialMainTab = 'agenda' | 'cronograma' | 'projetos' | 'visao-geral';

export interface EditorialTabOption {
  id: EditorialMainTab;
  label: string;
  icon: React.ElementType;
}
