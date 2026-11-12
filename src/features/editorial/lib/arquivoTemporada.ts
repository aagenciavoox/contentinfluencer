import type { StatusSerie } from '../../../lib/database.ts';

type ComArquivo = { status?: StatusSerie | null; arquivadaEm?: string | null };

/**
 * Guarda o dia em que a temporada foi arquivada. Do dia em diante, os episódios dela voltam
 * para a meta da série; antes dele, vale o acompanhamento próprio que existia.
 * - Arquivou agora: grava hoje (ou a data que já veio).
 * - Já estava arquivada: mantém a data gravada; arquivada antiga sem data continua sem data.
 * - Saiu do arquivo (Reativar ou Rascunho): a data sai.
 */
export function comDataDoArquivo<T extends ComArquivo>(temporada: T, anterior: ComArquivo | undefined, hoje: string): T {
  if (temporada.status === 'arquivada') {
    if (anterior?.status === 'arquivada') {
      const data = temporada.arquivadaEm ?? anterior.arquivadaEm ?? null;
      return data ? { ...temporada, arquivadaEm: data } : temporada;
    }
    return { ...temporada, arquivadaEm: temporada.arquivadaEm || hoje };
  }
  if (temporada.arquivadaEm || anterior?.arquivadaEm) return { ...temporada, arquivadaEm: null };
  return temporada;
}
