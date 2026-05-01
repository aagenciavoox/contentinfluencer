import type * as db from '../../lib/database';

export interface AppState extends db.AppData {
  theme: 'light' | 'dark';
  isLoaded: boolean;
}

export const initialState: AppState = {
  platforms: [],
  preferences: {},
  dnaVoz: null,
  pilares: [],
  series: [],
  cenarios: [],
  looks: [],
  bibliotecaGeneros: [],
  bibliotecaItems: [],
  contents: [],
  ideas: [],
  projetos: [],
  recordingBlocks: [],
  templates: [],
  agendaItems: [],
  goldenRules: [],
  contentMetrics: [],

  // Legacy aliases
  books: [],
  partnerships: [],
  results: [],
  agenda: [],

  theme: 'light',
  isLoaded: false,
};
