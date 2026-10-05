import { lazy } from 'react';
import { Navigate, useLocation, useParams, type RouteObject } from 'react-router-dom';
import { AppShell } from '../../layouts/app/AppShell';
import { CampanhaPublicaPage } from '../../features/projects/pages/CampanhaPublicaPage';
import { LoginRoute, RequireAuth } from './RequireAuth';
import { ModuleRoute } from './ModuleRoute';
import { RouteDataBoundary } from './RouteDataBoundary';
import { LegacyCreationRedirect } from '../../features/creation/components/LegacyCreationRedirect';
import { ChunkLoadError } from './ChunkLoadError';
import { routeLoaders } from './routePrefetch';

const Creation = lazy(() => routeLoaders.creation().then(module => ({ default: module.Creation })));
const Legendas = lazy(() => routeLoaders.captions().then(module => ({ default: module.Legendas })));
const ContentDetail = lazy(() => routeLoaders.contentDetail().then(module => ({ default: module.ContentDetail })));
const EditorialCalendar = lazy(() => routeLoaders.calendar().then(module => ({ default: module.EditorialCalendar })));
const Planejamento = lazy(() => routeLoaders.planejamento().then(module => ({ default: module.Planejamento })));
const Editorial = lazy(() => routeLoaders.editorial().then(module => ({ default: module.Editorial })));
const Biblioteca = lazy(() => routeLoaders.library().then(module => ({ default: module.Biblioteca })));
const Analise = lazy(() => routeLoaders.libraryAnalysis().then(module => ({ default: module.Analise })));
const BookDetail = lazy(() => routeLoaders.bookDetail().then(module => ({ default: module.BookDetail })));
const Settings = lazy(() => routeLoaders.settings().then(module => ({ default: module.Settings })));
const PerfilSettings = lazy(() => routeLoaders.profile().then(module => ({ default: module.PerfilSettings })));
const PilarEditar = lazy(() => routeLoaders.pillarEdit().then(module => ({ default: module.PilarEditar })));
const SeriesSettings = lazy(() => routeLoaders.series().then(module => ({ default: module.SeriesSettings })));
const SeriesEditar = lazy(() => routeLoaders.seriesEdit().then(module => ({ default: module.SeriesEditar })));
const SeriesRoteiros = lazy(() => routeLoaders.seriesScripts().then(module => ({ default: module.SeriesRoteiros })));
const PlataformasSettings = lazy(() => routeLoaders.platforms().then(module => ({ default: module.PlataformasSettings })));
const Projetos = lazy(() => routeLoaders.projects().then(module => ({ default: module.Projetos })));
const ProjetoDetalhe = lazy(() => routeLoaders.projectDetail().then(module => ({ default: module.ProjetoDetalhe })));
const Gravacao = lazy(() => routeLoaders.recording().then(module => ({ default: module.Gravacao })));
const GravacaoBloco = lazy(() => routeLoaders.recordingBlock().then(module => ({ default: module.GravacaoBloco })));
const Dashboard = lazy(() => routeLoaders.dashboard().then(module => ({ default: module.Dashboard })));

function LegacyPillarEditRedirect() {
  const { pilarId } = useParams<{ pilarId: string }>();
  const { search, hash } = useLocation();
  return <Navigate to={`/editorial/pilares/${pilarId ?? ''}${search}${hash}`} replace />;
}

function LegacySeriesEditRedirect() {
  const { serieId } = useParams<{ serieId: string }>();
  const { search, hash } = useLocation();
  return <Navigate to={`/editorial/series/${serieId ?? ''}${search}${hash}`} replace />;
}

export function buildAppRoutes(): RouteObject[] {
  return [
    {
      path: '/share/:token',
      element: <CampanhaPublicaPage />,
    },
    {
      path: '/login',
      element: <LoginRoute />,
    },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <AppShell />,
          children: [
            {
              element: <RouteDataBoundary />,
              errorElement: <ChunkLoadError />,
              children: [
                { path: '/', element: <Navigate to="/criacao" replace /> },
                { path: '/dashboard', element: <Navigate to="/criacao" replace /> },
                { path: '/hoje', element: <Dashboard /> },
                { path: '/criacao', element: <Creation /> },
                { path: '/criacao/legendas', element: <Legendas /> },
                { path: '/conteudos', element: <LegacyCreationRedirect source="contents" /> },
                { path: '/conteudos/historico', element: <LegacyCreationRedirect source="contents" /> },
                { path: '/conteudos/publicados', element: <LegacyCreationRedirect source="contents" /> },
                { path: '/conteudos/:id', element: <ContentDetail /> },
                { path: '/ideias', element: <LegacyCreationRedirect source="ideas" /> },
                {
                  path: '/calendario',
                  element: (
                    <ModuleRoute module="calendar">
                      <EditorialCalendar />
                    </ModuleRoute>
                  ),
                },
                { path: '/editorial', element: <Editorial /> },
                { path: '/editorial/pilares/nova', element: <PilarEditar /> },
                { path: '/editorial/pilares/:pilarId', element: <PilarEditar /> },
                { path: '/editorial/series/nova', element: <SeriesEditar /> },
                { path: '/editorial/series/:serieId', element: <SeriesEditar /> },
                {
                  path: '/planejamento',
                  element: (
                    <ModuleRoute module="calendar">
                      <Planejamento />
                    </ModuleRoute>
                  ),
                },
                {
                  path: '/programacao',
                  element: <Navigate to="/planejamento" replace />,
                },
                {
                  path: '/biblioteca',
                  element: (
                    <ModuleRoute module="library">
                      <Biblioteca />
                    </ModuleRoute>
                  ),
                },
                {
                  path: '/biblioteca/analise',
                  element: (
                    <ModuleRoute module="library">
                      <Analise />
                    </ModuleRoute>
                  ),
                },
                {
                  path: '/biblioteca/:id',
                  element: (
                    <ModuleRoute module="library">
                      <BookDetail />
                    </ModuleRoute>
                  ),
                },
                {
                  path: '/projetos',
                  element: (
                    <ModuleRoute module="projects">
                      <Projetos />
                    </ModuleRoute>
                  ),
                },
                {
                  path: '/projetos/:id',
                  element: (
                    <ModuleRoute module="projects">
                      <ProjetoDetalhe />
                    </ModuleRoute>
                  ),
                },
                {
                  path: '/gravacao',
                  element: (
                    <ModuleRoute module="recording">
                      <Gravacao />
                    </ModuleRoute>
                  ),
                },
                {
                  path: '/gravacao/:id',
                  element: (
                    <ModuleRoute module="recording">
                      <GravacaoBloco />
                    </ModuleRoute>
                  ),
                },
                { path: '/configuracoes', element: <Settings /> },
                { path: '/configuracoes/perfil', element: <PerfilSettings /> },
                { path: '/configuracoes/pilares', element: <Navigate to="/editorial?aba=pilares" replace /> },
                { path: '/configuracoes/pilares/nova', element: <Navigate to="/editorial/pilares/nova" replace /> },
                {
                  path: '/configuracoes/pilares/:pilarId/editar',
                  element: <LegacyPillarEditRedirect />,
                },
                { path: '/configuracoes/aparencia', element: <Navigate to="/configuracoes" replace /> },
                { path: '/configuracoes/looks', element: <Navigate to="/configuracoes" replace /> },
                { path: '/configuracoes/regras', element: <Navigate to="/editorial?aba=pilares" replace /> },
                { path: '/series', element: <SeriesSettings /> },
                { path: '/series/nova', element: <Navigate to="/editorial/series/nova" replace /> },
                { path: '/series/:serieId/editar', element: <LegacySeriesEditRedirect /> },
                { path: '/series/:serieId/roteiros', element: <SeriesRoteiros /> },
                { path: '/configuracoes/series', element: <Navigate to="/editorial?aba=series" replace /> },
                { path: '/configuracoes/series/nova', element: <Navigate to="/editorial/series/nova" replace /> },
                {
                  path: '/configuracoes/series/:serieId/editar',
                  element: <LegacySeriesEditRedirect />,
                },
                {
                  path: '/configuracoes/series/:serieId/roteiros',
                  element: <SeriesRoteiros />,
                },
                { path: '/configuracoes/plataformas', element: <PlataformasSettings /> },
                { path: '/configuracoes/templates', element: <Navigate to="/series" replace /> },
                { path: '/configuracoes/horarios', element: <Navigate to="/configuracoes/plataformas" replace /> },
                { path: '/contents', element: <LegacyCreationRedirect source="contents" /> },
                { path: '/ideas', element: <LegacyCreationRedirect source="ideas" /> },
                { path: '/analise', element: <Navigate to="/biblioteca/analise" replace /> },
                { path: '/calendar', element: <Navigate to="/calendario" replace /> },
                { path: '/results', element: <Navigate to="/criacao" replace /> },
                { path: '/configuracoes/dna', element: <Navigate to="/criacao" replace /> },
                { path: '/settings/*', element: <Navigate to="/configuracoes" replace /> },
                { path: '*', element: <Navigate to="/criacao" replace /> },
              ],
            },
          ],
        },
      ],
    },
  ];
}
