import type { Content, Platform, Serie, Temporada } from '../../../lib/database.ts';
import { isActiveCreation } from '../../contents/lib/contentWorkflow.ts';
import { REDE_ROTULO, redeDaConta } from '../../contas/lib/contas.ts';
import { etapaDoStatus } from '../../editorial/lib/etapas.ts';
import { filhosDaSerie, idsDaSubarvore } from '../../editorial/lib/serieArvore.ts';
import { escopoTemporadas, temporadasDoEscopo } from '../../editorial/lib/temporadas.ts';
import { compararOrdemEpisodio } from './ordemEpisodios.ts';
import { faixaDaEtapa, type FaixaDoCabecalho } from './serieCabecalho.ts';
import type { GrupoConteudos } from './seriesGrupos.ts';
import { contasDoCicloAtual } from './seriesSecoes.ts';

/**
 * Lista da página da série: busca, filtros, agrupamento e ordem.
 * Tudo aqui só lê. Nenhuma função grava série, temporada ou conteúdo.
 */

export type AgruparLista = 'nenhum' | 'quadro' | 'temporada';
export type OrdemLista = 'manual' | 'publicacao' | 'criacao' | 'titulo';

export type FiltrosLista = {
  busca: string;
  etapa: 'todas' | FaixaDoCabecalho;
  /** 'todos', 'sem' (direto na série) ou o id do quadro. */
  quadro: string;
  /** 'todas' ou o id da conta. */
  conta: string;
  /** 'todas', 'sem' ou o id da temporada. */
  temporada: string;
};

export const FILTROS_LISTA_PADRAO: FiltrosLista = { busca: '', etapa: 'todas', quadro: 'todos', conta: 'todas', temporada: 'todas' };

export const ETAPAS_DO_FILTRO: ReadonlyArray<{ value: FiltrosLista['etapa']; label: string }> = [
  { value: 'todas', label: 'Todas' },
  { value: 'ideias', label: 'Ideia' },
  { value: 'roteiros', label: 'Roteiro' },
  { value: 'producao', label: 'Produção' },
  { value: 'postados', label: 'Postado' },
];

export const ROTULO_ORDEM: Record<OrdemLista, string> = {
  manual: 'Ordem manual',
  publicacao: 'Data de publicação',
  criacao: 'Data de criação',
  titulo: 'Título A-Z',
};

export const ROTULO_AGRUPAR: Record<AgruparLista, string> = {
  nenhum: 'Nenhum',
  quadro: 'Quadro',
  temporada: 'Temporada',
};

export function filtrosListaAtivos(filtros: FiltrosLista): boolean {
  return Boolean(filtros.busca.trim()) || filtros.etapa !== 'todas' || filtros.quadro !== 'todos'
    || filtros.conta !== 'todas' || filtros.temporada !== 'todas';
}

function semAcento(valor: string): string {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

type ContaRotulo = Pick<Platform, 'id' | 'nome' | 'rede'>;

/** "Instagram · @anne". Sem rede conhecida, só o nome. */
export function rotuloDaConta(conta: ContaRotulo): string {
  const rede = redeDaConta(conta);
  const nome = conta.nome?.trim() || 'Sem nome';
  return rede ? `${REDE_ROTULO[rede]} · ${nome}` : nome;
}

/** Quadro (filho direto da série da página) em que o episódio está. Null = direto na série. */
export function quadroDoEpisodio(
  content: Pick<Content, 'seriesId'>,
  serieId: string,
  series: readonly Pick<Serie, 'id' | 'parentId' | 'name'>[],
): string | null {
  if (!content.seriesId || content.seriesId === serieId) return null;
  for (const filho of filhosDaSerie(serieId, series)) {
    if (idsDaSubarvore(filho.id, series).has(content.seriesId)) return filho.id;
  }
  return null;
}

export type ContextoLista = {
  serieId: string;
  series: readonly Serie[];
  contas: readonly ContaRotulo[];
  /** Temporadas válidas desta série (escopo). Fora delas o episódio conta como sem temporada. */
  temporadasValidas: readonly Pick<Temporada, 'id'>[];
};

function temporadaValida(content: Pick<Content, 'temporadaId'>, ctx: ContextoLista): string | null {
  const id = content.temporadaId ?? null;
  return id && ctx.temporadasValidas.some(item => item.id === id) ? id : null;
}

/** Os filtros juntos. A conta só olha as contas já marcadas: não muda nada no episódio. */
export function passaNosFiltros(content: Content, filtros: FiltrosLista, ctx: ContextoLista): boolean {
  if (filtros.etapa !== 'todas' && faixaDaEtapa(etapaDoStatus(content.status)) !== filtros.etapa) return false;
  if (filtros.quadro !== 'todos') {
    const quadro = quadroDoEpisodio(content, ctx.serieId, ctx.series);
    if (filtros.quadro === 'sem' ? quadro !== null : quadro !== filtros.quadro) return false;
  }
  if (filtros.conta !== 'todas') {
    if (!contasDoCicloAtual(content, ctx.contas).some(conta => conta.id === filtros.conta)) return false;
  }
  if (filtros.temporada !== 'todas') {
    const temporada = temporadaValida(content, ctx);
    if (filtros.temporada === 'sem' ? temporada !== null : temporada !== filtros.temporada) return false;
  }
  const busca = semAcento(filtros.busca.trim());
  if (busca && !semAcento(content.title ?? '').includes(busca)) return false;
  return true;
}

type Ordenavel = Pick<Content, 'id' | 'title' | 'createdAt' | 'publishDate'> & Partial<Pick<Content, 'ordemEpisodio'>>;

function porManual(a: Ordenavel, b: Ordenavel): number {
  return compararOrdemEpisodio(a, b) || (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id);
}

/**
 * Ordena sem mudar nada. Empates sempre caem na ordem manual e, por fim, no id: o resultado é estável.
 * Data de publicação: a data do episódio (`publishDate`), a mesma que a linha mostra. Sem data, vai para o fim.
 */
export function ordenarLista<T extends Ordenavel>(lista: readonly T[], ordem: OrdemLista): T[] {
  return [...lista].sort((a, b) => {
    if (ordem === 'titulo') return (a.title || '').localeCompare(b.title || '', 'pt-BR') || porManual(a, b);
    if (ordem === 'criacao') return (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id);
    if (ordem === 'publicacao') {
      const da = a.publishDate || '';
      const db = b.publishDate || '';
      if (da !== db) {
        if (!da) return 1;
        if (!db) return -1;
        return da.localeCompare(db);
      }
      return porManual(a, b);
    }
    return porManual(a, b);
  });
}

/** Episódios ativos da série e dos quadros; na página de uma temporada, só os dela. */
export function episodiosDaPagina(
  serieId: string,
  series: readonly Serie[],
  contents: readonly Content[],
  temporadaId: string | null = null,
): Content[] {
  const subarvore = idsDaSubarvore(serieId, series);
  const vistos = new Set<string>();
  return contents.filter(content => {
    if (!isActiveCreation(content) || !content.seriesId || !subarvore.has(content.seriesId)) return false;
    if (temporadaId && content.temporadaId !== temporadaId) return false;
    if (vistos.has(content.id)) return false;
    vistos.add(content.id);
    return true;
  });
}

export type OpcoesDeAgrupar = { temQuadros: boolean; temTemporadas: boolean };

export function opcoesDeAgrupar({ temQuadros, temTemporadas }: OpcoesDeAgrupar): AgruparLista[] {
  return ['nenhum', ...(temQuadros ? ['quadro' as const] : []), ...(temTemporadas ? ['temporada' as const] : [])];
}

/** Escolha salva, se ainda existir; senão quadro quando há quadros, senão lista contínua. */
export function resolverAgrupar(salvo: unknown, opcoes: OpcoesDeAgrupar): AgruparLista {
  const validas = opcoesDeAgrupar(opcoes);
  if (typeof salvo === 'string' && (validas as string[]).includes(salvo)) return salvo as AgruparLista;
  return opcoes.temQuadros ? 'quadro' : 'nenhum';
}

/** Ordem salva, se ainda existir. Sem a coluna de ordem, a manual não é oferecida. */
export function opcoesDeOrdem(ordemDisponivel: boolean): OrdemLista[] {
  return [...(ordemDisponivel ? ['manual' as const] : []), 'publicacao', 'criacao', 'titulo'];
}

export function resolverOrdem(salvo: unknown, ordemDisponivel: boolean): OrdemLista {
  const validas = opcoesDeOrdem(ordemDisponivel);
  if (typeof salvo === 'string' && (validas as string[]).includes(salvo)) return salvo as OrdemLista;
  return validas[0];
}

/** Filtro de quadro ou temporada que aponta para algo que sumiu volta para "todos". */
export function filtrosValidos(filtros: FiltrosLista, validos: { quadros: readonly string[]; contas: readonly string[]; temporadas: readonly string[] | null }): FiltrosLista {
  return {
    ...filtros,
    quadro: filtros.quadro === 'todos' || filtros.quadro === 'sem' || validos.quadros.includes(filtros.quadro) ? filtros.quadro : 'todos',
    conta: filtros.conta === 'todas' || validos.contas.includes(filtros.conta) ? filtros.conta : 'todas',
    temporada: validos.temporadas && (filtros.temporada === 'todas' || filtros.temporada === 'sem' || validos.temporadas.includes(filtros.temporada))
      ? filtros.temporada
      : 'todas',
  };
}

/** Só existem setas na lista contínua, em ordem manual, sem busca nem filtro e com a coluna no banco. */
export function setasDisponiveis(input: { agrupar: AgruparLista; ordem: OrdemLista; filtros: FiltrosLista; ordemDisponivel: boolean }): boolean {
  return input.ordemDisponivel && input.agrupar === 'nenhum' && input.ordem === 'manual' && !filtrosListaAtivos(input.filtros);
}

export function temporadasDaSerie(serieId: string, series: readonly Serie[], temporadas: readonly Temporada[]): Temporada[] | null {
  const escopo = escopoTemporadas(serieId, series);
  return escopo ? temporadasDoEscopo(escopo.id, temporadas) : null;
}

type GrupoBruto = { id: string; rotulo: string; serieId: string; temporada: Temporada | null; filhoId: string | null; lista: Content[]; fixo?: boolean };

/**
 * Grupos só para mostrar. Cada episódio entra em um grupo só; trocar o agrupamento não muda nenhum vínculo.
 * Grupos sem episódio visível ficam de fora.
 */
export function montarLista({
  episodios,
  filtros,
  agrupar,
  ordem,
  ctx,
  temporadas,
  soYoutube,
}: {
  episodios: readonly Content[];
  filtros: FiltrosLista;
  agrupar: AgruparLista;
  ordem: OrdemLista;
  ctx: ContextoLista;
  temporadas: readonly Temporada[];
  /** Regra do bloco "Só YouTube" (vai só para o YouTube e a série costuma ir para mais redes). Sem ela, não há bloco. */
  soYoutube?: (content: Content) => boolean;
}): GrupoConteudos[] {
  let brutos: GrupoBruto[];
  if (agrupar === 'quadro') {
    const filhos = filhosDaSerie(ctx.serieId, ctx.series);
    brutos = [
      { id: 'sem-quadro', rotulo: 'Sem quadro', serieId: ctx.serieId, temporada: null, filhoId: null, lista: [] },
      ...filhos.map(filho => ({
        id: `quadro:${filho.id}`, rotulo: filho.name?.trim() || 'Sem nome', serieId: filho.id, temporada: null, filhoId: filho.id, lista: [] as Content[],
        // Quadro ativo aparece mesmo vazio (sem busca nem filtro), com o botão de novo episódio.
        fixo: ctx.series.find(item => item.id === filho.id)?.ativa !== false,
      })),
    ];
    for (const content of episodios) {
      const quadro = quadroDoEpisodio(content, ctx.serieId, ctx.series);
      (brutos.find(grupo => grupo.filhoId === quadro) ?? brutos[0]).lista.push(content);
    }
  } else if (agrupar === 'temporada') {
    const validas = temporadas.filter(item => ctx.temporadasValidas.some(valida => valida.id === item.id));
    brutos = [
      ...validas.map(temporada => ({ id: `temporada:${temporada.id}`, rotulo: temporada.nome, serieId: ctx.serieId, temporada, filhoId: null, lista: [] as Content[], fixo: true })),
      { id: 'sem-temporada', rotulo: 'Sem temporada', serieId: ctx.serieId, temporada: null, filhoId: null, lista: [] },
    ];
    for (const content of episodios) {
      const id = temporadaValida(content, ctx);
      ((id ? brutos.find(grupo => grupo.temporada?.id === id) : undefined) ?? brutos[brutos.length - 1]).lista.push(content);
    }
  } else {
    brutos = [{ id: 'todos', rotulo: 'Episódios', serieId: ctx.serieId, temporada: null, filhoId: null, lista: [...episodios] }];
  }

  const semFiltro = !filtrosListaAtivos(filtros);
  return brutos
    .filter(bruto => bruto.lista.length > 0 || (semFiltro && bruto.fixo))
    .map(bruto => {
      const visiveis = ordenarLista(bruto.lista.filter(content => passaNosFiltros(content, filtros, ctx)), ordem);
      const { principais, soYt, totalSoYt } = separarSoYoutube(bruto.lista, visiveis, soYoutube);
      return {
        id: bruto.id,
        rotulo: bruto.rotulo,
        serieId: bruto.serieId,
        temporadaId: bruto.temporada?.id ?? null,
        temporada: bruto.temporada,
        filhoId: bruto.filhoId,
        foraDoEscopo: false,
        total: bruto.lista.length,
        visiveis: visiveis.length,
        contents: principais,
        blocos: soYt.length > 0 ? [{
          id: `${bruto.id}:so:youtube`,
          rede: 'youtube' as const,
          rotulo: ROTULO_SO_YOUTUBE,
          total: totalSoYt,
          contents: soYt,
        }] : [],
      };
    })
    // Esvaziado pelo filtro some; vazio de verdade só fica se for temporada ou quadro ativo, sem filtro.
    .filter(grupo => grupo.visiveis > 0 || (semFiltro && grupo.total === 0));
}

export const ROTULO_SO_YOUTUBE = 'Só YouTube';

/**
 * Separa, mantendo a ordem, os que vão só para o YouTube. Só apresentação: nada é gravado.
 * O grupo continua com a mesma contagem; o bloco só aparece quando tem algum visível.
 */
export function separarSoYoutube<T>(
  todos: readonly T[],
  visiveis: readonly T[],
  soYoutube?: (content: T) => boolean,
): { principais: T[]; soYt: T[]; totalSoYt: number } {
  if (!soYoutube) return { principais: [...visiveis], soYt: [], totalSoYt: 0 };
  return {
    principais: visiveis.filter(content => !soYoutube(content)),
    soYt: visiveis.filter(content => soYoutube(content)),
    totalSoYt: todos.filter(content => soYoutube(content)).length,
  };
}

/** Episódios exibidos do grupo: os de cima e os do bloco "Só YouTube", na ordem da tela. */
export function exibidosDoGrupo<T>(grupo: { contents: readonly T[]; blocos: ReadonlyArray<{ contents: readonly T[] }> }): T[] {
  return [...grupo.contents, ...grupo.blocos.flatMap(bloco => bloco.contents)];
}

export function textoEpisodios(quantidade: number): string {
  return quantidade === 1 ? '1 episódio' : `${quantidade} episódios`;
}

/** "Exibindo 3 de 8 episódios". */
export function textoExibindo(visiveis: number, total: number): string {
  return `Exibindo ${visiveis} de ${textoEpisodios(total)}`;
}

/** Cabeçalho do grupo: "8 episódios" ou, com filtro, "3 de 8 episódios". */
export function contagemDoGrupo(visiveis: number, total: number, filtrando: boolean): string {
  return filtrando ? `${visiveis} de ${textoEpisodios(total)}` : textoEpisodios(total);
}

export type NovaOrdem = { id: string; ordemEpisodio: number };

/**
 * Mover para…: tira os movidos da posição antiga e põe no fim, na ordem relativa que já tinham.
 * Renumera a série inteira (1, 2, 3...) porque episódio sem número fica depois dos numerados:
 * gravar só "maior + 1" com outros ainda sem número colocaria o movido antes deles.
 * Devolve só quem muda de número.
 */
export function planoMoverParaOFim<T extends Ordenavel>(escopo: readonly T[], movidos: ReadonlySet<string>): NovaOrdem[] {
  const ordenado = ordenarLista(escopo, 'manual');
  const ficam = ordenado.filter(item => !movidos.has(item.id));
  const vao = ordenado.filter(item => movidos.has(item.id));
  return [...ficam, ...vao]
    .map((item, indice) => ({ item, ordemEpisodio: indice + 1 }))
    .filter(({ item, ordemEpisodio }) => item.ordemEpisodio !== ordemEpisodio)
    .map(({ item, ordemEpisodio }) => ({ id: item.id, ordemEpisodio }));
}

/** Aplica só o número de ordem; o resto do episódio fica igual (inclusive updatedAt). */
export function aplicarOrdem<T extends { id: string; ordemEpisodio?: number | null }>(lista: readonly T[], novas: readonly NovaOrdem[]): T[] {
  const porId = new Map(novas.map(item => [item.id, item.ordemEpisodio]));
  return lista.map(item => (porId.has(item.id) ? { ...item, ordemEpisodio: porId.get(item.id) as number } : item));
}

/** A coluna existe quando o banco devolve o campo (número ou null); sem ela, o app recebe undefined. */
export function colunaDeOrdemDisponivel(contents: readonly Partial<Pick<Content, 'ordemEpisodio'>>[]): boolean {
  return contents.some(content => content.ordemEpisodio !== undefined);
}
