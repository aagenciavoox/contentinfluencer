// Avaliação do livro por critério: notas de 0 a 5, de meia em meia (coluna `avaliacao_criterios`).

export const CRITERIOS_AVALIACAO = [
  'personagens',
  'escrita',
  'cenario',
  'divertimento',
  'envolvimento',
  'plot',
] as const;

export type CriterioAvaliacao = (typeof CRITERIOS_AVALIACAO)[number];
export type AvaliacaoCriterios = Partial<Record<CriterioAvaliacao, number>>;

export const CRITERIO_ROTULO: Record<CriterioAvaliacao, string> = {
  personagens: 'Desenvolvimento dos personagens',
  escrita: 'Escrita',
  cenario: 'Cenário',
  divertimento: 'Divertimento',
  envolvimento: 'Envolvimento',
  plot: 'Plot',
};

/** Nota válida: número entre 0 e 5, arredondado para a meia estrela mais próxima. */
export function normalizarNota(valor: unknown): number | undefined {
  const numero = typeof valor === 'string' ? Number(valor.replace(',', '.')) : valor;
  if (typeof numero !== 'number' || !Number.isFinite(numero)) return undefined;
  return Math.min(5, Math.max(0, Math.round(numero * 2) / 2));
}

/** Lê o JSON gravado no banco; ignora critérios desconhecidos e notas inválidas. */
export function lerAvaliacaoCriterios(valor: unknown): AvaliacaoCriterios | undefined {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return undefined;
  const origem = valor as Record<string, unknown>;
  const criterios: AvaliacaoCriterios = {};
  for (const id of CRITERIOS_AVALIACAO) {
    const nota = normalizarNota(origem[id]);
    if (nota !== undefined) criterios[id] = nota;
  }
  return Object.keys(criterios).length ? criterios : undefined;
}

/** Critérios com nota, na ordem da tela. */
export function criteriosAvaliados(criterios: AvaliacaoCriterios | undefined) {
  return CRITERIOS_AVALIACAO.flatMap(id => {
    const nota = criterios?.[id];
    return typeof nota === 'number' ? [{ id, rotulo: CRITERIO_ROTULO[id], nota }] : [];
  });
}

export function mediaDosCriterios(criterios: AvaliacaoCriterios | undefined): number | null {
  const notas = criteriosAvaliados(criterios).map(criterio => criterio.nota);
  if (notas.length === 0) return null;
  return notas.reduce((soma, nota) => soma + nota, 0) / notas.length;
}

/**
 * A avaliação geral do item (inteiro de 1 a 5, como o banco aceita) é a média dos critérios
 * arredondada. Assim os cartões da Biblioteca e as análises seguem com a nota do livro.
 */
export function avaliacaoGeralDosCriterios(
  criterios: AvaliacaoCriterios | undefined,
): 1 | 2 | 3 | 4 | 5 | undefined {
  const media = mediaDosCriterios(criterios);
  if (media === null) return undefined;
  return Math.min(5, Math.max(1, Math.round(media))) as 1 | 2 | 3 | 4 | 5;
}

/** Nota para a tela, no padrão brasileiro: 4.5 → "4,5"; 4 → "4". */
export function formatarNota(nota: number): string {
  return nota.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}
