import type { Content } from '../../../lib/database.ts';
import { compararOrdemEpisodio } from './ordemEpisodios.ts';

/** Três modos persistidos na série; o Planejamento (Fase 3) usa ao sugerir o próximo. */
export type ModoSequenciaSerie = 'intercalar' | 'seguir_um' | 'ordem_temporada';

export const MODOS_SEQUENCIA: readonly ModoSequenciaSerie[] = [
  'intercalar',
  'seguir_um',
  'ordem_temporada',
] as const;

export const ROTULO_MODO_SEQUENCIA: Record<ModoSequenciaSerie, string> = {
  intercalar: 'Intercalar quadros',
  seguir_um: 'Seguir um só',
  ordem_temporada: 'Ordem da temporada',
};

export const AJUDA_MODO_SEQUENCIA: Record<ModoSequenciaSerie, string> = {
  intercalar: 'Alterna entre os quadros: depois de um episódio de um quadro, prefere outro.',
  seguir_um: 'Esgota o quadro em andamento antes de pular para o próximo.',
  ordem_temporada: 'Segue a ordem manual dos episódios (1, 2, 3…) na wave.',
};

export function lerModoSequencia(value: unknown): ModoSequenciaSerie | null {
  if (value === 'intercalar' || value === 'seguir_um' || value === 'ordem_temporada') return value;
  return null;
}

type EpisodioRef = Pick<Content, 'id' | 'seriesId' | 'temporadaId' | 'ordemEpisodio' | 'title'>;

/**
 * Compara dois candidatos da mesma série para "Ver o que encaixa".
 * Empate (0) deixa o desempate por título/etapa com quem chama.
 * `ultimoQuadroId`: quadro do último episódio já encaixado/publicado da série (pode ser null).
 */
export function compararPeloModoSequencia(
  a: EpisodioRef,
  b: EpisodioRef,
  modo: ModoSequenciaSerie | null | undefined,
  ultimoQuadroId: string | null = null,
): number {
  // Null / ausente: mesmo comportamento de ordem_temporada (default aprovado).
  const atual = lerModoSequencia(modo) ?? 'ordem_temporada';

  if (atual === 'ordem_temporada') return compararOrdemEpisodio(a, b);

  const quadroA = a.seriesId ?? '';
  const quadroB = b.seriesId ?? '';

  if (atual === 'seguir_um') {
    if (ultimoQuadroId) {
      const aContinua = quadroA === ultimoQuadroId ? 0 : 1;
      const bContinua = quadroB === ultimoQuadroId ? 0 : 1;
      if (aContinua !== bContinua) return aContinua - bContinua;
    }
    // Sem quadro em andamento: agrupa por quadro e, dentro, pela ordem.
    if (quadroA !== quadroB) return quadroA.localeCompare(quadroB, 'pt-BR');
    return compararOrdemEpisodio(a, b);
  }

  // intercalar: prefere quadro diferente do último; depois ordem.
  if (ultimoQuadroId) {
    const aOutro = quadroA && quadroA !== ultimoQuadroId ? 0 : 1;
    const bOutro = quadroB && quadroB !== ultimoQuadroId ? 0 : 1;
    if (aOutro !== bOutro) return aOutro - bOutro;
  }
  if (quadroA !== quadroB) return quadroA.localeCompare(quadroB, 'pt-BR');
  return compararOrdemEpisodio(a, b);
}

/** Ordena uma lista estável pelo modo; não muta a entrada. */
export function ordenarPeloModoSequencia<T extends EpisodioRef>(
  itens: readonly T[],
  modo: ModoSequenciaSerie | null | undefined,
  ultimoQuadroId: string | null = null,
): T[] {
  return [...itens].sort((a, b) => {
    const porModo = compararPeloModoSequencia(a, b, modo, ultimoQuadroId);
    if (porModo !== 0) return porModo;
    return (a.title || '').localeCompare(b.title || '', 'pt-BR');
  });
}
