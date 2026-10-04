import { isPostableStock } from '../../recommendations/contentStock.ts';

type PostableContent = Parameters<typeof isPostableStock>[0];

export type EstoqueContent = PostableContent & {
  /** Ausente conta como verdadeiro, no mesmo critério da grade. */
  contaNaGrade?: boolean;
};

/** Gravado, pronto para postar e dentro da grade. */
export function entraNoEstoque(content: EstoqueContent): boolean {
  return content.contaNaGrade !== false && isPostableStock(content);
}

export function contarEstoque(contents: readonly EstoqueContent[]): number {
  return contents.reduce((total, content) => total + (entraNoEstoque(content) ? 1 : 0), 0);
}

/** Sem desejado, só a contagem. Um campo vazio não vira alvo. */
export function textoEstoque(contagem: number, desejado: number | null): string {
  if (desejado == null) return `${contagem} no estoque`;
  return `${contagem} de ${desejado}`;
}
