import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Shirt, ShieldCheck, ChevronRight, Settings as SettingsIcon, Rocket, Fingerprint } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { ConfirmModal } from '../components/ConfirmModal';

export function Settings() {
  const navigate = useNavigate();
  const { dispatch } = useAppContext();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleResetOnboarding = () => {
    setConfirmOpen(true);
  };

  const items = [
    {
      to: '/settings/dna',
      icon: Fingerprint,
      title: 'DNA da Voz',
      desc: 'Promessa central, público, tom de voz e limites do seu conteúdo',
    },
    {
      to: '/settings/pilares',
      icon: Palette,
      title: 'Pilares Editoriais',
      desc: 'Gerencie os pilares de conteúdo, cores e hashtag combos por plataforma',
    },
    {
      to: '/settings/looks',
      icon: Shirt,
      title: 'Looks & Cenários',
      desc: 'Catálogo de looks de gravação e cenários disponíveis',
    },
    {
      to: '/settings/regras',
      icon: ShieldCheck,
      title: 'Regras de Ouro',
      desc: 'Validações editoriais que garantem consistência e qualidade da grade',
    },
  ];

  return (
    <>
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="content-narrow mx-auto px-6 md:px-12 py-10 md:py-16">
        <div className="mb-10">
          <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.4em] mb-2 italic">
            Sistema
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] leading-none tracking-tight flex items-center gap-4">
            <SettingsIcon className="w-10 h-10 opacity-20" />
            Configurações
          </h1>
        </div>

        <div className="space-y-3">
          {items.map(({ to, icon: Icon, title, desc }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="w-full flex items-center gap-5 px-6 py-5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl hover:border-[var(--text-primary)]/30 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-hover)] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-[var(--text-primary)] opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[var(--text-primary)]">{title}</p>
                <p className="text-xs text-[var(--text-secondary)] opacity-50 mt-0.5">{desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-primary)] opacity-20 group-hover:opacity-50 transition-opacity shrink-0" />
            </button>
          ))}

          <div className="pt-6 border-t border-[var(--border-color)] mt-8">
            <button
              onClick={handleResetOnboarding}
              className="w-full flex items-center gap-5 px-6 py-5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl hover:border-[var(--accent-blue)]/30 hover:shadow-sm transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent-blue)]/5 flex items-center justify-center shrink-0">
                <Rocket className="w-5 h-5 text-[var(--accent-blue)] opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[var(--accent-blue)] uppercase tracking-tight italic">Reiniciar Guia de Operação</p>
                <p className="text-[10px] text-[var(--text-secondary)] opacity-40 font-bold mt-0.5 uppercase tracking-widest">Teste o tutorial de primeiro acesso agora</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--accent-blue)] opacity-20 group-hover:opacity-50 transition-opacity shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
    <ConfirmModal
      open={confirmOpen}
      message="Deseja reiniciar o Guia de Configuração? Isso permitirá que você reavalie seus pilares e DNA da voz agora mesmo."
      confirmLabel="Reiniciar"
      onConfirm={() => {
        dispatch({ type: 'SET_ONBOARDING_COMPLETO', payload: false });
        setConfirmOpen(false);
        navigate('/');
      }}
      onCancel={() => setConfirmOpen(false)}
    />
    </>
  );
}
