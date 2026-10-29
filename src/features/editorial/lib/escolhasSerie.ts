import type { FuncaoEditorial, FuncaoOrigem, FuncaoPadraoSerie, PilarOrigem } from '../../../lib/database.ts';
import { funcaoHerdavelDaSerie } from './funcoes.ts';
import { resolverHerancaSerie, type SerieHeranca } from './herancaSerie.ts';
import { pilarPrincipalDaSerie } from './pilarDaSerie.ts';

export type ConteudoHerdavel = {
  seriesId?: string | null;
  pilarId?: string | null;
  pilarOrigem?: PilarOrigem | null;
  funcao?: FuncaoEditorial | null;
  funcaoOrigem?: FuncaoOrigem | null;
  classificacaoCongeladaEm?: string | null;
};

export type SerieParaHeranca = {
  id: string;
  funcaoPadrao?: FuncaoPadraoSerie | null;
  pilarPrincipalId?: string | null;
  pilarIds?: readonly string[] | null;
};

export type ValoresHerdados = {
  pilarId?: string | null;
  funcao?: FuncaoEditorial | null;
};

function origemProtegida(origem: string | null | undefined): boolean {
  return origem === 'escolhida' || origem === 'nenhuma';
}

/**
 * Preenche quando o campo está vazio ou a origem ainda segue a série.
 * Escolha manual (`escolhida` / `nenhuma`) não volta atrás.
 * `aplicada` não é um terceiro caminho: só entra se o campo estiver vazio.
 */
function podeHerdar(origem: string | null | undefined, vazio: boolean): boolean {
  if (origemProtegida(origem)) return false;
  if (origem === 'herdada' || origem == null) return true;
  return vazio;
}

function aplicarPilar<T extends ConteudoHerdavel>(content: T, pilarId: string | null): T & ConteudoHerdavel {
  const atual = content.pilarId?.trim() || null;
  const origem = content.pilarOrigem ?? null;
  if (!podeHerdar(origem, !atual)) return content;
  if (pilarId) return {...content, pilarId, pilarOrigem: 'herdada'};
  if (origem === 'herdada') return {...content, pilarId: null, pilarOrigem: 'herdada'};
  return content;
}

function aplicarFuncao<T extends ConteudoHerdavel>(content: T, funcao: FuncaoEditorial | null): T & ConteudoHerdavel {
  const atual = content.funcao ?? null;
  const origem = content.funcaoOrigem ?? null;
  if (!podeHerdar(origem, !atual)) return content;
  if (funcao) return {...content, funcao, funcaoOrigem: 'herdada'};
  if (origem === 'herdada') return {...content, funcao: null, funcaoOrigem: 'herdada'};
  return content;
}

/**
 * Copia pilar e função que já vieram de outro lugar (post-it, por exemplo).
 * Conteúdo congelado não muda.
 */
export function aplicarEscolhasHerdadas<T extends ConteudoHerdavel>(
  content: T,
  valores: ValoresHerdados,
): T & ConteudoHerdavel {
  if (content.classificacaoCongeladaEm) return content;
  const comPilar = aplicarPilar(content, valores.pilarId?.trim() || null);
  return aplicarFuncao(comPilar, valores.funcao ?? null);
}

/**
 * Uma regra para criar da série, escolher a série depois e aplicar em massa.
 * Com `catalogo`, sobe a cadeia (pilar/função). Congelado não muda.
 */
export function aplicarEscolhasDaSerie<T extends ConteudoHerdavel>(
  content: T,
  serie: SerieParaHeranca | null | undefined,
  catalogo?: readonly SerieHeranca[] | null,
): T & ConteudoHerdavel {
  if (content.classificacaoCongeladaEm) return content;
  if (!serie) return {...content, seriesId: null};
  const comSerie = {...content, seriesId: serie.id};
  if (catalogo && catalogo.length > 0) {
    const resolvido = resolverHerancaSerie(comSerie, catalogo);
    return aplicarEscolhasHerdadas(comSerie, {
      pilarId: resolvido.pilar.pilarId,
      funcao: resolvido.funcao.funcao,
    });
  }
  return aplicarEscolhasHerdadas(comSerie, {
    pilarId: pilarPrincipalDaSerie(serie),
    funcao: funcaoHerdavelDaSerie(serie),
  });
}

/**
 * A pessoa escolheu pilar ou função na mão.
 * Valor vazio vira `nenhuma`, para a série não preencher de novo.
 */
export function marcarEscolhaManual<T extends ConteudoHerdavel>(
  content: T,
  campo: 'pilar' | 'funcao',
  valor: string | null,
): T & ConteudoHerdavel {
  if (campo === 'pilar') {
    const pilarId = valor?.trim() || null;
    return {...content, pilarId, pilarOrigem: pilarId ? 'escolhida' : 'nenhuma'};
  }
  const funcao = valor === 'atrair' || valor === 'converter' || valor === 'aprofundar'
    || valor === 'comunidade' || valor === 'acao' || valor === 'reter'
    ? valor
    : null;
  return {...content, funcao, funcaoOrigem: funcao ? 'escolhida' : 'nenhuma'};
}

/**
 * Copia a função pedida e marca como herdada.
 * Usado quando a pessoa confirma a função nos publicados que ainda herdam.
 * Não grava `aplicada`.
 */
export function copiarFuncaoHerdada<T extends ConteudoHerdavel>(
  content: T,
  funcao: FuncaoEditorial,
): T & ConteudoHerdavel {
  if (origemProtegida(content.funcaoOrigem)) return content;
  return {...content, funcao, funcaoOrigem: 'herdada'};
}

/** Na primeira vez que o roteiro é publicado, guarda a rede de referência daquele momento. */
export function congelarRedeReferencia<T extends { redeReferenciaCongeladaId?: string | null }>(
  content: T,
  redeReferenciaId: string | null | undefined,
): T {
  if (content.redeReferenciaCongeladaId?.trim()) return content;
  const id = redeReferenciaId?.trim();
  if (!id) return content;
  return {...content, redeReferenciaCongeladaId: id};
}
