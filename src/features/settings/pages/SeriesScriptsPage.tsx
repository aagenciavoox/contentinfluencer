import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layers, Plus, Settings } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { SelectField } from '../../../components/ui/SelectField';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import type { Content } from '../../../lib/database';
import { withDetailBack } from '../../../lib/navigation/detailBack';
import { broadcastDataSync } from '../../../lib/syncBroadcast';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';
import { formatOpenItems, getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import { filhosDaSerie, idsDaSubarvore } from '../../editorial/lib/serieArvore';
import { escopoTemporadas, temporadasDoEscopo } from '../../editorial/lib/temporadas';
import { SeriesBulkDrawer, type PedidoMassa } from '../components/series-detail/SeriesBulkDrawer';
import { SeriesEpisodeGroups } from '../components/series-detail/SeriesEpisodeGroups';
import { SeriesDefinicoes } from '../components/series-detail/SeriesReadPanels';
import { SeriesTrackingHeader } from '../components/series-detail/SeriesTrackingHeader';
import { abaDoItemAberto } from '../lib/serieEditAba';
import { contarEpisodios } from '../../editorial/lib/contarEpisodios';
import { montarVistaEpisodios, temporadaInicial } from '../lib/seriesEpisodeView';

type AbaSerie = 'episodios' | 'definicoes';

function capaHttp(value: string | null | undefined) {
  const trimmed = value?.trim() ?? '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function contagem(quantidade: number, singular: string, plural: string) {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

export function SeriesScriptsPage() {
  const { serieId } = useParams<{ serieId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { state, dispatch } = useAppContext();
  const [aba, setAba] = useState<AbaSerie>('episodios');
  const [preferida, setPreferida] = useState('');
  const [drawerAberto, setDrawerAberto] = useState(false);
  const [pedido, setPedido] = useState<PedidoMassa | null>(null);
  const nonce = useRef(0);

  const serie = state.series.find(item => item.id === serieId) ?? null;
  const editorialSettings = state.editorial;

  const linkedContents = useMemo(() => {
    if (!serieId) return [];
    const sub = idsDaSubarvore(serieId, state.series);
    return state.contents.filter(content => content.seriesId && sub.has(content.seriesId) && !content.deletedAt);
  }, [serieId, state.contents, state.series]);

  const temporadasDaSerie = useMemo(() => {
    if (!serieId) return [];
    const escopo = escopoTemporadas(serieId, state.series);
    return escopo ? temporadasDoEscopo(escopo.id, state.temporadas) : [];
  }, [serieId, state.series, state.temporadas]);

  const semTemporada = linkedContents.filter(content => !content.temporadaId).length;
  const temporadaAtiva = useMemo(
    () => temporadaInicial(temporadasDaSerie, linkedContents, preferida),
    [linkedContents, preferida, temporadasDaSerie],
  );

  const vista = useMemo(() => {
    if (!serieId) return null;
    return montarVistaEpisodios({
      serieId,
      series: state.series,
      temporadas: state.temporadas,
      contents: linkedContents,
      temporadaSelecionada: temporadasDaSerie.length === 0 ? null : temporadaAtiva,
    });
  }, [linkedContents, serieId, state.series, state.temporadas, temporadaAtiva, temporadasDaSerie.length]);

  const idsExistentes = useMemo(() => new Set(state.contents.map(content => content.id)), [state.contents]);

  const abrirEditor = () => {
    if (serie) navigate(`/series/${serie.id}/editar`);
  };

  const abrirMassa = (origem: PedidoMassa['origem'], destinoId: string, temporadaId: string | null) => {
    nonce.current += 1;
    setPedido({ nonce: nonce.current, origem, serieId: destinoId, temporadaId });
    setDrawerAberto(true);
  };

  const criarConteudos = async (contents: Content[]) => {
    for (const content of contents) {
      await dispatch(
        { type: 'ADD_CONTENT', payload: content },
        { silent: true, skipBroadcast: true },
      );
    }
    broadcastDataSync();
  };

  if (!state.isLoaded) {
    return (
      <PageLayout contentWidth="wide" contentStack="dense">
        <SkeletonList count={4} variant="row" />
      </PageLayout>
    );
  }

  if (!serie || !serieId || !vista) {
    return (
      <PageLayout contentWidth="wide" contentStack="dense">
        <EmptyState
          icon={<Layers className="h-8 w-8" aria-hidden />}
          title="Série não encontrada"
          description="Ela pode ter sido excluída, ou o endereço não corresponde a uma série."
          action={
            <AppButton variant="secondary" onClick={() => navigate('/series')}>
              Voltar para séries
            </AppButton>
          }
        />
      </PageLayout>
    );
  }

  const quadros = filhosDaSerie(serie.id, state.series).length;
  const abertos = getSerieOpenItems(serie, { series: state.series, contents: state.contents });
  const opcoesTemporada = temporadasDaSerie.length === 0 ? [] : [
    ...temporadasDaSerie.map(item => ({ value: item.id, label: item.nome })),
    ...(semTemporada > 0 ? [{ value: 'none', label: 'Sem temporada' }] : []),
  ];
  const valorTemporada = temporadaAtiva ?? 'none';
  const contagemTemporada = temporadaAtiva
    ? linkedContents.filter(content => content.temporadaId === temporadaAtiva).length
    : semTemporada;
  const totalEpisodios = contarEpisodios(serieId, state.series, state.contents);
  const meta = `${contagem(totalEpisodios, 'episódio', 'episódios')} · ${contagem(quadros, 'quadro', 'quadros')}`;
  const proposta = serie.notes?.trim() || '';
  const capa = capaHttp(serie.capaUrl);
  const acoes = (
    <>
      <AppButton
        variant="secondary"
        onClick={abrirEditor}
        leftIcon={<Settings className="h-4 w-4" />}
      >
        Editar definições
      </AppButton>
      <AppButton
        variant="primary"
        onClick={() => abrirMassa('massa', serie.id, temporadasDaSerie.length > 0 ? temporadaAtiva : null)}
        leftIcon={<Plus className="h-4 w-4" />}
      >
        Adicionar em massa
      </AppButton>
    </>
  );

  return (
    <PageLayout
      contentWidth="wide"
      contentStack="dense"
      header={
        <DesktopPageHeader
          section="Séries"
          backLabel="Séries"
          backTo="/series"
          title={serie.name}
          titleAside={!serie.ativa ? <Badge variant="neutral">Inativa</Badge> : undefined}
          meta={meta}
          actions={acoes}
        />
      }
    >
      {isMobile ? (
        <SeriesTrackingHeader
          serie={serie}
          meta={meta}
          onEdit={abrirEditor}
          onBulk={() => abrirMassa('massa', serie.id, temporadasDaSerie.length > 0 ? temporadaAtiva : null)}
        />
      ) : proposta || capa ? (
        <div className="flex items-start gap-4">
          {capa ? (
            <img
              src={capa}
              alt=""
              className="h-28 w-28 shrink-0 rounded-[var(--radius-card)] object-cover"
            />
          ) : null}
          {proposta ? (
            <Text variant="body" className="max-w-3xl text-[var(--text-secondary)]">{proposta}</Text>
          ) : null}
        </div>
      ) : null}

      {editorialSettings.openInfoNotices && abertos.length > 0 ? (
        <OpenInfoNotice
          items={abertos}
          title={`Esta série tem informações em aberto: ${formatOpenItems(abertos)}`}
          description={null}
          actionLabel="Completar agora"
          onAction={() => navigate(`/series/${serie.id}/editar?aba=${abaDoItemAberto(abertos[0].key)}`)}
        />
      ) : null}

      <SegmentTabs<AbaSerie>
        ariaLabel="Série"
        value={aba}
        onChange={setAba}
        options={[
          { id: 'episodios', label: 'Episódios', count: totalEpisodios },
          { id: 'definicoes', label: 'Definições' },
        ]}
      />

      {aba === 'episodios' ? (
        <div className="stack-lg">
          {opcoesTemporada.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <SelectField
                ariaLabel="Temporada"
                value={valorTemporada}
                onChange={setPreferida}
                options={opcoesTemporada}
              />
              <Text variant="meta">
                {contagemTemporada === 1 ? '1 episódio' : `${contagemTemporada} episódios`}
              </Text>
            </div>
          ) : null}
          <SeriesEpisodeGroups
            vista={vista}
            serie={serie}
            series={state.series}
            onOpen={content => navigate(buildContentDetailRoute(content.id), withDetailBack(`/series/${serie.id}`))}
            onBulk={() => abrirMassa('massa', serie.id, temporadasDaSerie.length > 0 ? temporadaAtiva : null)}
            onAdd={grupo => abrirMassa('grupo', grupo.serieId, grupo.temporadaId)}
          />
        </div>
      ) : (
        <SeriesDefinicoes
          serie={serie}
          series={state.series}
          pilares={state.pilares}
          temporadas={temporadasDaSerie}
          plataformas={state.platforms}
          templates={state.templates}
        />
      )}

      <SeriesBulkDrawer
        open={drawerAberto}
        onClose={() => setDrawerAberto(false)}
        seriePaginaId={serie.id}
        serieNome={serie.name}
        series={state.series}
        temporadas={temporadasDaSerie}
        plataformas={state.platforms}
        destinosPadrao={editorialSettings.destinosPadrao}
        pedido={pedido}
        idsExistentes={idsExistentes}
        onCreate={criarConteudos}
      />
    </PageLayout>
  );
}
