import {generateUUID} from '../../../utils/uuid';
import {useMemo, useState} from 'react';
import {endOfMonth, format, startOfMonth} from 'date-fns';
import {useNavigate} from 'react-router-dom';
import {useAppContext} from '../../../context/AppContext';
import {metasDoPeriodo, readProporcao} from '../../editorial/lib/proporcaoObjetivos';
import {decisaoDoPeriodo} from '../../editorial/lib/periodoEditorial';
import {redeDaRef} from '../../contas/lib/contas';
import {entriesDaConcentracao} from '../lib/concentracaoAoColocar';
import {saudeDoMes} from '../lib/monthHealth';
import {avisoDoCalendario, rotuloDoPeriodo} from '../lib/periodoDaSaude';
import {continuidadeDasSeries, distribuicaoPorObjetivo, janelaDaContinuidade, proporcaoDesejadaDoPeriodo} from '../lib/saudeIndicadores';
import {linhasDaContinuidadePorEscopo} from '../lib/continuidadePorEscopoNaSaude';
import {publicacoesNaSaude} from '../lib/publicacoesNaSaude';
import {contaNoFiltro, conteudoPassa, filtroAtivo, postItPassa, type FiltroCalendario} from '../lib/filtroCalendario';
import {abreAnaliseAoLocalizar, diaDoAviso} from '../lib/detalheDoAviso';
import {avisosDeOrientacao, excecaoFoiDeProposito, mapaSequenciaPorConteudo, janelaDosProximosDias, semanaCorrente, TIPOS_AVISO_GLOBAIS, type AvisoOrientacao} from '../lib/orientacaoEditorial';
import {periodoDaVista, type VistaPlanejamento} from '../lib/periodoPlanejamento';
import {progressoDasOndas} from '../lib/episodioNaTemporada';
import {pendenciasNaSaude} from '../lib/pendenciasNaSaude';
import {roteirosDaSaude, type IntervaloSaude} from '../lib/saudeActions';
import {setDiasPausaPublicacao, vistaTemRoteiroNosPostIts} from '../lib/reguaFrequencia';
import type {Content} from '../../../lib/database';
import type {PlanejamentoPostIt} from '../lib/postIt';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';

type OrigemSaude = {periodo: {inicio: string; fim: string}; data: string; vista: VistaPlanejamento} | null;

export function useSaudeEAvisos(args: {
  month: Date;
  vista: VistaPlanejamento;
  setMonth: (data: Date) => void;
  setVistaRaw: (vista: VistaPlanejamento) => void;
  intervaloEmFoco: {inicio: string; fim: string} | null;
  setIntervaloEmFoco: (foco: {inicio: string; fim: string} | null) => void;
  origemSaude: OrigemSaude;
  setOrigemSaude: (origem: OrigemSaude | ((prev: OrigemSaude) => OrigemSaude)) => void;
  filtro: FiltroCalendario;
  trecho: 'calendario' | 'intervalo';
  intervalo: {inicio: string; fim: string};
  postIts: PlanejamentoPostIt[];
  contents: Content[];
  indiceAgenda: ReturnType<typeof import('../lib/filtroCalendario').indiceDaAgenda>;
  destaqueIds: Set<string>;
  setDestaqueIds: (ids: Set<string>) => void;
  setAnaliseAberta: (aberta: boolean) => void;
  setSeriePlanejandoId: (id: string | null) => void;
  retornoPlanejamento: string;
}) {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
  const {
    month, vista, setMonth, setVistaRaw, intervaloEmFoco, setIntervaloEmFoco,
    origemSaude, setOrigemSaude, filtro, trecho, intervalo, postIts, contents, indiceAgenda,
    setDestaqueIds, setAnaliseAberta, setSeriePlanejandoId, retornoPlanejamento,
  } = args;
  const [avisoAtivoId, setAvisoAtivoId] = useState<string | null>(null);

  const periodo = useMemo(() => intervaloEmFoco ?? periodoDaVista(month, vista), [month, vista, intervaloEmFoco]);

  // Decisão 3 (03/11): a Saúde segue o trecho visível no calendário (mês ou semana).
  // O plano do Editorial continua identificado à parte, no card de metas do período.
  // 2D: "Intervalo" troca o trecho da Saúde por datas escolhidas; incompleto ou invertido, vale o calendário.
  const intervaloValido = trecho === 'intervalo' && Boolean(intervalo.inicio && intervalo.fim && intervalo.inicio <= intervalo.fim);
  const periodoDaSaude = useMemo(
    () => origemSaude?.periodo ?? (intervaloValido ? {inicio: intervalo.inicio, fim: intervalo.fim} : {inicio: periodo.inicio, fim: periodo.fim}),
    [origemSaude, intervaloValido, intervalo.inicio, intervalo.fim, periodo.inicio, periodo.fim],
  );
  // Com filtro, Saúde e calendário olham o mesmo recorte: só os conteúdos e post-its que passam nele.
  // A continuidade geral fica de todas as contas (o acompanhamento geral é de todas), identificada na análise.
  const contentsDoFiltro = useMemo(
    () => (filtroAtivo(filtro) ? contents.filter(content => conteudoPassa(indiceAgenda, content.id, filtro)) : contents),
    [contents, indiceAgenda, filtro],
  );
  const postItsDoFiltro = useMemo(
    () => (filtroAtivo(filtro) ? postIts.filter(postIt => postItPassa(indiceAgenda, postIt, filtro)) : postIts),
    [postIts, indiceAgenda, filtro],
  );
  const vistaTemRoteiro = useMemo(
    () => vistaTemRoteiroNosPostIts(postItsDoFiltro),
    [postItsDoFiltro],
  );
  // Hachura: pausa de publicação no período visível da grade (mês/semana/foco).
  const pausedDateKeys = useMemo(
    () => setDiasPausaPublicacao(state.editorial.pausas ?? [], {inicio: periodo.inicio, fim: periodo.fim}),
    [state.editorial.pausas, periodo.inicio, periodo.fim],
  );
  const monthHealth = useMemo(() => {
    const settings = state.editorial;
    const counts = saudeDoMes({
      postIts: postItsDoFiltro,
      contents: contentsDoFiltro,
      series: state.series,
      pilares: state.pilares,
      settings,
      periodo: periodoDaSaude,
      platforms: state.platforms,
    });
    // Indicadores da Saúde: só leem. Objetivo de cada conteúdo; séries intervalo a intervalo.
    const proporcao = proporcaoDesejadaDoPeriodo({
      periodo: periodoDaSaude,
      limiteSemanal: settings.preferencias?.limiteSemanal ?? null,
      proporcaoFuncoes: readProporcao(settings.proporcaoFuncoes),
      vigencias: settings.vigencias,
    });
    // As mesmas metas em número do editor do Editorial: o ajuste do período, senão proporção × meta.
    // Com filtro não há meta de conteúdos daquela rede: os objetivos ficam em percentual contra a proporção.
    const metasObjetivo = metasDoPeriodo({
      limite: filtroAtivo(filtro) ? null : counts.limite,
      proporcao,
      ajustes: decisaoDoPeriodo(settings.periodos ?? [], periodoDaSaude.inicio, periodoDaSaude.fim)?.metas,
    });
    const objetivos = distribuicaoPorObjetivo({itens: counts.itens, contents: contentsDoFiltro, series: state.series, proporcao, metas: metasObjetivo});
    // Semanas e meses das pontas são avaliados inteiros: busca os itens além do período.
    const estendido = saudeDoMes({
      postIts,
      contents,
      series: state.series,
      pilares: state.pilares,
      settings,
      periodo: janelaDaContinuidade(periodoDaSaude),
      platforms: state.platforms,
    });
    const continuidade = continuidadeDasSeries({
      series: state.series,
      itens: estendido.itens,
      periodo: periodoDaSaude,
      pausas: settings.pausas ?? [],
      temporadas: state.temporadas,
      // Andamento das waves sobre todos os episódios, não só os do período.
      progressoDasOndas: progressoDasOndas(state.contents, format(new Date(), 'yyyy-MM-dd')),
    });
    // Publicações por conta no trecho, com a meta de cada conta e a soma (incompleta quando falta meta).
    const publicacoes = publicacoesNaSaude({
      contents: contentsDoFiltro,
      platforms: state.platforms,
      series: state.series,
      periodo: periodoDaSaude,
      linhas: settings.metasDasContas ?? [],
      decisao: decisaoDoPeriodo(settings.periodos ?? [], periodoDaSaude.inicio, periodoDaSaude.fim),
      proporcaoGeral: readProporcao(settings.proporcaoFuncoes),
      pausas: settings.pausas ?? [],
      filtro,
    });
    // Acompanhamentos por conta ou formato: cada um conferido à parte, pelas publicações de cada conta.
    // Com filtro, ficam os acompanhamentos daquela conta ou formato e os que valem para todas.
    const escopos = linhasDaContinuidadePorEscopo({
      series: state.series,
      contents,
      postIts,
      platforms: state.platforms,
      periodo: periodoDaSaude,
      pausas: settings.pausas ?? [],
      temporadas: state.temporadas,
    }).filter(linha =>
      (filtro.redes.length === 0 || !linha.platformId || contaNoFiltro(redeDaRef(linha.platformId, state.platforms), filtro.redes))
      && (!filtro.formato || !linha.formato || linha.formato === filtro.formato));
    return {
      // A meta absoluta do período já vem na contagem (`metaDoPeriodo`).
      counts,
      temDistribuicao: readProporcao(settings.proporcaoFuncoes) != null,
      objetivos,
      continuidade,
      escopos,
      publicacoes,
    };
  }, [postIts, contents, postItsDoFiltro, contentsDoFiltro, state.series, state.pilares, state.platforms, state.editorial, state.temporadas, periodoDaSaude, filtro]);
  const rotuloSaude = rotuloDoPeriodo(periodoDaSaude);
  const avisoSaude = avisoDoCalendario(periodoDaSaude, periodo);

  // Avisos no mesmo trecho da Saúde (o intervalo, quando escolhido) e no mesmo recorte do filtro.
  // Gravações por dia são capacidade do dia, de todas as redes: esse aviso não segue o filtro.
  // Semana corrente, próximos 12 dias e fim do mês da vista: continuidade de todas as redes, como na Saúde.
  const avisosOrientacao = useMemo(() => {
    const hoje = new Date();
    const hojeIso = format(hoje, 'yyyy-MM-dd');
    const continuidadeNo = (trecho: {inicio: string; fim: string}, comItens: boolean) => continuidadeDasSeries({
      series: state.series,
      itens: comItens ? saudeDoMes({
        postIts,
        contents,
        series: state.series,
        pilares: state.pilares,
        settings: state.editorial,
        periodo: janelaDaContinuidade(trecho),
        platforms: state.platforms,
      }).itens : [],
      periodo: trecho,
      pausas: state.editorial.pausas ?? [],
      temporadas: state.temporadas,
      hoje: hojeIso,
    });
    const mesDaVista = {inicio: format(startOfMonth(month), 'yyyy-MM-dd'), fim: format(endOfMonth(month), 'yyyy-MM-dd')};
    const globais = {
      hoje,
      // Capacidade só usa as metas das linhas acompanhadas na semana, não os itens.
      continuidadeDaSemana: continuidadeNo(semanaCorrente(hoje), false),
      continuidadeProxima: continuidadeNo(janelaDosProximosDias(hoje), true),
      continuidadeDoMes: continuidadeNo(mesDaVista, true),
      mesDaVista,
    };
    const avisosDo = (lista: {postIts: PlanejamentoPostIt[]; contents: typeof contents}, extras: Partial<typeof globais> = {}) => avisosDeOrientacao({
      ...extras,
      postIts: lista.postIts,
      contents: lista.contents,
      series: state.series,
      temas: state.temas,
      obras: state.bibliotecaItems,
      periodo: periodoDaSaude,
      // Concentração usa os mesmos publicados e reservas da Saúde, também no aviso pontual.
      entries: entriesDaConcentracao({
        ...lista, series: state.series, temas: state.temas, obras: state.bibliotecaItems,
        settings: state.editorial, platforms: state.platforms, periodo: periodoDaSaude,
      }),
      // Frequência das séries com a mesma apuração da Saúde: janelas inteiras nas pontas.
      itensSerie: saudeDoMes({
        postIts: lista.postIts,
        contents: lista.contents,
        series: state.series,
        pilares: state.pilares,
        settings: state.editorial,
        periodo: janelaDaContinuidade(periodoDaSaude),
        platforms: state.platforms,
      }).itens,
      limiteGravacoesDia: state.editorial.preferencias.limiteGravacoesDia,
      concentracao: state.editorial.concentracao,
      sequenciaPorConteudo: state.editorial.concentracao.contarSequencia ? mapaSequenciaPorConteudo(lista.contents) : {},
      excecoesConcentracao: state.editorial.excecoesConcentracao,
      pausas: state.editorial.pausas ?? [],
      platforms: state.platforms,
      redeReferenciaId: state.editorial.preferencias.redeReferenciaId,
      diasGravacao: state.editorial.preferencias.diasGravacao,
      antecedenciaPostagemDias: state.editorial.preferencias.antecedenciaPostagemDias,
      temporadas: state.temporadas,
    });
    const todos = avisosDo({postIts, contents}, globais);
    if (!filtroAtivo(filtro)) return todos;
    const doFiltro = avisosDo({postIts: postItsDoFiltro, contents: contentsDoFiltro});
    return [
      ...doFiltro.filter(aviso => !TIPOS_AVISO_GLOBAIS.has(aviso.tipo)),
      ...todos.filter(aviso => TIPOS_AVISO_GLOBAIS.has(aviso.tipo)),
    ];
  }, [postIts, contents, postItsDoFiltro, contentsDoFiltro, filtro, state.series, state.pilares, state.platforms, state.editorial, state.temas, state.bibliotecaItems, state.temporadas, periodoDaSaude, month]);

  const marcarFoiDeProposito = (aviso: AvisoOrientacao) => {
    const excecao = excecaoFoiDeProposito(aviso, generateUUID());
    if (!excecao) return;
    dispatch({type: 'SET_EDITORIAL', payload: {
      ...state.editorial,
      excecoesConcentracao: [...(state.editorial.excecoesConcentracao ?? []), excecao],
    }});
  };

  const verPautasDoAviso = (aviso: AvisoOrientacao) => {
    setAvisoAtivoId(aviso.id);
    setDestaqueIds(new Set(aviso.postItIds));
  };

  const localizarAviso = (aviso: AvisoOrientacao) => {
    const dia = diaDoAviso(aviso, postIts, contents);
    if (dia) setMonth(new Date(`${dia}T12:00:00`));
    verPautasDoAviso(aviso);
    // Ausência e capacidade não têm pauta para destacar: a análise mostra o porquê.
    setAnaliseAberta(abreAnaliseAoLocalizar(aviso));
  };

  const focarIntervalo = (intervalo: IntervaloSaude) => {
    setOrigemSaude(prev => prev ?? {periodo: periodoDaSaude, data: format(month, 'yyyy-MM-dd'), vista});
    setMonth(new Date(intervalo.inicio + 'T12:00:00'));
    setVistaRaw('semana');
    setIntervaloEmFoco(intervalo);
    setAvisoAtivoId(null);
    setAnaliseAberta(false);
  };
  const handlePlanejarIntervalo = ({serieId, inicio, fim}: IntervaloSaude & {serieId: string}) => {
    focarIntervalo({inicio, fim});
    setDestaqueIds(new Set());
    setSeriePlanejandoId(serieId);
  };
  const handleReorganizarEpisodios = ({inicio, fim, itemIds}: IntervaloSaude & {itemIds: string[]}) => {
    focarIntervalo({inicio, fim});
    setSeriePlanejandoId(null);
    setDestaqueIds(new Set(itemIds));
  };
  const roteiroIdsDoPeriodo = useMemo(() => roteirosDaSaude(monthHealth.counts.itens, contents, state.recordingBlocks), [monthHealth.counts.itens, contents, state.recordingBlocks]);
  const handleOpenGravacao = (contentIds = roteiroIdsDoPeriodo) => {
    const elegiveis = new Set(roteiroIdsDoPeriodo);
    const ids = contentIds.filter(id => elegiveis.has(id));
    if (ids.length === 0) return;
    navigate('/gravacao?ids=' + encodeURIComponent(ids.join(',')), buildDetailBackState(retornoPlanejamento));
  };
  // Pendências ativas não somem quando o calendário vira o mês ou a semana.
  const foraDoPrazo = useMemo(() => pendenciasNaSaude({
    postIts: postItsDoFiltro, contents: contentsDoFiltro, series: state.series,
    pilares: state.pilares, settings: state.editorial, platforms: state.platforms,
  }), [postItsDoFiltro, contentsDoFiltro, state.series, state.pilares, state.editorial, state.platforms]);

  const limparDestaque = () => {
    setAvisoAtivoId(null);
    setDestaqueIds(new Set());
  };

  return {
    periodo,
    intervaloValido,
    periodoDaSaude,
    contentsDoFiltro,
    postItsDoFiltro,
    vistaTemRoteiro,
    pausedDateKeys,
    monthHealth,
    rotuloSaude,
    avisoSaude,
    avisosOrientacao,
    verPautasDoAviso,
    localizarAviso,
    marcarFoiDeProposito,
    focarIntervalo,
    handlePlanejarIntervalo,
    handleReorganizarEpisodios,
    roteiroIdsDoPeriodo,
    handleOpenGravacao,
    foraDoPrazo,
    avisoAtivoId,
    setAvisoAtivoId,
    limparDestaque,
  };
}
