import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import type { Serie, SerieTipoAgrupamento } from '../../../lib/database';
import { CONFIRM } from '../../../lib/uiCopy';
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
import {tipoDaSerie} from '../lib/serieAgrupamento';

const TITULO_CRIAR: Record<SerieTipoAgrupamento, string> = {
  familia: 'Criar família',
  serie: 'Criar série',
  quadro: 'Criar quadro',
};

const TITULO_EDITAR: Record<SerieTipoAgrupamento, string> = {
  familia: 'Editar família',
  serie: 'Editar série',
  quadro: 'Editar quadro',
};
import {ordenarContas} from '../../contas/lib/contas';
import {roteirosQueSeguemASerie, type AlteracaoDeRoteiro} from '../../editorial/lib/legendaSerie';

function SerieEditHeaderActions({
  isCreate,
  rotuloSalvar,
  onDelete,
  chrome,
}: {
  isCreate: boolean;
  rotuloSalvar: string;
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
        {rotuloSalvar}
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
  const [searchParams] = useSearchParams();
  const [chrome, setChrome] = useState<SerieEditChromeState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pendingApply, setPendingApply] = useState<Serie | null>(null);
  const [legendaPendente, setLegendaPendente] = useState<{
    serie: Serie;
    alvos: AlteracaoDeRoteiro[];
    aplicarFuncao: boolean;
  } | null>(null);

  const { pathname } = useLocation();
  // Quadro só nasce dentro de uma série: /series/:serieId/quadros/novo.
  const criandoQuadro = pathname.endsWith('/quadros/novo');
  const isCreate = criandoQuadro || !serieId || serieId === 'nova';
  const editingSerie = useMemo(
    () => (isCreate ? null : state.series.find(serie => serie.id === serieId) ?? null),
    [isCreate, serieId, state.series],
  );
  const serieDoQuadro = criandoQuadro ? state.series.find(serie => serie.id === serieId) ?? null : null;
  const familiaPedida = searchParams.get('familia');
  const familiaInicial = !criandoQuadro && familiaPedida
    && state.series.some(serie => serie.id === familiaPedida && tipoDaSerie(serie.id, state.series) === 'familia')
    ? familiaPedida
    : null;
  const tipo: SerieTipoAgrupamento = editingSerie
    ? tipoDaSerie(editingSerie.id, state.series)
    : criandoQuadro
      ? 'quadro'
      : searchParams.get('tipo') === 'familia' ? 'familia' : 'serie';
  const quadroSemSerie = criandoQuadro
    && (!serieDoQuadro || tipoDaSerie(serieDoQuadro.id, state.series) !== 'serie');

  const contas = useMemo(() => {
    const ligadas = new Set((editingSerie?.plataformas ?? []).map(item => item.platformId));
    return ordenarContas(state.platforms.filter(platform => platform.ativo || ligadas.has(platform.id)));
  }, [editingSerie?.plataformas, state.platforms]);

  const editorialSettings = state.editorial;
  const voltarLista = () => navigate('/series');
  const voltarSerie = (id: string) => navigate(`/series/${id}`);
  const destinoDeVolta = criandoQuadro && serieId
    ? `/series/${serieId}?aba=quadros`
    : familiaInicial
      ? `/series/${familiaInicial}?aba=quadros`
      : isCreate || !serieId ? '/series' : `/series/${serieId}`;
  const voltar = () => navigate(destinoDeVolta);

  const alteracoesDeLegenda = (serie: Serie) => {
    const anterior = state.series.find(item => item.id === serie.id);
    if (!anterior) return [];
    return roteirosQueSeguemASerie({
      serieId: serie.id,
      anterior,
      nova: serie,
      contents: state.contents,
    });
  };

  const persistSerie = (serie: Serie, aplicar: boolean, alvosLegenda: AlteracaoDeRoteiro[] = []) => {
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

    for (const alvo of alvosLegenda) {
      const content = state.contents.find(item => item.id === alvo.contentId);
      if (!content) continue;
      dispatch({
        type: 'UPDATE_CONTENT',
        payload: { ...content, legendaBase: alvo.legendaBase, plataformas: alvo.publicacoes },
      });
    }

    setPendingApply(null);
    setLegendaPendente(null);
    // Quadro novo volta para a série, na lista de quadros; o resto abre a própria página.
    if (!exists && tipo === 'quadro' && payload.parentId) navigate(`/series/${payload.parentId}?aba=quadros`);
    else voltarSerie(payload.id);
  };

  const seguirParaLegenda = (serie: Serie, aplicarFuncao: boolean) => {
    const alvos = alteracoesDeLegenda(serie);
    if (alvos.length > 0) {
      setPendingApply(null);
      setLegendaPendente({ serie, alvos, aplicarFuncao });
      return;
    }
    persistSerie(serie, aplicarFuncao);
  };

  const handleSave = (serie: Serie) => {
    const anterior = state.series.find(item => item.id === serie.id);
    const alvos = conteudosParaAplicarFuncao(state.contents, serie.id);
    if (devePerguntarAplicarFuncao(anterior?.funcaoPadrao, serie.funcaoPadrao, alvos.length)) {
      setPendingApply(serie);
      return;
    }
    seguirParaLegenda(serie, false);
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
    voltarLista();
  };

  const lastEditLabel = editingSerie?.updatedAt
    ? `Última edição ${formatDistanceToNow(new Date(editingSerie.updatedAt), {addSuffix: true, locale: ptBR})} por você.`
    : null;

  const pageTitle = isCreate ? TITULO_CRIAR[tipo] : TITULO_EDITAR[tipo];
  const pageMeta = isCreate
    ? criandoQuadro && serieDoQuadro
      ? `Dentro de ${serieDoQuadro.name}. Só o nome é necessário agora.`
      : 'Só o nome é necessário agora. O resto pode ficar para depois.'
    : editingSerie?.name || '';
  const rotuloVolta = criandoQuadro ? serieDoQuadro?.name || 'Série' : isCreate ? 'Séries e quadros' : editingSerie?.name || 'Série';

  const handleChromeChange = useCallback((next: SerieEditChromeState) => {
    setChrome(next);
  }, []);

  if ((!isCreate && !editingSerie) || (quadroSemSerie && state.isLoaded)) {
    return (
      <PageLayout variant="settings">
        <div className="mx-auto max-w-3xl text-center">
          <Text variant="body" className="text-[var(--text-tertiary)]">
            {quadroSemSerie
              ? 'Quadros são criados dentro de uma série. Abra a série e use Criar quadro.'
              : 'Esta série não existe mais.'}
          </Text>
          <AppButton variant="secondary" className="mt-4" onClick={voltarLista}>
            Voltar para séries
          </AppButton>
        </div>
      </PageLayout>
    );
  }

  const formKey = editingSerie?.id || `novo:${tipo}:${criandoQuadro ? serieId : familiaInicial ?? ''}`;

  const formElement = (
    <SerieEditForm
      key={formKey}
      tipo={tipo}
      initial={editingSerie ?? {
        cor: nextFreeSerieColor(state.series),
        tipoAgrupamento: tipo,
        // Quadro já chega dentro da série; série criada pela família já chega nela.
        parentId: criandoQuadro ? serieId ?? null : familiaInicial,
        // Quadro acompanha a meta da série até ganhar uma própria.
        ...(tipo === 'quadro' ? { frequenciaRecomendada: 'Sob demanda' } : {}),
      }}
      takenColors={[...takenSerieColorKeys(state.series, editingSerie?.id)]}
      contas={contas}
      pilares={state.pilares}
      series={state.series}
      contents={state.contents}
      usedFormatoValues={state.series.flatMap(serie => serie.formatoVisualPadrao ?? [])}
      showOpenInfoNotice={editorialSettings.openInfoNotices}
      onSave={handleSave}
      onCancel={voltar}
      onChromeChange={handleChromeChange}
      lastEditLabel={lastEditLabel}
    />
  );

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)] px-4 pb-28 pt-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <AppButton variant="ghost" size="sm" onClick={voltar}>
              {rotuloVolta}
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
                    {isCreate ? 'Criar' : 'Salvar'}
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
          onConfirm={() => pendingApply && seguirParaLegenda(pendingApply, true)}
          onCancel={() => pendingApply && seguirParaLegenda(pendingApply, false)}
        />
        <ConfirmModal
          open={Boolean(legendaPendente)}
          message={legendaPendente
            ? `${legendaPendente.alvos.length === 1 ? '1 roteiro ainda segue a legenda desta série e não foi publicado. Atualizar esse texto?' : `${legendaPendente.alvos.length} roteiros ainda seguem a legenda desta série e não foram publicados. Atualizar esses textos?`} Versões editadas à mão e publicações já feitas ficam como estão.`
            : ''}
          confirmLabel="Atualizar esses roteiros"
          cancelLabel="Só salvar a série"
          onConfirm={() => legendaPendente && persistSerie(legendaPendente.serie, legendaPendente.aplicarFuncao, legendaPendente.alvos)}
          onCancel={() => legendaPendente && persistSerie(legendaPendente.serie, legendaPendente.aplicarFuncao)}
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
            backLabel={rotuloVolta}
            backTo={destinoDeVolta}
            title={pageTitle}
            meta={pageMeta}
            hideSearch
            actions={
              <SerieEditHeaderActions
                isCreate={isCreate}
                rotuloSalvar={isCreate ? TITULO_CRIAR[tipo] : 'Salvar alterações'}
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
        onConfirm={() => pendingApply && seguirParaLegenda(pendingApply, true)}
        onCancel={() => pendingApply && seguirParaLegenda(pendingApply, false)}
      />
      <ConfirmModal
        open={Boolean(legendaPendente)}
        message={legendaPendente
          ? `${legendaPendente.alvos.length === 1 ? '1 roteiro ainda segue a legenda desta série e não foi publicado. Atualizar esse texto?' : `${legendaPendente.alvos.length} roteiros ainda seguem a legenda desta série e não foram publicados. Atualizar esses textos?`} Versões editadas à mão e publicações já feitas ficam como estão.`
          : ''}
        confirmLabel="Atualizar esses roteiros"
        cancelLabel="Só salvar a série"
        onConfirm={() => legendaPendente && persistSerie(legendaPendente.serie, legendaPendente.aplicarFuncao, legendaPendente.alvos)}
        onCancel={() => legendaPendente && persistSerie(legendaPendente.serie, legendaPendente.aplicarFuncao)}
      />
    </>
  );
}
