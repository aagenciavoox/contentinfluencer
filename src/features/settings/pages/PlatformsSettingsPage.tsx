import {useState} from 'react';
import {Lock, MonitorSpeaker, Plus} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import type {Platform} from '../../../lib/database';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {AppButton} from '../../../components/ui/AppButton';
import {MoreMenu} from '../../../components/ui/MoreMenu';
import {Text} from '../../../components/ui/Text';
import {Dialog} from '../../../components/overlays/Dialog';
import {OverlayHeader} from '../../../components/overlays/OverlayHeader';
import {OverlayBody} from '../../../components/overlays/OverlayBody';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {PlatformsMobileScreen} from '../../../mobile/screens/settings/PlatformsMobileScreen';
import {PostingTimesEditor} from '../components/PostingTimesEditor';
import {MobileToggleSwitch} from '../../../mobile/components/MobileToggleSwitch';
import {generateUUID} from '../../../utils/uuid';
import {notifySaveFeedback} from '../../../lib/saveFeedback';
import {CONFIRM, type ConfirmState} from '../../../lib/uiCopy';
import {platformDisplayName, platformKey} from '../../../components/ui/platformName';

const PADROES = ['Instagram', 'TikTok', 'YouTube', 'Blog'];
const PADRAO_KEYS = new Set(PADROES.map(platformKey));
const PADRAO_LOCK_REASON = 'Canal padrão: permanece ligado para criação e leitura histórica.';
const HISTORICAL_READING_META =
  'Plataformas inativas continuam disponíveis para leitura de dados antigos. Os horários de postagem ficam nesta mesma tela, com uma aba global e uma por canal ativo.';

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
        message: 'Entre na conta para salvar plataformas.',
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

  const isPadrao = (nome: string) => PADRAO_KEYS.has(platformKey(nome));

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
            padraoLockReason={PADRAO_LOCK_REASON}
            historicalReadingMeta={HISTORICAL_READING_META}
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
          title="Plataformas e horários"
          icon={MonitorSpeaker}
          backLabel="Configurações"
          backTo="/configuracoes"
          actions={
            <AppButton
              onClick={() => setShowForm(true)}
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Nova plataforma
            </AppButton>
          }
        />
      }
    >
        <Dialog open={showForm} onClose={closeForm} desktopMaxW="max-w-md">
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
                  placeholder="Ex.: Instagram, TikTok"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <AppButton type="button" onClick={closeForm} variant="secondary">
                  Cancelar
                </AppButton>
                <AppButton onClick={handleAdd} disabled={!novoNome.trim() || isSaving || !user?.id} variant="primary">
                  {isSaving ? 'Salvando…' : 'Adicionar plataforma'}
                </AppButton>
              </div>
            </div>
          </OverlayBody>
        </Dialog>

        <div className="stack-xl">
          <section className="stack-xs">
            <header className="px-2">
              <Text variant="eyebrow">Plataformas</Text>
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
                  const displayName = platformDisplayName(platform.nome);
                  const lockedOn = padrao || platform.ativo;
                  return (
                    <div key={platform.id} className="flex items-center gap-4 px-6 py-3.5">
                      <div className="min-w-0 flex-1">
                        <Text variant="bodyStrong" truncate>
                          {displayName}
                        </Text>
                        {padrao && (
                          <Text variant="meta" className="mt-0.5">
                            Padrão
                          </Text>
                        )}
                        {!platform.ativo && !padrao && (
                          <Text variant="meta" className="mt-0.5">
                            Inativa para criação, mas preservada para leitura histórica
                          </Text>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-2"
                        title={padrao ? PADRAO_LOCK_REASON : undefined}
                      >
                        {padrao ? (
                          <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                        ) : null}
                        <Text variant="meta">
                          {lockedOn ? 'Ativa' : 'Inativa'}
                        </Text>
                        <MobileToggleSwitch
                          enabled={lockedOn}
                          onToggle={() => {
                            void toggleAtivo(platform);
                          }}
                          label={displayName}
                          className={padrao ? 'pointer-events-none' : undefined}
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
            <Text variant="meta" className="block px-2">
              {HISTORICAL_READING_META}
            </Text>
          </section>

          <section className="stack-xs">
            <header className="px-2">
              <span className="eyebrow-label">Horários de postagem</span>
            </header>
            <PostingTimesEditor />
          </section>
        </div>
        {confirmModal}
    </PageLayout>
  );
}
