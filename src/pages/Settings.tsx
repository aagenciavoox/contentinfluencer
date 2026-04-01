import { useNavigate } from 'react-router-dom';
import { Palette, Shirt, ShieldCheck, ChevronRight, Settings as SettingsIcon } from 'lucide-react';

const items = [
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

export function Settings() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
        <div className="mb-10">
          <p className="text-[9px] font-black text-[var(--text-primary)] opacity-30 uppercase tracking-[0.4em] mb-2 italic">
            Sistema
          </p>
          <h1 className="text-5xl font-black text-[var(--text-primary)] leading-none tracking-tight flex items-center gap-4">
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
        </div>
      </div>
    </div>
  );
}
