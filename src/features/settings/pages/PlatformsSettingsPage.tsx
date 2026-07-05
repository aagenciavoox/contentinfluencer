import {useState} from 'react';
import {MonitorSpeaker, Plus, Trash2} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import type {Platform} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';
import {BottomSheet} from '../../../components/overlays/BottomSheet';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {PlatformsMobileScreen} from '../../../mobile/screens/settings/PlatformsMobileScreen';
import {generateUUID} from '../../../utils/uuid';
import {notifySaveFeedback} from '../../../lib/saveFeedback';

const PADROES = ['Instagram', 'TikTok', 'YouTube', 'Blog'];

export function PlatformsSettingsPage() {
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
  const isMobile = useIsMobile();

  const [novoNome, setNovoNome] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const createPlatform = async (nome: string) => {
    const trimmed = nome.trim();
    if (!trimmed) return;
    if (!user?.id) {
      notifySaveFeedback({
        status: 'error',
        message: 'Faça login para salvar plataformas.',
      });
      return;
    }

    const platform: Platform = {
      id: generateUUID(),
      userId: user.id,
      nome: trimmed,
      ativo: true,
      createdAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await dispatch({type: 'ADD_PLATFORM', payload: platform});
      setNovoNome('');
      setShowForm(false);
    } catch {
      // feedback já exibido pelo AppContext
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = () => {
    void createPlatform(novoNome);
  };

  const toggleAtivo = async (platform: Platform) => {
    if (isPadrao(platform.nome) || !user?.id) return;
    try {
      await dispatch({type: 'UPDATE_PLATFORM', payload: {...platform, ativo: !platform.ativo}});
    } catch {
      // feedback já exibido pelo AppContext
    }
  };

  const removePlatform = async (platformId: string) => {
    if (!user?.id) return;
    try {
      await dispatch({type: 'DELETE_PLATFORM', payload: platformId});
    } catch {
      // feedback já exibido pelo AppContext
    }
  };

  const isPadrao = (nome: string) => PADROES.includes(nome);

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <PlatformsMobileScreen
          platforms={state.platforms}
          isPadrao={isPadrao}
          onAdd={platformName => {
            void createPlatform(platformName);
          }}
          onToggle={platform => {
            void toggleAtivo(platform);
          }}
          onDelete={platformId => {
            void removePlatform(platformId);
          }}
        />
      </div>
    );
  }

  return (
    <PageLayout
      variant="settings"
      header={
        <DesktopPageHeader
          section="Configurações"
          title="Plataformas"
          icon={MonitorSpeaker}
          backLabel="Configurações"
          backTo="/configuracoes"
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
      }
    >
        <BottomSheet
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setNovoNome('');
          }}
          desktopMaxW="max-w-md"
        >
          <OverlayHeader
            title="Nova plataforma"
            onClose={() => {
              setShowForm(false);
              setNovoNome('');
            }}
          />
          <OverlayBody>
            <div className="flex flex-col gap-4">
              <input
                autoFocus
                value={novoNome}
                onChange={event => setNovoNome(event.target.value)}
                onKeyDown={event => event.key === 'Enter' && handleAdd()}
                placeholder="Nome da plataforma"
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setNovoNome('');
                  }}
                  className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-xs font-semibold opacity-60 hover:opacity-90"
                >
                  Cancelar
                </button>
                <AppButton onClick={handleAdd} disabled={!novoNome.trim() || isSaving || !user?.id} variant="primary">
                  {isSaving ? 'Salvando...' : 'Criar'}
                </AppButton>
              </div>
            </div>
          </OverlayBody>
        </BottomSheet>

        <div className="stack-xl">
          <div className="surface-quiet px-6 py-4">
            <span className="eyebrow-label">Leitura histórica</span>
            <Text variant="body" className="mt-2 text-[var(--text-secondary)]">
              Plataformas inativas continuam disponíveis para leitura de dados antigos. Só os seletores de criação e edição devem limitar o uso às plataformas ativas.
            </Text>
          </div>

          <section className="stack-xs">
            <header className="px-2">
              <span className="eyebrow-label">Plataformas</span>
            </header>

            {state.platforms.length === 0 ? (
              <div className="py-16 text-center">
                <MonitorSpeaker className="mx-auto mb-3 h-10 w-10 text-[var(--text-tertiary)] opacity-40" />
                <Text variant="body" className="text-[var(--text-tertiary)]">
                  Nenhuma plataforma ainda
                </Text>
              </div>
            ) : (
              <div className="surface-quiet divide-y divide-[var(--border-color)]">
                {state.platforms.map(platform => (
                  <div key={platform.id} className="flex items-center gap-4 px-6 py-3.5">
                    <div className="min-w-0 flex-1">
                      <Text variant="bodyStrong" truncate>
                        {platform.nome}
                      </Text>
                      {isPadrao(platform.nome) && (
                        <Text variant="meta" className="mt-0.5">
                          Padrão
                        </Text>
                      )}
                      {!platform.ativo && (
                        <Text variant="meta" className="mt-0.5">
                          Inativa para criação, mas preservada para leitura histórica
                        </Text>
                      )}
                    </div>
                    <button
                      onClick={() => toggleAtivo(platform)}
                      disabled={isPadrao(platform.nome)}
                      className={cn(
                        'rounded-[var(--radius-pill)] px-3 py-1 text-xs font-semibold transition-all',
                        platform.ativo
                          ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]'
                          : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]',
                        isPadrao(platform.nome) && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {platform.ativo ? 'Ativa' : 'Inativa'}
                    </button>
                    {!isPadrao(platform.nome) && (
                      <button
                        onClick={() => {
                          void removePlatform(platform.id);
                        }}
                        className="rounded-[var(--radius-input)] p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--accent-pink)]/10 hover:text-[var(--accent-pink)]"
                        aria-label="Remover plataforma"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
    </PageLayout>
  );
}
