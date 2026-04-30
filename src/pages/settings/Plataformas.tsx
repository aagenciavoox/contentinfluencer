import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MonitorSpeaker } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import type { Platform } from '../../lib/database';
import { cn } from '../../lib/utils';
import { DesktopPageHeader } from '../../components/layout/DesktopPageHeader';

const PADROES = ['Instagram', 'TikTok', 'YouTube', 'Blog'];

export function PlataformasSettings() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [novoNome, setNovoNome] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleAdd = () => {
    if (!novoNome.trim()) return;
    const platform: Platform = {
      id: crypto.randomUUID(),
      userId: user?.id || null,
      nome: novoNome.trim(),
      ativo: true,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_PLATFORM', payload: platform });
    setNovoNome('');
    setShowForm(false);
  };

  const toggleAtivo = (platform: Platform) => {
    if (isPadrao(platform.nome)) return;
    dispatch({ type: 'UPDATE_PLATFORM', payload: { ...platform, ativo: !platform.ativo } });
  };

  const isPadrao = (nome: string) => PADROES.includes(nome);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Configurações"
          title="Plataformas"
          subtitle="Ative os canais da sua operação e controle onde cada conteúdo pode existir."
          icon={MonitorSpeaker}
          backLabel="Configurações"
          onBack={() => navigate('/configuracoes')}
          actions={(
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          )}
        />
      </div>

      <div className="desktop-content-frame">

        {/* Form adicionar */}
        {showForm && (
          <div className="mb-6 flex gap-3 p-5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
            <input
              autoFocus
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Nome da plataforma"
              className="flex-1 px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
            />
            <button onClick={handleAdd} disabled={!novoNome.trim()} className="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-30">Criar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80">✕</button>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-3">
          {state.platforms.length === 0 && (
            <div className="text-center py-16">
              <MonitorSpeaker className="w-10 h-10 mx-auto opacity-10 mb-3" />
              <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhuma plataforma ainda</p>
            </div>
          )}
          {state.platforms.map(platform => (
            <div
              key={platform.id}
              className="flex items-center gap-4 px-5 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[var(--text-primary)]">{platform.nome}</p>
                {isPadrao(platform.nome) && (
                  <p className="text-[9px] font-bold opacity-30 uppercase tracking-widest mt-0.5">Padrão</p>
                )}
              </div>
              <button
                onClick={() => toggleAtivo(platform)}
                disabled={isPadrao(platform.nome)}
                className={cn(
                  'px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all',
                  platform.ativo ? 'bg-green-400/10 text-green-400' : 'bg-zinc-800 text-zinc-500',
                  isPadrao(platform.nome) && 'cursor-not-allowed opacity-50'
                )}
              >
                {platform.ativo ? 'Ativa' : 'Inativa'}
              </button>
              {!isPadrao(platform.nome) && (
                <button
                  onClick={() => dispatch({ type: 'DELETE_PLATFORM', payload: platform.id })}
                  className="text-[10px] font-black uppercase tracking-widest opacity-20 hover:opacity-60 hover:text-red-400 transition-all px-2"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
