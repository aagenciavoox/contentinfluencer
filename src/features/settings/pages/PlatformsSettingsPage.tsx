import {useState} from 'react';
import {MonitorSpeaker, Plus} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import type {Platform} from '../../../lib/database';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {AppButton} from '../../../components/ui/AppButton';
import {MoreMenu} from '../../../components/ui/MoreMenu';
import {Text} from '../../../components/ui/Text';
import {BottomSheet} from '../../../components/overlays/BottomSheet';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {PlatformsMobileScreen} from '../../../mobile/screens/settings/PlatformsMobileScreen';
import {MobileToggleSwitch} from '../../../mobile/components/MobileToggleSwitch';
import {generateUUID} from '../../../utils/uuid';
import {notifySaveFeedback} from '../../../lib/saveFeedback';
import {CONFIRM, type ConfirmState} from '../../../lib/uiCopy';

const PADROES = ['Instagram', 'TikTok', 'YouTube', 'Blog'];

export function PlatformsSettingsPage() {
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
  const isMobile = useIsMobile();

  const [novoNome, setNovoNome] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const closeForm = () => {
    setShowForm(false);
    setNovoNome('');
  };

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

  const handleDelete = (platformId: string) => {
    setConfirm({
      ...CONFIRM.excluirPlataforma,
      onConfirm: () => {
        void removePlatform(platformId);
      },
    });
  };

  const isPadrao = (nome: string) => PADROES.includes(nome);

  const confirmModal = (
    <ConfirmModal
      open={!!confirm}
      message={confirm?.message || ''}
      confirmLabel={confirm?.confirmLabel}
      cancelLabel={confirm?.cancelLabel}
      onConfirm={() => {
        confirm?.onConfirm();
        setConfirm(null);
      }}
      onCancel={() => setConfirm(null)}
    />
  );

  if (isMobile) {
    return (
      <>
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
              handleDelete(platformId);
            }}
          />
        </div>
        {confirmModal}
      </>
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
        <BottomSheet open={showForm} onClose={closeForm} desktopMaxW="max-w-md">
          <OverlayHeader title="Nova plataforma" onClose={closeForm} />
          <OverlayBody>
            <div className="flex flex-col gap-4">
              <div className="stack-sm">
                <label htmlFor="nova-plataforma-nome" className="t-label text-[var(--text-tertiary)]">
                  Nome
                </label>
                <input
                  id="nova-plataforma-nome"
                  autoFocus
                  value={novoNome}
                  onChange={event => setNovoNome(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && handleAdd()}
                  placeholder="Ex: Instagram, TikTok"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
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
                {state.platforms.map(platform => {
                  const padrao = isPadrao(platform.nome);
                  return (
                    <div key={platform.id} className="flex items-center gap-4 px-6 py-3.5">
                      <div className="min-w-0 flex-1">
                        <Text variant="bodyStrong" truncate>
                          {platform.nome}
                        </Text>
                        {padrao && (
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
                      <div className="flex items-center gap-2">
                        <Text variant="meta" className="text-[var(--text-secondary)]">
                          {platform.ativo ? 'Ativa' : 'Inativa'}
                        </Text>
                        <MobileToggleSwitch
                          enabled={platform.ativo}
                          onToggle={() => {
                            void toggleAtivo(platform);
                          }}
                          label={platform.nome}
                          className={padrao ? 'pointer-events-none opacity-50' : undefined}
                        />
                      </div>
                      {!padrao ? (
                        <MoreMenu
                          size="sm"
                          items={[
                            {
                              label: CONFIRM.excluirPlataforma.confirmLabel,
                              tone: 'danger',
                              onClick: () => handleDelete(platform.id),
                            },
                          ]}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
        {confirmModal}
    </PageLayout>
  );
}
