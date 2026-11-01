import type { Content, Platform, RedeSocial, Serie, SerieTipoAgrupamento, Temporada } from '../../../lib/database.ts';
import { isActiveCreation } from '../../contents/lib/contentWorkflow.ts';
import { REDE_ROTULO, redeDaConta } from '../../contas/lib/contas.ts';
import { destinosPadraoAtivos } from '../../editorial/lib/destinations.ts';
import { aplicarEscolhasDaSerie } from '../../editorial/lib/escolhasSerie.ts';
import { ancestraisDaSerie, filhosDaSerie, idsDaSubarvore } from '../../editorial/lib/serieArvore.ts';
import { escopoTemporadas, temporadaNoEscopo, temporadasDoEscopo } from '../../editorial/lib/temporadas.ts';
import { contasDoCicloAtual, filtrosAtivos, ordenarConteudos, passaNoFiltro, type FiltrosConteudos } from './seriesSecoes.ts';

export type AgruparPor = 'temporada' | 'quadro' | 'rede';

type ContaRede = Pick<Platform, 'id' | 'nome' | 'rede' | 'ativo'>;

const ORDEM_DAS_REDES: readonly RedeSocial[] = ['instagram', 'tiktok', 'youtube', 'blog', 'outra'];

function porOrdemDeRede(a: RedeSocial, b: RedeSocial): number {
  return ORDEM_DAS_REDES.indexOf(a) - ORDEM_DAS_REDES.indexOf(b);
}

/** Redes marcadas no ciclo atual do conteúdo, sem repetir. Duas contas de YouTube contam como uma rede. */
export function redesDoConteudo(
  content: Pick<Content, 'plataformas'>,
  contas: readonly Pick<Platform, 'id' | 'nome' | 'rede'>[],
): RedeSocial[] {
  const redes = new Set<RedeSocial>();
  for (const conta of contasDoCicloAtual(content, contas)) {
    const rede = redeDaConta(conta);
    if (rede) redes.add(rede);
  }
  return [...redes].sort(porOrdemDeRede);
}

/** Todas as redes marcadas nos conteúdos, juntas. */
export function redesUsadas(
  contents: readonly Pick<Content, 'plataformas'>[],
  contas: readonly Pick<Platform, 'id' | 'nome' | 'rede'>[],
): Set<RedeSocial> {
  return new Set(contents.flatMap(content => redesDoConteudo(content, contas)));
}

/**
 * Redes que os conteúdos do agrupamento costumam ter: as contas dele ou do agrupamento acima
 * mais próximo que tiver contas; sem nenhuma, os destinos padrão de conteúdo novo; sem destinos
 * padrão, as redes que os próprios conteúdos usam.
 */
export function redesDeCostume(
  serieId: string,
  series: readonly Pick<Serie, 'id' | 'parentId' | 'name' | 'plataformas'>[],
  contas: readonly ContaRede[],
  destinosPadrao: readonly string[],
  usadas: ReadonlySet<RedeSocial> = new Set(),
): Set<RedeSocial> {
  const propria = series.find(item => item.id === serieId);
  const acima = ancestraisDaSerie(serieId, series)
    .map(no => series.find(item => item.id === no.id))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const paraRedes = (ids: readonly string[]) => new Set(
    ids
      .map(id => contas.find(conta => conta.id === id))
      .map(conta => redeDaConta(conta))
      .filter((rede): rede is RedeSocial => Boolean(rede)),
  );
  for (const serie of propria ? [propria, ...acima] : acima) {
    const redes = paraRedes((serie.plataformas ?? []).map(item => item.platformId));
    if (redes.size > 0) return redes;
  }
  const padrao = paraRedes(destinosPadraoAtivos(destinosPadrao, contas.filter(conta => conta.ativo)).map(item => item.id));
  return padrao.size > 0 ? padrao : new Set(usadas);
}

/**
 * Rede do bloco "Só …": o conteúdo vai para uma rede só e a série costuma ir para mais de uma
 * (ou para outra). Numa série que só posta numa rede, quem vai só para ela segue o costume.
 */
export function redeDoBloco(redes: readonly RedeSocial[], costume: ReadonlySet<RedeSocial>): RedeSocial | null {
  if (redes.length !== 1 || costume.size === 0) return null;
  return costume.size === 1 && costume.has(redes[0]) ? null : redes[0];
}

export function rotuloSoRede(rede: RedeSocial): string {
  return `Só ${REDE_ROTULO[rede]}`;
}

/** Temporada só agrupa quando a série (ou a série do quadro) usa temporadas. Na página de uma temporada, não. */
export function modosDeAgrupar(input: {
  serieId: string;
  series: readonly Pick<Serie, 'id' | 'parentId' | 'name' | 'usaTemporadas'>[];
  temporadaId?: string | null;
}): AgruparPor[] {
  const temTemporadas = !input.temporadaId && Boolean(escopoTemporadas(input.serieId, input.series));
  return [...(temTemporadas ? ['temporada' as const] : []), 'quadro', 'rede'];
}

export function agruparPadrao(modos: readonly AgruparPor[]): AgruparPor {
  return modos.includes('temporada') ? 'temporada' : 'quadro';
}

/** "Quadro" na série, "Série" na família; sem filhos, a lista fica num grupo só. */
export function rotuloDoModo(modo: AgruparPor, tipo: SerieTipoAgrupamento, temFilhos: boolean): string {
  if (modo === 'temporada') return 'Temporada';
  if (modo === 'rede') return 'Rede';
  if (!temFilhos) return 'Nenhum';
  return tipo === 'familia' ? 'Série' : 'Quadro';
}

export type BlocoRede = {
  id: string;
  rede: RedeSocial;
  rotulo: string;
  /** Conteúdos do bloco, sem filtro. */
  total: number;
  /** Os que passam no filtro, já ordenados. */
  contents: Content[];
};

export type GrupoConteudos = {
  id: string;
  rotulo: string;
  /** Agrupamento que recebe conteúdo novo deste grupo. */
  serieId: string;
  /** Temporada que recebe conteúdo novo deste grupo. */
  temporadaId: string | null;
  /** Temporada do escopo que o grupo representa: dá para editar e excluir. */
  temporada: Temporada | null;
  /** Agrupamento filho que o grupo representa: dá para abrir e configurar. */
  filhoId: string | null;
  /** Conteúdos numa temporada que não é do escopo: aparecem, mas pedem reorganizar. */
  foraDoEscopo: boolean;
  /** Conteúdos do grupo inteiro, blocos incluídos, sem filtro. */
  total: number;
  /** Quantos passam no filtro, blocos incluídos. */
  visiveis: number;
  /** Os que ficam fora dos blocos, filtrados e ordenados. */
  contents: Content[];
  /** Conteúdos que vão para uma rede só. */
  blocos: BlocoRede[];
};

type GrupoBruto = Omit<GrupoConteudos, 'total' | 'visiveis' | 'contents' | 'blocos'> & {
  lista: Content[];
  /** Grupo que só aparece quando tem conteúdo. */
  somenteComConteudo?: boolean;
};

function gruposPorTemporada(
  serieId: string,
  ativos: readonly Content[],
  series: readonly Serie[],
  temporadas: readonly Temporada[],
): GrupoBruto[] {
  const escopo = escopoTemporadas(serieId, series);
  const doEscopo = escopo ? temporadasDoEscopo(escopo.id, temporadas) : [];
  const ids = new Set(doEscopo.map(item => item.id));
  const base = { serieId, filhoId: null, foraDoEscopo: false };
  return [
    ...doEscopo.map(temporada => ({
      ...base,
      id: `temp:${temporada.id}`,
      rotulo: temporada.nome,
      temporadaId: temporada.id,
      temporada,
      lista: ativos.filter(content => content.temporadaId === temporada.id),
    })),
    {
      ...base,
      id: 'temp:none',
      rotulo: 'Sem temporada',
      temporadaId: null,
      temporada: null,
      lista: ativos.filter(content => !content.temporadaId),
      somenteComConteudo: doEscopo.length > 0,
    },
    {
      ...base,
      id: 'temp:fora',
      rotulo: 'Temporada de outro agrupamento',
      temporadaId: null,
      temporada: null,
      foraDoEscopo: true,
      lista: ativos.filter(content => content.temporadaId && !ids.has(content.temporadaId)),
      somenteComConteudo: true,
    },
  ];
}

function gruposPorQuadro(
  serieId: string,
  ativos: readonly Content[],
  series: readonly Serie[],
  tipo: SerieTipoAgrupamento,
): GrupoBruto[] {
  const filhos = filhosDaSerie(serieId, series);
  const diretos = ativos.filter(content => content.seriesId === serieId);
  const grupos: GrupoBruto[] = [];
  if (diretos.length > 0 || filhos.length === 0) {
    grupos.push({
      id: 'direto',
      rotulo: filhos.length === 0 ? 'Conteúdos' : tipo === 'familia' ? 'Direto na família' : 'Direto na série',
      serieId,
      temporadaId: null,
      temporada: null,
      filhoId: null,
      foraDoEscopo: false,
      lista: diretos,
    });
  }
  for (const filho of filhos) {
    const ramo = idsDaSubarvore(filho.id, series);
    grupos.push({
      id: `filho:${filho.id}`,
      rotulo: filho.name?.trim() || 'Sem nome',
      serieId: filho.id,
      temporadaId: null,
      temporada: null,
      filhoId: filho.id,
      foraDoEscopo: false,
      lista: ativos.filter(content => Boolean(content.seriesId && ramo.has(content.seriesId))),
    });
  }
  return grupos;
}

function gruposPorRede(
  serieId: string,
  ativos: readonly Content[],
  contas: readonly ContaRede[],
): GrupoBruto[] {
  const porChave = new Map<string, Content[]>();
  for (const content of ativos) {
    const redes = redesDoConteudo(content, contas);
    const chave = redes.length === 0 ? 'nenhuma' : redes.length > 1 ? 'varias' : redes[0];
    porChave.set(chave, [...(porChave.get(chave) ?? []), content]);
  }
  const chaves = [...ORDEM_DAS_REDES, 'varias', 'nenhuma'];
  const rotulo = (chave: string) => chave === 'varias'
    ? 'Várias redes'
    : chave === 'nenhuma' ? 'Sem rede ainda' : rotuloSoRede(chave as RedeSocial);
  return chaves
    .filter(chave => porChave.has(chave))
    .map(chave => ({
      id: `rede:${chave}`,
      rotulo: rotulo(chave),
      serieId,
      temporadaId: null,
      temporada: null,
      filhoId: null,
      foraDoEscopo: false,
      lista: porChave.get(chave) ?? [],
    }));
}

/** Conteúdos ativos do agrupamento e dos que estão dentro dele; na página de uma temporada, só os dela. */
export function conteudosDaPagina(
  serieId: string,
  series: readonly Serie[],
  contents: readonly Content[],
  temporadaId: string | null = null,
): Content[] {
  const subarvore = idsDaSubarvore(serieId, series);
  return contents.filter(content =>
    isActiveCreation(content)
    && Boolean(content.seriesId && subarvore.has(content.seriesId))
    && (!temporadaId || content.temporadaId === temporadaId),
  );
}

/**
 * Grupos da página do agrupamento: por temporada, por quadro (ou série, na família) ou por rede.
 * Fora do modo rede, o que vai para uma rede só (quando a série costuma ir para mais de uma) fica
 * num bloco no fim do grupo ("Só YouTube"). Grupos vazios de temporada e de quadro continuam, para receber conteúdo.
 */
export function montarGrupos({
  serieId,
  tipo,
  series,
  temporadas,
  contents,
  contas,
  destinosPadrao,
  filtros,
  agruparPor,
  temporadaId = null,
}: {
  serieId: string;
  tipo: SerieTipoAgrupamento;
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  contents: readonly Content[];
  contas: readonly ContaRede[];
  destinosPadrao: readonly string[];
  filtros: FiltrosConteudos;
  agruparPor: AgruparPor;
  /** Página de uma temporada: só os conteúdos dela. */
  temporadaId?: string | null;
}): GrupoConteudos[] {
  const ativos = conteudosDaPagina(serieId, series, contents, temporadaId);
  const brutos = agruparPor === 'temporada'
    ? gruposPorTemporada(serieId, ativos, series, temporadas)
    : agruparPor === 'rede'
      ? gruposPorRede(serieId, ativos, contas)
      : gruposPorQuadro(serieId, ativos, series, tipo);

  const usadas = redesUsadas(ativos, contas);
  const costumes = new Map<string, Set<RedeSocial>>();
  const costumeDe = (id: string) => {
    const pronto = costumes.get(id);
    if (pronto) return pronto;
    const novo = redesDeCostume(id, series, contas, destinosPadrao, usadas);
    costumes.set(id, novo);
    return novo;
  };
  const filtrar = (lista: readonly Content[]) =>
    ordenarConteudos(lista.filter(content => passaNoFiltro(content, filtros)), filtros.ordem);
  const comFiltro = filtrosAtivos(filtros);

  const grupos = brutos
    .filter(bruto => !bruto.somenteComConteudo || bruto.lista.length > 0)
    .map(({ lista, somenteComConteudo: _, ...bruto }): GrupoConteudos => {
      const principais: Content[] = [];
      const porRede = new Map<RedeSocial, Content[]>();
      for (const content of lista) {
        const fora = agruparPor === 'rede' || !content.seriesId
          ? null
          : redeDoBloco(redesDoConteudo(content, contas), costumeDe(content.seriesId));
        if (fora) porRede.set(fora, [...(porRede.get(fora) ?? []), content]);
        else principais.push(content);
      }
      const blocos = [...porRede.entries()]
        .sort(([a], [b]) => porOrdemDeRede(a, b))
        .map(([rede, doBloco]) => ({
          id: `${bruto.id}:so:${rede}`,
          rede,
          rotulo: rotuloSoRede(rede),
          total: doBloco.length,
          contents: filtrar(doBloco),
        }))
        .filter(bloco => !comFiltro || bloco.contents.length > 0);
      const visiveisPrincipais = filtrar(principais);
      return {
        ...bruto,
        total: lista.length,
        visiveis: visiveisPrincipais.length + blocos.reduce((soma, bloco) => soma + bloco.contents.length, 0),
        contents: visiveisPrincipais,
        blocos,
      };
    });
  return comFiltro ? grupos.filter(grupo => grupo.visiveis > 0) : grupos;
}

/**
 * Destino escolhido em "Mover para". Sem `serieId`, cada conteúdo fica no agrupamento em que está.
 * A temporada mantida só fica se ainda for do escopo do destino.
 */
export type DestinoMover = {
  serieId: string | null;
  temporada: 'manter' | 'nenhuma' | string;
};

/**
 * Mesma regra de trocar a série na página do conteúdo: o que foi escolhido na mão fica, o que vinha
 * da série passa a vir do destino, e as redes marcadas não mudam.
 */
export function moverConteudo(
  content: Content,
  destino: DestinoMover,
  series: readonly Serie[],
  temporadas: readonly Temporada[],
  agora: string,
): Content {
  const serieId = destino.serieId ?? content.seriesId ?? null;
  const pedida = destino.temporada === 'manter'
    ? content.temporadaId ?? null
    : destino.temporada === 'nenhuma' ? null : destino.temporada;
  const temporadaId = pedida && serieId && temporadaNoEscopo(pedida, serieId, series, temporadas) ? pedida : null;
  const trocaDeSerie = serieId !== (content.seriesId ?? null);
  const comSerie = trocaDeSerie
    ? aplicarEscolhasDaSerie(content, series.find(item => item.id === serieId) ?? null, series)
    : content;
  return { ...comSerie, seriesId: serieId, temporadaId, updatedAt: agora };
}

/** Quem muda de fato ao mover; quem já está no destino fica de fora. */
export function conteudosQueMudam(
  selecionados: readonly Content[],
  destino: DestinoMover,
  series: readonly Serie[],
  temporadas: readonly Temporada[],
): Content[] {
  return selecionados.filter(content => {
    const movido = moverConteudo(content, destino, series, temporadas, content.updatedAt ?? '');
    return movido.seriesId !== content.seriesId || (movido.temporadaId ?? null) !== (content.temporadaId ?? null);
  });
}
