import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import type { Serie } from '../../../lib/database';
import { CONFIRM } from '../../../lib/uiCopy';
import {
  SerieEditForm,
  type SerieEditChromeState,
} from '../components/SerieEditForm';

function SerieEditHeaderActions({
  isDirty,
  isCreate,
  lastEditLabel,
  showMoreMenu,
  onToggleMore,
  onDelete,
  chrome,
}: {
  isDirty: boolean;
  isCreate: boolean;
  lastEditLabel: string | null;
  showMoreMenu: boolean;
  onToggleMore: () => void;
  onDelete?: () => void;
  chrome: SerieEditChromeState | null;
}) {
  if (!chrome) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isDirty ? (
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-orange)]" />
          <Text variant="meta" className="font-medium text-[var(--text-secondary)]">
            Alterações não salvas
          </Text>
        </span>
      ) : null}
      {!isCreate && lastEditLabel ? (
        <span className="hidden items-center gap-1.5 xl:inline-flex">
          <Clock className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
          <Text variant="meta" className="text-[var(--text-tertiary)]">
            {lastEditLabel}
          </Text>
        </span>
      ) : null}
      {!isCreate && onDelete ? (
        <div className="relative">
          <button
            type="button"
            onClick={onToggleMore}
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
            aria-label="Mais opções"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {showMoreMenu ? (
            <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left text-sm text-[var(--accent-pink)] hover:bg-[var(--bg-hover)]"
                onClick={() => {
                  onToggleMore();
                  onDelete();
                }}
              >
                Excluir série
              </button>
            </div>
          ) : null}
        </div>
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

export function SeriesEditPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { serieId } = useParams<{ serieId: string }>();
  const [chrome, setChrome] = useState<SerieEditChromeState | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isCreate = !serieId || serieId === 'nova';
  const editingSerie = useMemo(
    () => (isCreate ? null : state.series.find(serie => serie.id === serieId) ?? null),
    [isCreate, serieId, state.series],
  );

  const platformNames = useMemo(
    () => state.platforms.filter(platform => platform.ativo).map(platform => platform.nome),
    [state.platforms],
  );

  const backToList = () => navigate('/configuracoes/series');

  const handleSave = (serie: Serie) => {
    const payload = {...serie, userId: serie.userId || user?.id || ''};
    const exists = state.series.find(item => item.id === payload.id);

    if (exists) {
      dispatch({type: 'UPDATE_SERIE', payload});
    } else {
      dispatch({type: 'ADD_SERIE', payload});
    }

    backToList();
  };

  const handleDelete = () => {
    if (!editingSerie) return;
    dispatch({type: 'DELETE_SERIE', payload: editingSerie.id});
    backToList();
  };

  const lastEditLabel = editingSerie?.updatedAt
    ? `Última edição ${formatDistanceToNow(new Date(editingSerie.updatedAt), {addSuffix: true, locale: ptBR})} por você`
    : null;

  const pageTitle = isCreate ? 'Nova série' : 'Editar série';
  const pageMeta = isCreate
    ? 'Cadastre as informações desta série.'
    : 'Atualize as informações desta série.';

  const handleChromeChange = useCallback((next: SerieEditChromeState) => {
    setChrome(next);
  }, []);

  if (!isCreate && !editingSerie) {
    return (
      <PageLayout variant="settings">
        <div className="mx-auto max-w-3xl text-center">
          <Text variant="body" className="text-[var(--text-tertiary)]">
            Esta série não existe mais.
          </Text>
          <AppButton variant="secondary" className="mt-4" onClick={backToList}>
            Voltar para séries
          </AppButton>
        </div>
      </PageLayout>
    );
  }

  const formKey = editingSerie?.id || 'new';

  const formElement = (
    <SerieEditForm
      key={formKey}
      initial={editingSerie ?? {}}
      platformNames={platformNames}
      pilares={state.pilares}
      contents={state.contents}
      onSave={handleSave}
      onCancel={backToList}
      onChromeChange={handleChromeChange}
    />
  );

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)] px-4 pb-28 pt-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <AppButton variant="ghost" size="sm" onClick={backToList}>
              Séries
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
          message={CONFIRM.excluirSerie.message}
          confirmLabel={CONFIRM.excluirSerie.confirmLabel}
          cancelLabel={CONFIRM.excluirSerie.cancelLabel}
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
        variant="settings"
        header={
          <DesktopPageHeader
            section="Séries"
            backLabel="Séries"
            backTo="/configuracoes/series"
            title={pageTitle}
            meta={pageMeta}
            hideSearch
            actions={
              <SerieEditHeaderActions
                isDirty={chrome?.isDirty ?? false}
                isCreate={isCreate}
                lastEditLabel={lastEditLabel}
                showMoreMenu={showMoreMenu}
                onToggleMore={() => setShowMoreMenu(previous => !previous)}
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
        message={CONFIRM.excluirSerie.message}
        confirmLabel={CONFIRM.excluirSerie.confirmLabel}
        cancelLabel={CONFIRM.excluirSerie.cancelLabel}
        onConfirm={() => {
          handleDelete();
          setConfirmDelete(false);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
