import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { AppButton } from '../../../components/ui/AppButton';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import type { Pilar } from '../../../lib/database';
import { CONFIRM } from '../../../lib/uiCopy';
import { contasAtivas } from '../../contas/lib/contas';
import {
  patchSerieAoVincularPilar,
  serieLigadaAoPilar,
} from '../../editorial/lib/vincularSerieAoPilar';
import {
  PilarEditForm,
  type PilarEditChromeState,
  type PilarEditSavePayload,
} from '../components/PilarEditForm';

function PilarEditHeaderActions({
  isCreate,
  pilarId,
  onDelete,
  chrome,
}: {
  isCreate: boolean;
  pilarId?: string;
  onDelete?: () => void;
  chrome: PilarEditChromeState | null;
}) {
  if (!chrome) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!isCreate && onDelete ? (
        <MoreMenu
          items={[
            ...(!isCreate && pilarId ? [{
              label: 'Copiar ID',
              onClick: () => { void navigator.clipboard.writeText(pilarId); },
            }] : []),
            {
              label: CONFIRM.excluirPilar.confirmLabel,
              tone: 'danger' as const,
              onClick: onDelete,
            },
          ]}
        />
      ) : null}
      <AppButton variant="secondary" size="sm" onClick={chrome.handleCancel}>
        Cancelar
      </AppButton>
      <AppButton
        variant="primary"
        size="sm"
        onClick={chrome.handleSave}
        disabled={!chrome.canSave}
      >
        Salvar alterações
      </AppButton>
    </div>
  );
}

export function PillarEditPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { pilarId } = useParams<{ pilarId: string }>();
  const [chrome, setChrome] = useState<PilarEditChromeState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isCreate = !pilarId || pilarId === 'nova';
  const editingPilar = useMemo(
    () => (isCreate ? null : state.pilares.find(pilar => pilar.id === pilarId) ?? null),
    [isCreate, pilarId, state.pilares],
  );

  // Ids das contas ativas. O formulário mostra cada uma com plataforma e @.
  const platformNames = useMemo(
    () => contasAtivas(state.platforms).map(platform => platform.id),
    [state.platforms],
  );

  const initialLinkedSerieIds = useMemo(() => {
    if (isCreate || !editingPilar) return [];
    return state.series
      .filter(serie => serieLigadaAoPilar(serie, editingPilar.id))
      .map(serie => serie.id);
  }, [editingPilar, isCreate, state.series]);

  const backToList = () => navigate('/editorial');

  const syncSeriesLinks = useCallback(
    (pilarIdToLink: string, linkedSerieIds: string[]) => {
      for (const serie of state.series) {
        const patch = patchSerieAoVincularPilar(
          serie,
          pilarIdToLink,
          linkedSerieIds.includes(serie.id),
        );
        if (!patch) continue;

        dispatch({
          type: 'UPDATE_SERIE',
          payload: {
            ...serie,
            ...patch,
            updatedAt: new Date().toISOString(),
          },
        });
      }
    },
    [dispatch, state.series],
  );

  const handleSave = ({ pilar, linkedSerieIds }: PilarEditSavePayload) => {
    const payload = {...pilar, userId: pilar.userId || user?.id || ''};
    const exists = state.pilares.find(item => item.id === payload.id);

    if (exists) {
      dispatch({type: 'UPDATE_PILAR', payload});
    } else {
      dispatch({type: 'ADD_PILAR', payload});
    }

    syncSeriesLinks(payload.id, linkedSerieIds);
    backToList();
  };

  const handleDelete = () => {
    if (!editingPilar) return;
    dispatch({type: 'DELETE_PILAR', payload: editingPilar.id});
    backToList();
  };

  const lastEditLabel = editingPilar?.updatedAt
    ? `Última edição ${formatDistanceToNow(new Date(editingPilar.updatedAt), {addSuffix: true, locale: ptBR})} por você.`
    : null;

  const pageTitle = isCreate ? 'Novo pilar' : 'Editar pilar';
  const pageMeta = isCreate
    ? 'Cadastre a identidade e as preferências deste pilar.'
    : 'Atualize a identidade e as preferências deste pilar.';

  const handleChromeChange = useCallback((next: PilarEditChromeState) => {
    setChrome(next);
  }, []);

  if (!isCreate && !editingPilar) {
    return (
      <PageLayout variant="settings">
        <div className="mx-auto max-w-3xl text-center">
          <Text variant="body" className="text-[var(--text-tertiary)]">
            Este pilar não existe mais.
          </Text>
          <AppButton variant="secondary" className="mt-4" onClick={backToList}>
            Voltar para pilares
          </AppButton>
        </div>
      </PageLayout>
    );
  }

  const formKey = editingPilar?.id || 'new';

  const formElement = (
    <PilarEditForm
      key={formKey}
      initial={editingPilar ?? {}}
      platformNames={platformNames}
      series={state.series}
      postingTimeEntries={state.postingTimeEntries}
      platforms={state.platforms}
      initialLinkedSerieIds={initialLinkedSerieIds}
      pilares={state.pilares}
      onSave={handleSave}
      onCancel={backToList}
      onChromeChange={handleChromeChange}
      lastEditLabel={lastEditLabel}
    />
  );

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)] px-4 pb-28 pt-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <AppButton variant="ghost" size="sm" onClick={backToList}>
              Pilares
            </AppButton>
            <div className="flex items-center gap-2">
              {chrome ? (
                <>
                  <AppButton variant="secondary" size="sm" onClick={chrome.handleCancel}>
                    Cancelar
                  </AppButton>
                  <AppButton
                    variant="primary"
                    size="sm"
                    onClick={chrome.handleSave}
                    disabled={!chrome.canSave}
                  >
                    Salvar
                  </AppButton>
                </>
              ) : null}
            </div>
          </div>
          <Text variant="sectionTitle" className="mb-1">
            {pageTitle}
          </Text>
          <Text variant="meta" className="mb-5 text-[var(--text-secondary)]">
            {pageMeta}
          </Text>
          {formElement}
        </div>
        <ConfirmModal
          open={confirmDelete}
          message={CONFIRM.excluirPilar.message}
          confirmLabel={CONFIRM.excluirPilar.confirmLabel}
          cancelLabel={CONFIRM.excluirPilar.cancelLabel}
          onConfirm={() => {
            handleDelete();
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      </>
    );
  }

  return (
    <>
      <PageLayout
        contentStack="dense"
        header={
          <DesktopPageHeader
            section="Criação"
            backLabel="Pilares"
            backTo="/editorial"
            title={pageTitle}
            meta={pageMeta}
            actions={
              <PilarEditHeaderActions
                isCreate={isCreate}
                pilarId={isCreate ? undefined : pilarId}
                onDelete={() => setConfirmDelete(true)}
                chrome={chrome}
              />
            }
          />
        }
      >
        <div className="w-full">{formElement}</div>
      </PageLayout>

      <ConfirmModal
        open={confirmDelete}
        message={CONFIRM.excluirPilar.message}
        confirmLabel={CONFIRM.excluirPilar.confirmLabel}
        cancelLabel={CONFIRM.excluirPilar.cancelLabel}
        onConfirm={() => {
          handleDelete();
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
