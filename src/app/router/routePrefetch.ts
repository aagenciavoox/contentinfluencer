type RouteLoader = () => Promise<unknown>;

const loadDashboard = () => import('../../pages/Dashboard');
const loadCreation = () => import('../../pages/Creation');
const loadCaptions = () => import('../../pages/Legendas');
const loadContentDetail = () => import('../../pages/ContentDetail');
const loadCalendar = () => import('../../pages/EditorialCalendar');
const loadPlanejamento = () => import('../../pages/Planejamento');
const loadEditorial = () => import('../../pages/Editorial');
const loadLibrary = () => import('../../pages/Biblioteca');
const loadLibraryAnalysis = () => import('../../pages/Analise');
const loadBookDetail = () => import('../../pages/BookDetail');
const loadSettings = () => import('../../pages/Settings');
const loadProfile = () => import('../../pages/settings/Perfil');
const loadPillarEdit = () => import('../../pages/settings/PilarEditar');
const loadSeries = () => import('../../pages/settings/Series');
const loadSeriesEdit = () => import('../../pages/settings/SeriesEditar');
const loadSeriesScripts = () => import('../../pages/settings/SeriesRoteiros');
const loadPlatforms = () => import('../../pages/settings/Plataformas');
const loadProjects = () => import('../../pages/Projetos');
const loadProjectDetail = () => import('../../pages/ProjetoDetalhe');
const loadRecording = () => import('../../pages/Gravacao');
const loadRecordingBlock = () => import('../../pages/GravacaoBloco');

/** Same import functions React.lazy uses, so a prefetch fills the module cache. */
export const routeLoaders = {
  dashboard: loadDashboard,
  creation: loadCreation,
  captions: loadCaptions,
  contentDetail: loadContentDetail,
  calendar: loadCalendar,
  planejamento: loadPlanejamento,
  editorial: loadEditorial,
  library: loadLibrary,
  libraryAnalysis: loadLibraryAnalysis,
  bookDetail: loadBookDetail,
  settings: loadSettings,
  profile: loadProfile,
  pillarEdit: loadPillarEdit,
  series: loadSeries,
  seriesEdit: loadSeriesEdit,
  seriesScripts: loadSeriesScripts,
  platforms: loadPlatforms,
  projects: loadProjects,
  projectDetail: loadProjectDetail,
  recording: loadRecording,
  recordingBlock: loadRecordingBlock,
} as const;

const started = new Set<RouteLoader>();

function start(loader: RouteLoader) {
  if (started.has(loader)) return;
  started.add(loader);
  void loader().catch(() => {
    started.delete(loader);
  });
}

const PRIMARY_LOADERS: RouteLoader[] = [
  loadDashboard,
  loadCreation,
  loadCaptions,
  loadCalendar,
  loadPlanejamento,
  loadEditorial,
  loadLibrary,
  loadSettings,
  loadSeries,
  loadProjects,
  loadRecording,
];

function loaderForPath(pathname: string): RouteLoader | null {
  const path = pathname.split('?')[0];

  if (path === '/hoje' || path === '/dashboard') return loadDashboard;
  if (path === '/criacao/legendas') return loadCaptions;
  if (path.startsWith('/criacao') || path === '/conteudos') return loadCreation;
  if (path.startsWith('/conteudos/')) return loadContentDetail;
  if (path.startsWith('/calendario')) return loadCalendar;
  if (path.startsWith('/planejamento') || path.startsWith('/programacao')) return loadPlanejamento;
  if (path === '/editorial') return loadEditorial;
  if (path === '/editorial/pilares/nova' || path.startsWith('/editorial/pilares/')) return loadPillarEdit;
  if (path === '/editorial/series/nova' || path.startsWith('/editorial/series/')) return loadSeriesEdit;
  if (path === '/biblioteca/analise') return loadLibraryAnalysis;
  if (path === '/biblioteca') return loadLibrary;
  if (path.startsWith('/biblioteca/')) return loadBookDetail;
  if (path === '/projetos') return loadProjects;
  if (path.startsWith('/projetos/')) return loadProjectDetail;
  if (path === '/gravacao') return loadRecording;
  if (path.startsWith('/gravacao/')) return loadRecordingBlock;
  if (path === '/configuracoes/perfil') return loadProfile;
  if (path === '/configuracoes/pilares' || path === '/configuracoes/series') return loadEditorial;
  if (path.startsWith('/configuracoes/pilares/')) return loadPillarEdit;
  if (path === '/series') return loadSeries;
  if (path.includes('/roteiros')) return loadSeriesScripts;
  if (path === '/series/nova' || path.startsWith('/series/')) return loadSeriesEdit;
  if (path.startsWith('/configuracoes/plataformas') || path.startsWith('/configuracoes/horarios')) return loadPlatforms;
  if (path.startsWith('/configuracoes/templates')) return loadSeries;
  if (path.startsWith('/configuracoes')) return loadSettings;
  return null;
}

/** Warm the chunk for a nav target. Safe to call repeatedly. */
export function prefetchRoute(href: string) {
  const loader = loaderForPath(href);
  if (loader) start(loader);
}

/** Warm the sidebar destinations after the shell is on screen. */
export function prefetchPrimaryRoutes() {
  for (const loader of PRIMARY_LOADERS) start(loader);
}
