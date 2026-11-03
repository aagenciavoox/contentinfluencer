import type { Content, Platform, Serie } from '../../../lib/database.ts';
import { REDE_ROTULO, ehRedePrincipal, redeDaConta } from '../../contas/lib/contas.ts';
import { etapaDoStatus, type Etapa } from '../../editorial/lib/etapas.ts';
import { cicloDaPublicacao } from '../../editorial/lib/cicloPublicacao.ts';
import { progressoPublicacao, publicacaoAtiva } from '../../editorial/lib/publicacaoSituacao.ts';
import { idsDaSubarvore } from '../../editorial/lib/serieArvore.ts';
import { contarConteudos, ehIdeia, type ContagemConteudos } from './serieAgrupamento.ts';
import { compararOrdemEpisodio } from './ordemEpisodios.ts';

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

export function ordenarConteudos<T extends Pick<Content, 'id' | 'title' | 'createdAt' | 'updatedAt'> & Partial<Pick<Content, 'ordemEpisodio'>>>(
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
    // Ordem definida pelas setas vem primeiro; sem ela, a de criação.
    return compararOrdemEpisodio(a, b)
      || (a.createdAt || '').localeCompare(b.createdAt || '') || porTitulo(a, b) || a.id.localeCompare(b.id);
  });
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

/** Contas marcadas no ciclo atual de publicação do conteúdo. */
export function contasDoCicloAtual<C extends Pick<Platform, 'id' | 'nome' | 'rede'>>(
  content: Pick<Content, 'plataformas'>,
  contas: readonly C[],
): C[] {
  const ativas = (content.plataformas ?? []).filter(publicacaoAtiva);
  const cicloAtual = ativas.reduce((maior, item) => Math.max(maior, cicloDaPublicacao(item)), 1);
  return ativas
    .filter(publicacao => cicloDaPublicacao(publicacao) === cicloAtual)
    .map(publicacao => contas.find(item => item.id === publicacao.platformId))
    .filter((conta): conta is C => Boolean(conta));
}

/** Destinos do ciclo atual pelo nome da rede, sem repetir. A etapa do conteúdo fica à parte. */
export function destinoDoConteudo(
  content: Pick<Content, 'plataformas'>,
  contas: readonly Pick<Platform, 'id' | 'nome' | 'rede'>[],
): DestinoConteudo {
  const publicacoes = content.plataformas ?? [];
  const nomes: string[] = [];
  for (const conta of contasDoCicloAtual(content, contas)) {
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
