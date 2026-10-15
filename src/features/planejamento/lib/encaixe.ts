import type { Content, FuncaoEditorial } from '../../../lib/database.ts';
import { etapaDoStatus, type Etapa } from '../../editorial/lib/etapas.ts';
import { FUNCAO_CURTA, resolveFuncao } from '../../editorial/lib/funcoes.ts';
import type { GradeSerie } from '../../editorial/lib/gradeEntries.ts';
import { pilarPrincipalDaSerie } from '../../editorial/lib/pilarDaSerie.ts';
import { canPullContent, type PlanejamentoPostIt } from './postIt.ts';

export type MotivoEncaixe = 'objetivo' | 'serie' | 'pilar';

export type CandidatoEncaixe = {
  content: Content;
  etapa: Etapa;
  /** O objetivo com que ele vai contar: o do conteúdo, não o do post-it. */
  objetivo: FuncaoEditorial | null;
  /** Na ordem de peso: objetivo, série, pilar. */
  motivos: MotivoEncaixe[];
};

const PESO: Record<MotivoEncaixe, number> = { objetivo: 4, serie: 2, pilar: 1 };

/** Mais adiantado primeiro: preenche o espaço com menos trabalho. */
const ORDEM_DA_ETAPA: Partial<Record<Etapa, number>> = { producao: 0, roteiro: 1, ideia: 2 };

function peso(motivos: readonly MotivoEncaixe[]): number {
  return motivos.reduce((total, motivo) => total + PESO[motivo], 0);
}

function motivosDoConteudo(
  postIt: Pick<PlanejamentoPostIt, 'serieId' | 'pilarId' | 'objetivo'>,
  content: Content,
  serie: GradeSerie | null,
  objetivo: FuncaoEditorial | null,
): MotivoEncaixe[] {
  const motivos: MotivoEncaixe[] = [];
  if (postIt.objetivo && objetivo === postIt.objetivo) motivos.push('objetivo');
  if (postIt.serieId && content.seriesId === postIt.serieId) motivos.push('serie');
  const pilar = content.pilarId || pilarPrincipalDaSerie(serie);
  if (postIt.pilarId && pilar === postIt.pilarId) motivos.push('pilar');
  return motivos;
}

/**
 * O que pode ocupar um espaço planejado: ideia, roteiro ou conteúdo em Produção,
 * sem dia na grade e sem outro post-it. Nada é ligado aqui: a lista só mostra.
 * `combinam` tem o mesmo objetivo, série ou pilar do post-it; `outros`, o resto.
 */
export function candidatosDoEncaixe({
  postIt,
  postIts,
  contents,
  series,
  datas,
}: {
  postIt: Pick<PlanejamentoPostIt, 'id' | 'serieId' | 'pilarId' | 'objetivo'>;
  postIts: readonly Pick<PlanejamentoPostIt, 'id' | 'contentId'>[];
  contents: readonly Content[];
  series: readonly GradeSerie[];
  /** De `datasNaGrade`. Quem tem algum dia já está planejado. */
  datas: ReadonlyMap<string, readonly string[]>;
}): { combinam: CandidatoEncaixe[]; outros: CandidatoEncaixe[] } {
  const ligados = new Set(postIts.flatMap(item => item.id !== postIt.id && item.contentId ? [item.contentId] : []));
  const seriePorId = new Map(series.map(item => [item.id, item]));

  const candidatos = contents
    .filter(canPullContent)
    .filter(content => !ligados.has(content.id))
    .filter(content => (datas.get(content.id)?.length ?? 0) === 0)
    .map(content => {
      const serie = content.seriesId ? seriePorId.get(content.seriesId) ?? null : null;
      const objetivo = resolveFuncao(content, serie).funcao;
      return {
        content,
        etapa: etapaDoStatus(content.status),
        objetivo,
        motivos: motivosDoConteudo(postIt, content, serie, objetivo),
      };
    })
    .sort((a, b) => {
      const porPeso = peso(b.motivos) - peso(a.motivos);
      if (porPeso !== 0) return porPeso;
      const porEtapa = (ORDEM_DA_ETAPA[a.etapa] ?? 9) - (ORDEM_DA_ETAPA[b.etapa] ?? 9);
      if (porEtapa !== 0) return porEtapa;
      return (a.content.title || '').localeCompare(b.content.title || '', 'pt-BR');
    });

  return {
    combinam: candidatos.filter(candidato => candidato.motivos.length > 0),
    outros: candidatos.filter(candidato => candidato.motivos.length === 0),
  };
}

/**
 * "Atrair · mesma série": o objetivo com que ele vai contar e o que mais combina.
 * O objetivo vem sempre, para não surpreender quando for diferente do espaço.
 */
export function descricaoDoCandidato(candidato: Pick<CandidatoEncaixe, 'objetivo' | 'motivos'>): string {
  const partes = [candidato.objetivo ? FUNCAO_CURTA[candidato.objetivo] : 'Sem objetivo'];
  if (candidato.motivos.includes('serie')) partes.push('mesma série');
  if (candidato.motivos.includes('pilar')) partes.push('mesmo pilar');
  return partes.join(' · ');
}
