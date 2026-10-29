import {importPage} from './chunkReload';
import {getRouteDataDomains} from './routeDataDomains';

type RouteLoader = () => Promise<unknown>;

const loadDashboard = () => importPage(() => import('../../pages/Dashboard'));
const loadCreation = () => importPage(() => import('../../pages/Creation'));
const loadCaptions = () => importPage(() => import('../../pages/Legendas'));
const loadTranscription = () => importPage(() => import('../../pages/Transcricao'));
const loadContentDetail = () => importPage(() => import('../../pages/ContentDetail'));
const loadCalendar = () => importPage(() => import('../../pages/EditorialCalendar'));
const loadPlanejamento = () => importPage(() => import('../../pages/Planejamento'));
const loadEditorial = () => importPage(() => import('../../pages/Editorial'));
const loadLibrary = () => importPage(() => import('../../pages/Biblioteca'));
const loadLibraryAnalysis = () => importPage(() => import('../../pages/Analise'));
const loadBookDetail = () => importPage(() => import('../../pages/BookDetail'));
const loadSettings = () => importPage(() => import('../../pages/Settings'));
const loadProfile = () => importPage(() => import('../../pages/settings/Perfil'));
const loadPillarEdit = () => importPage(() => import('../../pages/settings/PilarEditar'));
const loadSeries = () => importPage(() => import('../../pages/settings/Series'));
const loadSeriesEdit = () => importPage(() => import('../../pages/settings/SeriesEditar'));
const loadSeriesScripts = () => importPage(() => import('../../pages/settings/SeriesRoteiros'));
const loadPlatforms = () => importPage(() => import('../../pages/settings/Plataformas'));
const loadAnalises = () => importPage(() => import('../../pages/Analises'));
const loadProjects = () => importPage(() => import('../../pages/Projetos'));
const loadProjectDetail = () => importPage(() => import('../../pages/ProjetoDetalhe'));
const loadRecording = () => importPage(() => import('../../pages/Gravacao'));
const loadRecordingBlock = () => importPage(() => import('../../pages/GravacaoBloco'));

/** Same import functions React.lazy uses, so a prefetch fills the module cache. */
export const routeLoaders = {
  dashboard: loadDashboard,
  creation: loadCreation,
  captions: loadCaptions,
  transcription: loadTranscription,
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
  analises: loadAnalises,
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
  loadTranscription,
  loadCalendar,
  loadPlanejamento,
  loadEditorial,
  loadLibrary,
  loadSettings,
  loadSeries,
  loadAnalises,
  loadPlatforms,
  loadProjects,
  loadRecording,
  // Abertos pelo clique num card, não pelo menu. Sem isso a primeira abertura espera o chunk.
  loadContentDetail,
  loadBookDetail,
  loadProjectDetail,
  loadRecordingBlock,
];

function loaderForPath(pathname: string): RouteLoader | null {
  const path = pathname.split('#')[0].split('?')[0];

  if (path === '/hoje' || path === '/dashboard') return loadDashboard;
  if (path === '/criacao/legendas') return loadCaptions;
  if (path === '/criacao/transcricao') return loadTranscription;
  if (path.startsWith('/criacao') || path === '/conteudos') return loadCreation;
  if (path.startsWith('/conteudos/')) return loadContentDetail;
  if (path.startsWith('/calendario')) return loadCalendar;
  if (path.startsWith('/planejamento') || path.startsWith('/programacao')) return loadPlanejamento;
  if (path === '/editorial') return loadEditorial;
  if (path === '/editorial/pilares/nova' || path.startsWith('/editorial/pilares/')) return loadPillarEdit;
  if (path === '/editorial/series/nova' || path === '/series/nova') return loadSeriesEdit;
  if (path.startsWith('/editorial/series/')) return loadSeriesEdit;
  if (path === '/biblioteca/analise') return loadLibraryAnalysis;
  if (path === '/biblioteca') return loadLibrary;
  if (path.startsWith('/biblioteca/')) return loadBookDetail;
  if (path === '/projetos') return loadProjects;
  if (path.startsWith('/projetos/')) return loadProjectDetail;
  if (path === '/gravacao') return loadRecording;
  if (path.startsWith('/gravacao/')) return loadRecordingBlock;
  if (path === '/configuracoes/perfil') return loadProfile;
  if (path === '/configuracoes/pilares') return loadEditorial;
  if (path.startsWith('/configuracoes/pilares/')) return loadPillarEdit;
  if (path === '/configuracoes/series') return loadSeries;
  if (path.startsWith('/configuracoes/series/')) {
    return path.endsWith('/editar') || path.endsWith('/nova') ? loadSeriesEdit : loadSeriesScripts;
  }
  if (path === '/series') return loadSeries;
  if (path.startsWith('/series/') && path.endsWith('/editar')) return loadSeriesEdit;
  if (path.startsWith('/series/')) return loadSeriesScripts;
  if (path === '/contas' || path.startsWith('/configuracoes/plataformas') || path.startsWith('/configuracoes/horarios')) return loadPlatforms;
  if (path === '/analises') return loadAnalises;
  if (path.startsWith('/configuracoes/templates')) return loadSeries;
  if (path.startsWith('/configuracoes')) return loadSettings;
  return null;
}

/** Warm the chunk for a nav target. Safe to call repeatedly. */
export function prefetchRoute(href: string) {
  const loader = loaderForPath(href);
  if (loader) start(loader);
}

/** Chunk e dados da rota. O segundo argumento já ignora domínio em voo ou carregado. */
export function warmRoute(
  href: string,
  ensureDataDomains?: (domains: ReturnType<typeof getRouteDataDomains>) => Promise<void> | void,
) {
  prefetchRoute(href);
  if (!ensureDataDomains) return;
  const domains = getRouteDataDomains(href);
  if (domains.length === 0) return;
  void ensureDataDomains(domains);
}

/** Warm the sidebar destinations after the shell is on screen. */
export function prefetchPrimaryRoutes() {
  for (const loader of PRIMARY_LOADERS) start(loader);
}
