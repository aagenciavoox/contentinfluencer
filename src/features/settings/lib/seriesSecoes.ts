import type { Content, Platform, Serie, Temporada } from '../../../lib/database.ts';
import { isActiveCreation } from '../../contents/lib/contentWorkflow.ts';
import { REDE_ROTULO, ehRedePrincipal, redeDaConta } from '../../contas/lib/contas.ts';
import { etapaDoStatus, type Etapa } from '../../editorial/lib/etapas.ts';
import { cicloDaPublicacao } from '../../editorial/lib/cicloPublicacao.ts';
import { progressoPublicacao, publicacaoAtiva } from '../../editorial/lib/publicacaoSituacao.ts';
import { filhosDaSerie, idsDaSubarvore } from '../../editorial/lib/serieArvore.ts';
import { escopoTemporadas, temporadasDoEscopo } from '../../editorial/lib/temporadas.ts';
import { contarConteudos, ehIdeia, type ContagemConteudos } from './serieAgrupamento.ts';

export type FiltroTipoConteudo = 'todos' | 'ideias' | 'roteiros';
export type OrdemConteudos = 'criacao' | 'recentes' | 'titulo';
export type FiltroEtapa = Etapa | 'todas';

export type FiltrosConteudos = {
  busca: string;
  tipo: FiltroTipoConteudo;
  etapa: FiltroEtapa;
  ordem: OrdemConteudos;
};

export const FILTROS_PADRAO: FiltrosConteudos = { busca: '', tipo: 'todos', etapa: 'todas', ordem: 'criacao' };

export function filtrosAtivos(filtros: FiltrosConteudos): boolean {
  return Boolean(filtros.busca.trim()) || filtros.tipo !== 'todos' || filtros.etapa !== 'todas';
}

function semAcento(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** "Roteiros" aqui inclui tudo que já passou da ideia: Produção, Edição e Publicado também. */
export function passaNoFiltro(
  content: Pick<Content, 'title' | 'status'>,
  filtros: FiltrosConteudos,
): boolean {
  if (filtros.tipo === 'ideias' && !ehIdeia(content)) return false;
  if (filtros.tipo === 'roteiros' && ehIdeia(content)) return false;
  if (filtros.etapa !== 'todas' && etapaDoStatus(content.status) !== filtros.etapa) return false;
  const busca = semAcento(filtros.busca.trim());
  if (busca && !semAcento(content.title ?? '').includes(busca)) return false;
  return true;
}

export function ordenarConteudos<T extends Pick<Content, 'id' | 'title' | 'createdAt' | 'updatedAt'>>(
  lista: readonly T[],
  ordem: OrdemConteudos,
): T[] {
  const porTitulo = (a: T, b: T) => (a.title || '').localeCompare(b.title || '', 'pt-BR');
  return [...lista].sort((a, b) => {
    if (ordem === 'titulo') return porTitulo(a, b) || a.id.localeCompare(b.id);
    if (ordem === 'recentes') {
      return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')
        || porTitulo(a, b) || a.id.localeCompare(b.id);
    }
    return (a.createdAt || '').localeCompare(b.createdAt || '') || porTitulo(a, b) || a.id.localeCompare(b.id);
  });
}

export type SecaoTemporada = {
  id: string;
  temporadaId: string | null;
  rotulo: string;
  /** Conteúdos da faixa, sem filtro. */
  total: number;
  /** Conteúdos que passam no filtro, já ordenados. */
  contents: Content[];
  /** Temporada que não pertence ao escopo atual do agrupamento: aparece, mas pede reorganizar. */
  foraDoEscopo?: boolean;
};

export type SecaoConteudos = {
  id: string;
  /** Agrupamento que recebe o conteúdo novo desta seção. */
  serieId: string;
  rotulo: string;
  tipo: 'direto' | 'filho';
  /** Contagem do escopo inteiro da seção, sem filtro. */
  contagem: ContagemConteudos;
  visiveis: number;
  /** Com temporadas, as faixas; sem, null e os conteúdos vão direto em `contents`. */
  temporadas: SecaoTemporada[] | null;
  contents: Content[];
};

function faixasDeTemporada(
  secaoId: string,
  serieId: string,
  lista: readonly Content[],
  series: readonly Serie[],
  temporadas: readonly Temporada[],
  filtros: FiltrosConteudos,
): SecaoTemporada[] | null {
  const escopo = escopoTemporadas(serieId, series);
  const doEscopo = escopo ? temporadasDoEscopo(escopo.id, temporadas) : [];
  const algumComTemporada = lista.some(content => content.temporadaId);
  if (doEscopo.length === 0 && !algumComTemporada) return null;

  const ids = new Set(doEscopo.map(item => item.id));
  const filtrar = (grupo: readonly Content[]) =>
    ordenarConteudos(grupo.filter(content => passaNoFiltro(content, filtros)), filtros.ordem);

  const faixas: SecaoTemporada[] = doEscopo.map(temporada => {
    const grupo = lista.filter(content => content.temporadaId === temporada.id);
    return {
      id: `${secaoId}:temp:${temporada.id}`,
      temporadaId: temporada.id,
      rotulo: temporada.nome,
      total: grupo.length,
      contents: filtrar(grupo),
    };
  });
  const sem = lista.filter(content => !content.temporadaId);
  faixas.push({
    id: `${secaoId}:temp:none`,
    temporadaId: null,
    rotulo: 'Sem temporada',
    total: sem.length,
    contents: filtrar(sem),
  });
  const fora = lista.filter(content => content.temporadaId && !ids.has(content.temporadaId));
  if (fora.length > 0) {
    faixas.push({
      id: `${secaoId}:temp:fora`,
      temporadaId: null,
      rotulo: 'Temporada de outro agrupamento',
      total: fora.length,
      contents: filtrar(fora),
      foraDoEscopo: true,
    });
  }
  const comFiltro = filtrosAtivos(filtros);
  return faixas.filter(faixa => faixa.total > 0 && (!comFiltro || faixa.contents.length > 0));
}

/**
 * Seções da página da série: os conteúdos ligados direto a ela e um grupo por agrupamento filho
 * (com os netos dentro). Cada grupo se divide por temporada quando o escopo usa temporadas.
 * Conteúdo sem temporada e conteúdo direto na série continuam visíveis.
 */
export function montarSecoes({
  serieId,
  series,
  temporadas,
  contents,
  filtros,
  temporadaId = null,
}: {
  serieId: string;
  series: readonly Serie[];
  temporadas: readonly Temporada[];
  contents: readonly Content[];
  filtros: FiltrosConteudos;
  /** Página de uma temporada: só os conteúdos dela. */
  temporadaId?: string | null;
}): SecaoConteudos[] {
  const subarvore = idsDaSubarvore(serieId, series);
  const ativos = contents.filter(content =>
    isActiveCreation(content)
    && Boolean(content.seriesId && subarvore.has(content.seriesId))
    && (!temporadaId || content.temporadaId === temporadaId),
  );
  const comFiltro = filtrosAtivos(filtros);
  const filhos = filhosDaSerie(serieId, series);

  const montar = (id: string, destinoId: string, rotulo: string, tipo: SecaoConteudos['tipo'], lista: Content[]): SecaoConteudos => {
    const faixas = faixasDeTemporada(id, destinoId, lista, series, temporadas, filtros);
    const planos = faixas ? [] : ordenarConteudos(lista.filter(content => passaNoFiltro(content, filtros)), filtros.ordem);
    const visiveis = faixas ? faixas.reduce((soma, faixa) => soma + faixa.contents.length, 0) : planos.length;
    return {
      id,
      serieId: destinoId,
      rotulo,
      tipo,
      contagem: contarConteudos(lista),
      visiveis,
      temporadas: faixas,
      contents: planos,
    };
  };

  const secoes: SecaoConteudos[] = [];
  const diretos = ativos.filter(content => content.seriesId === serieId);
  if (diretos.length > 0 || filhos.length === 0) {
    secoes.push(montar('direto', serieId, filhos.length === 0 ? 'Conteúdos' : 'Diretos na série', 'direto', diretos));
  }
  for (const filho of filhos) {
    const ramo = idsDaSubarvore(filho.id, series);
    const lista = ativos.filter(content => content.seriesId && ramo.has(content.seriesId));
    secoes.push(montar(`filho:${filho.id}`, filho.id, filho.name?.trim() || 'Sem nome', 'filho', lista));
  }
  if (!comFiltro) return secoes;
  return secoes.filter(secao => secao.visiveis > 0);
}

/** Totais da página sem filtro: a subárvore inteira, ou só a temporada aberta. */
export function contagemDoEscopo({
  serieId,
  series,
  contents,
  temporadaId = null,
}: {
  serieId: string;
  series: readonly Serie[];
  contents: readonly Content[];
  temporadaId?: string | null;
}): ContagemConteudos {
  const subarvore = idsDaSubarvore(serieId, series);
  return contarConteudos(contents.filter(content =>
    Boolean(content.seriesId && subarvore.has(content.seriesId))
    && (!temporadaId || content.temporadaId === temporadaId),
  ));
}

export type DestinoConteudo = {
  /** "Instagram · TikTok". Vazio quando nenhuma conta foi escolhida. */
  rotulo: string;
  /** "2 de 2 publicados" quando alguma conta já saiu. */
  progresso: string | null;
};

/** Destinos do ciclo atual pelo nome da rede, sem repetir. A etapa do conteúdo fica à parte. */
export function destinoDoConteudo(
  content: Pick<Content, 'plataformas'>,
  contas: readonly Pick<Platform, 'id' | 'nome' | 'rede'>[],
): DestinoConteudo {
  const publicacoes = content.plataformas ?? [];
  const ativas = publicacoes.filter(publicacaoAtiva);
  const cicloAtual = ativas.reduce((maior, item) => Math.max(maior, cicloDaPublicacao(item)), 1);
  const nomes: string[] = [];
  for (const publicacao of ativas) {
    if (cicloDaPublicacao(publicacao) !== cicloAtual) continue;
    const conta = contas.find(item => item.id === publicacao.platformId);
    if (!conta) continue;
    const rede = redeDaConta(conta);
    const nome = ehRedePrincipal(rede) ? REDE_ROTULO[rede] : conta.nome.trim();
    if (nome && !nomes.includes(nome)) nomes.push(nome);
  }
  const progresso = progressoPublicacao(publicacoes);
  return {
    rotulo: nomes.join(' · '),
    progresso: progresso.publicadas > 0
      ? `${progresso.publicadas} de ${progresso.previstas} ${progresso.previstas === 1 ? 'publicado' : 'publicados'}`
      : null,
  };
}
