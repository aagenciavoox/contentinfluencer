import { Navigate, Route, Routes } from 'react-router-dom';
import { Contents } from '../pages/Contents';
import { Ideas } from '../pages/Ideas';
import { EditorialCalendar } from '../pages/EditorialCalendar';
import { Biblioteca } from '../pages/Biblioteca';
import { BookDetail } from '../pages/BookDetail';
import { Settings } from '../pages/Settings';
import { PilaresSettings } from '../pages/settings/Pilares';
import { LooksSettings } from '../pages/settings/LooksScenarios';
import { RegrasDeOuro } from '../pages/settings/RegrasDeOuro';
import { DNAVozSettings } from '../pages/settings/DNAVoz';
import { SeriesSettings } from '../pages/settings/Series';
import { PlataformasSettings } from '../pages/settings/Plataformas';
import { TemplatesSettings } from '../pages/settings/Templates';
import { Projetos } from '../pages/Projetos';
import { ProjetoDetalhe } from '../pages/ProjetoDetalhe';
import { Gravacao } from '../pages/Gravacao';
import { GravacaoBloco } from '../pages/GravacaoBloco';
import { Analise } from '../pages/Analise';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/conteudos" replace />} />
      <Route path="/conteudos" element={<Contents />} />
      <Route path="/ideias" element={<Ideas />} />
      <Route path="/calendario" element={<EditorialCalendar />} />
      <Route path="/biblioteca" element={<Biblioteca />} />
      <Route path="/biblioteca/:id" element={<BookDetail />} />

      <Route path="/projetos" element={<Projetos />} />
      <Route path="/projetos/:id" element={<ProjetoDetalhe />} />

      <Route path="/gravacao" element={<Gravacao />} />
      <Route path="/gravacao/:id" element={<GravacaoBloco />} />

      <Route path="/analise" element={<Analise />} />

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

      <Route path="*" element={<Navigate to="/conteudos" replace />} />
    </Routes>
  );
}
