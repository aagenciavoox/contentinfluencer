import type { ContentPlataforma } from '../../../lib/database.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { isPostableStock, isPublishedContent } from '../../recommendations/contentStock.ts';
import { cicloDaPublicacao } from './cicloPublicacao.ts';
import { publicacaoAtiva } from './publicacaoSituacao.ts';
import { referenciaPublicacao, type ReferenciaSettings } from './referenciaPublicacao.ts';

type PostableContent = Parameters<typeof isPostableStock>[0];

export type EstoqueContent = PostableContent & {
  /** Ausente conta como verdadeiro. A reserva pronta não usa mais este corte. */
  contaNaGrade?: boolean;
  formatoVisual?: string | null;
  plataformas?: readonly ContentPlataforma[];
  redeReferenciaCongeladaId?: string | null;
};

export type ReservaPronta = {
  /** Edição · Pronto, sem publicação prevista e nunca publicados. */
  ineditos: number;
  /** Já publicados, sem ciclo novo pendente (prevista/programada em ciclo 2+). */
  reaproveitar: number;
  /** Soma das duas filas. */
  total: number;
};

function temPrevisaoAtiva(plataformas: readonly ContentPlataforma[] | undefined): boolean {
  return (plataformas ?? []).some(item => publicacaoAtiva(item));
}

function temCicloPendente(plataformas: readonly ContentPlataforma[] | undefined): boolean {
  return (plataformas ?? []).some(item =>
    cicloDaPublicacao(item) >= 2 && publicacaoAtiva(item) && item.status !== 'publicada',
  );
}

/**
 * Gravado, em Produção, sem a etiqueta editar, e sem data de referência.
 * Agendado fica de fora. Não inventa status novo.
 * @deprecated Preferir `reservaPronta` (Inéditos / Para reaproveitar).
 */
export function entraNoEstoque(content: EstoqueContent, settings?: ReferenciaSettings): boolean {
  if (!isPostableStock(content)) return false;
  const ref = referenciaPublicacao(content, settings ?? { redeReferenciaId: null });
  return ref.data == null && !ref.soEmOutrasRedes;
}

/** Reserva pronta: inéditos sem destinação + publicados disponíveis para reaproveitar. */
export function reservaPronta(
  contents: readonly EstoqueContent[],
  settings?: ReferenciaSettings,
): ReservaPronta {
  const refSettings = settings ?? { redeReferenciaId: null };
  let ineditos = 0;
  let reaproveitar = 0;

  for (const content of contents) {
    if (content.deletedAt) continue;

    if (isPublishedContent(content) || normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO) {
      // Já ao ar: entra em reaproveitar se não há ciclo novo pendente.
      if (!temCicloPendente(content.plataformas)) reaproveitar += 1;
      continue;
    }

    if (!isPostableStock(content)) continue;
    const ref = referenciaPublicacao(content, refSettings);
    if (ref.soEmOutrasRedes) continue;
    if (ref.data != null) continue;
    if (temPrevisaoAtiva(content.plataformas)) continue;
    ineditos += 1;
  }

  return { ineditos, reaproveitar, total: ineditos + reaproveitar };
}

export function contarEstoque(
  contents: readonly EstoqueContent[],
  settings?: ReferenciaSettings,
): number {
  return reservaPronta(contents, settings).total;
}

/** Sem desejado, só a contagem. Um campo vazio não vira alvo. */
export function textoEstoque(contagem: number, desejado: number | null): string {
  if (desejado == null) return contagem === 1 ? '1 pronto' : `${contagem} prontos`;
  return `${contagem} de ${desejado}`;
}

/** Limite 8 e reserva 3 → “Séries 4 de 5 · Fora das séries 2 de 3”. */
export function rotuloCapacidadeSeries(input: {
  limite: number | null;
  reservaFora: number | null;
  comSerie: number;
  semSerie: number;
}): string | null {
  if (input.limite == null || input.reservaFora == null) return null;
  const metaFora = Math.min(Math.max(0, input.reservaFora), input.limite);
  const metaSeries = input.limite - metaFora;
  return `Séries ${input.comSerie} de ${metaSeries} · Fora das séries ${input.semSerie} de ${metaFora}`;
}
