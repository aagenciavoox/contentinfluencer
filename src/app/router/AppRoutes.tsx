import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { getModuleFlags } from '../../features/settings/lib/moduleFlags';

const Dashboard = lazy(() => import('../../pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Contents = lazy(() => import('../../pages/Contents').then(module => ({ default: module.Contents })));
const ContentHistory = lazy(() => import('../../pages/ContentHistory').then(module => ({ default: module.ContentHistory })));
const Ideas = lazy(() => import('../../pages/Ideas').then(module => ({ default: module.Ideas })));
const EditorialCalendar = lazy(() => import('../../pages/EditorialCalendar').then(module => ({ default: module.EditorialCalendar })));
const Biblioteca = lazy(() => import('../../pages/Biblioteca').then(module => ({ default: module.Biblioteca })));
const BookDetail = lazy(() => import('../../pages/BookDetail').then(module => ({ default: module.BookDetail })));
const Settings = lazy(() => import('../../pages/Settings').then(module => ({ default: module.Settings })));
const PilaresSettings = lazy(() => import('../../pages/settings/Pilares').then(module => ({ default: module.PilaresSettings })));
const LooksSettings = lazy(() => import('../../pages/settings/LooksScenarios').then(module => ({ default: module.LooksSettings })));
const RegrasDeOuro = lazy(() => import('../../pages/settings/RegrasDeOuro').then(module => ({ default: module.RegrasDeOuro })));
const DNAVozSettings = lazy(() => import('../../pages/settings/DNAVoz').then(module => ({ default: module.DNAVozSettings })));
const SeriesSettings = lazy(() => import('../../pages/settings/Series').then(module => ({ default: module.SeriesSettings })));
const PlataformasSettings = lazy(() => import('../../pages/settings/Plataformas').then(module => ({ default: module.PlataformasSettings })));
const TemplatesSettings = lazy(() => import('../../pages/settings/Templates').then(module => ({ default: module.TemplatesSettings })));
const Projetos = lazy(() => import('../../pages/Projetos').then(module => ({ default: module.Projetos })));
const ProjetoDetalhe = lazy(() => import('../../pages/ProjetoDetalhe').then(module => ({ default: module.ProjetoDetalhe })));
const Gravacao = lazy(() => import('../../pages/Gravacao').then(module => ({ default: module.Gravacao })));
const GravacaoBloco = lazy(() => import('../../pages/GravacaoBloco').then(module => ({ default: module.GravacaoBloco })));
const Analise = lazy(() => import('../../pages/Analise').then(module => ({ default: module.Analise })));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
        Carregando modulo...
      </p>
    </div>
  );
}

export function AppRoutes() {
  const { state } = useAppContext();
  const moduleFlags = getModuleFlags(state.preferences);

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/conteudos" element={<Contents />} />
        <Route path="/conteudos/historico" element={<ContentHistory />} />
        <Route path="/ideias" element={<Ideas />} />
        <Route
          path="/calendario"
          element={moduleFlags.calendar ? <EditorialCalendar /> : <Navigate to="/dashboard" replace />}
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
        <Route path="/configuracoes/pilares" element={<PilaresSettings />} />
        <Route path="/configuracoes/looks" element={<LooksSettings />} />
        <Route path="/configuracoes/regras" element={<RegrasDeOuro />} />
        <Route path="/configuracoes/dna" element={<DNAVozSettings />} />
        <Route path="/configuracoes/series" element={<SeriesSettings />} />
        <Route path="/configuracoes/plataformas" element={<PlataformasSettings />} />
        <Route path="/configuracoes/templates" element={<TemplatesSettings />} />

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
