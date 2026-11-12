import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { SelectField } from '../../../components/ui/SelectField';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { PageLayout } from '../../../layouts/page/PageLayout';
import type { Clube, ClubeConteudo, ClubePasta, ClubeSerie, Serie } from '../../../lib/database';
import { withDetailBack } from '../../../lib/navigation/detailBack';
import { generateUUID } from '../../../utils/uuid';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { createContentDraft } from '../../contents/lib/createContentDraft';
import { CaixaMarcacao } from '../../settings/components/series-detail/SeriesAcoesEmMassa';
import { SeriesSelectionBar } from '../../settings/components/series-detail/SeriesSelecao';
import { alternarVarios, estadoDaMarcacao } from '../../settings/lib/selecaoEpisodios';
import { TIPO_AGRUPAMENTO_LABEL, tipoDaSerie } from '../../settings/lib/serieAgrupamento';
import { nextFreeSerieColor, serieColorKey } from '../../settings/lib/serieColors';
import { seloDoFluxo } from '../../settings/lib/seriesSecoes';
import { ClubeCabecalho } from '../components/ClubeCabecalho';
import { ClubeFormDialog, type RascunhoClube } from '../components/ClubeFormDialog';
import {
  candidatosDeSerie,
  candidatosParaPuxar,
  htmlInicialDoClube,
  itensDoClube,
  ordenarItensDoClube,
  pastasDoClube,
  proximaOrdem,
  proximaOrdemDePasta,
  proximaOrdemDeSerie,
  ROTULO_ORDEM_CLUBE,
  rotuloDaOrigem,
  seriesDoClube,
  type OrdemDoClube,
  type SerieNoClube,
} from '../lib/clubeLista';

const ARRASTO_CONTEUDO = 'application/x-criaki-clube-conteudo';
const ARRASTO_SERIE = 'application/x-criaki-clube-serie';
const ORDENS: OrdemDoClube[] = ['manual', 'publicacao', 'criacao', 'titulo'];

function diaCurto(valor: string | null | undefined): string | null {
  if (!valor || !/^\d{4}-\d{2}-\d{2}/.test(valor)) return null;
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function ClubePage() {
  const { clubeId = '' } = useParams();
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const celular = useIsMobile();
  const [editarAberto, setEditarAberto] = useState(false);
  const [puxarAberto, setPuxarAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [pastaDialogo, setPastaDialogo] = useState<ClubePasta | null | undefined>(undefined);
  const [nomePasta, setNomePasta] = useState('');
  const [serieDialogo, setSerieDialogo] = useState<string | null | undefined>(undefined);
  const [nomeSerie, setNomeSerie] = useState('');
  const [vincularDialogo, setVincularDialogo] = useState<string | null | undefined>(undefined);
  const [pastaAlvo, setPastaAlvo] = useState('');
  const [confirmar, setConfirmar] = useState<null | { message: string; confirmLabel: string; onConfirm: () => void }>(null);
  const [ordemLista, setOrdemLista] = useState<OrdemDoClube>('manual');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [selecaoAtiva, setSelecaoAtiva] = useState(false);
  const [pastaSobre, setPastaSobre] = useState<string | null>(null);
  const [moverAberto, setMoverAberto] = useState(false);
  const [fechadas, setFechadas] = useState<Set<string>>(new Set());

  const clube = (state.clubes ?? []).find(item => item.id === clubeId) ?? null;
  const vinculos = state.clubeConteudos ?? [];
  const vinculosSerie = state.clubeSeries ?? [];
  const pastas = useMemo(
    () => (clube ? pastasDoClube(clube.id, state.clubePastas ?? []) : []),
    [clube, state.clubePastas],
  );
  const itens = useMemo(
    () => (clube ? itensDoClube(clube.id, vinculos, state.contents) : []),
    [clube, vinculos, state.contents],
  );
  const caminho = `/clubes/${clubeId}`;

  const abrir = (contentId: string) => {
    navigate(buildContentDetailRoute(contentId), withDetailBack(caminho));
  };

  const criarPeca = async (pastaId: string | null) => {
    if (!clube || !user?.id) return;
    const draft = createContentDraft({
      userId: user.id,
      title: 'Novo arquivo',
      clubeId: clube.id,
      seriesId: null,
      script: htmlInicialDoClube(),
      scriptOrigem: 'modelo',
      contaNaGrade: false,
      contaNaGradeOrigem: 'manual',
    });
    const vinculo: ClubeConteudo = {
      id: generateUUID(),
      userId: user.id,
      clubeId: clube.id,
      contentId: draft.id,
      pastaId,
      ordem: proximaOrdem(clube.id, vinculos, pastaId),
      createdAt: new Date().toISOString(),
    };
    await dispatch({ type: 'ADD_CONTENT', payload: draft });
    await dispatch({ type: 'VINCULAR_CLUBE', payload: vinculo });
    navigate(buildContentDetailRoute(draft.id), withDetailBack(caminho));
  };

  const puxar = async (contentId: string) => {
    if (!clube || !user?.id) return;
    const pastaId = pastaAlvo || null;
    const vinculo: ClubeConteudo = {
      id: generateUUID(),
      userId: user.id,
      clubeId: clube.id,
      contentId,
      pastaId,
      ordem: proximaOrdem(clube.id, vinculos, pastaId),
      createdAt: new Date().toISOString(),
    };
    await dispatch({ type: 'VINCULAR_CLUBE', payload: vinculo });
    setPuxarAberto(false);
    setBusca('');
  };

  const itensDaPasta = (pastaId: string | null) => ordenarItensDoClube(
    itens.filter(item => (item.vinculo.pastaId ?? null) === pastaId),
    ordemLista,
  );

  const mover = (pastaId: string | null, contentId: string, sentido: -1 | 1) => {
    if (!clube || ordemLista !== 'manual') return;
    const ids = itensDaPasta(pastaId).map(item => item.content.id);
    const indice = ids.indexOf(contentId);
    const destino = indice + sentido;
    if (indice < 0 || destino < 0 || destino >= ids.length) return;
    const proximos = [...ids];
    const [item] = proximos.splice(indice, 1);
    proximos.splice(destino, 0, item);
    void dispatch({ type: 'REORDENAR_CLUBE', payload: { clubeId: clube.id, contentIds: proximos, pastaId } });
  };

  const moverSelecionados = (pastaId: string | null) => {
    if (!clube || selecionados.size === 0) return;
    void dispatch({
      type: 'MOVER_CONTEUDOS_CLUBE',
      payload: { clubeId: clube.id, contentIds: [...selecionados], pastaId },
    });
    setSelecionados(new Set());
    setSelecaoAtiva(false);
    setMoverAberto(false);
  };

  const soltarNaPasta = (pastaId: string | null, event: React.DragEvent) => {
    event.preventDefault();
    setPastaSobre(null);
    if (!clube) return;
    const texto = event.dataTransfer.getData('text/plain');
    if (texto.startsWith('serie:')) {
      const serieId = texto.slice('serie:'.length);
      const vinculo = vinculosSerie.find(item => item.clubeId === clube.id && item.serieId === serieId);
      if (vinculo && (vinculo.pastaId ?? null) !== pastaId) moverSerie(vinculo, pastaId);
      return;
    }
    if (!texto.startsWith('conteudo:')) return;
    const contentId = texto.slice('conteudo:'.length);
    const ids = selecionados.has(contentId) ? [...selecionados] : [contentId];
    void dispatch({ type: 'MOVER_CONTEUDOS_CLUBE', payload: { clubeId: clube.id, contentIds: ids, pastaId } });
    setSelecionados(new Set());
    setSelecaoAtiva(false);
  };

  const tirar = (contentId: string, exclusiva: boolean) => {
    if (!clube) return;
    if (exclusiva) {
      setConfirmar({
        message: 'Apagar esta peça? Ela só existe neste clube.',
        confirmLabel: 'Apagar peça',
        onConfirm: () => { void dispatch({ type: 'DELETE_CONTENT', payload: contentId }); },
      });
      return;
    }
    void dispatch({ type: 'DESVINCULAR_CLUBE', payload: { clubeId: clube.id, contentId } });
  };

  const apagarClube = () => {
    if (!clube) return;
    setConfirmar({
      message: 'Apagar o clube tira as pastas e os vínculos. As séries continuam na lista. As peças exclusivas são apagadas.',
      confirmLabel: 'Apagar clube',
      onConfirm: () => {
        void dispatch({ type: 'DELETE_CLUBE', payload: clube.id });
        navigate('/series');
      },
    });
  };

  const abrirPasta = (pasta: ClubePasta | null) => {
    setNomePasta(pasta?.nome ?? '');
    setPastaDialogo(pasta);
  };

  const salvarPasta = () => {
    if (!clube || !user?.id || !nomePasta.trim() || pastaDialogo === undefined) return;
    const agora = new Date().toISOString();
    const pasta: ClubePasta = pastaDialogo
      ? { ...pastaDialogo, nome: nomePasta.trim(), updatedAt: agora }
      : {
        id: generateUUID(),
        userId: user.id,
        clubeId: clube.id,
        nome: nomePasta.trim(),
        ordem: proximaOrdemDePasta(clube.id, state.clubePastas ?? []),
        createdAt: agora,
        updatedAt: agora,
      };
    void dispatch({ type: pastaDialogo ? 'UPDATE_CLUBE_PASTA' : 'ADD_CLUBE_PASTA', payload: pasta });
    setPastaDialogo(undefined);
    setNomePasta('');
  };

  const apagarPasta = (pasta: ClubePasta) => {
    setConfirmar({
      message: 'Apagar a pasta tira o agrupamento. As séries continuam neste clube e na lista de séries.',
      confirmLabel: 'Apagar pasta',
      onConfirm: () => { void dispatch({ type: 'DELETE_CLUBE_PASTA', payload: pasta.id }); },
    });
  };

  const criarSerie = async () => {
    if (!clube || !user?.id || !nomeSerie.trim() || serieDialogo === undefined) return;
    const agora = new Date().toISOString();
    const pastaId = pastaAlvo || null;
    const serie: Serie = {
      id: generateUUID(),
      userId: user.id,
      name: nomeSerie.trim(),
      template: '',
      notes: '',
      slotPadrao: null,
      formatoVisualPadrao: [],
      estruturaRoteiro: null,
      cor: nextFreeSerieColor(state.series),
      capaUrl: null,
      ativa: true,
      frequenciaRecomendada: null,
      funcaoPadrao: null,
      energiaPadrao: null,
      createdAt: agora,
      updatedAt: agora,
      pilarIds: [],
      plataformas: [],
      tipoAgrupamento: 'serie',
    };
    const vinculo: ClubeSerie = {
      id: generateUUID(),
      userId: user.id,
      clubeId: clube.id,
      serieId: serie.id,
      pastaId,
      ordem: proximaOrdemDeSerie(clube.id, vinculosSerie, pastaId),
      createdAt: agora,
    };
    await dispatch({ type: 'ADD_SERIE', payload: serie });
    await dispatch({ type: 'VINCULAR_SERIE_CLUBE', payload: vinculo });
    setSerieDialogo(undefined);
    setNomeSerie('');
  };

  const vincularSerie = async (serieId: string) => {
    if (!clube || !user?.id || vincularDialogo === undefined) return;
    const pastaId = pastaAlvo || null;
    const vinculo: ClubeSerie = {
      id: generateUUID(),
      userId: user.id,
      clubeId: clube.id,
      serieId,
      pastaId,
      ordem: proximaOrdemDeSerie(clube.id, vinculosSerie, pastaId),
      createdAt: new Date().toISOString(),
    };
    await dispatch({ type: 'VINCULAR_SERIE_CLUBE', payload: vinculo });
    setVincularDialogo(undefined);
    setBusca('');
  };

  const moverSerie = (vinculo: ClubeSerie, pastaId: string | null) => {
    void dispatch({ type: 'ATUALIZAR_SERIE_CLUBE', payload: { ...vinculo, pastaId } });
  };

  const tirarSerie = (serieId: string) => {
    if (!clube) return;
    void dispatch({ type: 'DESVINCULAR_SERIE_CLUBE', payload: { clubeId: clube.id, serieId } });
  };

  const abrirSerieDialogo = (pastaId: string | null) => {
    setPastaAlvo(pastaId ?? '');
    setNomeSerie('');
    setSerieDialogo(pastaId);
  };

  const abrirVincular = (pastaId: string | null) => {
    setPastaAlvo(pastaId ?? '');
    setBusca('');
    setVincularDialogo(pastaId);
  };

  const candidatos = useMemo(() => {
    if (!clube) return [];
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return candidatosParaPuxar(clube.id, vinculos, state.contents)
      .map(content => ({
        content,
        origem: rotuloDaOrigem(content, state.series, state.clubes ?? []) ?? 'Série',
      }))
      .filter(item => !termo || `${item.content.title} ${item.origem}`.toLocaleLowerCase('pt-BR').includes(termo));
  }, [busca, clube, state.clubes, state.contents, state.series, vinculos]);

  const seriesParaVincular = useMemo(() => {
    if (!clube) return [];
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return candidatosDeSerie(clube.id, vinculosSerie, state.series)
      .filter(serie => !termo || (serie.name || '').toLocaleLowerCase('pt-BR').includes(termo))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));
  }, [busca, clube, state.series, vinculosSerie]);

  if (!clube) {
    return (
      <PageLayout>
        <EmptyState
          title="Clube não encontrado"
          description="Ele pode ter sido apagado. Volte para as séries."
          action={<Link to="/series" className="t-button text-[var(--text-primary)] underline">Voltar às séries</Link>}
        />
      </PageLayout>
    );
  }

  const ocupadas = [
    ...state.series.map(serie => ({ id: serie.id, cor: serie.cor })),
    ...(state.clubes ?? []).map(item => ({ id: item.id, cor: item.cor })),
  ];
  const opcoesPasta = [
    { value: '', label: 'Sem pasta' },
    ...pastas.map(pasta => ({ value: pasta.id, label: pasta.nome })),
  ];
  const soltas = seriesDoClube(clube.id, vinculosSerie, state.series, null);
  const totalSeries = vinculosSerie.filter(vinculo => vinculo.clubeId === clube.id && state.series.some(serie => serie.id === vinculo.serieId)).length;

  const salvarEdicao = (rascunho: RascunhoClube) => {
    if (!user?.id) return;
    const atualizado: Clube = {
      ...clube,
      userId: user.id,
      nome: rascunho.nome.trim(),
      descricao: rascunho.descricao.trim(),
      cor: serieColorKey(rascunho.cor),
      capaUrl: rascunho.capaUrl.trim() || null,
      origem: rascunho.origem,
      url: rascunho.url.trim() || null,
      updatedAt: new Date().toISOString(),
    };
    void dispatch({ type: 'UPDATE_CLUBE', payload: atualizado });
    setEditarAberto(false);
  };

  const menu = [
    { id: 'vincular', label: 'Vincular série', onClick: () => abrirVincular(null) },
    { id: 'roteiro', label: 'Puxar roteiro', onClick: () => { setPastaAlvo(''); setBusca(''); setPuxarAberto(true); } },
    { id: 'editar', label: 'Editar clube', onClick: () => setEditarAberto(true) },
    { id: 'apagar', label: 'Apagar clube', tone: 'danger' as const, onClick: apagarClube },
  ];

  const cabecalho = (noCelular: boolean) => (
    <ClubeCabecalho
      clube={clube}
      celular={noCelular}
      series={totalSeries}
      pastas={pastas.length}
      pecas={itens.length}
      onNovaSerie={() => abrirSerieDialogo(null)}
      onNovaPeca={() => { void criarPeca(null); }}
      onNovaPasta={() => abrirPasta(null)}
      menu={menu}
    />
  );

  const listaDeSeries = (grupo: SerieNoClube<Serie>[]) => (
    grupo.length === 0 ? null : (
      <ul>
        {grupo.map(item => {
          const tipo = tipoDaSerie(item.serie.id, state.series);
          const nome = item.serie.name.trim() || 'Sem nome';
          return (
            <li
              key={item.vinculo.id}
              draggable
              onDragStart={event => {
                event.dataTransfer.setData('text/plain', `serie:${item.serie.id}`);
                event.dataTransfer.setData(ARRASTO_SERIE, item.serie.id);
                event.dataTransfer.effectAllowed = 'move';
              }}
              className="relative flex min-h-12 items-center justify-between gap-3 border-t border-[var(--border-color)] px-4 py-3"
            >
              <button
                type="button"
                onClick={() => navigate(`/series/${item.serie.id}`)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Badge variant="neutral" className="shrink-0">{TIPO_AGRUPAMENTO_LABEL[tipo]}</Badge>
                <span className="min-w-0 flex-1">
                  <Text variant="bodyStrong" as="span" className="block truncate text-[var(--text-primary)]">{nome}</Text>
                  <Text variant="meta" as="span" className="block truncate text-[var(--text-secondary)]">
                    {tipo === 'quadro' ? 'Quadro vinculado' : 'Série vinculada'}
                  </Text>
                </span>
              </button>
              <MoreMenu
                size="sm"
                label={`Ações de ${nome}`}
                items={[
                  { id: 'abrir', label: 'Abrir série', onClick: () => navigate(`/series/${item.serie.id}`) },
                  { id: 'editar', label: 'Editar série', onClick: () => navigate(`/series/${item.serie.id}/editar`) },
                  ...pastas
                    .filter(pasta => pasta.id !== item.vinculo.pastaId)
                    .map(pasta => ({
                      id: `pasta-${pasta.id}`,
                      label: `Mover para ${pasta.nome}`,
                      onClick: () => moverSerie(item.vinculo, pasta.id),
                    })),
                  ...(item.vinculo.pastaId ? [{
                    id: 'raiz',
                    label: 'Tirar da pasta',
                    onClick: () => moverSerie(item.vinculo, null),
                  }] : []),
                  { id: 'tirar', label: 'Tirar do clube', onClick: () => tirarSerie(item.serie.id) },
                ]}
              />
            </li>
          );
        })}
      </ul>
    )
  );

  const listaDeConteudos = (pastaId: string | null) => {
    const grupo = itensDaPasta(pastaId);
    if (grupo.length === 0) return null;
    const manual = ordemLista === 'manual';
    return (
      <ul>
        {grupo.map((item, indice) => {
          const origem = item.atalho ? rotuloDaOrigem(item.content, state.series, state.clubes ?? []) : null;
          const data = diaCurto(ordemLista === 'criacao' ? item.content.createdAt : (item.content.publishDate || item.content.createdAt));
          const marcada = selecionados.has(item.content.id);
          const titulo = item.content.title.trim() || 'Sem título';
          const selo = seloDoFluxo(item.content.status);
          return (
            <li
              key={item.content.id}
              draggable
              onDragStart={event => {
                event.dataTransfer.setData('text/plain', `conteudo:${item.content.id}`);
                event.dataTransfer.setData(ARRASTO_CONTEUDO, item.content.id);
                event.dataTransfer.effectAllowed = 'move';
              }}
              className={cn(
                'relative flex min-h-12 items-center justify-between gap-3 border-t border-[var(--border-color)] px-4 py-3',
                marcada && 'bg-[var(--bg-hover)]',
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {!celular || selecaoAtiva ? (
                  <CaixaMarcacao
                    estado={marcada ? 'todos' : 'nenhum'}
                    rotulo={`${marcada ? 'Desmarcar' : 'Marcar'} ${titulo}`}
                    onToggle={() => {
                      setSelecaoAtiva(true);
                      setSelecionados(atual => {
                        const proxima = new Set(atual);
                        if (proxima.has(item.content.id)) proxima.delete(item.content.id);
                        else proxima.add(item.content.id);
                        return proxima;
                      });
                    }}
                  />
                ) : null}
                <Text variant="meta" as="span" className="min-w-12 shrink-0 tabular-nums text-[var(--text-secondary)]">
                  {`Ep. ${String(indice + 1).padStart(2, '0')}`}
                </Text>
                <Badge
                  variant={selo === 'Em Ideia' ? 'warning' : selo === 'Publicado' ? 'success' : 'neutral'}
                  className="shrink-0"
                >
                  {selo}
                </Badge>
                <button
                  type="button"
                  onClick={() => (selecaoAtiva ? setSelecionados(atual => {
                    const proxima = new Set(atual);
                    if (proxima.has(item.content.id)) proxima.delete(item.content.id);
                    else proxima.add(item.content.id);
                    return proxima;
                  }) : abrir(item.content.id))}
                  className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Text variant="bodyStrong" as="span" className="block truncate text-[var(--text-primary)]">{titulo}</Text>
                  <Text variant="meta" as="span" className="block truncate text-[var(--text-secondary)]">
                    {[item.atalho ? (origem || 'Outra série') : 'Peça do clube', data].filter(Boolean).join(' · ')}
                  </Text>
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                {manual && grupo.length > 1 ? (
                  <div className="hidden items-center gap-0.5 sm:flex">
                    <AppButton variant="ghost" size="sm" iconOnly aria-label="Subir" disabled={indice === 0} onClick={() => mover(pastaId, item.content.id, -1)}>
                      <ChevronUp className="h-4 w-4" />
                    </AppButton>
                    <AppButton variant="ghost" size="sm" iconOnly aria-label="Descer" disabled={indice === grupo.length - 1} onClick={() => mover(pastaId, item.content.id, 1)}>
                      <ChevronDown className="h-4 w-4" />
                    </AppButton>
                  </div>
                ) : null}
                <MoreMenu
                  size="sm"
                  label={`Ações de ${titulo}`}
                items={[
                  { id: 'abrir', label: 'Abrir roteiro', onClick: () => abrir(item.content.id) },
                  ...(manual ? [
                    { id: 'subir', label: 'Subir', disabled: indice === 0, onClick: () => mover(pastaId, item.content.id, -1) },
                    { id: 'descer', label: 'Descer', disabled: indice === grupo.length - 1, onClick: () => mover(pastaId, item.content.id, 1) },
                  ] : []),
                  ...(celular ? [{ id: 'marcar', label: marcada ? 'Desmarcar' : 'Selecionar', onClick: () => {
                    setSelecaoAtiva(true);
                    setSelecionados(atual => {
                      const proxima = new Set(atual);
                      if (proxima.has(item.content.id)) proxima.delete(item.content.id);
                      else proxima.add(item.content.id);
                      return proxima;
                    });
                  } }] : []),
                  {
                    id: 'tirar',
                    label: item.atalho ? 'Tirar do clube' : 'Apagar peça',
                    tone: item.atalho ? 'default' as const : 'danger' as const,
                    onClick: () => tirar(item.content.id, !item.atalho),
                  },
                ]}
                />
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  const zona = (pastaId: string | null, titulo: string, series: SerieNoClube<Serie>[]) => {
    const conteudos = itensDaPasta(pastaId);
    const ids = conteudos.map(item => item.content.id);
    const marcacao = estadoDaMarcacao(ids, selecionados);
    const chave = pastaId ?? 'raiz';
    const aberta = !fechadas.has(chave);
    const vazia = series.length === 0 && conteudos.length === 0;
    const total = series.length + conteudos.length;
    const contagem = series.length === 0
      ? `${total} ${total === 1 ? 'peça' : 'peças'}`
      : `${total} ${total === 1 ? 'item' : 'itens'}`;
    const menuPasta = pastaId
      ? [
        { id: 'serie', label: 'Nova série nesta pasta', onClick: () => abrirSerieDialogo(pastaId) },
        { id: 'vincular', label: 'Vincular série nesta pasta', onClick: () => abrirVincular(pastaId) },
        { id: 'roteiro', label: 'Puxar roteiro nesta pasta', onClick: () => { setPastaAlvo(pastaId); setBusca(''); setPuxarAberto(true); } },
        { id: 'renomear', label: 'Editar pasta', onClick: () => abrirPasta(pastas.find(pasta => pasta.id === pastaId) ?? null) },
        { id: 'apagar', label: 'Apagar pasta', tone: 'danger' as const, onClick: () => {
          const pasta = pastas.find(item => item.id === pastaId);
          if (pasta) apagarPasta(pasta);
        } },
      ]
      : [
        { id: 'vincular', label: 'Vincular série', onClick: () => abrirVincular(null) },
        { id: 'roteiro', label: 'Puxar roteiro', onClick: () => { setPastaAlvo(''); setBusca(''); setPuxarAberto(true); } },
      ];
    return (
      <section
        key={chave}
        aria-label={titulo}
        onDragOver={event => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setPastaSobre(chave);
        }}
        onDragLeave={() => setPastaSobre(atual => atual === chave ? null : atual)}
        onDrop={event => soltarNaPasta(pastaId, event)}
        className={cn(
          'overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-sm',
          pastaSobre === chave && 'ring-2 ring-[var(--text-primary)]',
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {ids.length > 0 && (!celular || selecaoAtiva) ? (
              <CaixaMarcacao
                estado={marcacao}
                rotulo={`Selecionar os conteúdos de ${titulo}`}
                onToggle={() => {
                  setSelecaoAtiva(true);
                  setSelecionados(atual => alternarVarios(atual, ids));
                }}
                className="-ml-2"
              />
            ) : null}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <Text variant="itemTitle" as="h2" id={`pasta-${chave}`} className="min-w-0 uppercase text-[var(--text-primary)]">{titulo}</Text>
              <Badge variant="neutral">{contagem}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AppButton variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { void criarPeca(pastaId); }}>
              Novo arquivo
            </AppButton>
            <button
              type="button"
              onClick={() => setFechadas(atual => {
                const proxima = new Set(atual);
                if (proxima.has(chave)) proxima.delete(chave);
                else proxima.add(chave);
                return proxima;
              })}
              aria-expanded={aberta}
              aria-controls={`corpo-${chave}`}
              aria-label={aberta ? 'Recolher' : 'Mostrar'}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              {aberta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <MoreMenu size="sm" label={`Mais opções de ${titulo}`} items={menuPasta} />
          </div>
        </div>
        {aberta ? (
          <div id={`corpo-${chave}`}>
            {listaDeSeries(series)}
            {listaDeConteudos(pastaId)}
            {vazia ? (
              <div className="border-t border-[var(--border-color)] p-4 sm:p-6">
                <div className="rounded-[var(--radius-input)] bg-[var(--surface-subtle)] p-6 text-center">
                  <Text variant="secondary" as="p" className="italic">Nenhum conteúdo ainda.</Text>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  };

  return (
    <PageLayout
      contentWidth="wide"
      contentStack="dense"
      header={cabecalho(false)}
      mobileHeader={cabecalho(true)}
    >
      <div className="stack-lg">
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="label" as="span">Ordenar</Text>
          <SelectField
            id="clube-ordem"
            ariaLabel="Ordenar"
            value={ordemLista}
            onChange={valor => {
              if (valor === 'manual' || valor === 'publicacao' || valor === 'criacao' || valor === 'titulo') setOrdemLista(valor);
            }}
            options={ORDENS.map(item => ({ value: item, label: ROTULO_ORDEM_CLUBE[item] }))}
          />
        </div>
        <div className="stack-md">
          {pastas.map(pasta => zona(pasta.id, pasta.nome, seriesDoClube(clube.id, vinculosSerie, state.series, pasta.id)))}
          {zona(null, pastas.length > 0 ? 'Sem pasta' : 'Neste clube', soltas)}
        </div>
        {selecionados.size > 0 ? (
          <SeriesSelectionBar
            quantidade={selecionados.size}
            disponiveis={itens.length}
            onToggleTodos={() => setSelecionados(atual => alternarVarios(atual, itens.map(item => item.content.id)))}
            onMover={() => setMoverAberto(true)}
            onCancelar={() => { setSelecionados(new Set()); setSelecaoAtiva(false); }}
          />
        ) : null}
      </div>

      <BottomSheetModal open={pastaDialogo !== undefined} onClose={() => setPastaDialogo(undefined)} desktopMaxW="max-w-md">
        <OverlayHeader onClose={() => setPastaDialogo(undefined)}>
          <Text variant="sectionTitle">{pastaDialogo ? 'Renomear pasta' : 'Nova pasta'}</Text>
        </OverlayHeader>
        <OverlayBody>
          <label className="flex flex-col gap-1" htmlFor="clube-pasta-nome">
            <Text variant="label" as="span">Nome da pasta</Text>
            <input
              id="clube-pasta-nome"
              className="input"
              value={nomePasta}
              autoFocus
              onChange={event => setNomePasta(event.target.value)}
              placeholder="Ex.: Encontros"
            />
          </label>
        </OverlayBody>
        <OverlayFooter>
          <AppButton variant="secondary" onClick={() => setPastaDialogo(undefined)}>Cancelar</AppButton>
          <AppButton variant="primary" onClick={salvarPasta} disabled={!nomePasta.trim()}>Salvar</AppButton>
        </OverlayFooter>
      </BottomSheetModal>

      <BottomSheetModal open={serieDialogo !== undefined} onClose={() => setSerieDialogo(undefined)} desktopMaxW="max-w-md">
        <OverlayHeader onClose={() => setSerieDialogo(undefined)}>
          <Text variant="sectionTitle">Nova série vinculada</Text>
          <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
            A série nasce na lista de séries e aparece neste clube.
          </Text>
        </OverlayHeader>
        <OverlayBody className="stack-md">
          <label className="flex flex-col gap-1" htmlFor="clube-serie-nome">
            <Text variant="label" as="span">Nome da série</Text>
            <input
              id="clube-serie-nome"
              className="input"
              value={nomeSerie}
              autoFocus
              onChange={event => setNomeSerie(event.target.value)}
              placeholder="Ex.: Leitura do mês"
            />
          </label>
          {pastas.length > 0 ? (
            <div className="stack-xs">
              <Text variant="label" as="span">Pasta</Text>
              <SelectField
                id="clube-serie-pasta"
                ariaLabel="Pasta da série"
                value={pastaAlvo}
                onChange={setPastaAlvo}
                options={opcoesPasta}
              />
            </div>
          ) : null}
        </OverlayBody>
        <OverlayFooter>
          <AppButton variant="secondary" onClick={() => setSerieDialogo(undefined)}>Cancelar</AppButton>
          <AppButton variant="primary" onClick={() => { void criarSerie(); }} disabled={!nomeSerie.trim()}>Criar</AppButton>
        </OverlayFooter>
      </BottomSheetModal>

      <BottomSheetModal open={vincularDialogo !== undefined} onClose={() => setVincularDialogo(undefined)} desktopMaxW="max-w-lg">
        <OverlayHeader onClose={() => setVincularDialogo(undefined)}>
          <Text variant="sectionTitle">Vincular série</Text>
          <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
            Puxa a série que já existe. Ela continua na lista de séries.
          </Text>
        </OverlayHeader>
        <OverlayBody className="stack-sm">
          {pastas.length > 0 ? (
            <div className="stack-xs">
              <Text variant="label" as="span">Pasta</Text>
              <SelectField
                id="clube-vincular-pasta"
                ariaLabel="Pasta do vínculo"
                value={pastaAlvo}
                onChange={setPastaAlvo}
                options={opcoesPasta}
              />
            </div>
          ) : null}
          <label className="flex flex-col gap-1" htmlFor="clube-busca-serie">
            <Text variant="label" as="span">Buscar</Text>
            <input
              id="clube-busca-serie"
              className="input"
              value={busca}
              onChange={event => setBusca(event.target.value)}
              placeholder="Nome da série"
            />
          </label>
          {seriesParaVincular.length === 0 ? (
            <Text variant="secondary">Nenhuma série ou quadro para vincular.</Text>
          ) : (
            <ul className="stack-xs">
              {seriesParaVincular.map(serie => (
                <li key={serie.id}>
                  <button
                    type="button"
                    onClick={() => { void vincularSerie(serie.id); }}
                    className="flex min-h-11 w-full min-w-0 flex-col items-start rounded-[var(--radius-input)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Text variant="bodyStrong" as="span" className="block w-full truncate">{serie.name.trim() || 'Sem nome'}</Text>
                    <Text variant="meta" as="span" className="block w-full truncate text-[var(--text-secondary)]">
                      {TIPO_AGRUPAMENTO_LABEL[tipoDaSerie(serie.id, state.series)]}
                    </Text>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </OverlayBody>
      </BottomSheetModal>

      <BottomSheetModal open={puxarAberto} onClose={() => setPuxarAberto(false)} desktopMaxW="max-w-lg">
        <OverlayHeader onClose={() => setPuxarAberto(false)}>
          <Text variant="sectionTitle">Puxar roteiro</Text>
          <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
            O mesmo roteiro aparece nas peças. A série continua dona dele.
          </Text>
        </OverlayHeader>
        <OverlayBody className="stack-sm">
          <label className="flex flex-col gap-1" htmlFor="clube-busca-roteiro">
            <Text variant="label" as="span">Buscar</Text>
            <input
              id="clube-busca-roteiro"
              className="input"
              value={busca}
              onChange={event => setBusca(event.target.value)}
              placeholder="Título ou série"
            />
          </label>
          {candidatos.length === 0 ? (
            <Text variant="secondary">Nenhum roteiro de série ou quadro para puxar.</Text>
          ) : (
            <ul className="stack-xs">
              {candidatos.map(item => (
                <li key={item.content.id}>
                  <button
                    type="button"
                    onClick={() => { void puxar(item.content.id); }}
                    className="flex min-h-11 w-full min-w-0 flex-col items-start rounded-[var(--radius-input)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Text variant="bodyStrong" as="span" className="block w-full truncate">{item.content.title.trim() || 'Sem título'}</Text>
                    <Text variant="meta" as="span" className="block w-full truncate text-[var(--text-secondary)]">{item.origem}</Text>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </OverlayBody>
      </BottomSheetModal>

      {editarAberto ? (
        <ClubeFormDialog
          key={clube.id}
          open
          clube={clube}
          corInicial={clube.cor || nextFreeSerieColor(ocupadas, clube.id)}
          coresOcupadas={ocupadas.filter(item => item.id !== clube.id).map(item => item.cor).filter((cor): cor is string => Boolean(cor))}
          onClose={() => setEditarAberto(false)}
          onSave={salvarEdicao}
        />
      ) : null}

      <BottomSheetModal open={moverAberto} onClose={() => setMoverAberto(false)} desktopMaxW="max-w-md">
        <OverlayHeader onClose={() => setMoverAberto(false)}>
          <Text variant="sectionTitle">Mover para a pasta</Text>
          <Text variant="meta" className="mt-1 text-[var(--text-secondary)]">
            Os conteúdos selecionados mudam de pasta. O roteiro continua o mesmo.
          </Text>
        </OverlayHeader>
        <OverlayBody>
          <ul className="stack-xs">
            {[{ id: '', nome: 'Sem pasta' }, ...pastas.map(pasta => ({ id: pasta.id, nome: pasta.nome }))].map(pasta => (
              <li key={pasta.id || 'raiz'}>
                <button
                  type="button"
                  onClick={() => moverSelecionados(pasta.id || null)}
                  className="flex min-h-11 w-full items-center rounded-[var(--radius-input)] px-3 py-2 text-left hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Text variant="bodyStrong" as="span">{pasta.nome}</Text>
                </button>
              </li>
            ))}
          </ul>
        </OverlayBody>
      </BottomSheetModal>

      <ConfirmModal
        open={confirmar != null}
        message={confirmar?.message || ''}
        confirmLabel={confirmar?.confirmLabel}
        cancelLabel="Cancelar"
        onConfirm={() => {
          confirmar?.onConfirm();
          setConfirmar(null);
        }}
        onCancel={() => setConfirmar(null)}
      />
    </PageLayout>
  );
}
