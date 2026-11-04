import type { Content, Serie, Temporada } from '../../../lib/database.ts';
import { filhosDaSerie } from '../../editorial/lib/serieArvore.ts';
import { escopoTemporadas, temporadasDoEscopo } from '../../editorial/lib/temporadas.ts';
import { moverConteudo } from './seriesGrupos.ts';
import { ordenarLista } from './seriesLista.ts';

/** Seleção e ações em massa da página da série. Só calcula; quem grava é a página. */

export type EstadoMarcacao = 'nenhum' | 'parcial' | 'todos';

export function estadoDaMarcacao(ids: readonly string[], selecionados: ReadonlySet<string>): EstadoMarcacao {
  if (ids.length === 0) return 'nenhum';
  const marcados = ids.filter(id => selecionados.has(id)).length;
  if (marcados === 0) return 'nenhum';
  return marcados === ids.length ? 'todos' : 'parcial';
}

/** Caixa do grupo ou geral: com todos marcados, desmarca esses; senão, marca todos. Os de fora ficam. */
export function alternarVarios(selecionados: ReadonlySet<string>, ids: readonly string[]): Set<string> {
  const proxima = new Set(selecionados);
  if (estadoDaMarcacao(ids, selecionados) === 'todos') ids.forEach(id => proxima.delete(id));
  else ids.forEach(id => proxima.add(id));
  return proxima;
}

/** Busca e filtros juntos. Quando muda, a seleção é limpa; agrupar e recolher não entram aqui. */
export function chaveDaSelecao(filtros: Record<string, string>): string {
  return JSON.stringify(Object.keys(filtros).sort().map(chave => [chave, chave === 'busca' ? filtros[chave].trim() : filtros[chave]]));
}

/** Depois de enviar: sucesso limpa e fecha; erro mantém seleção e formulário para tentar de novo. */
export function depoisDoEnvio(ok: boolean, selecionados: ReadonlySet<string>): { selecionados: ReadonlySet<string>; formularioAberto: boolean } {
  return ok ? { selecionados: new Set(), formularioAberto: false } : { selecionados, formularioAberto: true };
}

export const ROTULO_SEM_QUADRO = 'Sem quadro — diretamente na série';

/** Destinos de "Definir quadro": a própria série (sem quadro) e os quadros ativos dela. */
export function destinosDeQuadro(
  serieId: string,
  series: readonly Pick<Serie, 'id' | 'parentId' | 'name' | 'ativa'>[],
): Array<{ id: string; label: string }> {
  const ativos = filhosDaSerie(serieId, series)
    .filter(filho => series.find(item => item.id === filho.id)?.ativa !== false)
    .map(filho => ({ id: filho.id, label: filho.name?.trim() || 'Sem nome' }));
  return [{ id: serieId, label: ROTULO_SEM_QUADRO }, ...ativos];
}

export type PlanoDefinirQuadro = {
  /** Episódios que mudam, já com o vínculo novo e os herdados recalculados. */
  mudam: Content[];
  /** Já estão no destino: não mudam e não contam como editados. */
  jaNoDestino: string[];
  /** Perdem a temporada porque ela não vale no destino. A página avisa antes de salvar. */
  perdemTemporada: Content[];
};

/**
 * Mesma regra do "Mover para…": muda o quadro, recalcula só pilar e objetivo herdados
 * e mantém a temporada quando ela continua valendo no destino.
 */
export function planoDefinirQuadro(
  selecionados: readonly Content[],
  destinoId: string,
  series: readonly Serie[],
  temporadas: readonly Temporada[],
  agora: string,
): PlanoDefinirQuadro {
  const plano: PlanoDefinirQuadro = { mudam: [], jaNoDestino: [], perdemTemporada: [] };
  for (const content of selecionados) {
    if ((content.seriesId ?? null) === destinoId) {
      plano.jaNoDestino.push(content.id);
      continue;
    }
    const movido = moverConteudo(content, { serieId: destinoId, temporada: 'manter' }, series, temporadas, agora);
    plano.mudam.push(movido);
    if (content.temporadaId && !movido.temporadaId) plano.perdemTemporada.push(content);
  }
  return plano;
}

/** Temporadas válidas para todos os selecionados. Vazio quando não há nenhuma em comum. */
export function temporadasComuns(
  selecionados: readonly Pick<Content, 'seriesId'>[],
  series: readonly Serie[],
  temporadas: readonly Temporada[],
): Temporada[] {
  let comuns: Temporada[] | null = null;
  for (const content of selecionados) {
    const escopo = content.seriesId ? escopoTemporadas(content.seriesId, series) : null;
    if (!escopo) return [];
    const doEscopo = temporadasDoEscopo(escopo.id, temporadas);
    comuns = comuns === null ? doEscopo : comuns.filter(item => doEscopo.some(outra => outra.id === item.id));
    if (comuns.length === 0) return [];
  }
  return comuns ?? [];
}

export type PlanoDefinirTemporada = {
  mudam: Content[];
  jaNoDestino: string[];
  /** Tinham outra temporada e vão trocar (ou sair dela). */
  substituem: number;
};

/** Só a temporada muda. Quadro, textos, contas, datas e etapa ficam. */
export function planoDefinirTemporada(
  selecionados: readonly Content[],
  temporadaId: string | null,
  agora: string,
): PlanoDefinirTemporada {
  const plano: PlanoDefinirTemporada = { mudam: [], jaNoDestino: [], substituem: 0 };
  for (const content of selecionados) {
    const atual = content.temporadaId ?? null;
    if (atual === temporadaId) {
      plano.jaNoDestino.push(content.id);
      continue;
    }
    if (atual) plano.substituem += 1;
    plano.mudam.push({ ...content, temporadaId, updatedAt: agora });
  }
  return plano;
}

type ComOrdem = Pick<Content, 'id' | 'title' | 'createdAt' | 'publishDate'> & Partial<Pick<Content, 'ordemEpisodio'>>;

/** Ordem final da série depois de mover: quem muda vai para o fim, na ordem em que já estava. */
export function ordemFinalNoFim(escopo: readonly ComOrdem[], movidos: ReadonlySet<string>): string[] {
  const ordenado = ordenarLista(escopo, 'manual');
  return [...ordenado.filter(item => !movidos.has(item.id)), ...ordenado.filter(item => movidos.has(item.id))].map(item => item.id);
}

/** Ordem final depois de uma seta. Null nas pontas. */
export function ordemAposSeta(lista: readonly { id: string }[], id: string, direcao: 'subir' | 'descer'): string[] | null {
  const indice = lista.findIndex(item => item.id === id);
  const alvo = direcao === 'subir' ? indice - 1 : indice + 1;
  if (indice < 0 || alvo < 0 || alvo >= lista.length) return null;
  const ids = lista.map(item => item.id);
  [ids[indice], ids[alvo]] = [ids[alvo], ids[indice]];
  return ids;
}

/**
 * O mesmo que o banco faz em mover_episodios, no estado local: troca os que mudaram e
 * numera a ordem (1, 2, 3...). Não duplica e não mexe em outros campos.
 */
/**
 * Seta dentro de uma seção (episódios de cima ou "YouTube longo"): troca com o vizinho da mesma seção,
 * e os dois trocam de lugar na ordem completa. Quem está entre eles e as outras seções não mexem.
 * Devolve a ordem completa para gravar, ou null nas pontas.
 */
export function ordemAposSetaNaSecao(
  global: readonly string[],
  secao: readonly { id: string }[],
  id: string,
  direcao: 'subir' | 'descer',
): string[] | null {
  const i = secao.findIndex(item => item.id === id);
  const j = direcao === 'subir' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= secao.length) return null;
  const a = global.indexOf(id);
  const b = global.indexOf(secao[j].id);
  if (a < 0 || b < 0) return null;
  const ordem = [...global];
  ordem[a] = secao[j].id;
  ordem[b] = id;
  return ordem;
}

export function aplicarMovimento<T extends { id: string; ordemEpisodio?: number | null }>(
  contents: readonly T[],
  mudados: readonly T[],
  ordem: readonly string[] | null,
): T[] {
  const porId = new Map(mudados.map(item => [item.id, item]));
  const posicao = new Map((ordem ?? []).map((id, indice) => [id, indice + 1]));
  return contents.map(content => {
    const base = porId.get(content.id) ?? content;
    const numero = posicao.get(content.id);
    return numero === undefined || base.ordemEpisodio === numero ? base : { ...base, ordemEpisodio: numero };
  });
}

export function textoQuantidade(quantidade: number, singular: string, plural: string): string {
  return quantidade === 1 ? `1 ${singular}` : `${quantidade} ${plural}`;
}
