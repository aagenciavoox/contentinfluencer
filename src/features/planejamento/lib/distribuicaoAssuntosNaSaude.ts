import type { Content, Tema } from '../../../lib/database.ts';
import type { GradeEntry } from '../../editorial/lib/gradeEntries.ts';
import { LIMITES_CONCENTRACAO_PADRAO } from '../../editorial/lib/concentracao.ts';

export type LinhaDistribuicaoAssunto = {
  id: string;
  nome: string;
  pautas: number;
  pct: number;
  concentrado: boolean;
  itens: GradeEntry[];
};

export type DistribuicaoAssuntos = {
  linhas: LinhaDistribuicaoAssunto[];
  totalPautas: number;
  comAssunto: number;
  semAssunto: GradeEntry[];
  semAssuntoPct: number;
};

/**
 * Apura a distribuição dos assuntos/temas entre as pautas do período da Saúde.
 *
 * Como um conteúdo pode ter múltiplos assuntos, a contagem de menções não é cumulativa em 100%;
 * a porcentagem reflete a presença do assunto sobre o total de pautas do período.
 * Marca `concentrado: true` quando passa da fração de variedade (padrão: 33%).
 */
export function distribuicaoAssuntosNaSaude({
  itens,
  contents,
  temas,
  limiteFracao = LIMITES_CONCENTRACAO_PADRAO.assuntoFracaoMax,
  minPautas = LIMITES_CONCENTRACAO_PADRAO.assuntoMinPautas,
}: {
  itens: readonly GradeEntry[];
  contents: readonly Content[];
  temas: readonly Pick<Tema, 'id' | 'nome'>[];
  limiteFracao?: number;
  minPautas?: number;
}): DistribuicaoAssuntos {
  const contentMap = new Map(contents.map(c => [c.id, c]));
  const temaMap = new Map(temas.map(t => [t.id, t.nome.trim()]));

  const porAssunto = new Map<string, GradeEntry[]>();
  const semAssunto: GradeEntry[] = [];
  let totalComAssunto = 0;

  for (const item of itens) {
    const content = contentMap.get(item.contentId);
    const temaIds = (content?.temaIds ?? []).filter(id => temaMap.has(id));

    if (temaIds.length === 0) {
      semAssunto.push(item);
    } else {
      totalComAssunto++;
      for (const id of temaIds) {
        const list = porAssunto.get(id) ?? [];
        list.push(item);
        porAssunto.set(id, list);
      }
    }
  }

  const totalPautas = itens.length;
  const limitePct = Math.round(limiteFracao * 100);

  const linhas: LinhaDistribuicaoAssunto[] = Array.from(porAssunto.entries())
    .map(([id, itensDoAssunto]) => {
      const pautas = itensDoAssunto.length;
      const pct = totalPautas > 0 ? Math.round((pautas / totalPautas) * 100) : 0;
      return {
        id,
        nome: temaMap.get(id) ?? 'Assunto',
        pautas,
        pct,
        concentrado: totalPautas >= minPautas && pct > limitePct,
        itens: itensDoAssunto,
      };
    })
    .sort((a, b) => b.pautas - a.pautas || a.nome.localeCompare(b.nome, 'pt-BR'));

  const semAssuntoPct = totalPautas > 0 ? Math.round((semAssunto.length / totalPautas) * 100) : 0;

  return {
    linhas,
    totalPautas,
    comAssunto: totalComAssunto,
    semAssunto,
    semAssuntoPct,
  };
}
