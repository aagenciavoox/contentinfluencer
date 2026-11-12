import { DEFAULT_EDITORIAL_SETTINGS } from '../../features/editorial/lib/editorialSettings';
import type * as db from '../../lib/database';
import type { AppTheme } from '../../lib/themeStorage';

export interface AppState extends db.AppData {
  theme: AppTheme;
  isLoaded: boolean;
}

export const initialState: AppState = {
  platforms: [],
  preferences: {},
  dnaVoz: null,
  pilares: [],
  series: [],
  temas: [],
  temporadas: [],
  clubes: [],
  clubeConteudos: [],
  clubePastas: [],
  clubeSeries: [],
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
  postIts: [],
  goldenRules: [],
  contentMetrics: [],
  postingTimeEntries: [],
  editorial: DEFAULT_EDITORIAL_SETTINGS,
  editorialVisao: null,

  theme: 'light',
  isLoaded: false,
};
