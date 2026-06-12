import { Suspense, lazy, useEffect, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { getModuleFlags } from '../../features/settings/lib/moduleFlags';
import type { AppDataDomain } from '../../lib/database';
import { SettingsSubSidebar } from '../../layouts/settings/SettingsSubSidebar';

const Dashboard = lazy(() => import('../../pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Contents = lazy(() => import('../../pages/Contents').then(module => ({ default: module.Contents })));
const ContentDetail = lazy(() => import('../../pages/ContentDetail').then(module => ({ default: module.ContentDetail })));
const Ideas = lazy(() => import('../../pages/Ideas').then(module => ({ default: module.Ideas })));
const EditorialCalendar = lazy(() => import('../../pages/EditorialCalendar').then(module => ({ default: module.EditorialCalendar })));
const Programacao = lazy(() => import('../../pages/Programacao').then(module => ({ default: module.Programacao })));
const Biblioteca = lazy(() => import('../../pages/Biblioteca').then(module => ({ default: module.Biblioteca })));
const BookDetail = lazy(() => import('../../pages/BookDetail').then(module => ({ default: module.BookDetail })));
const Settings = lazy(() => import('../../pages/Settings').then(module => ({ default: module.Settings })));
const PerfilSettings = lazy(() => import('../../pages/settings/Perfil').then(module => ({ default: module.PerfilSettings })));
const PilaresSettings = lazy(() => import('../../pages/settings/Pilares').then(module => ({ default: module.PilaresSettings })));
const RegrasDeOuro = lazy(() => import('../../pages/settings/RegrasDeOuro').then(module => ({ default: module.RegrasDeOuro })));
const DNAVozSettings = lazy(() => import('../../pages/settings/DNAVoz').then(module => ({ default: module.DNAVozSettings })));
const SeriesSettings = lazy(() => import('../../pages/settings/Series').then(module => ({ default: module.SeriesSettings })));
const SeriesRoteiros = lazy(() => import('../../pages/settings/SeriesRoteiros').then(module => ({ default: module.SeriesRoteiros })));
const PlataformasSettings = lazy(() => import('../../pages/settings/Plataformas').then(module => ({ default: module.PlataformasSettings })));
const TemplatesSettings = lazy(() => import('../../pages/settings/Templates').then(module => ({ default: module.TemplatesSettings })));
const PostingTimesSettings = lazy(() => import('../../pages/settings/PostingTimes').then(module => ({ default: module.PostingTimesSettings })));
const Projetos = lazy(() => import('../../pages/Projetos').then(module => ({ default: module.Projetos })));
const ProjetoDetalhe = lazy(() => import('../../pages/ProjetoDetalhe').then(module => ({ default: module.ProjetoDetalhe })));
const Gravacao = lazy(() => import('../../pages/Gravacao').then(module => ({ default: module.Gravacao })));
const GravacaoBloco = lazy(() => import('../../pages/GravacaoBloco').then(module => ({ default: module.GravacaoBloco })));
const Analise = lazy(() => import('../../pages/Analise').then(module => ({ default: module.Analise })));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-[var(--radius-overlay)] border border-[var(--border-color)] bg-[var(--bg-primary)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
        Carregando modulo...
      </p>
    </div>
  );
}

function getRouteDataDomains(pathname: string): AppDataDomain[] {
  if (pathname.startsWith('/biblioteca')) return ['library', 'content'];
  if (pathname.startsWith('/conteudos/')) return ['content', 'production', 'library', 'recording'];
  if (pathname.startsWith('/conteudos')) return ['content', 'production', 'library'];
  if (pathname.startsWith('/ideias')) return ['ideas', 'production', 'library'];
  if (pathname.startsWith('/calendario')) return ['content', 'agenda', 'projects'];
  if (pathname.startsWith('/programacao')) return ['content', 'rules', 'bootstrap'];
  if (pathname.startsWith('/projetos')) return ['projects', 'agenda', 'content', 'library'];
  if (pathname.startsWith('/gravacao')) return ['content', 'production', 'recording'];
  if (pathname.startsWith('/analise')) return ['analytics', 'rules', 'production', 'content'];
  if (pathname.startsWith('/configuracoes/dna')) return ['voice', 'production'];
  if (pathname.startsWith('/configuracoes/pilares')) return ['production', 'content'];
  if (pathname.startsWith('/configuracoes/series/')) return ['production', 'content', 'bootstrap'];
  if (pathname.startsWith('/configuracoes/series')) return ['production'];
  if (pathname.startsWith('/configuracoes/templates')) return ['templates', 'production'];
  if (pathname.startsWith('/configuracoes/regras')) return ['rules', 'production', 'content'];
  if (pathname.startsWith('/configuracoes/plataformas')) return ['bootstrap'];
  return [];
}

export function AppRoutes() {
  const { state, ensureDataDomains } = useAppContext();
  const location = useLocation();
  const moduleFlags = getModuleFlags(state.preferences);
  const routeDataDomains = useMemo(() => getRouteDataDomains(location.pathname), [location.pathname]);

  useEffect(() => {
    if (routeDataDomains.length === 0) return;
    void ensureDataDomains(routeDataDomains);
  }, [ensureDataDomains, routeDataDomains]);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/conteudos" element={<Contents />} />
        <Route path="/conteudos/historico" element={<Navigate to="/conteudos?view=publicados" replace />} />
        <Route path="/conteudos/publicados" element={<Navigate to="/conteudos?view=publicados" replace />} />
        <Route path="/conteudos/:id" element={<ContentDetail />} />
        <Route path="/ideias" element={<Ideas />} />
        <Route
          path="/calendario"
          element={moduleFlags.calendar ? <EditorialCalendar /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/programacao"
          element={moduleFlags.calendar ? <Programacao /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/biblioteca"
          element={moduleFlags.library ? <Biblioteca /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/biblioteca/:id"
          element={moduleFlags.library ? <BookDetail /> : <Navigate to="/dashboard" replace />}
        />

        <Route
          path="/projetos"
          element={moduleFlags.projects ? <Projetos /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/projetos/:id"
          element={moduleFlags.projects ? <ProjetoDetalhe /> : <Navigate to="/dashboard" replace />}
        />

        <Route
          path="/gravacao"
          element={moduleFlags.recording ? <Gravacao /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/gravacao/:id"
          element={moduleFlags.recording ? <GravacaoBloco /> : <Navigate to="/dashboard" replace />}
        />

        <Route
          path="/analise"
          element={moduleFlags.analytics ? <Analise /> : <Navigate to="/dashboard" replace />}
        />

        <Route path="/configuracoes" element={<Settings />} />
        <Route
          path="/configuracoes/perfil"
          element={<SettingsSubSidebar><PerfilSettings /></SettingsSubSidebar>}
        />
        {/* Estúdio Editorial — no sub-sidebar */}
        <Route path="/configuracoes/pilares" element={<PilaresSettings />} />
        <Route path="/configuracoes/looks" element={<Navigate to="/configuracoes" replace />} />
        {/* Estúdio Editorial routes — no sub-sidebar, they live in the main sidebar nav */}
        <Route path="/configuracoes/regras" element={<RegrasDeOuro />} />
        <Route path="/configuracoes/dna" element={<DNAVozSettings />} />
        <Route path="/configuracoes/series" element={<SeriesSettings />} />
        <Route path="/configuracoes/series/:serieId/roteiros" element={<SeriesRoteiros />} />
        {/* System settings routes — use sub-sidebar */}
        <Route
          path="/configuracoes/plataformas"
          element={<SettingsSubSidebar><PlataformasSettings /></SettingsSubSidebar>}
        />
        <Route
          path="/configuracoes/templates"
          element={<SettingsSubSidebar><TemplatesSettings /></SettingsSubSidebar>}
        />
        <Route
          path="/configuracoes/horarios"
          element={<SettingsSubSidebar><PostingTimesSettings /></SettingsSubSidebar>}
        />

        <Route path="/contents" element={<Navigate to="/conteudos" replace />} />
        <Route path="/ideas" element={<Navigate to="/ideias" replace />} />
        <Route path="/editorial" element={<Navigate to="/calendario" replace />} />
        <Route path="/calendar" element={<Navigate to="/calendario" replace />} />
        <Route path="/results" element={<Navigate to="/analise" replace />} />
        <Route path="/settings/*" element={<Navigate to="/configuracoes" replace />} />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
