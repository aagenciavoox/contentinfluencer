import { useNavigate } from 'react-router-dom';
import { Palette, Shirt, ShieldCheck, ChevronRight, Settings as SettingsIcon, Fingerprint, Layers, Layout, MonitorSpeaker } from 'lucide-react';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { AppButton } from '../components/common/AppButton';

export function Settings() {
  const navigate = useNavigate();

  const items = [
    {
      to: '/configuracoes/dna',
      icon: Fingerprint,
      title: 'DNA da Voz',
      desc: 'Promessa central, público, tom de voz e limites do seu conteúdo',
    },
    {
      to: '/configuracoes/pilares',
      icon: Palette,
      title: 'Pilares Editoriais',
      desc: 'Gerencie os pilares de conteúdo, cores e hashtag combos por plataforma',
    },
    {
      to: '/configuracoes/looks',
      icon: Shirt,
      title: 'Looks & Cenários',
      desc: 'Catálogo de looks de gravação e cenários disponíveis',
    },
    {
      to: '/configuracoes/regras',
      icon: ShieldCheck,
      title: 'Regras de Ouro',
      desc: 'Validações editoriais que garantem consistência e qualidade da grade',
    },
    {
      to: '/configuracoes/series',
      icon: Layers,
      title: 'Séries',
      desc: 'Gerencie séries editoriais recorrentes com estrutura e frequência definidas',
    },
    {
      to: '/configuracoes/plataformas',
      icon: MonitorSpeaker,
      title: 'Plataformas',
      desc: 'Ative ou desative as plataformas onde você publica conteúdo',
    },
    {
      to: '/configuracoes/templates',
      icon: Layout,
      title: 'Templates de Roteiro',
      desc: 'Modelos de roteiro reutilizáveis por série ou formato',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Sistema"
          title="Configurações"
          subtitle="Centralize as regras e definições que moldam o comportamento do seu sistema."
          icon={SettingsIcon}
        />
      </div>

      <div className="desktop-content-frame">

        <div className="space-y-3">
          {items.map(({ to, icon: Icon, title, desc }) => (
            <AppButton
              key={to}
              onClick={() => navigate(to)}
              variant="ghost"
              size="lg"
              fullWidth
              className="group h-auto justify-start gap-5 border border-[#E5E7EB] px-5 py-4 text-left normal-case tracking-normal"
            >
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-[var(--text-primary)] opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[var(--text-primary)]">{title}</p>
                <p className="text-xs text-[var(--text-secondary)] opacity-50 mt-0.5">{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-primary)] opacity-20 group-hover:opacity-50 transition-opacity shrink-0" />
            </AppButton>
          ))}
        </div>
      </div>
    </div>
  );
}
