import type { ContentPlataforma } from '../../../lib/database.ts';
import { mesmoDestino, publicacaoOriginal, type DestinoPlataforma } from './destinations.ts';

/**
 * Enquanto a rede não tem legenda própria, usa a base.
 * Sem base gravada, a legenda que já estava na publicação continua visível.
 */
export function legendaEfetiva(
  legendaBase: string | null | undefined,
  publicacao: Pick<ContentPlataforma, 'legenda' | 'legendaPropria'>,
): string {
  if (publicacao.legendaPropria) return publicacao.legenda ?? '';
  if (legendaBase == null) return publicacao.legenda ?? '';
  return legendaBase;
}

export function editarLegendaBase<T extends Pick<ContentPlataforma, 'legenda' | 'legendaPropria'>>(
  legendaBase: string,
  publicacoes: readonly T[],
): { legendaBase: string; publicacoes: T[] } {
  return {
    legendaBase,
    publicacoes: publicacoes.map(item => (
      item.legendaPropria ? item : { ...item, legenda: legendaBase }
    )),
  };
}

export function adaptarLegenda<T extends ContentPlataforma>(
  legendaBase: string | null | undefined,
  publicacoes: readonly T[],
  plataforma: DestinoPlataforma,
): T[] {
  return publicacoes.map(item => {
    if (!publicacaoOriginal(item) || !mesmoDestino(item.platformId, plataforma)) return item;
    if (item.legendaPropria) return item;
    return {
      ...item,
      legendaPropria: true,
      legenda: legendaEfetiva(legendaBase, item),
    };
  });
}

/**
 * Primeira edição da legenda compartilhada.
 * Redes que já tinham um texto diferente ficam com legenda própria, para não perder o que estava escrito.
 */
export function definirLegendaCompartilhada<T extends ContentPlataforma>(input: {
  legendaBaseAtual: string | null | undefined;
  novoTexto: string;
  publicacoes: readonly T[];
  plataformaEditada: DestinoPlataforma;
}): { legendaBase: string; publicacoes: T[] } {
  if (input.legendaBaseAtual != null) {
    return editarLegendaBase(input.novoTexto, input.publicacoes);
  }

  const base = input.novoTexto;
  return {
    legendaBase: base,
    publicacoes: input.publicacoes.map(item => {
      if (item.legendaPropria) return item;
      const editando = mesmoDestino(item.platformId, input.plataformaEditada);
      const texto = (item.legenda ?? '').trim();
      if (!editando && texto && texto !== base.trim()) {
        return { ...item, legendaPropria: true };
      }
      if (!publicacaoOriginal(item) && texto && texto !== base.trim()) {
        return { ...item, legendaPropria: true };
      }
      return { ...item, legenda: base, legendaPropria: false };
    }),
  };
}

/**
 * Regra de migração das legendas já gravadas, descrita no E4.
 * Não roda sozinha e não é SQL: a coluna `legenda_base` já está na M1, que continua sem ser executada.
 * A base vem da rede de referência. Rede com texto diferente fica com legenda própria.
 */
export function migrarLegendas<T extends ContentPlataforma>(input: {
  legendaBase: string | null | undefined;
  publicacoes: readonly T[];
  redeReferencia: DestinoPlataforma | null;
}): { legendaBase: string | null; publicacoes: T[] } {
  if (input.legendaBase != null) {
    return { legendaBase: input.legendaBase, publicacoes: [...input.publicacoes] };
  }

  const referencia = input.redeReferencia
    ? input.publicacoes.find(item =>
      publicacaoOriginal(item) && mesmoDestino(item.platformId, input.redeReferencia as DestinoPlataforma),
    )
    : undefined;
  const base = referencia?.legenda ?? '';

  return {
    legendaBase: base,
    publicacoes: input.publicacoes.map(item => {
      if (!publicacaoOriginal(item)) return item;
      const texto = (item.legenda ?? '').trim();
      if (texto && texto !== base.trim()) return { ...item, legendaPropria: true };
      return { ...item, legendaPropria: false };
    }),
  };
}