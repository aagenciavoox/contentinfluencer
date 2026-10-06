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
import type { Serie } from '../../../lib/database';
import { CONFIRM } from '../../../lib/uiCopy';
import { getEditorialSettings } from '../../editorial/lib/editorialSettings';
import {
  aplicarFuncaoPublicada,
  conteudosParaAplicarFuncao,
  devePerguntarAplicarFuncao,
} from '../../editorial/lib/aplicarFuncao';
import { FUNCAO_LABELS, isFuncaoEditorial } from '../../editorial/lib/funcoes';
import {
  SerieEditForm,
  type SerieEditChromeState,
} from '../components/SerieEditForm';
import {nextFreeSerieColor, takenSerieColorKeys} from '../lib/serieColors';

function SerieEditHeaderActions({
  isCreate,
  onDelete,
  chrome,
}: {
  isCreate: boolean;
  onDelete?: () => void;
  chrome: SerieEditChromeState | null;
}) {
  if (!chrome) return null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!isCreate && onDelete ? (
        <MoreMenu
          items={[
            {
              label: CONFIRM.excluirSerie.confirmLabel,
              tone: 'danger',
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

export function SeriesEditPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { serieId } = useParams<{ serieId: string }>();
  const [chrome, setChrome] = useState<SerieEditChromeState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingApply, setPendingApply] = useState<Serie | null>(null);

  const isCreate = !serieId || serieId === 'nova';
  const editingSerie = useMemo(
    () => (isCreate ? null : state.series.find(serie => serie.id === serieId) ?? null),
    [isCreate, serieId, state.series],
  );

  const platformNames = useMemo(
    () => state.platforms.filter(platform => platform.ativo).map(platform => platform.nome),
    [state.platforms],
  );

  const editorialSettings = getEditorialSettings(state.preferences);
  const backToList = () => navigate('/editorial?aba=series');

  const persistSerie = (serie: Serie, aplicar: boolean) => {
    const payload = {...serie, userId: serie.userId || user?.id || ''};
    const exists = state.series.find(item => item.id === payload.id);

    if (exists) {
      dispatch({type: 'UPDATE_SERIE', payload});
    } else {
      dispatch({type: 'ADD_SERIE', payload});
    }

    if (aplicar && isFuncaoEditorial(payload.funcaoPadrao)) {
      const funcao = payload.funcaoPadrao;
      for (const content of conteudosParaAplicarFuncao(state.contents, payload.id)) {
        dispatch({
          type: 'UPDATE_CONTENT',
          payload: aplicarFuncaoPublicada(content, funcao),
        });
      }
    }

    setPendingApply(null);
    backToList();
  };

  const handleSave = (serie: Serie) => {
    const anterior = state.series.find(item => item.id === serie.id);
    const alvos = conteudosParaAplicarFuncao(state.contents, serie.id);
    if (devePerguntarAplicarFuncao(anterior?.funcaoPadrao, serie.funcaoPadrao, alvos.length)) {
      setPendingApply(serie);
      return;
    }
    persistSerie(serie, false);
  };

  const aplicarQuantidade = pendingApply
    ? conteudosParaAplicarFuncao(state.contents, pendingApply.id).length
    : 0;
  const aplicarMensagem = pendingApply && isFuncaoEditorial(pendingApply.funcaoPadrao)
    ? `${aplicarQuantidade === 1 ? '1 roteiro já publicado ainda usa' : `${aplicarQuantidade} roteiros já publicados ainda usam`} a função herdada. Aplicar ${FUNCAO_LABELS[pendingApply.funcaoPadrao]} a ${aplicarQuantidade === 1 ? 'ele' : 'eles'}?`
    : '';

  const handleDelete = () => {
    if (!editingSerie) return;
    dispatch({type: 'DELETE_SERIE', payload: editingSerie.id});
    backToList();
  };

  const lastEditLabel = editingSerie?.updatedAt
    ? `Última edição ${formatDistanceToNow(new Date(editingSerie.updatedAt), {addSuffix: true, locale: ptBR})} por você.`
    : null;

  const pageTitle = isCreate ? 'Nova série' : 'Editar série';
  const pageMeta = isCreate
    ? 'Cadastre os padrões e a identidade desta série.'
    : 'Atualize os padrões e a identidade desta série.';

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
      initial={editingSerie ?? {cor: nextFreeSerieColor(state.series)}}
      takenColors={[...takenSerieColorKeys(state.series, editingSerie?.id)]}
      platformNames={platformNames}
      pilares={state.pilares}
      contents={state.contents}
      usedFormatoValues={state.series.map(serie => serie.formatoVisualPadrao)}
      showOpenInfoNotice={editorialSettings.openInfoNotices}
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
        <ConfirmModal
          open={Boolean(pendingApply)}
          message={aplicarMensagem}
          confirmLabel="Aplicar aos publicados"
          cancelLabel="Manter os publicados"
          onConfirm={() => pendingApply && persistSerie(pendingApply, true)}
          onCancel={() => pendingApply && persistSerie(pendingApply, false)}
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
            backLabel="Séries"
            backTo="/editorial?aba=series"
            title={pageTitle}
            meta={pageMeta}
            hideSearch
            actions={
              <SerieEditHeaderActions
                isCreate={isCreate}
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
      <ConfirmModal
        open={Boolean(pendingApply)}
        message={aplicarMensagem}
        confirmLabel="Aplicar aos publicados"
        cancelLabel="Manter os publicados"
        onConfirm={() => pendingApply && persistSerie(pendingApply, true)}
        onCancel={() => pendingApply && persistSerie(pendingApply, false)}
      />
    </>
  );
}
