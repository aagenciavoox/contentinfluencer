import type { ContentPlataforma } from '../../../lib/database.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { mesmoDestino, publicacaoOriginal, type DestinoPlataforma } from './destinations.ts';

/**
 * Regras da legenda. Valem para Roteiro, Legendas e Séries; nenhuma tela decide sozinha.
 *
 * - Legenda-base compartilhada: o texto de origem do conteúdo.
 * - Legenda desta publicação: o texto efetivo numa conta.
 * - Usando legenda-base: a publicação acompanha a base (`legendaPropria` falso).
 * - Versão própria: a publicação tem texto independente (`legendaPropria` verdadeiro).
 * - Publicação realizada: o texto usado fica preservado e nada o altera.
 */

type LegendaDaPublicacao = Pick<ContentPlataforma, 'legenda' | 'legendaPropria'>;
type PublicacaoComStatus = LegendaDaPublicacao & Pick<ContentPlataforma, 'status'>;

/** O mínimo do conteúdo para saber se ele foi postado antes do status por publicação. */
export type ConteudoDaLegenda = {
  status?: string | null;
  plataformas?: ReadonlyArray<Pick<ContentPlataforma, 'status'>> | null;
};

/**
 * Já foi ao ar. Status `publicada` vale sempre. Conteúdo Postado sem nenhuma
 * publicação marcada é do tempo em que o status era só do conteúdo: todas as
 * publicações dele contam como realizadas.
 */
export function publicacaoJaPostada(
  publicacao: Pick<ContentPlataforma, 'status'>,
  conteudo?: ConteudoDaLegenda | null,
): boolean {
  if (publicacao.status === 'publicada') return true;
  if (publicacao.status === 'nao_publicada' || publicacao.status === 'removida') return false;
  if (!conteudo || normalizeContentStatus(conteudo.status ?? '') !== CONTENT_STATUS.POSTADO) return false;
  return !(conteudo.plataformas ?? []).some(item => item.status === 'publicada');
}

/**
 * Texto efetivo da publicação. Versão própria usa o próprio texto. Sem base
 * gravada (conteúdo antigo), o texto que já estava na publicação continua valendo.
 */
export function legendaEfetiva(
  legendaBase: string | null | undefined,
  publicacao: LegendaDaPublicacao,
): string {
  if (publicacao.legendaPropria) return publicacao.legenda ?? '';
  if (legendaBase == null) return publicacao.legenda ?? '';
  return legendaBase;
}

/** A publicação tem legenda quando o texto efetivo tem conteúdo, venha da base ou não. */
export function temLegenda(legendaBase: string | null | undefined, publicacao: LegendaDaPublicacao): boolean {
  return legendaEfetiva(legendaBase, publicacao).trim().length > 0;
}

export type EstadoLegenda = 'base' | 'propria' | 'publicada';

export function estadoLegenda(
  publicacao: PublicacaoComStatus,
  conteudo?: ConteudoDaLegenda | null,
): EstadoLegenda {
  if (publicacaoJaPostada(publicacao, conteudo)) return 'publicada';
  return publicacao.legendaPropria ? 'propria' : 'base';
}

export const ESTADO_LEGENDA_ROTULO: Record<EstadoLegenda, string> = {
  base: 'Usando legenda-base',
  propria: 'Versão própria',
  publicada: 'Publicada · texto preservado',
};

/** Guarda o texto efetivo como texto da publicação. Usado quando ela vai ao ar. */
export function congelarLegenda<T extends LegendaDaPublicacao>(
  legendaBase: string | null | undefined,
  publicacao: T,
): T {
  return { ...publicacao, legendaPropria: true, legenda: legendaEfetiva(legendaBase, publicacao) };
}

/**
 * Altera a legenda-base. Só as publicações não realizadas que continuam usando a
 * base passam a mostrar o texto novo. Versões próprias ficam como estão. Uma
 * publicação realizada que ainda acompanhava a base é congelada com o texto
 * anterior, para nunca mudar depois de ir ao ar.
 */
export function atualizarLegendaBase<T extends PublicacaoComStatus>(input: {
  anterior: string | null | undefined;
  nova: string;
  publicacoes: readonly T[];
  conteudo?: ConteudoDaLegenda | null;
}): { legendaBase: string; publicacoes: T[] } {
  return {
    legendaBase: input.nova,
    publicacoes: input.publicacoes.map(item => {
      if (item.legendaPropria) return item;
      if (publicacaoJaPostada(item, input.conteudo)) return congelarLegenda(input.anterior, item);
      return { ...item, legenda: input.nova };
    }),
  };
}

/** Mantido para quem só tem o texto novo. Sem a base anterior, realizadas são congeladas com o próprio texto. */
export function editarLegendaBase<T extends PublicacaoComStatus>(
  legendaBase: string,
  publicacoes: readonly T[],
): { legendaBase: string; publicacoes: T[] } {
  return atualizarLegendaBase({ anterior: null, nova: legendaBase, publicacoes });
}

function naoRealizadaComId<T extends PublicacaoComStatus & Pick<ContentPlataforma, 'id'>>(
  item: T,
  publicacaoId: string,
  conteudo?: ConteudoDaLegenda | null,
): boolean {
  return item.id === publicacaoId && !publicacaoJaPostada(item, conteudo);
}

/** "Criar versão própria": a publicação parte do texto que mostra agora e passa a ser independente. */
export function criarVersaoPropria<T extends PublicacaoComStatus & Pick<ContentPlataforma, 'id'>>(
  legendaBase: string | null | undefined,
  publicacoes: readonly T[],
  publicacaoId: string,
  conteudo?: ConteudoDaLegenda | null,
): T[] {
  return publicacoes.map(item => {
    if (!naoRealizadaComId(item, publicacaoId, conteudo) || item.legendaPropria) return item;
    return { ...item, legendaPropria: true, legenda: legendaEfetiva(legendaBase, item) };
  });
}

/** Editar uma versão própria muda só aquela publicação. */
export function editarVersaoPropria<T extends PublicacaoComStatus & Pick<ContentPlataforma, 'id'>>(
  publicacoes: readonly T[],
  publicacaoId: string,
  texto: string,
  conteudo?: ConteudoDaLegenda | null,
): T[] {
  return publicacoes.map(item => (
    naoRealizadaComId(item, publicacaoId, conteudo)
      ? { ...item, legendaPropria: true, legenda: texto }
      : item
  ));
}

/**
 * "Voltar a usar a legenda-base": descarta o texto próprio e a publicação passa
 * a acompanhar a base atual. Publicação realizada não volta.
 */
export function voltarParaBase<T extends PublicacaoComStatus & Pick<ContentPlataforma, 'id'>>(
  legendaBase: string | null | undefined,
  publicacoes: readonly T[],
  publicacaoId: string,
  conteudo?: ConteudoDaLegenda | null,
): T[] {
  return publicacoes.map(item => (
    naoRealizadaComId(item, publicacaoId, conteudo)
      ? { ...item, legendaPropria: false, legenda: legendaBase ?? '' }
      : item
  ));
}

/** Por rede, como antes. As telas novas usam `criarVersaoPropria` pelo id da publicação. */
export function adaptarLegenda<T extends ContentPlataforma>(
  legendaBase: string | null | undefined,
  publicacoes: readonly T[],
  plataforma: DestinoPlataforma,
): T[] {
  return publicacoes.map(item => {
    if (!publicacaoOriginal(item) || !mesmoDestino(item.platformId, plataforma)) return item;
    if (item.legendaPropria || publicacaoJaPostada(item)) return item;
    return {
      ...item,
      legendaPropria: true,
      legenda: legendaEfetiva(legendaBase, item),
    };
  });
}

/**
 * Edição da legenda-base. Na primeira vez (conteúdo antigo, sem base gravada),
 * publicações que já tinham um texto diferente ficam com versão própria, para
 * não perder o que estava escrito; a publicação em edição, quando houver,
 * passa a seguir a base. Realizadas nunca mudam.
 */
export function definirLegendaCompartilhada<T extends ContentPlataforma>(input: {
  legendaBaseAtual: string | null | undefined;
  novoTexto: string;
  publicacoes: readonly T[];
  plataformaEditada?: DestinoPlataforma | null;
  conteudo?: ConteudoDaLegenda | null;
}): { legendaBase: string; publicacoes: T[] } {
  if (input.legendaBaseAtual != null) {
    return atualizarLegendaBase({
      anterior: input.legendaBaseAtual,
      nova: input.novoTexto,
      publicacoes: input.publicacoes,
      conteudo: input.conteudo,
    });
  }

  const base = input.novoTexto;
  return {
    legendaBase: base,
    publicacoes: input.publicacoes.map(item => {
      if (item.legendaPropria) return item;
      if (publicacaoJaPostada(item, input.conteudo)) return congelarLegenda(null, item);
      const editando = input.plataformaEditada ? mesmoDestino(item.platformId, input.plataformaEditada) : false;
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
 * Não roda sozinha e não é SQL. A base vem da rede de referência.
 * Rede com texto diferente fica com legenda própria.
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

/**
 * Legenda de um conteúdo novo a partir da série: a base da série vira a base do
 * roteiro, e cada conta com versão própria na série começa com essa versão.
 * É uma cópia: mudar a série depois não reescreve o roteiro por conta própria.
 */
export function legendasDaSerie<T extends ContentPlataforma>(
  serie: { legendaBase?: string | null; plataformas?: ReadonlyArray<{ platformId: string; legenda?: string | null }> } | null | undefined,
  publicacoes: readonly T[],
  contas: readonly DestinoPlataforma[] = [],
): { legendaBase: string | null; publicacoes: T[] } {
  const base = serie?.legendaBase?.trim() ? serie.legendaBase : null;
  return {
    legendaBase: base,
    publicacoes: publicacoes.map(item => {
      if (item.legendaPropria) return item;
      const conta = contas.find(destino => mesmoDestino(item.platformId, destino));
      const versao = serie?.plataformas?.find(plataforma =>
        plataforma.platformId === item.platformId || (conta && mesmoDestino(plataforma.platformId, conta)),
      )?.legenda;
      if (versao?.trim()) return { ...item, legendaPropria: true, legenda: versao };
      return { ...item, legendaPropria: false, legenda: base ?? item.legenda ?? '' };
    }),
  };
}
