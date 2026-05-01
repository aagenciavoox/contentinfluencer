import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {MonitorSpeaker, Plus} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import type {Platform} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {AppButton} from '../../../components/ui/AppButton';

const PADROES = ['Instagram', 'TikTok', 'YouTube', 'Blog'];

export function PlatformsSettingsPage() {
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
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
    dispatch({type: 'ADD_PLATFORM', payload: platform});
    setNovoNome('');
    setShowForm(false);
  };

  const toggleAtivo = (platform: Platform) => {
    if (isPadrao(platform.nome)) return;
    dispatch({type: 'UPDATE_PLATFORM', payload: {...platform, ativo: !platform.ativo}});
  };

  const isPadrao = (nome: string) => PADROES.includes(nome);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <header className="desktop-header-sticky transition-colors duration-300">
        <div className="desktop-header-frame">
          <DesktopPageHeader
            section="Configurações"
            title="Plataformas"
            subtitle="Ative os canais da operação e preserve referências históricas mesmo quando uma plataforma sair do fluxo de criação."
            icon={MonitorSpeaker}
            backLabel="Configurações"
            onBack={() => navigate('/configuracoes')}
            actions={
              <AppButton
                onClick={() => setShowForm(true)}
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Adicionar
              </AppButton>
            }
          />
        </div>
      </header>

      <div className="desktop-content-frame">
        {showForm && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-5">
            <input
              autoFocus
              value={novoNome}
              onChange={event => setNovoNome(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && handleAdd()}
              placeholder="Nome da plataforma"
              className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
            />
            <AppButton onClick={handleAdd} disabled={!novoNome.trim()} variant="primary">
              Criar
            </AppButton>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80"
            >
              ✕
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-50">
              Leitura histórica
            </p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Plataformas inativas continuam disponíveis para leitura de dados antigos. Só os seletores de criação e edição devem limitar o uso às plataformas ativas.
            </p>
          </div>

          {state.platforms.length === 0 && (
            <div className="py-16 text-center">
              <MonitorSpeaker className="mx-auto mb-3 h-10 w-10 opacity-10" />
              <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhuma plataforma ainda</p>
            </div>
          )}

          {state.platforms.map(platform => (
            <div
              key={platform.id}
              className="flex items-center gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--text-primary)]">{platform.nome}</p>
                {isPadrao(platform.nome) && (
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest opacity-30">Padrão</p>
                )}
                {!platform.ativo && (
                  <p className="mt-1 text-[10px] font-bold text-[var(--text-secondary)] opacity-50">
                    Inativa para criação, mas preservada para leitura histórica
                  </p>
                )}
              </div>
              <button
                onClick={() => toggleAtivo(platform)}
                disabled={isPadrao(platform.nome)}
                className={cn(
                  'rounded-full px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all',
                  platform.ativo ? 'bg-green-400/10 text-green-400' : 'bg-zinc-800 text-zinc-500',
                  isPadrao(platform.nome) && 'cursor-not-allowed opacity-50'
                )}
              >
                {platform.ativo ? 'Ativa' : 'Inativa'}
              </button>
              {!isPadrao(platform.nome) && (
                <button
                  onClick={() => dispatch({type: 'DELETE_PLATFORM', payload: platform.id})}
                  className="px-2 text-[10px] font-black uppercase tracking-widest opacity-20 transition-all hover:text-red-400 hover:opacity-60"
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
