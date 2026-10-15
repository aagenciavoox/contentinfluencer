import type { Content, ContentPlataforma, SeriePlataforma } from '../../../lib/database.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { atualizarLegendaBase, publicacaoJaPostada, voltarParaBase } from './captions.ts';

/** O que da série orienta a legenda: a base e as versões por conta. */
export type LegendaDaSerie = {
  legendaBase?: string | null;
  plataformas?: ReadonlyArray<Pick<SeriePlataforma, 'platformId' | 'legenda'>>;
};

export type AlteracaoDeRoteiro = {
  contentId: string;
  titulo: string;
  legendaBase: string | null;
  publicacoes: ContentPlataforma[];
};

type RoteiroDaSerie = Pick<Content, 'id' | 'title' | 'status' | 'seriesId' | 'legendaBase' | 'plataformas'>
  & Partial<Pick<Content, 'deletedAt' | 'archivedAt'>>;

function texto(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function versaoDaConta(serie: LegendaDaSerie, platformId: string): string {
  return texto(serie.plataformas?.find(item => item.platformId === platformId)?.legenda);
}

/**
 * Quando a pessoa muda a legenda da série, quais roteiros ainda seguem a série?
 *
 * Entram só roteiros desta série que não foram postados e cuja legenda-base é
 * igual à base anterior da série (ninguém a editou no roteiro). Dentro deles:
 * - publicações realizadas não mudam;
 * - versões próprias só mudam quando ainda são iguais à versão anterior da série
 *   para aquela conta (não foram adaptadas à mão);
 * - publicações que usam a base acompanham a base nova.
 *
 * Não grava nada: devolve as alterações para a tela mostrar o alcance e pedir confirmação.
 */
export function roteirosQueSeguemASerie({
  serieId,
  anterior,
  nova,
  contents,
}: {
  serieId: string;
  anterior: LegendaDaSerie;
  nova: LegendaDaSerie;
  contents: readonly RoteiroDaSerie[];
}): AlteracaoDeRoteiro[] {
  const baseAnterior = texto(anterior.legendaBase);
  const baseNova = texto(nova.legendaBase);
  const contasAlteradas = new Set(
    [...(anterior.plataformas ?? []), ...(nova.plataformas ?? [])]
      .map(item => item.platformId)
      .filter(platformId => versaoDaConta(anterior, platformId) !== versaoDaConta(nova, platformId)),
  );
  if (baseAnterior === baseNova && contasAlteradas.size === 0) return [];

  const alteracoes: AlteracaoDeRoteiro[] = [];
  for (const content of contents) {
    if (content.seriesId !== serieId || content.deletedAt || content.archivedAt) continue;
    if (normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO) continue;
    // Base editada no roteiro: a série deixou de orientar este texto.
    if (texto(content.legendaBase) !== baseAnterior) continue;

    let legendaBase = content.legendaBase ?? null;
    let publicacoes = [...(content.plataformas ?? [])];

    // Só propaga uma base que já existia: quem não tinha base não é reescrito.
    if (baseAnterior && baseAnterior !== baseNova) {
      const resultado = atualizarLegendaBase({
        anterior: content.legendaBase,
        nova: nova.legendaBase ?? '',
        publicacoes,
        conteudo: content,
      });
      legendaBase = resultado.legendaBase;
      publicacoes = resultado.publicacoes;
    }

    for (const platformId of contasAlteradas) {
      const velha = versaoDaConta(anterior, platformId);
      const novaVersao = versaoDaConta(nova, platformId);
      for (const publicacao of publicacoes.filter(item => item.platformId === platformId)) {
        if (publicacaoJaPostada(publicacao, content)) continue;
        if (publicacao.legendaPropria) {
          // Adaptada à mão (texto diferente da versão da série): fica.
          if (!velha || texto(publicacao.legenda) !== velha) continue;
          publicacoes = novaVersao
            ? publicacoes.map(item => (item.id === publicacao.id ? { ...item, legenda: nova.plataformas?.find(v => v.platformId === platformId)?.legenda ?? '' } : item))
            : voltarParaBase(legendaBase, publicacoes, publicacao.id, content);
        } else if (novaVersao) {
          publicacoes = publicacoes.map(item => (
            item.id === publicacao.id
              ? { ...item, legendaPropria: true, legenda: nova.plataformas?.find(v => v.platformId === platformId)?.legenda ?? '' }
              : item
          ));
        }
      }
    }

    const mudouBase = (legendaBase ?? null) !== (content.legendaBase ?? null);
    const mudouPublicacao = JSON.stringify(publicacoes) !== JSON.stringify(content.plataformas ?? []);
    if (!mudouBase && !mudouPublicacao) continue;
    alteracoes.push({
      contentId: content.id,
      titulo: content.title.trim() || 'Sem título',
      legendaBase,
      publicacoes,
    });
  }
  return alteracoes;
}
