import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import { useAppContext } from '../../../context/AppContext';
import { PageLayout } from '../../../layouts/page/PageLayout';
import type { Content } from '../../../lib/database';
import { withDetailBack } from '../../../lib/navigation/detailBack';
import { broadcastDataSync } from '../../../lib/syncBroadcast';
import { cn } from '../../../lib/utils';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { OpenInfoNotice } from '../../editorial/components/OpenInfoNotice';
import { formatOpenItems, getSerieOpenItems } from '../../editorial/lib/serieCompleteness';
import { filhosDaSerie, idsDaSubarvore } from '../../editorial/lib/serieArvore';
import { escopoTemporadas, temporadasDoEscopo } from '../../editorial/lib/temporadas';
import { SeriesBulkDrawer, type PedidoMassa } from '../components/series-detail/SeriesBulkDrawer';
import { SeriesEpisodeGroups } from '../components/series-detail/SeriesEpisodeGroups';
import { SeriesAboutPanel, SeriesSettingsPanel } from '../components/series-detail/SeriesReadPanels';
import { SeriesTrackingHeader } from '../components/series-detail/SeriesTrackingHeader';
import { montarVistaEpisodios, temporadaInicial } from '../lib/seriesEpisodeView';

type AbaSerie = 'episodios' | 'sobre' | 'configuracoes';

const ABAS: Array<{ id: AbaSerie; label: string }> = [
  { id: 'episodios', label: 'Episódios' },
  { id: 'sobre', label: 'Sobre' },
  { id: 'configuracoes', label: 'Configurações' },
];

export function SeriesScriptsPage() {
  const { serieId } = useParams<{ serieId: string }>();
  const navigate = useNavigate();
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

  if (!serie || !serieId || !vista) {
    return (
      <PageLayout variant="settings">
        <div className="py-12 text-center stack-md">
          <Layers className="mx-auto h-8 w-8 text-[var(--text-tertiary)]" aria-hidden />
          <Text variant="body" className="text-[var(--text-tertiary)]">
            {state.isLoaded ? 'Série não encontrada.' : 'Carregando série…'}
          </Text>
          {state.isLoaded ? (
            <AppButton variant="secondary" onClick={() => navigate('/series')}>Voltar para séries</AppButton>
          ) : null}
        </div>
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

  return (
    <PageLayout variant="settings" contentWidth="wide" contentStack="dense">
      <SeriesTrackingHeader
        serie={serie}
        episodios={linkedContents.length}
        quadros={quadros}
        onEdit={abrirEditor}
        onBulk={() => abrirMassa('massa', serie.id, temporadasDaSerie.length > 0 ? temporadaAtiva : null)}
      />

      {editorialSettings.openInfoNotices && abertos.length > 0 ? (
        <OpenInfoNotice
          items={abertos}
          title={`Esta série tem informações em aberto: ${formatOpenItems(abertos)}`}
          description={null}
          actionLabel="Editar definições"
          onAction={abrirEditor}
        />
      ) : null}

      <div role="tablist" aria-label="Série" className="flex gap-6 border-b border-[var(--border-color)]">
        {ABAS.map(item => {
          const ativa = aba === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={ativa}
              onClick={() => setAba(item.id)}
              className={cn(
                '-mb-px min-h-11 border-b-2 px-1 text-sm font-medium focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                ativa
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-secondary)]',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

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
      ) : null}

      {aba === 'sobre' ? (
        <SeriesAboutPanel
          serie={serie}
          series={state.series}
          pilares={state.pilares}
          temporadas={temporadasDaSerie}
          onEdit={abrirEditor}
        />
      ) : null}

      {aba === 'configuracoes' ? (
        <SeriesSettingsPanel
          serie={serie}
          series={state.series}
          plataformas={state.platforms}
          onEdit={abrirEditor}
        />
      ) : null}

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
