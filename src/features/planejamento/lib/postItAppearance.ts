import type {Content, Pilar, Serie, Tema} from '../../../lib/database';
import {FUNCAO_CURTA, FUNIL_DA_FUNCAO} from '../../editorial/lib/funcoes';
import {objetivoDoConteudo, objetivoHerdadoDaSerie, pilarDoConteudo, pilarHerdadoDaSerie} from '../../editorial/lib/herancaSerie';
import {type PostItMark} from '../components/PostItNote';
import {nomesDosAssuntos} from '../lib/assuntosObras';
import {postItMudou, type PlanejamentoPostIt} from '../lib/postIt';

export function contentById(contents: Content[], id: string | null): Content | null {
  if (!id) return null;
  return contents.find(content => content.id === id) ?? null;
}

const FUNIL_COLOR = {
  topo: 'var(--accent-blue)',
  meio: 'var(--accent-purple)',
  fundo: 'var(--accent-orange)',
  fora: 'var(--text-tertiary)',
} as const;

/**
 * Marcas do post-it. Com conteúdo, as do conteúdo; sem conteúdo, as do próprio espaço.
 * O objetivo é o mesmo que a contagem do Editorial usa.
 */
export function postItAppearance(
  content: Content | null,
  series: readonly Serie[],
  pilares: readonly Pilar[],
  temas: readonly Tema[],
  postIt?: PlanejamentoPostIt | null,
): {seriesColor: string | null; marks: PostItMark[]; assuntos: string[]} {
  if (!content && !postIt) return {seriesColor: null, marks: [], assuntos: []};
  const serieId = content ? content.seriesId : postIt?.serieId ?? null;
  const serie = serieId ? series.find(item => item.id === serieId) ?? null : null;
  // Mesma resolução da ficha e da Saúde: gravado vale, campo vazio sobe quadro → série.
  const pilarId = content
    ? pilarDoConteudo(content, series)
    : postIt?.pilarId || pilarHerdadoDaSerie(postIt?.serieId, series);
  const pilar = pilarId ? pilares.find(item => item.id === pilarId) ?? null : null;
  const funcao = content
    ? objetivoDoConteudo(content, series)
    : postIt?.objetivo ?? objetivoHerdadoDaSerie(postIt?.serieId, series);
  const etapa = funcao ? FUNIL_DA_FUNCAO[funcao] : null;
  const marks: PostItMark[] = [];
  if (serie?.name?.trim()) {
    marks.push({
      kind: 'serie',
      nome: serie.name.trim(),
      cor: serie.cor?.trim() || 'var(--text-tertiary)',
    });
  }
  if (funcao) {
    marks.push({
      kind: 'funil',
      nome: etapa ? `${FUNCAO_CURTA[funcao]} · ${etapa[0].toUpperCase()}${etapa.slice(1)}` : FUNCAO_CURTA[funcao],
      cor: FUNIL_COLOR[etapa ?? 'fora'],
    });
  }
  if (pilar?.nome?.trim()) {
    marks.push({
      kind: 'pilar',
      nome: pilar.nome.trim(),
      cor: pilar.cor?.trim() || 'var(--text-tertiary)',
    });
  }
  return {
    seriesColor: pilar?.cor?.trim() || null,
    marks,
    assuntos: content ? nomesDosAssuntos(content, temas) : [],
  };
}

export function changedPostIts(before: PlanejamentoPostIt[], after: PlanejamentoPostIt[]): {
  added: PlanejamentoPostIt[];
  updated: PlanejamentoPostIt[];
} {
  const beforeById = new Map(before.map(postIt => [postIt.id, postIt]));
  const added: PlanejamentoPostIt[] = [];
  const updated: PlanejamentoPostIt[] = [];
  for (const postIt of after) {
    const previous = beforeById.get(postIt.id);
    if (!previous) added.push(postIt);
    else if (postItMudou(previous, postIt)) {
      updated.push(postIt);
    }
  }
  return {added, updated};
}
