/** Selo do post-it sem roteiro cujo dia já passou. */
export const TEXTO_RESERVA_PENDENTE = 'Reserva pendente';

/**
 * Reserva pendente: post-it sem roteiro ligado e com o dia já passado (antes de hoje).
 * Continua no quadro, com o alerta, mas deixa de contar como previsto nas réguas.
 * Hoje ainda conta. Post-it com roteiro ligado continua contando.
 */
export function reservaPendente(
  postIt: { contentId?: string | null; date?: string | null },
  hoje: string,
): boolean {
  if (postIt.contentId) return false;
  const dia = postIt.date?.slice(0, 10);
  return Boolean(dia) && (dia as string) < hoje.slice(0, 10);
}