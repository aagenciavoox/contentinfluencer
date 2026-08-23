import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { AppShell } from '../../layouts/app/AppShell';
import { CampanhaPublicaPage } from '../../features/projects/pages/CampanhaPublicaPage';
import { LoginRoute, RequireAuth } from './RequireAuth';
import { ModuleRoute } from './ModuleRoute';
import { RouteDataBoundary } from './RouteDataBoundary';
import { LegacyCreationRedirect } from '../../features/creation/components/LegacyCreationRedirect';

const Creation = lazy(() => import('../../pages/Creation').then(module => ({ default: module.Creation })));
const ContentDetail = lazy(() => import('../../pages/ContentDetail').then(module => ({ default: module.ContentDetail })));
const EditorialCalendar = lazy(() => import('../../pages/EditorialCalendar').then(module => ({ default: module.EditorialCalendar })));
const Biblioteca = lazy(() => import('../../pages/Biblioteca').then(module => ({ default: module.Biblioteca })));
const Analise = lazy(() => import('../../pages/Analise').then(module => ({ default: module.Analise })));
const BookDetail = lazy(() => import('../../pages/BookDetail').then(module => ({ default: module.BookDetail })));
const Settings = lazy(() => import('../../pages/Settings').then(module => ({ default: module.Settings })));
const PerfilSettings = lazy(() => import('../../pages/settings/Perfil').then(module => ({ default: module.PerfilSettings })));
const PilaresSettings = lazy(() => import('../../pages/settings/Pilares').then(module => ({ default: module.PilaresSettings })));
const PilarEditar = lazy(() => import('../../pages/settings/PilarEditar').then(module => ({ default: module.PilarEditar })));
const SeriesSettings = lazy(() => import('../../pages/settings/Series').then(module => ({ default: module.SeriesSettings })));
const SeriesEditar = lazy(() => import('../../pages/settings/SeriesEditar').then(module => ({ default: module.SeriesEditar })));
const SeriesRoteiros = lazy(() => import('../../pages/settings/SeriesRoteiros').then(module => ({ default: module.SeriesRoteiros })));
const PlataformasSettings = lazy(() => import('../../pages/settings/Plataformas').then(module => ({ default: module.PlataformasSettings })));
const TemplatesSettings = lazy(() => import('../../pages/settings/Templates').then(module => ({ default: module.TemplatesSettings })));
const PostingTimesSettings = lazy(() => import('../../pages/settings/PostingTimes').then(module => ({ default: module.PostingTimesSettings })));
const LooksSettings = lazy(() => import('../../pages/settings/LooksScenarios').then(module => ({ default: module.LooksSettings })));
const Projetos = lazy(() => import('../../pages/Projetos').then(module => ({ default: module.Projetos })));
const ProjetoDetalhe = lazy(() => import('../../pages/ProjetoDetalhe').then(module => ({ default: module.ProjetoDetalhe })));
const Gravacao = lazy(() => import('../../pages/Gravacao').then(module => ({ default: module.Gravacao })));
const GravacaoBloco = lazy(() => import('../../pages/GravacaoBloco').then(module => ({ default: module.GravacaoBloco })));

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
              children: [
                { path: '/', element: <Navigate to="/criacao" replace /> },
                { path: '/dashboard', element: <Navigate to="/criacao" replace /> },
                { path: '/criacao', element: <Creation /> },
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
                {
                  path: '/programacao',
                  element: <Navigate to="/calendario?modo=agendar" replace />,
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
                { path: '/configuracoes/pilares', element: <PilaresSettings /> },
                { path: '/configuracoes/pilares/nova', element: <PilarEditar /> },
                { path: '/configuracoes/pilares/:pilarId/editar', element: <PilarEditar /> },
                { path: '/configuracoes/aparencia', element: <LooksSettings /> },
                { path: '/configuracoes/looks', element: <Navigate to="/configuracoes/aparencia" replace /> },
                { path: '/configuracoes/regras', element: <Navigate to="/configuracoes/pilares" replace /> },
                { path: '/configuracoes/series', element: <SeriesSettings /> },
                { path: '/configuracoes/series/nova', element: <SeriesEditar /> },
                { path: '/configuracoes/series/:serieId/editar', element: <SeriesEditar /> },
                { path: '/configuracoes/series/:serieId/roteiros', element: <SeriesRoteiros /> },
                { path: '/configuracoes/plataformas', element: <PlataformasSettings /> },
                { path: '/configuracoes/templates', element: <TemplatesSettings /> },
                { path: '/configuracoes/horarios', element: <PostingTimesSettings /> },
                { path: '/contents', element: <LegacyCreationRedirect source="contents" /> },
                { path: '/ideas', element: <LegacyCreationRedirect source="ideas" /> },
                { path: '/editorial', element: <Navigate to="/calendario" replace /> },
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
