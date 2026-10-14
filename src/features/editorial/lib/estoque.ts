import type { ContentPlataforma } from '../../../lib/database.ts';
import { isPostableStock } from '../../recommendations/contentStock.ts';
import { referenciaPublicacao, type ReferenciaSettings } from './referenciaPublicacao.ts';

type PostableContent = Parameters<typeof isPostableStock>[0];

export type EstoqueContent = PostableContent & {
  /** Ausente conta como verdadeiro. A reserva pronta não usa mais este corte. */
  contaNaGrade?: boolean;
  formatoVisual?: string | null;
  plataformas?: readonly ContentPlataforma[];
  redeReferenciaCongeladaId?: string | null;
};

/**
 * Gravado, em Produção, sem a etiqueta editar, e sem data de referência.
 * Agendado fica de fora. Não inventa status novo.
 */
export function entraNoEstoque(content: EstoqueContent, settings?: ReferenciaSettings): boolean {
  if (!isPostableStock(content)) return false;
  const ref = referenciaPublicacao(content, settings ?? { redeReferenciaId: null });
  return ref.data == null;
}

export function contarEstoque(
  contents: readonly EstoqueContent[],
  settings?: ReferenciaSettings,
): number {
  return contents.reduce((total, content) => total + (entraNoEstoque(content, settings) ? 1 : 0), 0);
}

/** Sem desejado, só a contagem. Um campo vazio não vira alvo. */
export function textoEstoque(contagem: number, desejado: number | null): string {
  if (desejado == null) return `${contagem} no estoque`;
  return `${contagem} de ${desejado}`;
}
