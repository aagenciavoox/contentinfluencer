import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette, Plus } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { PillarsMobileScreen } from '../../../mobile/screens/settings/PillarsMobileScreen';
import { sortPilares } from '../lib/activePilares';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';

export function PillarsSettingsPage() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const sortedPilares = useMemo(() => sortPilares(state.pilares), [state.pilares]);

  const contentCountByPilar = useMemo(() => {
    const map = new Map<string, number>();
    for (const content of state.contents) {
      if (content.pilarId) {
        map.set(content.pilarId, (map.get(content.pilarId) || 0) + 1);
      }
    }
    return map;
  }, [state.contents]);

  const openCreatePage = () => navigate('/configuracoes/pilares/nova');
  const openEditPage = (pilarId: string) => navigate(`/configuracoes/pilares/${pilarId}/editar`);

  const handleToggleActive = (pilar: (typeof state.pilares)[number]) => {
    dispatch({ type: 'UPDATE_PILAR', payload: { ...pilar, ativo: !pilar.ativo } });
  };

  const handleDelete = (id: string) => {
    setConfirm({
      ...CONFIRM.excluirPilar,
      onConfirm: () => dispatch({ type: 'DELETE_PILAR', payload: id }),
    });
  };

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <PillarsMobileScreen
            pilares={state.pilares}
            onCreate={openCreatePage}
            onEdit={openEditPage}
            onToggle={handleToggleActive}
            onDelete={(pilarId) => handleDelete(pilarId)}
          />
        </div>
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
      </>
    );
  }

  return (
    <SettingsPageScaffold
      title="Pilares editoriais"
      icon={Palette}
      actions={
        <AppButton
          onClick={openCreatePage}
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Novo
        </AppButton>
      }
    >
      <Text variant="secondary" className="mb-4">
        Pilares organizam temas, ritmo editorial e publicação por plataforma. Frequência semanal, meta do ciclo, dias e hashtags ficam aqui.
      </Text>

      {state.pilares.length === 0 ? (
        <EmptyState
          icon={<Palette className="h-8 w-8" />}
          title="Nenhum pilar cadastrado"
          description="Adicione o primeiro pilar para organizar os temas editoriais."
          action={
            <AppButton
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreatePage}
            >
              Novo pilar
            </AppButton>
          }
        />
      ) : (
        <div className={SETTINGS_ENTITY_GRID_CLASS}>
          {sortedPilares.map(pilar => {
            const count = contentCountByPilar.get(pilar.id) || 0;
            const volumeLabel =
              count === 0
                ? 'Nenhum roteiro neste pilar ainda'
                : `${count} roteiro${count === 1 ? '' : 's'}`;

            return (
              <SettingsGridCard
                key={pilar.id}
                title={pilar.nome}
                description={pilar.descricao || 'Descrição ainda não preenchida'}
                color={pilar.cor}
                active={pilar.ativo}
                dimmed={!pilar.ativo}
                onToggle={() => handleToggleActive(pilar)}
                onEdit={() => openEditPage(pilar.id)}
                onDelete={() => handleDelete(pilar.id)}
                badges={
                  <>
                    {count > 0 ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/criacao?pilar=${pilar.id}`)}
                        className="rounded-[var(--radius-pill)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <Badge variant="neutral">{volumeLabel}</Badge>
                      </button>
                    ) : (
                      <Badge variant="neutral">{volumeLabel}</Badge>
                    )}
                    <Badge variant="neutral">{pilar.plataformas.length} redes</Badge>
                    {pilar.frequenciaSemanal != null ? (
                      <Badge variant="neutral">{pilar.frequenciaSemanal}x/sem</Badge>
                    ) : (
                      <Badge variant="neutral">Sem ritmo</Badge>
                    )}
                  </>
                }
              />
            );
          })}
        </div>
      )}

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
    </SettingsPageScaffold>
  );
}
