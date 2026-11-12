import { situacaoDaFrequencia, TEXTO_SEM_ANCORA, textoFrequencia } from './apuracaoSerie.ts';
import { frequenciaParaGravar, unidadeDaMeta, type ErroDeFrequencia, type FrequenciaGravada, type UnidadeDaMeta } from './metaDaOnda.ts';

/**
 * O clique conta como dentro do popover do chip? Os seletores do painel (SelectMenu) abrem a
 * lista em portal no body, fora do painel; sem esta checagem, o mousedown na opção fechava o
 * popover antes do clique escolher o período.
 */
export function cliqueDentroDoPainel(
  alvo: unknown,
  painel: { contains(no: never): boolean; querySelector(seletor: string): unknown } | null,
): boolean {
  if (!alvo || !painel) return false;
  if (painel.contains(alvo as never)) return true;
  const closest = (alvo as { closest?: (seletor: string) => { id?: string } | null }).closest;
  const lista = typeof closest === 'function' ? closest.call(alvo, '[role="listbox"]') : null;
  if (!lista?.id) return false;
  const id = lista.id.replace(/["\\]/g, '\\$&');
  return painel.querySelector(`[aria-controls="${id}"]`) != null;
}

/** Os quatro campos da frequência, no lugar canônico da série (o mesmo da Continuidade). */
export type AlvoDaFrequencia = {
  frequenciaRecomendada?: string | null;
  frequenciaVezes?: number | null;
  frequenciaUnidade?: string | null;
  frequenciaAPartirDe?: string | null;
  frequenciaAncora?: string | null;
};

/** O que o popover edita: quantidade como texto, período e início. */
export type RascunhoDaFrequencia = {
  vezes: string;
  unidade: UnidadeDaMeta;
  aPartirDe: string;
};

/**
 * Texto curto da meta, no chip e na Continuidade. Mostra a meta que conta no plano:
 * quadro é sempre "Sob demanda"; série e wave, até 1 por semana (Regra de Ouro);
 * família, uma por série ativa (`unidades`).
 */
export function textoDoChip(alvo: AlvoDaFrequencia, opcoes: { quadro?: boolean; unidades?: number } = {}): string {
  if (opcoes.quadro) return 'Sob demanda';
  const situacao = situacaoDaFrequencia({
    frequenciaRecomendada: alvo.frequenciaRecomendada ?? null,
    frequenciaVezes: alvo.frequenciaVezes ?? null,
    frequenciaUnidade: alvo.frequenciaUnidade ?? null,
    frequenciaAPartirDe: alvo.frequenciaAPartirDe ?? null,
    frequenciaAncora: alvo.frequenciaAncora ?? null,
  }, opcoes.unidades ?? 1);
  if (situacao.tipo === 'definida') return textoFrequencia(situacao.freq);
  if (situacao.tipo === 'sem-ancora') return TEXTO_SEM_ANCORA;
  if (situacao.tipo === 'incompleta') return 'Frequência incompleta';
  if (situacao.tipo === 'sob-demanda') return 'Sob demanda';
  return 'Sem meta definida';
}

export function rascunhoDaFrequencia(alvo: AlvoDaFrequencia): RascunhoDaFrequencia {
  return {
    vezes: alvo.frequenciaVezes ? String(alvo.frequenciaVezes) : '',
    unidade: unidadeDaMeta(alvo.frequenciaUnidade),
    aPartirDe: alvo.frequenciaAPartirDe?.slice(0, 10) ?? '',
  };
}

/** Valida o rascunho com a mesma regra da Continuidade. Quantidade vazia tira a meta. */
export function frequenciaDoRascunho(
  rascunho: RascunhoDaFrequencia,
  tipo: 'serie' | 'quadro',
  unidadesDaRegra = 1,
): ErroDeFrequencia | FrequenciaGravada {
  const vezes = rascunho.vezes.trim() ? Number.parseInt(rascunho.vezes, 10) : null;
  return frequenciaParaGravar({ vezes, unidade: rascunho.unidade, aPartirDe: rascunho.aPartirDe, tipo, unidadesDaRegra });
}

/** Grava a frequência nos campos da série; o resto da série fica como está. */
export function comFrequencia<S extends AlvoDaFrequencia>(alvo: S, frequencia: FrequenciaGravada): S {
  return {
    ...alvo,
    frequenciaVezes: frequencia.vezes,
    frequenciaUnidade: frequencia.unidade,
    frequenciaAPartirDe: frequencia.aPartirDe,
    frequenciaRecomendada: frequencia.recomendada,
  };
}
